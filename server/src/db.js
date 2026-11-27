// Connection to PostgreSQL.
// The settings come from the .env file (see .env.example).
import pg from 'pg';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

// Return dates and times exactly as stored ("2026-11-02 18:05:00"),
// without moving them to another time zone.
pg.types.setTypeParser(1114, (v) => v); // TIMESTAMP
pg.types.setTypeParser(1082, (v) => v); // DATE

const connectionString = process.env.DATABASE_URL;
const schema = process.env.PGSCHEMA;
if (schema && !/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid PGSCHEMA.');
const ca = process.env.SUPABASE_CA_CERT ||
  (process.env.PGSSLROOTCERT ? readFileSync(process.env.PGSSLROOTCERT, 'utf8') : undefined);
if (ca && connectionString && /[?&](sslmode|sslrootcert|sslcert|sslkey)=/i.test(connectionString)) {
  throw new Error('Remove SSL options from DATABASE_URL when configuring a separate CA certificate.');
}
export const pool = new pg.Pool({
  ...(connectionString ? { connectionString } : {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'kbtu_ums',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  }),
  connectionTimeoutMillis: 7000,
  max: Number(process.env.PGPOOL_MAX || 8),
  ...(schema ? { onConnect: (client) => client.query('SET search_path = ' + schema) } : {}),
  ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
});

// PostgreSQL error codes we turn into clear answers
export const PG = {
  UNIQUE: '23505', // same student, lesson and hour twice
  FOREIGN_KEY: '23503', // student or lesson does not exist
  CHECK: '23514', // a CHECK rule or our hour trigger said no
};
