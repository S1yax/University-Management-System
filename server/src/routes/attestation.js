// Attestation (1st, 2nd attestation and the final exam).
//   GET /api/attestation?studentId=...&courseCode=...   points, admission, total and letter grade
//   PUT /api/attestation                                the teacher saves points:
//       { studentId, courseCode, semester?, attestation1?, attestation2?, finalExam?, teacher }
//       Only the fields that are sent are changed. null clears a field.
import { Router } from 'express';
import { pool, PG } from '../db.js';
import { reply, route, replyDbRule, isNumber, CURRENT_SEMESTER } from '../http.js';

export const attestation = Router();

const num = (v) => (v === null || v === undefined ? v : Number(v));

attestation.get('/api/attestation', route(async (req, res) => {
  const { studentId, courseCode, semester = CURRENT_SEMESTER } = req.query;
  if (!studentId && !courseCode) return reply(res, 400, 'BAD_REQUEST', 'studentId or courseCode is required.');
  const { rows } = await pool.query(
    `SELECT student_id, full_name, course_code, title, ects_credits,
            attestation_1, attestation_2, rating, admitted, final_exam, total, letter, max_possible,
            updated_by, to_char(updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at
     FROM v_attestation
     WHERE semester = $3
       AND ($1::varchar IS NULL OR student_id = $1)
       AND ($2::varchar IS NULL OR course_code = $2)`,
    [studentId || null, courseCode || null, semester]
  );
  // NUMERIC comes from pg as text; the website wants numbers
  const items = rows.map((r) => ({
    ...r,
    attestation_1: num(r.attestation_1), attestation_2: num(r.attestation_2), rating: num(r.rating),
    final_exam: num(r.final_exam), total: num(r.total), max_possible: num(r.max_possible),
  }));
  res.json({ semester, items });
}));

attestation.put('/api/attestation', route(async (req, res) => {
  const b = req.body ?? {};
  const { studentId, courseCode, semester = CURRENT_SEMESTER, teacher } = b;
  if (!studentId || !courseCode) return reply(res, 400, 'BAD_REQUEST', 'studentId and courseCode are required.');
  const fields = { attestation_1: b.attestation1, attestation_2: b.attestation2, final_exam: b.finalExam };
  const sent = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (sent.length === 0) return reply(res, 400, 'BAD_REQUEST', 'Send attestation1, attestation2 or finalExam.');
  if (sent.some(([, v]) => v !== null && !isNumber(v))) return reply(res, 400, 'BAD_REQUEST', 'Points must be numbers.');

  // Change only the sent fields of the existing row; insert a new row when there is none.
  // (Not INSERT ... ON CONFLICT: PostgreSQL checks the CHECK rules on the new row first,
  //  so "only the final exam" would always break chk_admitted_to_final.)
  const cols = sent.map(([k]) => k);
  const values = sent.map(([, v]) => v);
  const who = teacher || 'Teacher';
  try {
    const updated = await pool.query(
      `UPDATE attestation SET ${cols.map((c, i) => `${c} = $${i + 4}`).join(', ')},
              updated_by = $${cols.length + 4}, updated_at = LOCALTIMESTAMP(0)
       WHERE student_id = $1 AND course_code = $2 AND semester = $3`,
      [studentId, courseCode, semester, ...values, who]
    );
    if (updated.rowCount === 0) {
      await pool.query(
        `INSERT INTO attestation (student_id, course_code, semester, ${cols.join(', ')}, updated_by)
         VALUES ($1, $2, $3, ${cols.map((_, i) => `$${i + 4}`).join(', ')}, $${cols.length + 4})`,
        [studentId, courseCode, semester, ...values, who]
      );
    }
  } catch (err) {
    if (err.code === PG.FOREIGN_KEY) {
      return reply(res, 404, 'NOT_REGISTERED', `Student ${studentId} is not registered for ${courseCode} in ${semester}.`);
    }
    if (err.constraint === 'chk_admitted_to_final') {
      return reply(res, 400, 'NOT_ADMITTED', 'The final exam needs at least 30 points for the two attestations.');
    }
    if (replyDbRule(res, err)) return;
    throw err;
  }
  const { rows } = await pool.query(
    `SELECT attestation_1, attestation_2, rating, admitted, final_exam, total, letter, max_possible
     FROM v_attestation WHERE student_id = $1 AND course_code = $2 AND semester = $3`,
    [studentId, courseCode, semester]
  );
  const r = rows[0];
  return reply(res, 200, 'SAVED', `Points saved for ${studentId} in ${courseCode}.`, {
    item: { ...r, attestation_1: num(r.attestation_1), attestation_2: num(r.attestation_2), rating: num(r.rating),
            final_exam: num(r.final_exam), total: num(r.total), max_possible: num(r.max_possible) },
  });
}));
