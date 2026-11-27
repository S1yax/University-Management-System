// The PowerShell parent stores the raw codes in the Windows user vault.
import { createHash, randomBytes } from 'node:crypto';
import { pool } from './db.js';
import { audit } from './auth.js';
import { transaction } from './transaction.js';

const pending = `SELECT u.username, u.role FROM portal_users u JOIN portal_credentials c USING (username)
                 WHERE c.must_change ORDER BY u.username`;
try {
  if (process.env.UMS_ACTIVATION_VAULT !== 'windows-dpapi' || process.stdout.isTTY) throw new Error('Use scripts/bootstrap.ps1 -Activation.');
  const { rows } = await pool.query(pending);
  if (!rows.length || new Set(rows.map((row) => row.username)).size !== rows.length) throw new Error('Expected unique accounts awaiting password setup.');
  const records = rows.map((row) => ({ ...row, token: randomBytes(32).toString('hex') }));
  process.stdout.write(JSON.stringify(records) + '\n');
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  if (Buffer.concat(chunks).toString('utf8').trim() !== 'commit') throw new Error('Vault confirmation missing.');

  await transaction(async (db) => {
    // Serialize reissues and lock credentials against concurrent activation.
    await db.query('SELECT pg_advisory_xact_lock(391206)');
    const locked = await db.query(pending + ' FOR UPDATE OF c');
    if (JSON.stringify(locked.rows) !== JSON.stringify(rows)) throw new Error('Pending accounts changed. Retry issuance.');
    for (const record of records) {
      const tokenHash = createHash('sha256').update(record.token).digest('hex');
      await db.query(`INSERT INTO portal_account_activation (username, token_hash, expires_at)
        VALUES ($1, $2, now() + interval '7 days')
        ON CONFLICT (username) DO UPDATE SET token_hash = excluded.token_hash, expires_at = excluded.expires_at`,
      [record.username, tokenHash]);
    }
    await db.query('DELETE FROM portal_sessions WHERE username = ANY($1)', [rows.map(({ username }) => username)]);
    await audit({ username: 'portal-maintenance', role: 'ADMIN' }, 'ACTIVATION_ISSUED',
      records.length + ' accounts received single-use activation links.', db);
  });
} catch (error) {
  console.error('Activation setup failed: ' + (error.code || error.message));
  process.exitCode = 1;
} finally {
  await pool.end();
}
