// Courses, the timetable and course registration.
//   GET    /api/courses                         catalog: schedule, teacher, room, free places
//   GET    /api/schedule?studentId=...          weekly timetable of one student
//   GET    /api/clashes                         timetable problems (room and student clashes)
//   GET    /api/enrollments?studentId=&courseCode=&status=   registrations (all filters optional)
//   POST   /api/enrollments                     a student registers: { studentId, courseCode, semester? }
//   PATCH  /api/enrollments/:id                 the manager answers: { status: "Approved" | "Rejected" }
//   DELETE /api/enrollments/:id                 the student cancels a registration
import { Router } from 'express';
import { pool } from '../db.js';
import { reply, route, replyDbRule, CURRENT_SEMESTER } from '../http.js';

import { roles, ownStudent, audit } from '../auth.js';
import { transaction } from '../transaction.js';

export const courses = Router();

courses.get('/api/courses', route(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT course_code, title, credits, ects_credits, faculty, teacher, day, day_of_week,
            to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time,
            room, max_places, COALESCE(places.taken, 0)::int AS taken_places,
            (max_places - COALESCE(places.taken, 0))::int AS free_places
     FROM v_course_catalog v
     LEFT JOIN LATERAL (SELECT count(*) AS taken FROM enrollments e WHERE e.course_code = v.course_code
         AND e.semester = $1 AND e.status IN ('Pending','Approved')) places ON true
     ORDER BY v.course_code`, [CURRENT_SEMESTER]
  );
  res.json({ semester: CURRENT_SEMESTER, courses: rows });
}));

courses.get('/api/schedule', roles('STUDENT','MANAGER','ADMIN'), ownStudent, route(async (req, res) => {
  const { studentId, semester = CURRENT_SEMESTER } = req.query;
  if (!studentId) return reply(res, 400, 'BAD_REQUEST', 'studentId is required.');
  const { rows } = await pool.query(
    `SELECT enrollment_id, status, course_code, title, credits, teacher, day, day_of_week,
            to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time, room
     FROM v_student_schedule WHERE student_id = $1 AND semester = $2`,
    [studentId, semester]
  );
  const credits = rows.reduce((sum, r) => sum + r.credits, 0);
  res.json({ studentId, semester, credits, creditLimit: 21, lessons: rows });
}));

courses.get('/api/clashes', roles('MANAGER','ADMIN'), route(async (_req, res) => {
  const rooms = await pool.query(
    `SELECT room_number AS room, course_1, course_2, day,
            to_char(clash_from, 'HH24:MI') AS clash_from, to_char(clash_to, 'HH24:MI') AS clash_to
     FROM v_room_clashes`
  );
  const students = await pool.query(
    `SELECT student_id, full_name, course_1, course_2, day,
            to_char(clash_from, 'HH24:MI') AS clash_from, to_char(clash_to, 'HH24:MI') AS clash_to
     FROM v_schedule_clashes`
  );
  res.json({ rooms: rooms.rows, students: students.rows });
}));

courses.get('/api/enrollments', ownStudent, route(async (req, res) => {
  const { studentId, courseCode, status } = req.query;
  const { rows } = await pool.query(
    `SELECT e.enrollment_id, e.student_id, s.full_name, e.course_code, c.title, c.credits, c.ects_credits, e.semester, e.status
     FROM enrollments e
     JOIN students s ON s.student_id = e.student_id
     JOIN courses c  ON c.course_code = e.course_code
     WHERE ($1::varchar IS NULL OR e.student_id = $1)
       AND ($2::varchar IS NULL OR e.course_code = $2)
       AND ($3::varchar IS NULL OR e.status = $3)
       AND ($4::varchar IS NULL OR (c.teacher_id = $4 AND e.status = 'Approved'))
       AND e.semester = $5
     ORDER BY e.enrollment_id`,
    [req.user.studentId || studentId || null, courseCode || null, status || null, req.user.teacherId, CURRENT_SEMESTER]
  );
  res.json({ enrollments: rows });
}));

// All checks are inside the database function register_for_course():
// free places, the 21-credit limit, time clashes and "already registered".
courses.post('/api/enrollments', roles('STUDENT'), ownStudent, route(async (req, res) => {
  const { studentId, courseCode, semester = CURRENT_SEMESTER } = req.body ?? {};
  if (typeof studentId !== 'string' || typeof courseCode !== 'string' || semester !== CURRENT_SEMESTER) return reply(res, 400, 'BAD_REQUEST', 'studentId and courseCode are required.');
  try {
    const { rows } = await transaction(async (db) => {
      const result = await db.query('SELECT * FROM register_for_course($1, $2, $3)', [studentId, courseCode, semester]);
      await audit(req.user, 'ENROLLMENT_CREATED', courseCode, db);
      return result;
    });
    return reply(res, 201, 'REGISTERED', `Registered for ${courseCode}. Waiting for the manager.`, { enrollment: rows[0] });
  } catch (err) {
    if (replyDbRule(res, err)) return;
    throw err;
  }
}));

courses.patch('/api/enrollments/:id', roles('ADMIN','MANAGER'), route(async (req, res) => {
  const { status } = req.body ?? {};
  if (!['Approved', 'Rejected'].includes(status) || !/^\d+$/.test(req.params.id)) {
    return reply(res, 400, 'BAD_REQUEST', 'Enter a registration ID and an Approved or Rejected status.');
  }
  const { rows } = await transaction(async (db) => {
    const result = await db.query(
      "UPDATE enrollments SET status = $2 WHERE enrollment_id = $1 AND status = 'Pending' AND semester = $3 RETURNING *",
      [req.params.id, status, CURRENT_SEMESTER]);
    if (result.rowCount) await audit(req.user, 'ENROLLMENT_DECIDED', req.params.id + ': ' + status, db);
    return result;
  });
  if (!rows.length) return reply(res, 409, 'NOT_PENDING', 'This registration is no longer pending.');
  return reply(res, 200, status.toUpperCase(), 'Registration is ' + status + '.', { enrollment: rows[0] });
}));

courses.delete('/api/enrollments/:id', roles('STUDENT'), route(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return reply(res, 400, 'BAD_REQUEST', 'Invalid registration ID.');
  const { rows } = await transaction(async (db) => {
    const result = await db.query(
      "DELETE FROM enrollments WHERE enrollment_id = $1 AND student_id = $2 AND semester = $3 AND status = 'Pending' RETURNING *",
      [req.params.id, req.user.studentId, CURRENT_SEMESTER]);
    if (result.rowCount) await audit(req.user, 'ENROLLMENT_CANCELLED', result.rows[0].course_code, db);
    return result;
  });
  if (!rows.length) return reply(res, 404, 'NOT_FOUND', 'Pending registration not found.');
  return reply(res, 200, 'CANCELLED', 'Registration cancelled.');
}));
