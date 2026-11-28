// KBTU UMS backend: every-hour attendance tracker.
// Endpoints:
//   GET  /api/health                      is the server connected to the database?
//   POST /api/checkin                     a student checks in by GPS for the current hour
//   GET  /api/tracker?sessionId=ses-8     the teacher's table: every student, every hour
//   POST /api/override                    the teacher sets a status by hand (reason required)
//   GET  /api/attendance?studentId=...    attendance % per course (counts hours)
//   GET  /api/records[?sessionId=ses-8]   all check-ins (the website loads them on start)
//   GET  /api/sessions                    lesson statuses (OPEN / CLOSED)
//   PATCH /api/sessions/:id               the teacher opens or closes check-in
// Other parts of the API are in src/routes/ (one file per part):
//   routes/courses.js      courses, timetable, course registration
//   routes/attestation.js  attestation points and grades
import express from 'express';
import cors from 'cors';
import { pool, PG } from './db.js';
import { distanceMeters, judgeAccuracy } from './geo.js';
import { courses } from './routes/courses.js';
import { attestation } from './routes/attestation.js';
import { authenticate, auth, roles, ownStudent, assignedSession, audit } from './auth.js';
import { admin } from './routes/admin.js';
import { portal } from './routes/portal.js';
import { campusDateSQL } from './http.js';

// Demo mode: the website can send a "time" so we can test lessons in the past
// (the sample lesson ses-8 was on 02.11). In a real system this must be false:
// the server time is used and a student cannot choose the time.
const ALLOW_DEMO_TIME = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_TIME === 'true';
const STATUSES = ['PRESENT', 'REJECTED', 'MANUAL_REVIEW'];

export const app = express();
// CORS_ORIGIN: one address, a list with commas, or * (any address, for the two-device demo)
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({ origin: origins.includes('*') && process.env.NODE_ENV !== 'production' ? true : origins.filter((origin) => origin !== '*') }));
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const reply = (res, code, status, message, extra = {}) =>
  res.status(code).json({ status, message, ...extra });

// Wraps a handler so a database error goes to the error handler at the bottom
const route = (fn) => (req, res, next) => fn(req, res).catch(next);

app.get('/api/health', route(async (_req, res) => {
  const { rows } = await pool.query('SELECT current_database() AS db, LOCALTIMESTAMP(0) AS now');
  res.json({ ok: true, database: rows[0].db, serverTime: rows[0].now, demoTime: ALLOW_DEMO_TIME });
}));

app.use(auth);
app.use('/api', authenticate, (req, res, next) => {
  if (req.user.passwordChangeRequired && req.path !== '/workspace') {
    return reply(res, 403, 'PASSWORD_CHANGE_REQUIRED', 'Change your initial password to continue.');
  }
  next();
});
app.use(portal);
app.use(admin);

// ---------------------------------------------------------------------
// POST /api/checkin
// Body: { sessionId, studentId, latitude, longitude, time?, weakSignal? }
// accuracy = the accuracy in meters that the browser reports (coords.accuracy). When it is sent,
// the server decides by itself and ignores weakSignal:
//   - weak (over 100 m) and the accuracy circle reaches the campus radius -> MANUAL_REVIEW
//   - too perfect (under 1 m, e.g. 0: fake GPS) and inside the radius -> MANUAL_REVIEW with a warning
//   - too perfect and outside the radius -> REJECTED (distance)
// weakSignal = true (only used when no accuracy is sent): GPS is weak inside the building,
// the student asks the teacher to check by hand. The check-in is saved as MANUAL_REVIEW
// (like isDrift on the website).
// The checks go in the same order as checkInGPS() on the website:
//   1. lesson time  2. lesson OPEN  3. student enrolled  4. one check-in per hour  5. distance
// ---------------------------------------------------------------------
app.post('/api/checkin', roles('STUDENT'), ownStudent, route(async (req, res) => {
  const {
    sessionId,
    latitude,
    longitude,
    time,
    weakSignal,
    accuracy
  } = req.body ?? {};

  const studentId = req.user.studentId;

  if (typeof sessionId !== 'string' || typeof studentId !== 'string' || !isNumber(latitude) || !isNumber(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return reply(res, 400, 'BAD_REQUEST', 'sessionId, latitude and longitude are required.');
  }
  if (!ALLOW_DEMO_TIME && !isNumber(accuracy)) {
    return reply(res, 400, 'BAD_REQUEST', 'A GPS accuracy measurement is required.');
  }
  if (accuracy !== undefined && accuracy !== null && (!isNumber(accuracy) || accuracy < 0)) {
    return reply(res, 400, 'BAD_REQUEST', 'accuracy must be a number (meters).');
  }
  if (time !== undefined && (!ALLOW_DEMO_TIME || typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(time))) {
    return reply(res, 400, 'BAD_REQUEST', 'The check-in time is set by the server.');
  }

  // Lesson, room center and the hour of the lesson at this moment
  const { rows } = await pool.query(
    `SELECT cs.session_id, cs.course_code, cs.semester, cs.status, cs.allowed_campus_radius_m,
            r.centroid_lat, r.centroid_lng,
            t.at AS check_in_time,
            hour_slot_for(cs.session_id, t.at) AS hour_slot
     FROM class_sessions cs
     JOIN rooms r ON r.room_id = cs.room_id
     CROSS JOIN (SELECT COALESCE($2::timestamp, ${campusDateSQL}) AS at) t
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
     WHERE student_id = $1 AND course_code = $2 AND status = 'Approved' AND semester = $3`,
    [studentId, lesson.course_code, lesson.semester]
  );
  if (enrolled.rowCount === 0) {
    return reply(res, 403, 'REJECTED_NOT_ENROLLED', `Student ${studentId} is not registered for ${lesson.course_code}.`);
  }

  // 5. Distance (a check-in that is too far is saved as REJECTED, like on the website)
  const distance = Math.min(99999.9, Math.round(
    distanceMeters(latitude, longitude, Number(lesson.centroid_lat), Number(lesson.centroid_lng)) * 10
  ) / 10);
  const inside = distance <= lesson.allowed_campus_radius_m;
  // The accuracy sent by the browser decides; the weakSignal flag is used only without accuracy
  const verdict = judgeAccuracy(accuracy, distance, lesson.allowed_campus_radius_m);
  const suspicious = verdict === 'SUSPICIOUS' && inside;
  const review = verdict === 'UNKNOWN' ? weakSignal === true : verdict === 'WEAK_NEAR' || suspicious;
  const status = review ? 'MANUAL_REVIEW' : inside ? 'PRESENT' : 'REJECTED';
  const reason = suspicious
    ? `Suspicious GPS accuracy (${accuracy} m): possible fake GPS, the teacher must check`
    : review
      ? verdict === 'WEAK_NEAR'
        ? `Weak GPS accuracy (${accuracy} m): manual review`
        : 'Indoor GPS drift: the student asked for a manual review'
      : inside ? null : `Distance ${distance}m exceeded allowed radius ${lesson.allowed_campus_radius_m}m`;

  // 4. One check-in per hour: the database rule uq_session_student_hour decides
  try {
    const saved = await pool.query(
      `INSERT INTO attendance_records
         (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude,
          distance_to_center_m, verification_status, rejection_reason)
       SELECT $1::varchar, $2::varchar, $3::smallint, $4::timestamp, $5::numeric, $6::numeric, $7::numeric, $8::varchar, $9::text
       FROM class_sessions WHERE session_id = $1 AND status = 'OPEN'
       AND EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = $2 AND e.course_code = class_sessions.course_code
                   AND e.semester = class_sessions.semester AND e.status = 'Approved')
       FOR SHARE
       RETURNING attendance_id, session_id, student_id, hour_slot, check_in_time,
                 distance_to_center_m, verification_status, rejection_reason`,
      [sessionId, studentId, lesson.hour_slot, lesson.check_in_time,
       latitude.toFixed(6), longitude.toFixed(6), distance, status, reason]
    );
    if (!saved.rowCount) return reply(res, 403, 'REJECTED_CLOSED', 'Check-in is no longer available.');
    await audit(req.user, 'GPS_CHECK_IN', `${sessionId}, hour ${lesson.hour_slot}: ${status}`);
    return reply(res, 201,
      review ? 'MANUAL_REVIEW_SUBMITTED' : inside ? 'SUCCESS_PRESENT' : 'REJECTED_RADIUS',
      suspicious ? `Suspicious GPS accuracy: the check-in for hour ${lesson.hour_slot} was sent to the teacher for review.`
        : review ? `Manual review for hour ${lesson.hour_slot} sent to the teacher.`
        : inside ? `Checked in for hour ${lesson.hour_slot}.` : reason,
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
app.get('/api/tracker', roles('TEACHER'), assignedSession, route(async (req, res) => {
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
// Body: { sessionId, studentId, hourSlot, status, reason }
// The teacher sets the result of one hour by hand. If the student already has a
// check-in for that hour it is changed, otherwise a new one is added.
// Like on the website, a manual record gets the room center and distance 0.
// ---------------------------------------------------------------------
app.post('/api/override', roles('TEACHER'), assignedSession, route(async (req, res) => {
  const { sessionId, studentId, hourSlot, status, reason } = req.body ?? {};
  if (!sessionId || !studentId || ![1, 2, 3].includes(hourSlot) || !STATUSES.includes(status)) {
    return reply(res, 400, 'BAD_REQUEST', 'sessionId, studentId, hourSlot (1-3) and a valid status are required.');
  }
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
    return reply(res, 400, 'REASON_REQUIRED', 'A reason is required for a manual change.');
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance_records
         (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude,
          distance_to_center_m, verification_status, is_override, override_by, override_reason)
       SELECT cs.session_id, $2::varchar, $3::smallint, ${campusDateSQL}, r.centroid_lat, r.centroid_lng,
              0, $4::varchar, TRUE, $5::varchar, $6::text
       FROM class_sessions cs JOIN rooms r ON r.room_id = cs.room_id
       WHERE cs.session_id = $1
       AND EXISTS (SELECT 1 FROM courses c WHERE c.course_code = cs.course_code AND c.teacher_id = $7)
       AND EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = $2 AND e.course_code = cs.course_code
                   AND e.semester = cs.semester AND e.status = 'Approved')
       ON CONFLICT (session_id, student_id, hour_slot) DO UPDATE
         SET verification_status = EXCLUDED.verification_status,
             rejection_reason    = NULL,
             is_override         = TRUE,
             override_by         = EXCLUDED.override_by,
             override_reason     = EXCLUDED.override_reason
       RETURNING attendance_id, session_id, student_id, hour_slot, verification_status,
                 is_override, override_by, override_reason`,
      [sessionId, studentId, hourSlot, status, req.user.fullName, reason.trim(), req.user.teacherId]
    );
    if (rows.length === 0) return reply(res, 404, 'NOT_FOUND', `Lesson ${sessionId} does not exist.`);
    await audit(req.user, 'MANUAL_OVERRIDE', `${sessionId}, ${studentId}, hour ${hourSlot}: ${reason}`);
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
app.get('/api/attendance', roles('STUDENT', 'MANAGER', 'ADMIN'), ownStudent, route(async (req, res) => {
  const { asOf } = req.query;

  const studentId = req.user.role === 'STUDENT'
    ? req.user.studentId
    : req.query.studentId;
  if (!studentId) return reply(res, 400, 'BAD_REQUEST', 'studentId is required.');
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return reply(res, 400, 'BAD_REQUEST', 'asOf must be YYYY-MM-DD.');
  const { rows } = await pool.query(
    `SELECT course_code, points_present, points_total, attendance_pct,
            attendance_pct < 80 AS at_risk
     FROM attendance_summary(COALESCE($2::date, (${campusDateSQL})::date))
     WHERE student_id = $1 ORDER BY course_code`,
    [studentId, asOf || null]
  );
  res.json({ studentId, courses: rows });
}));

// ---------------------------------------------------------------------
// GET /api/records?sessionId=ses-8   (sessionId is optional)
// ---------------------------------------------------------------------
app.get('/api/records', roles('STUDENT', 'TEACHER', 'ADMIN'), route(async (req, res) => {
  const { sessionId } = req.query;
  const { rows } = await pool.query(
    `SELECT attendance_id, session_id, student_id, hour_slot, check_in_time,
            gps_latitude::float AS gps_latitude, gps_longitude::float AS gps_longitude,
            distance_to_center_m::float AS distance_to_center_m,
            verification_status, rejection_reason, is_override, override_by, override_reason
     FROM attendance_records a
     WHERE ($1::varchar IS NULL OR session_id = $1)
       AND ($2::varchar IS NULL OR student_id = $2)
       AND ($3::varchar IS NULL OR EXISTS (
         SELECT 1 FROM class_sessions cs JOIN courses c USING (course_code)
         WHERE cs.session_id = a.session_id AND c.teacher_id = $3))
     ORDER BY check_in_time DESC, attendance_id DESC`,
    [sessionId || null, req.user.studentId, req.user.teacherId]
  );
  res.json({ records: rows });
}));

// ---------------------------------------------------------------------
// GET /api/sessions  and  PATCH /api/sessions/:id  { status: "OPEN" | "CLOSED" }
// ---------------------------------------------------------------------
app.get('/api/sessions', route(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT session_id, course_code, session_number, session_date, status, tracked_hours
     FROM class_sessions cs
     WHERE ($1::varchar IS NULL OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_code = cs.course_code AND e.semester = cs.semester AND e.student_id = $1 AND e.status = 'Approved'))
       AND ($2::varchar IS NULL OR EXISTS (SELECT 1 FROM courses c WHERE c.course_code = cs.course_code AND c.teacher_id = $2))
     ORDER BY course_code, session_number`, [req.user.studentId, req.user.teacherId]
  );
  res.json({ sessions: rows });
}));

app.patch('/api/sessions/:id', roles('TEACHER'), assignedSession, route(async (req, res) => {
  const { status } = req.body ?? {};
  if (!['OPEN', 'CLOSED'].includes(status)) {
    return reply(res, 400, 'BAD_REQUEST', 'status must be OPEN or CLOSED.');
  }
  const { rows } = await pool.query(
    `UPDATE class_sessions SET status = $2 WHERE session_id = $1
     AND EXISTS (SELECT 1 FROM courses c WHERE c.course_code = class_sessions.course_code AND c.teacher_id = $3)
     RETURNING session_id, status`,
    [req.params.id, status, req.user.teacherId]
  );
  if (rows.length === 0) return reply(res, 404, 'NOT_FOUND', `Lesson ${req.params.id} does not exist.`);
  await audit(req.user, 'SESSION_STATUS_CHANGED', `${req.params.id}: ${status}`);
  return reply(res, 200, 'UPDATED', `Lesson ${req.params.id} is now ${status}.`, { session: rows[0] });
}));

// Parts of the API in separate files (see src/routes/)
app.use(courses);
app.use(attestation);

// Any other error: log it and answer without showing database details
app.use((err, _req, res, _next) => {
  if (err.status >= 400 && err.status < 500) return reply(res, err.status, 'BAD_REQUEST', 'Invalid request.');
  console.error('API request failed:', err.code || err.name);
  reply(res, 500, 'SERVER_ERROR', 'Something went wrong on the server.');
});
