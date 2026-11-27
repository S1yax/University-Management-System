import { Router } from 'express';
import { pool } from '../db.js';
import { audit, hashPassword, roles, validPassword } from '../auth.js';
import { CURRENT_SEMESTER, reply, route } from '../http.js';
import { transaction } from '../transaction.js';

const resources = {
  students: { table: 'students', key: 'student_id', fields: ['username','full_name','email','major','year'], account: true },
  teachers: { table: 'teachers', key: 'teacher_id', fields: ['username','full_name','email','department'], account: true },
  staff: { table: 'portal_staff', key: 'username', fields: ['full_name','email','role'], account: true },
  rooms: { table: 'rooms', key: 'room_id', fields: ['room_number','building','capacity','centroid_lat','centroid_lng','wifi_bssid'] },
  courses: { table: 'courses', key: 'course_code', fields: ['title','credits','ects_credits','faculty','max_places','teacher_id','day_of_week','start_time','end_time','room_id'] },
  sessions: { table: 'class_sessions', key: 'session_id', fields: ['course_code','room_id','session_number','session_date','start_time','end_time','tracked_hours','allowed_campus_radius_m','semester'] },
  events: { table: 'portal_events', key: 'id', fields: ['title','description','starts_at','volunteer'], generated: true },
};
const optional = new Set(['wifi_bssid','ects_credits']);
const integers = new Set(['year','capacity','credits','ects_credits','max_places','day_of_week','session_number','tracked_hours','allowed_campus_radius_m']);

function validate(field, value) {
  if (optional.has(field) && (value === null || value === '')) return null;
  if (integers.has(field)) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 100000
        || (field === 'allowed_campus_radius_m' && value > 10000)) throw new Error(field + ' must be a valid positive integer.');
  } else if (field === 'centroid_lat' || field === 'centroid_lng') {
    if (!Number.isFinite(value) || Math.abs(value) > (field === 'centroid_lat' ? 90 : 180)) throw new Error('Invalid room coordinates.');
  } else if (field === 'volunteer') {
    if (typeof value !== 'boolean') throw new Error('Choose an event type.');
  } else {
    if (typeof value !== 'string' || !value.trim() || value.length > (field === 'description' ? 4000 : 120)) throw new Error(field + ' is required.');
    value = value.trim();
    if (field === 'username' && !/^[a-z0-9_.-]{2,50}$/.test(value)) throw new Error('Use a lowercase username.');
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address.');
    if (field === 'role' && !['MANAGER','ADMIN'].includes(value)) throw new Error('Choose Manager or Admin.');
  }
  return value;
}

export const admin = Router();
admin.use('/api/admin', roles('ADMIN'));

admin.get('/api/admin/volunteers', route(async (_req, res) => {
  const { rows } = await pool.query(`SELECT e.title, r.student_id, s.full_name, r.created_at
    FROM portal_event_registrations r JOIN portal_events e ON e.id = r.event_id
    JOIN students s USING (student_id) WHERE e.volunteer ORDER BY r.created_at DESC`);
  res.json({ rows });
}));

admin.get('/api/admin/:resource', route(async (req, res) => {
  const spec = Object.hasOwn(resources, req.params.resource) ? resources[req.params.resource] : null;
  if (!spec) return reply(res, 404, 'NOT_FOUND', 'Unknown resource.');
  const { rows } = await pool.query('SELECT ' + [spec.key, ...spec.fields].join(',') + ' FROM ' + spec.table + ' ORDER BY ' + spec.key);
  res.json({ rows });
}));

admin.post('/api/admin/:resource', route(writeResource));
admin.patch('/api/admin/:resource/:id', route(writeResource));
admin.delete('/api/admin/:resource/:id', route(writeResource));

async function writeResource(req, res) {
  const { resource, id } = req.params;
  const spec = Object.hasOwn(resources, resource) ? resources[resource] : null;
  if (!spec) return reply(res, 404, 'NOT_FOUND', 'Unknown resource.');
  const create = req.method === 'POST';
  const remove = req.method === 'DELETE';
  const body = req.body ?? {};
  const fields = create && !spec.generated ? [spec.key, ...spec.fields] : spec.fields.filter((field) => field in body);
  const editable = fields;
  const defaults = { semester: CURRENT_SEMESTER };
  let values = [];
  if (!remove) {
    try {
      if (!editable.length && !(spec.account && body.password)) throw new Error('Enter at least one change.');
      if (spec.account && (create || body.password !== undefined) && !validPassword(body.password)) {
        throw new Error('Choose an initial password of 12 to 128 characters.');
      }
      if (!create && spec.account && spec.key !== 'username' && 'username' in body) throw new Error('Existing usernames are fixed.');
      values = editable.map((field) => validate(field, (body[field] === '' && field === 'semester' ? defaults[field] : body[field]) ?? defaults[field] ?? (optional.has(field) ? null : undefined)));
    } catch (err) {
      return reply(res, 400, 'BAD_REQUEST', err.message);
    }
  }
  const passwordHash = spec.account && !remove && body.password ? await hashPassword(body.password) : null;

  try {
    const result = await transaction(async (db) => {
      if (spec.account) await db.query("SELECT pg_advisory_xact_lock(391206)");
      let existing;
      if (!create) {
        const before = await db.query('SELECT * FROM ' + spec.table + ' WHERE ' + spec.key + ' = $1 FOR UPDATE', [id]);
        existing = before.rows[0];
        if (!existing) return null;
      }
      if (create && spec.account) {
        const user = await db.query('SELECT 1 FROM portal_users WHERE username = $1 OR lower(email) = lower($2) OR id = $3',
          [body.username, body.email, resource === 'staff' ? 'staff:' + body.username : body[spec.key]]);
        if (user.rowCount) throw Object.assign(new Error(), { code: '23505' });
      }
      if (resource === 'staff' && existing?.role === 'ADMIN' && (remove || (body.role && body.role !== 'ADMIN'))) {
        if (existing.username === req.user.username) throw Object.assign(new Error(), { code: 'ADMIN_REQUIRED' });
        const admins = await db.query("SELECT 1 FROM portal_staff WHERE role = 'ADMIN' AND username <> $1 LIMIT 1", [existing.username]);
        if (!admins.rowCount) throw Object.assign(new Error(), { code: 'ADMIN_REQUIRED' });
      }
      if (remove) {
        const dependencies = {
          students: 'SELECT 1 FROM enrollments WHERE student_id = $1 UNION ALL SELECT 1 FROM attendance_records WHERE student_id = $1',
          courses: 'SELECT 1 FROM enrollments WHERE course_code = $1 UNION ALL SELECT 1 FROM class_sessions WHERE course_code = $1',
          sessions: 'SELECT 1 FROM attendance_records WHERE session_id = $1',
        };
        if (dependencies[resource] && (await db.query(dependencies[resource] + ' LIMIT 1', [id])).rowCount) {
          throw Object.assign(new Error(), { code: '23503' });
        }
        await db.query('DELETE FROM ' + spec.table + ' WHERE ' + spec.key + ' = $1', [id]);
        if (spec.account) {
          const name = existing.username.toLowerCase();
          await db.query('DELETE FROM portal_credentials WHERE username = $1', [name]);
          await db.query('DELETE FROM portal_profiles WHERE username = $1', [name]);
          await db.query('DELETE FROM portal_notifications WHERE recipient = $1', [name]);
        }
        await audit(req.user, 'ADMIN_DELETE', resource + ' / ' + id, db);
        return { id };
      }
      let row = existing;
      if (create) {
        const inserts = values.map((_, index) => '$' + (index + 1)).join(',');
        const result = await db.query('INSERT INTO ' + spec.table + ' (' + editable.join(',') + ') VALUES (' + inserts + ') RETURNING *', values);
        row = result.rows[0];
      } else if (editable.length) {
        if (resource === 'courses' && body.max_places !== undefined) {
          const occupied = await db.query(`SELECT count(*) AS count FROM enrollments WHERE course_code = $1 AND status IN ('Pending','Approved')
            GROUP BY semester ORDER BY count DESC LIMIT 1`, [id]);
          if (Number(occupied.rows[0]?.count ?? 0) > body.max_places) throw Object.assign(new Error(), { code: 'CAPACITY' });
        }
        const sets = editable.map((field, index) => field + ' = $' + (index + 2)).join(',');
        const result = await db.query('UPDATE ' + spec.table + ' SET ' + sets + ' WHERE ' + spec.key + ' = $1 RETURNING *', [id, ...values]);
        row = result.rows[0];
      }
      if (passwordHash) {
        const name = row.username.toLowerCase();
        await db.query(`INSERT INTO portal_credentials (username,password_hash,must_change) VALUES ($1,$2,true)
          ON CONFLICT (username) DO UPDATE SET password_hash = excluded.password_hash, must_change = true`, [name,passwordHash]);
        await db.query('DELETE FROM portal_sessions WHERE username = $1', [name]);
      }
      await audit(req.user, create ? 'ADMIN_CREATE' : 'ADMIN_UPDATE', resource + ' / ' + row[spec.key], db);
      return { id: row[spec.key] };
    });
    if (!result) return reply(res, 404, 'NOT_FOUND', 'Record not found.');
    res.status(create ? 201 : 200).json({ ...result, message: remove ? 'Record deleted.' : 'Record saved.' });
  } catch (error) {
    if (error.code === '23503') return reply(res, 409, 'DEPENDENCY', 'This change conflicts with existing academic records or a referenced record is missing.');
    if (error.code === '23505') return reply(res, 409, 'DUPLICATE', 'A matching record already exists.');
    if (error.code === 'ADMIN_REQUIRED') return reply(res, 409, 'ADMIN_REQUIRED', 'Another administrator must make this change.');
    if (error.code === 'CAPACITY') return reply(res, 409, 'CAPACITY', 'Capacity cannot be lower than active registrations.');
    if (['23514','23502','22001','22P02','22007','22008'].includes(error.code)) return reply(res, 400, 'BAD_VALUE', 'A field has an invalid value.');
    throw error;
  }
}
