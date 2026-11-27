import { readFile, readdir } from 'node:fs/promises';
import { pool } from './db.js';

const directory = new URL('../../database/migrations/', import.meta.url);
const db = await pool.connect();
try {
  await db.query('SELECT pg_advisory_lock(391207)');
  const files = (await readdir(directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  for (const name of files) {
    await db.query(await readFile(new URL(name, directory), 'utf8'));
    console.log('Applied ' + name);
  }
} catch (error) {
  await db.query('ROLLBACK');
  console.error('Migration failed (' + (error.code || error.name) + ').');
  process.exitCode = 1;
} finally {
  await db.query('SELECT pg_advisory_unlock(391207)');
  db.release();
  await pool.end();
}
