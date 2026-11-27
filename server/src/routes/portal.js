import { Router } from 'express';
import { pool } from '../db.js';
import { audit, publicUser, roles } from '../auth.js';
import { campusDateSQL, CURRENT_SEMESTER, SHOW_DEMO_CONTENT, reply, route } from '../http.js';
import { transaction } from '../transaction.js';

export const portal = Router();
const management = roles('ADMIN', 'MANAGER');
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

portal.get('/api/workspace', route(async (req, res) => {
  if (req.user.passwordChangeRequired) return res.json({ user: req.user, demoTime: false, users: [], courses: [], enrollments: [], classSessions: [], attendanceRecords: [], auditLogs: [], notifications: [] });
  const { studentId = null, teacherId = null, role, username } = req.user;
  const staff = role === 'ADMIN' || role === 'MANAGER';
  const studentDemo = SHOW_DEMO_CONTENT && role === 'STUDENT';
  const scope = [studentId, teacherId, CURRENT_SEMESTER];
  const queries = [
    [`SELECT u.* FROM portal_users u
      WHERE ($1::text IS NULL OR u.username = $1)
        AND ($2::varchar IS NULL OR u.teacher_id = $2 OR EXISTS (
         SELECT 1 FROM enrollments e JOIN courses c USING (course_code)
         WHERE c.teacher_id = $2 AND e.student_id = u.student_id AND e.semester = $3 AND e.status = 'Approved'))
      ORDER BY u.full_name`, [studentId ? username : null, teacherId, CURRENT_SEMESTER]],
    [`SELECT c.*, t.full_name AS teacher, r.room_number,
         (SELECT count(*)::int FROM enrollments e
          WHERE e.course_code = c.course_code AND e.semester = $3 AND e.status = 'Approved') AS approved
      FROM courses c JOIN teachers t USING (teacher_id) JOIN rooms r USING (room_id)
      WHERE ($2::varchar IS NULL OR c.teacher_id = $2)
        AND ($1::varchar IS NULL OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_code = c.course_code
             AND e.student_id = $1 AND e.semester = $3)) ORDER BY c.course_code`, scope],
    [`SELECT e.*, s.full_name, c.credits, c.ects_credits, a.total, a.letter, demo.total AS demo_total, demo.letter AS demo_letter
      FROM enrollments e JOIN students s USING (student_id) JOIN courses c USING (course_code)
      LEFT JOIN v_attestation a ON (a.student_id, a.course_code, a.semester) = (e.student_id, e.course_code, e.semester)
      LEFT JOIN portal_grade_examples demo ON $4::boolean AND (demo.student_id, demo.course_code, demo.semester) = (e.student_id, e.course_code, e.semester)
      WHERE ($1::varchar IS NULL OR e.student_id = $1)
        AND ($2::varchar IS NULL OR (c.teacher_id = $2 AND e.status = 'Approved'))
        AND e.semester = $3 ORDER BY e.enrollment_id`, [...scope, studentDemo]],
    [`SELECT cs.*, c.title, c.teacher_id, t.full_name AS teacher, r.room_number,
         r.centroid_lat::float, r.centroid_lng::float,
         (cs.session_date + cs.end_time < ${campusDateSQL}) AS completed,
         EXISTS (SELECT 1 FROM attendance_records ar WHERE ar.session_id = cs.session_id) AS has_attendance_records
      FROM class_sessions cs JOIN courses c USING (course_code)
      JOIN teachers t USING (teacher_id) JOIN rooms r ON r.room_id = cs.room_id
      WHERE ($1::varchar IS NULL OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_code = cs.course_code
             AND e.student_id = $1 AND e.semester = cs.semester AND e.status = 'Approved'))
        AND ($2::varchar IS NULL OR c.teacher_id = $2) AND cs.semester = $3
      ORDER BY cs.session_date, cs.start_time`, scope],
    [`SELECT a.*, s.full_name, cs.session_number, cs.course_code, c.title
      FROM attendance_records a JOIN class_sessions cs USING (session_id)
      JOIN courses c USING (course_code) JOIN students s ON s.student_id = a.student_id
      WHERE ($1::varchar IS NULL OR a.student_id = $1)
        AND ($2::varchar IS NULL OR c.teacher_id = $2) AND cs.semester = $3
      ORDER BY check_in_time DESC`, scope],
    staff ? ['SELECT * FROM portal_audit ORDER BY id DESC LIMIT 200', []] : ['SELECT * FROM portal_audit WHERE false', []],
    [`SELECT round(sum((letter_grade(a.total)).gpa_points * coalesce(c.ects_credits,c.credits))
                  / nullif(sum(coalesce(c.ects_credits,c.credits)),0),2)::float AS gpa
      FROM v_attestation a JOIN courses c USING (course_code) JOIN enrollments e
      ON (a.student_id,a.course_code,a.semester) = (e.student_id,e.course_code,e.semester)
      WHERE a.student_id = $1 AND a.total IS NOT NULL AND e.status = 'Approved'`, [studentId]],
    [`SELECT id::text, sender, subject, message AS content, created_at AS date, (read_at IS NOT NULL) AS read, (demo_key IS NOT NULL) AS demo
      FROM portal_notifications WHERE recipient = $1 AND ($2::boolean OR demo_key IS NULL) ORDER BY id DESC LIMIT 100`, [username, SHOW_DEMO_CONTENT]],
    [`SELECT round(sum(a.gpa_points * coalesce(c.ects_credits,c.credits))
                  / nullif(sum(coalesce(c.ects_credits,c.credits)),0),2)::float AS gpa
      FROM portal_grade_examples a JOIN courses c USING (course_code)
      WHERE $3::boolean AND a.student_id = $1 AND a.semester = $2`, [studentId, CURRENT_SEMESTER, studentDemo]],
  ];
  // Fetch all workspace sections in one PostgreSQL snapshot and one round trip.
  const parameters = [];
  const selects = queries.map(([sql, args], index) => {
    const offset = parameters.length;
    parameters.push(...args);
    const statement = sql.replace(/\$(\d+)/g, (_, number) => String.fromCharCode(36) + (offset + Number(number)));
    return 'ARRAY(SELECT row_to_json(item) FROM (' + statement + ') AS item) AS section_' + index;
  });
  const { rows: [snapshot] } = await pool.query('SELECT ' + selects.join(','), parameters);
  const [users, courses, enrollments, sessions, records, logs, grade, notifications, gradeExample] =
    selects.map((_, index) => ({ rows: snapshot['section_' + index] }));
  res.json({
    demoTime: process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_TIME === 'true',
    user: { ...req.user, gpa: grade.rows[0].gpa, demoGpa: gradeExample.rows[0].gpa },
    users: users.rows.map((r) => {
      const user = publicUser(r);
      return staff || user.username === username ? user : { id: user.id, fullName: user.fullName, role: user.role, studentId: user.studentId };
    }),
    courses: courses.rows.map((r) => ({
      id: r.course_code, code: r.course_code, title: r.title, credits: r.credits, ectsCredits: r.ects_credits,
      department: r.faculty, instructorId: r.teacher_id, instructorName: r.teacher, semester: CURRENT_SEMESTER,
      maxCapacity: r.max_places, enrolledCount: r.approved, description: '', room: r.room_number,
      dayOfWeek: r.day_of_week, startTime: r.start_time.slice(0, 5), endTime: r.end_time.slice(0, 5),
      schedule: dayNames[r.day_of_week - 1] + ' ' + r.start_time.slice(0, 5) + '–' + r.end_time.slice(0, 5),
    })),
    enrollments: enrollments.rows.map((r) => ({
      id: String(r.enrollment_id), studentId: r.student_id, studentName: r.full_name, courseCode: r.course_code,
      semester: r.semester, status: r.status, credits: r.credits, ectsCredits: r.ects_credits,
      grade: r.letter || undefined, score: r.total === null ? undefined : Number(r.total),
      demoGrade: r.demo_letter || undefined, demoScore: r.demo_total === null ? undefined : Number(r.demo_total),
    })),
    classSessions: sessions.rows.map((r) => ({
      id: r.session_id, courseCode: r.course_code, sessionNumber: r.session_number, title: r.title,
      date: r.session_date, dayOfWeek: dayNames[(new Date(r.session_date).getUTCDay() + 6) % 7],
      startTime: r.start_time.slice(0, 5), endTime: r.end_time.slice(0, 5), roomId: r.room_id,
      roomName: r.room_number, instructorId: r.teacher_id, instructorName: r.teacher,
      allowedCampusRadiusM: r.allowed_campus_radius_m, centerLat: r.centroid_lat, centerLng: r.centroid_lng,
      status: r.status, trackedHours: r.tracked_hours, completed: r.completed, hasAttendanceRecords: r.has_attendance_records,
    })),
    attendanceRecords: records.rows.map((r) => ({
      id: String(r.attendance_id), sessionId: r.session_id, courseCode: r.course_code, sessionTitle: r.title,
      sessionNumber: r.session_number, studentId: r.student_id, studentName: r.full_name, checkInTime: r.check_in_time.replace('T', ' '),
      gpsLatitude: staff ? null : Number(r.gps_latitude), gpsLongitude: staff ? null : Number(r.gps_longitude),
      distanceToCenterM: Number(r.distance_to_center_m), verificationStatus: r.verification_status,
      rejectionReason: r.rejection_reason, isOverride: r.is_override, overrideBy: r.override_by, overrideReason: r.override_reason,
      hourSlot: r.hour_slot, manualReviewNote: r.verification_status === 'MANUAL_REVIEW' ? r.rejection_reason : undefined,
    })),
    auditLogs: logs.rows.map((r) => ({
      id: String(r.id), timestamp: r.created_at, username: r.username, role: r.role, action: r.action, details: r.details, status: r.status,
    })),
    notifications: notifications.rows,
  });
}));

portal.patch('/api/profile', route(async (req, res) => {
  const { phone } = req.body ?? {};
  if (typeof phone !== 'string' || !/^[+\d() .-]{0,40}$/.test(phone)) {
    return reply(res, 400, 'BAD_REQUEST', 'Enter a valid phone number.');
  }
  await pool.query(`INSERT INTO portal_profiles (username, phone) VALUES ($1,$2)
    ON CONFLICT (username) DO UPDATE SET phone = EXCLUDED.phone`, [req.user.username, phone.trim()]);
  res.json({ ok: true });
}));

portal.patch('/api/notifications/:id', route(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return reply(res, 400, 'BAD_REQUEST', 'Invalid notification.');
  const result = await pool.query(
    'UPDATE portal_notifications SET read_at = coalesce(read_at, now()) WHERE id = $1 AND recipient = $2',
    [req.params.id, req.user.username]);
  if (!result.rowCount) return reply(res, 404, 'NOT_FOUND', 'Notification not found.');
  res.json({ ok: true });
}));

portal.post('/api/warnings', management, route(async (req, res) => {
  const { studentId, courseCode } = req.body ?? {};
  if (typeof studentId !== 'string' || typeof courseCode !== 'string') return reply(res, 400, 'BAD_REQUEST', 'Choose a student and course.');
  const result = await transaction(async (db) => {
    const result = await db.query(`INSERT INTO portal_notifications (recipient,sender,subject,message)
      SELECT lower(s.username), $3::text, 'Attendance warning', 'Your attendance for ' || e.course_code ||
             ' is below 80%. Contact your instructor for details.'
      FROM enrollments e JOIN students s USING (student_id)
      WHERE e.student_id = $1 AND e.course_code = $2 AND e.semester = $4 AND e.status = 'Approved'
      AND EXISTS (SELECT 1 FROM v_at_risk_students r WHERE r.student_id = $1 AND r.course_code = $2)`,
      [studentId, courseCode, req.user.fullName, CURRENT_SEMESTER]);
    if (result.rowCount) await audit(req.user, 'EARLY_WARNING_SENT', studentId + ' / ' + courseCode, db);
    return result;
  });
  if (!result.rowCount) return reply(res, 409, 'NOT_AT_RISK', 'No eligible attendance warning for this enrollment.');
  res.json({ message: 'Attendance warning sent.' });
}));

portal.post('/api/manual-review', roles('STUDENT'), route(async (req, res) => {
  const { sessionId, reason, time } = req.body ?? {};
  if (typeof sessionId !== 'string' || typeof reason !== 'string' || !reason.trim() || reason.length > 1000 ||
      (time !== undefined && (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_TIME !== 'true' ||
       typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(time)))) {
    return reply(res, 400, 'BAD_REQUEST', 'Enter a session and a reason for manual review.');
  }
  const result = await transaction(async (db) => {
    const result = await db.query(`INSERT INTO attendance_records
      (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, rejection_reason)
      SELECT cs.session_id, $1::varchar, hour_slot_for(cs.session_id, clock.at), clock.at, r.centroid_lat, r.centroid_lng,
             0, 'MANUAL_REVIEW', $3::text
      FROM class_sessions cs JOIN rooms r USING (room_id)
      CROSS JOIN (SELECT coalesce($4::timestamp, ${campusDateSQL}) at) clock
      WHERE cs.session_id = $2 AND cs.status = 'OPEN' AND hour_slot_for(cs.session_id, clock.at) IS NOT NULL
        AND EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = $1 AND e.course_code = cs.course_code
                    AND e.semester = cs.semester AND e.status = 'Approved')
      ON CONFLICT (session_id, student_id, hour_slot) DO UPDATE
        SET verification_status = 'MANUAL_REVIEW', rejection_reason = excluded.rejection_reason
        WHERE attendance_records.verification_status = 'REJECTED' AND NOT attendance_records.is_override`,
      [req.user.studentId, sessionId, reason.trim(), time ?? null]);
    if (result.rowCount) await audit(req.user, 'MANUAL_REVIEW_REQUEST', sessionId, db);
    return result;
  });
  if (!result.rowCount) return reply(res, 409, 'UNAVAILABLE', 'This check-in is closed, already submitted, or unavailable.');
  res.json({ message: 'Manual review sent to your instructor.' });
}));

portal.get('/api/students', management, route(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM portal_users WHERE role = 'STUDENT' ORDER BY full_name");
  res.json({ students: rows.map(publicUser) });
}));

portal.get('/api/events', route(async (req, res) => {
  const { rows } = await pool.query(`SELECT e.*, EXISTS (
    SELECT 1 FROM portal_event_registrations r WHERE r.event_id = e.id AND r.student_id = $1
    ) AS registered FROM portal_events e WHERE ($2::boolean OR e.demo_key IS NULL) ORDER BY e.starts_at`, [req.user.studentId, SHOW_DEMO_CONTENT]);
  res.json({ events: rows });
}));

portal.post('/api/events/:id/register', roles('STUDENT'), route(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return reply(res, 400, 'BAD_REQUEST', 'Invalid event.');
  const result = await pool.query(`INSERT INTO portal_event_registrations (event_id, student_id)
    SELECT id, $2::varchar FROM portal_events WHERE id = $1 AND demo_key IS NULL AND starts_at > now()
    ON CONFLICT DO NOTHING`, [req.params.id, req.user.studentId]);
  if (!result.rowCount) return reply(res, 409, 'UNAVAILABLE', 'Registration is closed or you are already registered.');
  res.json({ message: 'Event registration confirmed.' });
}));
