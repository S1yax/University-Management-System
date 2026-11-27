// Starts the server: npm start
import { app } from './app.js';
import { pool } from './db.js';

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

try {
  const { rows } = await pool.query('SELECT current_database() AS db, count(*) FROM portal_users');
  console.log(`Connected to PostgreSQL database "${rows[0].db}"`);
} catch (err) {
  console.error('Database startup check failed. Check connection settings and migrations:', err.code || err.name);
  process.exit(1);
}

app.listen(PORT, HOST, () => {
  console.log(`KBTU UMS server: http://localhost:${PORT}/api/health`);
});
