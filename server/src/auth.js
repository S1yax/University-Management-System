import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import { pool } from './db.js';
import { reply, route } from './http.js';

const scrypt = promisify(derive);
const dummyHash = '0'.repeat(32) + ':' + '0'.repeat(128);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const parseToken = (req) => /^Bearer ([a-f0-9]{64})$/.exec(req.get('Authorization') || '')?.[1];
const attempts = new Map();

export const validPassword = (value) => typeof value === 'string' && value.length >= 12 && value.length <= 128;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}

async function matches(password, hash) {
  const [salt, expected] = (hash || dummyHash).split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && !!hash;
}

export const publicUser = (row) => ({
  id: row.id, username: row.username, fullName: row.full_name, role: row.role,
  email: row.email, studentId: row.student_id, teacherId: row.teacher_id,
  major: row.major, year: row.year, department: row.department, phone: row.phone, passwordChangeRequired: row.must_change === true,
});

export const audit = (user, action, details, db = pool) => db.query(
  'INSERT INTO portal_audit (username, role, action, details) VALUES ($1, $2, $3, $4)',
  [user.username, user.role, action, details]
);

export const authenticate = route(async (req, res, next) => {
  const token = parseToken(req);
  if (!token) return reply(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
  const { rows } = await pool.query(
    `SELECT u.*, p.phone, c.must_change FROM portal_sessions ps JOIN portal_users u USING (username)
     JOIN portal_credentials c USING (username)
     LEFT JOIN portal_profiles p ON p.username = u.username
     WHERE ps.token_hash = $1 AND ps.expires_at > now() LIMIT 2`, [digest(token)]);
  if (rows.length !== 1) return reply(res, 401, 'SIGN_IN_REQUIRED', 'Your session has expired.');
  req.user = publicUser(rows[0]);
  req.sessionHash = digest(token);
  next();
});

export const deny = (res) => reply(res, 403, 'FORBIDDEN', 'You do not have access to this resource.');
export const roles = (...allowed) => (req, res, next) => allowed.includes(req.user.role) ? next() : deny(res);
export const ownStudent = (req, res, next) => {
  if (req.user.role === 'STUDENT' && [req.query.studentId, req.body?.studentId].some((id) => id !== undefined && id !== req.user.studentId)) return deny(res);
  next();
};

export function assignedCourse(req, res, next) {
  return route(async (request, response) => {
    const course = request.query.courseCode ?? request.body?.courseCode;
    const result = await pool.query('SELECT 1 FROM courses WHERE course_code = $1 AND teacher_id = $2', [course, request.user.teacherId]);
    if (!result.rowCount) return deny(response);
    next();
  })(req, res, next);
}

export function assignedSession(req, res, next) {
  return route(async (request, response) => {
    const session = request.params.id ?? request.query.sessionId ?? request.body?.sessionId;
    const result = await pool.query(
      'SELECT 1 FROM class_sessions cs JOIN courses c USING (course_code) WHERE cs.session_id = $1 AND c.teacher_id = $2',
      [session, request.user.teacherId]);
    if (!result.rowCount) return deny(response);
    next();
  })(req, res, next);
}

export const auth = Router();
if (process.env.NODE_ENV !== 'production' && process.env.SHOW_DEMO_ACCOUNTS === 'true') {
  auth.get('/api/auth/demo-accounts', route(async (_req, res) => {
    const { rows } = await pool.query('SELECT id, username, full_name AS "fullName", role FROM portal_users ORDER BY role DESC, username');
    res.json({ users: rows });
  }));
}
auth.post('/api/auth/login', route(async (req, res) => {
  const { username, password, remember } = req.body ?? {};
  if (typeof username !== 'string' || username.length > 100 || typeof password !== 'string' || !password.length || password.length > 128) {
    return reply(res, 400, 'BAD_REQUEST', 'Enter your username and password.');
  }
  const name = username.trim().toLowerCase();
  const now = Date.now();
  for (const [key, attempt] of attempts) if (attempt.until <= now) attempts.delete(key);
  const key = req.ip;
  const attempt = attempts.get(key) || { count: 0, until: now + 60_000 };
  if (attempt.count >= 30 || (!attempts.has(key) && attempts.size >= 10_000)) {
    return reply(res, 429, 'TRY_LATER', 'Too many sign-in attempts. Try again in one minute.');
  }
  attempt.count++;
  attempts.set(key, attempt);
  const { rows } = await pool.query(
    `SELECT u.*, c.password_hash, c.must_change FROM portal_users u JOIN portal_credentials c USING (username)
     WHERE u.username = $1 LIMIT 2`, [name]);
  const row = rows.length === 1 ? rows[0] : null;
  if (!await matches(password, row?.password_hash)) return reply(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  attempt.count--;
  const token = randomBytes(32).toString('hex');
  const user = publicUser(row);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM portal_sessions WHERE expires_at <= now() AND username = $1', [name]);
    const inserted = await client.query(
      `INSERT INTO portal_sessions (token_hash, username, expires_at)
       SELECT $1, username, now() + $3::interval FROM portal_credentials WHERE username = $2 AND password_hash = $4`,
      [digest(token), name, remember === true ? '7 days' : '8 hours', row.password_hash]
    );
    if (!inserted.rowCount) {
      await client.query('ROLLBACK');
      return reply(res, 409, 'PASSWORD_CHANGED', 'Sign in again with the current password.');
    }
    await audit(user, 'LOGIN_SUCCESS', 'Signed in to the portal', client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  res.json({ user, token });
}));

auth.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));
auth.post('/api/auth/logout', authenticate, route(async (req, res) => {
  await pool.query('DELETE FROM portal_sessions WHERE token_hash = $1', [req.sessionHash]);
  await audit(req.user, 'LOGOUT', 'Signed out of the portal');
  res.json({ ok: true });
}));

auth.put('/api/auth/password', authenticate, route(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!validPassword(newPassword) || typeof currentPassword !== 'string' || currentPassword.length > 128 || currentPassword === newPassword) {
    return reply(res, 400, 'BAD_PASSWORD', 'Choose a different password of 12 to 128 characters.');
  }
  const { rows: [row] } = await pool.query('SELECT password_hash FROM portal_credentials WHERE username = $1', [req.user.username]);
  if (!await matches(currentPassword, row?.password_hash)) return reply(res, 400, 'BAD_PASSWORD', 'Current password is incorrect.');
  const hash = await hashPassword(newPassword);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query('UPDATE portal_credentials SET password_hash = $1, must_change = false WHERE username = $2 AND password_hash = $3',
      [hash, req.user.username, row.password_hash]);
    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return reply(res, 409, 'PASSWORD_CHANGED', 'Sign in again and retry.');
    }
    await client.query('DELETE FROM portal_sessions WHERE username = $1 AND token_hash <> $2', [req.user.username, req.sessionHash]);
    await audit(req.user, 'PASSWORD_CHANGED', 'Changed portal password', client);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));
