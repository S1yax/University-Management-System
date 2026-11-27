import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';

export async function fixture({ origin } = {}) {
  if (origin) process.env.CORS_ORIGIN = origin;
  const schema = 'ums_qa_' + randomBytes(8).toString('hex');
  process.env.PGSCHEMA = schema;
  process.env.ALLOW_DEMO_TIME = 'true';
  process.env.SHOW_DEMO_ACCOUNTS = 'true';
  delete process.env.NODE_ENV;
  const { pool } = await import('../src/db.js');
  const { app } = await import('../src/app.js');
  const { hashPassword } = await import('../src/auth.js');
  const password = randomBytes(24).toString('base64url');
  const tokens = new Map();
  let server;
  let created = false;
  let base;
  const closeServer = async () => {
    if (!server) return;
    const current = server;
    const closed = once(current, 'close');
    current.close();
    current.closeAllConnections();
    await closed;
    server = null;
  };
  const close = async () => {
    await closeServer();
    try {
      if (created) await pool.query('DROP SCHEMA ' + schema + ' CASCADE');
    } finally {
      await pool.end();
    }
  };
  const start = async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port + '/api';
  };
  const call = async (method, path, body, token) => {
    const response = await fetch(base + path, {
      method, signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { code: response.status, body: await response.json() };
  };
  const login = (username) => call('POST', '/auth/login', { username, password });
  const request = async (method, path, body, username) => {
    if (username && !tokens.has(username)) {
      const res = await login(username);
      if (res.code !== 200) throw new Error('Fixture sign-in failed: ' + username);
      tokens.set(username, res.body.token);
    }
    return call(method, path, body, tokens.get(username));
  };
  try {
    await pool.query('CREATE SCHEMA ' + schema);
    created = true;
    const active = await pool.query('SELECT current_schema() AS name');
    if (active.rows[0].name !== schema) throw new Error('Test schema could not be isolated. Use a session pool or direct connection.');
    for (const file of ['01_schema.sql','02_seed.sql','03_dashboards.sql','migrations/06_portal.sql','migrations/07_registration.sql','migrations/08_protect_legacy_credentials.sql']) {
      await pool.query(await readFile(new URL('../../database/' + file, import.meta.url), 'utf8'));
    }
    await pool.query('INSERT INTO portal_credentials (username, password_hash) SELECT username, $1 FROM portal_users', [await hashPassword(password)]);
    await start();
    return { pool, request, call, login, close, base, password, restart: async () => { await closeServer(); await start(); } };
  } catch (error) {
    await close();
    throw error;
  }
}
