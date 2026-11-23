// Small helpers shared by all route files.
import { PG } from './db.js';

/** One answer format for the whole API: { status, message, ...extra } */
export const reply = (res, code, status, message, extra = {}) =>
  res.status(code).json({ status, message, ...extra });

/** Wraps an async handler so a database error goes to the error handler in app.js */
export const route = (fn) => (req, res, next) => fn(req, res).catch(next);

export const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** The semester the website works with. Change it in .env when a new semester starts. */
export const CURRENT_SEMESTER = process.env.CURRENT_SEMESTER || 'Fall 2026';

/**
 * Turns a database rule error into a clear answer for the website.
 * Returns true when it answered, false when the error is unknown (then: 500).
 * Our own codes are raised in database/01_schema.sql.
 */
export function replyDbRule(res, err) {
  const answers = {
    UMS01: [409, 'COURSE_FULL'],
    UMS02: [409, 'CREDIT_LIMIT'],
    UMS03: [409, 'TIME_CLASH'],
    UMS05: [403, 'NOT_APPROVED'],
    [PG.UNIQUE]: [409, 'ALREADY_REGISTERED'],
    [PG.FOREIGN_KEY]: [404, 'NOT_FOUND'],
    [PG.CHECK]: [400, 'BAD_VALUE'],
  };
  const a = answers[err.code];
  if (!a) return false;
  // err.message of our own rules is written for people; for the others give a short text
  const message = err.code.startsWith('UMS') ? err.message
    : err.code === PG.UNIQUE ? 'The student is already registered for this course in this semester.'
      : err.code === PG.FOREIGN_KEY ? 'The student or the course does not exist.'
        : `A value breaks a database rule (${err.constraint || 'CHECK'}).`;
  reply(res, a[0], a[1], message);
  return true;
}
