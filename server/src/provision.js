// Read a chosen password from standard input. Never put it in an argument or a log.
import { pool } from './db.js';
import { hashPassword, validPassword } from './auth.js';

const name = process.argv[2]?.toLowerCase();
const reset = process.argv.includes('--reset');
try {
  if (!name) throw new Error('Usage: node src/provision.js <username> [--reset], with password on stdin');
  const { rows } = await pool.query('SELECT username FROM portal_users WHERE username = $1 LIMIT 2', [name]);
  if (rows.length !== 1) throw new Error('Username must identify exactly one academic or staff account.');
  const chunks = [];
  for await (const bytes of process.stdin) chunks.push(bytes);
  const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  if (!validPassword(password)) throw new Error('Password must be 12 to 128 characters.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO portal_credentials (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) ' +
      (reset ? 'DO UPDATE SET password_hash = EXCLUDED.password_hash' : 'DO NOTHING'),
      [name, await hashPassword(password)]);
    if (reset) await client.query('DELETE FROM portal_sessions WHERE username = $1', [name]);
    await client.query('COMMIT');
    console.log(result.rowCount ? 'Portal credentials configured.' : 'Portal credentials already exist.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(error.code ? 'Database operation failed (' + error.code + ').' : error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
