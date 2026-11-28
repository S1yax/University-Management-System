import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import { pool } from './db.js';
import { reply, route } from './http.js';
import { pbkdf2 } from 'node:crypto';
import { transaction } from './transaction.js';
import {
  checkPassword,
  isPasswordExpired
} from './passwordPolicy.js';

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

const derivePassword = promisify(pbkdf2);
const PASSWORD_ITERATIONS = 210000;

export async function hashDatabasePassword(password) {
  const salt = randomBytes(16).toString('base64');

  const hash = await derivePassword(
    password,
    Buffer.from(salt, 'base64'),
    PASSWORD_ITERATIONS,
    32,
    'sha256'
  );

  return {
    hash: hash.toString('base64'),
    salt,
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyDatabasePassword(password, row) {
  if (!row?.password_hash || !row.salt || !row.iterations) {
    return false;
  }

  const calculated = await derivePassword(
    password,
    Buffer.from(row.salt, 'base64'),
    row.iterations,
    32,
    'sha256'
  );

  const expected = Buffer.from(row.password_hash, 'base64');

  return calculated.length === expected.length &&
    timingSafeEqual(calculated, expected);
}

export async function saveDatabasePassword(
  db,
  username,
  password
) {
  const result = await hashDatabasePassword(password);

  await db.query(
    'SELECT set_password($1, $2, $3, $4)',
    [
      username,
      result.hash,
      result.salt,
      result.iterations
    ]
  );
}

export async function ensureDatabaseAccount(db, username) {
  await db.query(
    `INSERT INTO user_credentials
       (username, role, student_id, teacher_id)
     SELECT username, role, student_id, teacher_id
     FROM portal_users
     WHERE username = $1
     ON CONFLICT (username)
     DO UPDATE SET
       role = EXCLUDED.role,
       student_id = EXCLUDED.student_id,
       teacher_id = EXCLUDED.teacher_id`,
    [username]
  );
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

  if (!token) {
    return reply(
      res, 401, 'SIGN_IN_REQUIRED',
      'Sign in to continue.'
    );
  }

  const { rows } = await pool.query(
    `SELECT u.*,
            p.phone,
            c.must_change,
            a.password_changed_at
     FROM portal_sessions ps
     JOIN portal_users u USING (username)
     JOIN portal_credentials c USING (username)
     JOIN user_credentials a USING (username)
     LEFT JOIN portal_profiles p
       ON p.username = u.username
     WHERE ps.token_hash = $1
       AND ps.expires_at > now()
       AND a.password_hash IS NOT NULL
     LIMIT 2`,
    [digest(token)]
  );

  if (rows.length !== 1) {
    return reply(
      res, 401, 'SIGN_IN_REQUIRED',
      'Your session has expired.'
    );
  }

  const row = rows[0];

  row.must_change =
    row.must_change === true ||
    isPasswordExpired(
      row.role,
      row.password_changed_at
    );

  req.user = publicUser(row);
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
const loginHandler = route(async (req, res) => {
  const {
    username,
    login,
    password,
    remember
  } = req.body ?? {};

  const rawUsername = username ?? login;

  if (
    typeof rawUsername !== 'string' ||
    typeof password !== 'string' ||
    !password.length ||
    password.length > 128 ||
    rawUsername.length > 100 ||
    !rawUsername.trim()
  ) {
    return reply(
      res, 400, 'BAD_REQUEST',
      'Enter your username and password.'
    );
  }

  const name = rawUsername.trim().toLowerCase();

  // Additional IP-based rate limiting.
  const now = Date.now();

  for (const [key, value] of attempts) {
    if (value.until <= now) attempts.delete(key);
  }

  const key = req.ip;
  const attempt = attempts.get(key) || {
    count: 0,
    until: now + 60000
  };

  if (
    attempt.count >= 30 ||
    (!attempts.has(key) && attempts.size >= 10000)
  ) {
    return reply(
      res, 429, 'TRY_LATER',
      'Too many sign-in attempts.'
    );
  }

  attempt.count++;
  attempts.set(key, attempt);

  const result = await transaction(async (db) => {
    const { rows } = await db.query(
      `SELECT u.*,
              c.password_hash,
              c.salt,
              c.iterations,
              c.password_changed_at,
              p.password_hash AS legacy_hash,
              p.must_change,
              GREATEST(
                CEIL(EXTRACT(EPOCH FROM
                  (c.locked_until - LOCALTIMESTAMP)
                )), 0
              )::int AS lock_left
       FROM user_credentials c
       JOIN portal_users u USING (username)
       LEFT JOIN portal_credentials p USING (username)
       WHERE c.username = $1
       FOR UPDATE OF c`,
      [name]
    );

    const row = rows[0];

    if (!row) {
      await matches(password, null);

      return {
        code: 401,
        status: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.'
      };
    }

    if (row.lock_left > 0) {
      return {
        code: 423,
        status: 'LOCKED',
        message: `Try again in ${row.lock_left} seconds.`,
        retryAfterSeconds: row.lock_left
      };
    }

    // Existing database password or verified legacy password.
    const correct = row.password_hash
      ? await verifyDatabasePassword(password, row)
      : await matches(password, row.legacy_hash);

    if (!correct) {
      const { rows: failed } = await db.query(
        'SELECT * FROM login_failed($1)',
        [name]
      );

      const account = failed[0];

      if (account?.locked_until && account.failed_attempts >= 5) {
        return {
          code: 423,
          status: 'LOCKED',
          message: 'Account locked for 30 seconds.',
          retryAfterSeconds: 30
        };
      }

      return {
        code: 401,
        status: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.'
      };
    }

    // Migrate only after verifying the existing password.
    if (!row.password_hash) {
      await saveDatabasePassword(db, name, password);
      row.password_changed_at = new Date();
    }

    await db.query('SELECT login_ok($1)', [name]);

    const token = randomBytes(32).toString('hex');

    row.must_change =
      row.must_change === true ||
      isPasswordExpired(
        row.role,
        row.password_changed_at
      );

    const user = publicUser(row);

    // portal_sessions currently references portal_credentials.
    // Preserve this account row for session compatibility.
    if (!row.legacy_hash) {
      await db.query(
        `INSERT INTO portal_credentials
           (username, password_hash, must_change)
         VALUES ($1, $2, false)
         ON CONFLICT (username) DO NOTHING`,
        [name, await hashPassword(password)]
      );
    }

    await db.query(
      `DELETE FROM portal_sessions
       WHERE username = $1 AND expires_at <= now()`,
      [name]
    );

    await db.query(
      `INSERT INTO portal_sessions
         (token_hash, username, expires_at)
       VALUES ($1, $2, now() + $3::interval)`,
      [
        digest(token),
        name,
        remember === true ? '7 days' : '8 hours'
      ]
    );

    await audit(
      user,
      'LOGIN_SUCCESS',
      'Signed in to the portal',
      db
    );

    return { code: 200, user, token };
  });

  if (result.code !== 200) {
    const {
      code,
      status,
      message,
      ...extra
    } = result;

    return reply(res, code, status, message, extra);
  }

  attempt.count--;

  return res.json({
    user: result.user,
    token: result.token,
    mustChangePassword: result.user.passwordChangeRequired
  });
});

auth.post('/api/auth/login', loginHandler);
auth.post('/api/login', loginHandler);

auth.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));
auth.post('/api/auth/logout', authenticate, route(async (req, res) => {
  await pool.query('DELETE FROM portal_sessions WHERE token_hash = $1', [req.sessionHash]);
  await audit(req.user, 'LOGOUT', 'Signed out of the portal');
  res.json({ ok: true });
}));

const changePasswordHandler = route(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};

  if (
  typeof currentPassword !== 'string' ||
  typeof newPassword !== 'string' ||
  currentPassword.length > 128 ||
  newPassword.length > 20
) {
    return reply(
      res, 400, 'BAD_REQUEST',
      'Current and new passwords are required.'
    );
  }

  const result = await transaction(async (db) => {
    const { rows: [account] } = await db.query(
      `SELECT * FROM user_credentials
       WHERE username = $1
       FOR UPDATE`,
      [req.user.username]
    );

    if (!await verifyDatabasePassword(currentPassword, account)) {
      return {
        code: 403,
        status: 'WRONG_PASSWORD',
        message: 'Current password is incorrect.'
      };
    }

    const errors = checkPassword(
      newPassword,
      req.user,
      currentPassword
    );

    if (errors.length) {
      return {
        code: 400,
        status: 'WEAK_PASSWORD',
        message: errors[0],
        errors
      };
    }

    const { rows: history } = await db.query(
      `SELECT password_hash, salt, iterations
       FROM password_history
       WHERE username = $1
       ORDER BY history_id DESC
       LIMIT 2`,
      [req.user.username]
    );

    for (const oldPassword of [account, ...history]) {
      if (await verifyDatabasePassword(newPassword, oldPassword)) {
        return {
          code: 400,
          status: 'PASSWORD_REUSED',
          message: 'You cannot reuse one of your last 3 passwords.'
        };
      }
    }

    await saveDatabasePassword(
      db,
      req.user.username,
      newPassword
    );

    await db.query(
      `UPDATE portal_credentials
       SET password_hash = $2, must_change = false
       WHERE username = $1`,
      [
        req.user.username,
        await hashPassword(newPassword)
      ]
    );

    await db.query(
      `DELETE FROM portal_sessions
       WHERE username = $1
       AND token_hash <> $2`,
      [req.user.username, req.sessionHash]
    );

    await audit(
      req.user,
      'PASSWORD_CHANGED',
      'Changed portal password',
      db
    );

    return { code: 200 };
  });

  if (result.code !== 200) {
    const {
      code,
      status,
      message,
      ...extra
    } = result;

    return reply(res, code, status, message, extra);
  }

  return res.json({
    ok: true,
    message: 'Password changed successfully.'
  });
});

auth.put(
  '/api/auth/password',
  authenticate,
  changePasswordHandler
);

auth.post(
  '/api/change-password',
  authenticate,
  changePasswordHandler
);
