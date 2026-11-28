// Used by bootstrap.ps1. Passwords travel over redirected process pipes to the OS vault.
import { randomBytes } from 'node:crypto';
import { pool } from './db.js';
import {
  hashPassword,
  ensureDatabaseAccount,
  saveDatabasePassword
} from './auth.js';
import { transaction } from './transaction.js';

try {
  if (process.env.UMS_BOOTSTRAP_PIPE !== 'windows-dpapi' || process.stdout.isTTY) throw new Error('Use scripts/bootstrap.ps1.');
  const { rows } = await pool.query(`SELECT username, role FROM portal_users u
    WHERE NOT EXISTS (SELECT 1 FROM portal_credentials c WHERE c.username = u.username) ORDER BY username`);
  if (new Set(rows.map((row) => row.username)).size !== rows.length) throw new Error('Duplicate university usernames.');
  const prepared = [];
  for (const row of rows) {
    const password = randomBytes(24).toString('base64url');
    prepared.push({ ...row, password, hash: await hashPassword(password) });
  }
  // The parent writes the encrypted pending vault before confirming the database change.
  process.stdout.write(JSON.stringify(prepared.map(({ hash: _hash, ...row }) => row)) + '\n');
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  if (Buffer.concat(chunks).toString('utf8').trim() !== 'commit') throw new Error('Vault confirmation missing.');
  await transaction(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(391206)');
    for (const { username, hash, password } of prepared) {
      await db.query('INSERT INTO portal_credentials (username,password_hash,must_change) VALUES ($1,$2,true)', [username, hash]);
      await ensureDatabaseAccount(db, username);
      await saveDatabasePassword(db, username, password);
    }
  });
} catch (error) {
  console.error(error.code ? 'Account setup failed (' + error.code + ').' : error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
