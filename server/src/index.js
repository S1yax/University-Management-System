// Starts the server: npm start
import { app } from './app.js';
import { pool } from './db.js';

const PORT = Number(process.env.PORT || 4000);

try {
  const { rows } = await pool.query('SELECT current_database() AS db');
  console.log(`Connected to PostgreSQL database "${rows[0].db}"`);
} catch (err) {
  console.error('Cannot connect to PostgreSQL. Check the .env file.\n', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`KBTU UMS server: http://localhost:${PORT}/api/health`);
});
