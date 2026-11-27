import { Router } from 'express';
import { roles } from '../auth.js';
import { pool } from '../db.js';
import { CURRENT_SEMESTER, reply, route } from '../http.js';
import { transaction } from '../transaction.js';

export const surveys = Router();

surveys.get('/api/surveys/course-feedback', roles('STUDENT'), route(async (req, res) => {
  const result = await pool.query(
    `SELECT e.course_code AS code, c.title, (p.student_id IS NOT NULL) AS submitted
       FROM enrollments e JOIN courses c USING (course_code)
       LEFT JOIN portal_survey_participation p
         ON (p.student_id, p.course_code, p.semester) = (e.student_id, e.course_code, e.semester)
      WHERE e.student_id = $1 AND e.semester = $2 AND e.status = 'Approved'
      ORDER BY e.course_code`, [req.user.studentId, CURRENT_SEMESTER]
  );
  res.json({ semester: CURRENT_SEMESTER, courses: result.rows });
}));

surveys.post('/api/surveys/course-feedback', roles('STUDENT'), route(async (req, res) => {
  const { courseCode, clarity, materials, workload, feedback = '' } = req.body ?? {};
  const ratings = [clarity, materials, workload];
  if (typeof courseCode !== 'string' || !ratings.every((value) => Number.isInteger(value) && value >= 1 && value <= 5)
      || typeof feedback !== 'string' || feedback.length > 500) {
    return reply(res, 400, 'BAD_REQUEST', 'Choose a course and rate all three questions from 1 to 5.');
  }

  const saved = await transaction(async (db) => {
    const claim = await db.query(
      `INSERT INTO portal_survey_participation (student_id, course_code, semester)
       SELECT student_id, course_code, semester FROM enrollments
        WHERE student_id = $1 AND course_code = $2 AND semester = $3 AND status = 'Approved'
       ON CONFLICT DO NOTHING RETURNING course_code`,
      [req.user.studentId, courseCode, CURRENT_SEMESTER]
    );
    if (!claim.rowCount) return false;
    await db.query(
      `INSERT INTO portal_survey_responses (course_code, semester, clarity, materials, workload, feedback)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [courseCode, CURRENT_SEMESTER, ...ratings, feedback.trim()]
    );
    return true;
  });

  if (!saved) return reply(res, 409, 'SURVEY_UNAVAILABLE', 'This course is unavailable for feedback or has already been reviewed.');
  res.status(201).json({ message: 'Thanks. Your feedback was submitted.' });
}));
