import { Router } from 'express';
import { roles } from '../auth.js';
import { pool } from '../db.js';
import { CURRENT_SEMESTER, SHOW_DEMO_CONTENT, reply, route } from '../http.js';

export const timetable = Router();
const studentOnly = roles('STUDENT');
const kinds = ['SIS', 'TSIS', 'Assignment', 'Quiz', 'Other'];

timetable.get('/api/timetable/tasks', studentOnly, route(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id::text, course_code AS "courseCode", title, kind, due_at AS "dueAt",
            completed_at AS "completedAt", (demo_key IS NOT NULL) AS demo
       FROM portal_timetable_student_tasks
      WHERE student_id = $1 AND semester = $2 AND ($3::boolean OR demo_key IS NULL)
      ORDER BY due_at, id`,
    [req.user.studentId, CURRENT_SEMESTER, SHOW_DEMO_CONTENT]
  );
  res.json({ semester: CURRENT_SEMESTER, tasks: rows });
}));

timetable.post('/api/timetable/tasks', studentOnly, route(async (req, res) => {
  const { title, kind, dueLocal, courseCode = null } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120 || !kinds.includes(kind) ||
      typeof dueLocal !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dueLocal) ||
      (courseCode !== null && typeof courseCode !== 'string')) {
    return reply(res, 400, 'BAD_REQUEST', 'Enter a title, task type and valid deadline.');
  }
  try {
    const saved = await pool.query(
      `INSERT INTO portal_timetable_tasks (owner_id, course_code, semester, title, kind, due_at)
       SELECT $1::varchar, $2::varchar, $3::varchar, $4::text, $5::text, $6::timestamp AT TIME ZONE 'Asia/Almaty'
       WHERE $2::varchar IS NULL OR EXISTS (
           SELECT 1 FROM enrollments WHERE student_id = $1 AND course_code = $2 AND semester = $3 AND status = 'Approved'
       )
       RETURNING id::text`,
      [req.user.studentId, courseCode, CURRENT_SEMESTER, title.trim(), kind, dueLocal]
    );
    if (!saved.rowCount) return reply(res, 403, 'COURSE_UNAVAILABLE', 'Choose a course you are enrolled in.');
    res.status(201).json({ id: saved.rows[0].id });
  } catch (error) {
    if (['22007', '22008'].includes(error.code)) return reply(res, 400, 'BAD_DEADLINE', 'Enter a valid date and time.');
    throw error;
  }
}));

timetable.patch('/api/timetable/tasks/:id', studentOnly, route(async (req, res) => {
  const id = req.params.id;
  const { completed } = req.body ?? {};
  if (!/^\d{1,18}$/.test(id) || typeof completed !== 'boolean') {
    return reply(res, 400, 'BAD_REQUEST', 'Choose a task and completion status.');
  }
  const args = [id, req.user.studentId, CURRENT_SEMESTER, SHOW_DEMO_CONTENT];
  const visible = `SELECT id, student_id FROM portal_timetable_student_tasks
       WHERE id = $1 AND student_id = $2 AND semester = $3 AND ($4::boolean OR demo_key IS NULL)`;
  const change = completed
    ? `INSERT INTO portal_timetable_progress (task_id, student_id)
       SELECT id, student_id FROM visible ON CONFLICT DO NOTHING RETURNING task_id`
    : `DELETE FROM portal_timetable_progress p USING visible v
       WHERE (p.task_id, p.student_id) = (v.id, v.student_id) RETURNING p.task_id`;
  const { rows } = await pool.query(
    `WITH visible AS (${visible}), changed AS (${change})
       SELECT EXISTS (SELECT 1 FROM visible) AS allowed`, args
  );
  if (!rows[0].allowed) return reply(res, 404, 'NOT_FOUND', 'Task unavailable.');
  res.json({ completed });
}));

timetable.post('/api/timetable/reminders', studentOnly, route(async (req, res) => {
  const result = await pool.query(
    `WITH due AS (
       SELECT id, title, course_code, due_at, demo_key, due_at < now() AS overdue
       FROM portal_timetable_student_tasks
       WHERE student_id = $1 AND semester = $2 AND ($4::boolean OR demo_key IS NULL)
         AND completed_at IS NULL AND due_at BETWEEN now() - interval '7 days' AND now() + interval '24 hours'
     ), reminders AS (
       SELECT *, 'timetable-' || id || CASE WHEN overdue THEN '-overdue' ELSE '-upcoming' END AS reminder_key
       FROM due
     )
     INSERT INTO portal_notifications (recipient, sender, subject, message, timetable_key, demo_key)
     SELECT $3, 'Smart Timetable',
       CASE WHEN overdue THEN 'Overdue · ' ELSE 'Due within 24 hours · ' END || title,
       coalesce(course_code || ' · ', '') || 'Deadline: ' ||
       to_char(due_at AT TIME ZONE 'Asia/Almaty', 'DD Mon YYYY, HH24:MI') || ' (Almaty time)',
       reminder_key, CASE WHEN demo_key IS NOT NULL THEN reminder_key END
     FROM reminders ON CONFLICT DO NOTHING`,
    [req.user.studentId, CURRENT_SEMESTER, req.user.username, SHOW_DEMO_CONTENT]
  );
  res.json({ created: result.rowCount });
}));
