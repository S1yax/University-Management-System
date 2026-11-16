// KBTU UMS backend: every-hour attendance tracker.
// Endpoints:
//   GET  /api/health                      is the server connected to the database?
//   POST /api/checkin                     a student checks in by GPS for the current hour
//   GET  /api/tracker?sessionId=ses-8     the teacher's table: every student, every hour
//   POST /api/override                    the teacher sets a status by hand (reason required)
//   GET  /api/attendance?studentId=...    attendance % per course (counts hours)
import express from 'express';
import cors from 'cors';
import { pool, PG } from './db.js';
import { distanceMeters } from './geo.js';

// Demo mode: the website can send a "time" so we can test lessons in the past
// (the sample lesson ses-8 was on 02.11). In a real system this must be false:
// the server time is used and a student cannot choose the time.
const ALLOW_DEMO_TIME = (process.env.ALLOW_DEMO_TIME ?? 'true') === 'true';
const STATUSES = ['PRESENT', 'REJECTED', 'MANUAL_REVIEW'];

export const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const reply = (res, code, status, message, extra = {}) =>
  res.status(code).json({ status, message, ...extra });

// Wraps a handler so a database error goes to the error handler at the bottom
const route = (fn) => (req, res, next) => fn(req, res).catch(next);

app.get('/api/health', route(async (_req, res) => {
  const { rows } = await pool.query('SELECT current_database() AS db, LOCALTIMESTAMP(0) AS now');
  res.json({ ok: true, database: rows[0].db, serverTime: rows[0].now, demoTime: ALLOW_DEMO_TIME });
}));

// ---------------------------------------------------------------------
// POST /api/checkin
// Body: { sessionId, studentId, latitude, longitude, time? }
// The checks go in the same order as checkInGPS() on the website:
//   1. lesson time  2. lesson OPEN  3. student enrolled  4. one check-in per hour  5. distance
// ---------------------------------------------------------------------
app.post('/api/checkin', route(async (req, res) => {
  const { sessionId, studentId, latitude, longitude, time } = req.body ?? {};
  if (!sessionId || !studentId || !isNumber(latitude) || !isNumber(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return reply(res, 400, 'BAD_REQUEST', 'sessionId, studentId, latitude and longitude are required.');
  }
  if (time && !ALLOW_DEMO_TIME) {
    return reply(res, 400, 'BAD_REQUEST', 'The check-in time is set by the server.');
  }

  // Lesson, room center and the hour of the lesson at this moment
  const { rows } = await pool.query(
    `SELECT cs.session_id, cs.course_code, cs.status, cs.allowed_campus_radius_m,
            r.centroid_lat, r.centroid_lng,
            t.at AS check_in_time,
            hour_slot_for(cs.session_id, t.at) AS hour_slot
     FROM class_sessions cs
     JOIN rooms r ON r.room_id = cs.room_id
     CROSS JOIN (SELECT COALESCE($2::timestamp, LOCALTIMESTAMP(0)) AS at) t
     WHERE cs.session_id = $1`,
    [sessionId, time || null]
  );
  const lesson = rows[0];
  if (!lesson) return reply(res, 404, 'REJECTED_CLOSED', `Lesson ${sessionId} does not exist.`);

  // 1. Lesson time
  if (lesson.hour_slot === null) {
    return reply(res, 403, 'REJECTED_CLOSED', 'Check-in is possible only during the lesson.');
  }
  // 2. Lesson open
  if (lesson.status !== 'OPEN') {
    return reply(res, 403, 'REJECTED_CLOSED', `Check-in for ${lesson.course_code} is closed.`);
  }
  // 3. Enrolled
  const enrolled = await pool.query(
    `SELECT 1 FROM enrollments
     WHERE student_id = $1 AND course_code = $2 AND status = 'Approved'`,
    [studentId, lesson.course_code]
  );
  if (enrolled.rowCount === 0) {
    return reply(res, 403, 'REJECTED_NOT_ENROLLED', `Student ${studentId} is not registered for ${lesson.course_code}.`);
  }

  // 5. Distance (a check-in that is too far is saved as REJECTED, like on the website)
  const distance = Math.round(
    distanceMeters(latitude, longitude, Number(lesson.centroid_lat), Number(lesson.centroid_lng)) * 10
  ) / 10;
  const inside = distance <= lesson.allowed_campus_radius_m;
  const status = inside ? 'PRESENT' : 'REJECTED';
  const reason = inside ? null : `Distance ${distance}m exceeded allowed radius ${lesson.allowed_campus_radius_m}m`;

  // 4. One check-in per hour: the database rule uq_session_student_hour decides
  try {
    const saved = await pool.query(
      `INSERT INTO attendance_records
         (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude,
          distance_to_center_m, verification_status, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING attendance_id, session_id, student_id, hour_slot, check_in_time,
                 distance_to_center_m, verification_status, rejection_reason`,
      [sessionId, studentId, lesson.hour_slot, lesson.check_in_time,
       latitude.toFixed(6), longitude.toFixed(6), distance, status, reason]
    );
    return reply(res, 201,
      inside ? 'SUCCESS_PRESENT' : 'REJECTED_RADIUS',
      inside ? `Checked in for hour ${lesson.hour_slot}.` : reason,
      { hourSlot: lesson.hour_slot, distanceM: distance, record: saved.rows[0] });
  } catch (err) {
    if (err.code === PG.UNIQUE) {
      return reply(res, 409, 'ALREADY_CHECKED_IN',
        `You have already checked in for hour ${lesson.hour_slot} of this lesson.`,
        { hourSlot: lesson.hour_slot });
    }
    throw err;
  }
}));

// ---------------------------------------------------------------------
// GET /api/tracker?sessionId=ses-8
// One row per student: hour_1, hour_2, hour_3 and hours present.
// ---------------------------------------------------------------------
app.get('/api/tracker', route(async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return reply(res, 400, 'BAD_REQUEST', 'sessionId is required.');
  const lesson = await pool.query(
    `SELECT session_id, course_code, session_number, session_date, start_time, end_time,
            status, tracked_hours
     FROM class_sessions WHERE session_id = $1`,
    [sessionId]
  );
  if (lesson.rowCount === 0) return reply(res, 404, 'NOT_FOUND', `Lesson ${sessionId} does not exist.`);
  const { rows } = await pool.query(
    `SELECT student_id, full_name, hour_1, hour_2, hour_3, hours_present, hours_total
     FROM v_hourly_tracker WHERE session_id = $1 ORDER BY full_name`,
    [sessionId]
  );
  res.json({ session: lesson.rows[0], students: rows });
}));

// ---------------------------------------------------------------------
// POST /api/override
// Body: { sessionId, studentId, hourSlot, status, reason, teacher }
// The teacher sets the result of one hour by hand. If the student already has a
// check-in for that hour it is changed, otherwise a new one is added.
// Like on the website, a manual record gets the room center and distance 0.
// ---------------------------------------------------------------------
app.post('/api/override', route(async (req, res) => {
  const { sessionId, studentId, hourSlot, status, reason, teacher } = req.body ?? {};
  if (!sessionId || !studentId || ![1, 2, 3].includes(hourSlot) || !STATUSES.includes(status)) {
    return reply(res, 400, 'BAD_REQUEST', 'sessionId, studentId, hourSlot (1-3) and a valid status are required.');
  }
  if (!reason || !String(reason).trim()) {
    return reply(res, 400, 'REASON_REQUIRED', 'A reason is required for a manual change.');
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance_records
         (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude,
          distance_to_center_m, verification_status, is_override, override_by, override_reason)
       SELECT cs.session_id, $2, $3, LOCALTIMESTAMP(0), r.centroid_lat, r.centroid_lng,
              0, $4, TRUE, $5, $6
       FROM class_sessions cs JOIN rooms r ON r.room_id = cs.room_id
       WHERE cs.session_id = $1
       ON CONFLICT (session_id, student_id, hour_slot) DO UPDATE
         SET verification_status = EXCLUDED.verification_status,
             rejection_reason    = NULL,
             is_override         = TRUE,
             override_by         = EXCLUDED.override_by,
             override_reason     = EXCLUDED.override_reason
       RETURNING attendance_id, session_id, student_id, hour_slot, verification_status,
                 is_override, override_by, override_reason`,
      [sessionId, studentId, hourSlot, status, teacher || 'Teacher', String(reason).trim()]
    );
    if (rows.length === 0) return reply(res, 404, 'NOT_FOUND', `Lesson ${sessionId} does not exist.`);
    return reply(res, 200, 'OVERRIDDEN', `Hour ${hourSlot} set to ${status}.`, { record: rows[0] });
  } catch (err) {
    if (err.code === PG.FOREIGN_KEY) return reply(res, 404, 'NOT_FOUND', `Student ${studentId} does not exist.`);
    if (err.code === PG.CHECK) return reply(res, 400, 'BAD_REQUEST', err.message);
    throw err;
  }
}));

// ---------------------------------------------------------------------
// GET /api/attendance?studentId=24B031901&asOf=2026-11-08
// Attendance % per course. asOf is optional (default: today).
// ---------------------------------------------------------------------
app.get('/api/attendance', route(async (req, res) => {
  const { studentId, asOf } = req.query;
  if (!studentId) return reply(res, 400, 'BAD_REQUEST', 'studentId is required.');
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return reply(res, 400, 'BAD_REQUEST', 'asOf must be YYYY-MM-DD.');
  const { rows } = await pool.query(
    `SELECT course_code, points_present, points_total, attendance_pct,
            attendance_pct < 80 AS at_risk
     FROM attendance_summary(COALESCE($2::date, CURRENT_DATE))
     WHERE student_id = $1 ORDER BY course_code`,
    [studentId, asOf || null]
  );
  res.json({ studentId, courses: rows });
}));

// Any other error: log it and answer without showing database details
app.use((err, _req, res, _next) => {
  console.error(err);
  reply(res, 500, 'SERVER_ERROR', 'Something went wrong on the server.');
});
