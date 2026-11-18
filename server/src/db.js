// Connection to PostgreSQL.
// The settings come from the .env file (see .env.example).
import pg from 'pg';
import 'dotenv/config';

// Return dates and times exactly as stored ("2026-11-02 18:05:00"),
// without moving them to another time zone.
pg.types.setTypeParser(1114, (v) => v); // TIMESTAMP
pg.types.setTypeParser(1082, (v) => v); // DATE

export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'kbtu_ums',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

// PostgreSQL error codes we turn into clear answers
export const PG = {
  UNIQUE: '23505', // same student, lesson and hour twice
  FOREIGN_KEY: '23503', // student or lesson does not exist
  CHECK: '23514', // a CHECK rule or our hour trigger said no
};
