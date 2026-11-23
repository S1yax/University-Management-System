// API tests: npm test
// They use the database from .env (run 01-03 SQL files first).
// Every check-in made here is deleted at the end, so the tests can run again.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';

const HALL_301 = { latitude: 43.255330, longitude: 76.943100 }; // ~1.5 m from the center
const FAR_AWAY = { latitude: 43.264000, longitude: 76.953500 }; // ~1.3 km away
const MUBARAK = '24B031901';
const AMIR = '24B031787';
const DANIYAR = '25B032011'; // IS202 only, not in BIS201
const SANIYA = '24B031926';
const BAGDAT = '24B031666';
// Free hours in ses-8 for the accuracy tests (Saniya and Bagdat already have hours 1 and 2 in the seed)
const AIGERIM = '24B031405'; // BIS201, no check-ins in ses-8
const DIAS = '24B031122';    // BIS201, only hour 1 in ses-8

let server;
let base;
let lastIdBefore;

before(async () => {
  const { rows } = await pool.query('SELECT COALESCE(MAX(attendance_id), 0) AS id FROM attendance_records');
  lastIdBefore = rows[0].id;
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  await pool.query('DELETE FROM attendance_records WHERE attendance_id > $1', [lastIdBefore]);
  await pool.query("UPDATE class_sessions SET status = 'OPEN' WHERE session_id = 'ses-8'");
  server.close();
  await pool.end();
});

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ code: r.status, body: await r.json() }));
const get = (path) => fetch(base + path).then(async (r) => ({ code: r.status, body: await r.json() }));
const checkin = (studentId, time, where = HALL_301, sessionId = 'ses-8') =>
  post('/checkin', { sessionId, studentId, ...where, time });

test('A1 server is connected to the database', async () => {
  const r = await get('/health');
  assert.equal(r.code, 200);
  assert.equal(r.body.ok, true);
});

test('A2 attendance at the end of week 8 = 50% for Mubarak, same as the website', async () => {
  const r = await get(`/attendance?studentId=${MUBARAK}&asOf=2026-11-08`);
  const bis = r.body.courses.find((c) => c.course_code === 'BIS201');
  assert.equal(Number(bis.attendance_pct), 50);
  assert.equal(bis.at_risk, true);
});

test('A3 check-in at 17:05 inside Hall 301 is saved for hour 2', async () => {
  const r = await checkin(MUBARAK, '2026-11-02 17:05');
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'SUCCESS_PRESENT');
  assert.equal(r.body.hourSlot, 2);
  assert.ok(r.body.distanceM < 150);
});

test('A4 second check-in in the same hour (17:40) is rejected', async () => {
  const r = await checkin(MUBARAK, '2026-11-02 17:40');
  assert.equal(r.code, 409);
  assert.equal(r.body.status, 'ALREADY_CHECKED_IN');
});

test('A5 check-in at 18:10 is a new check-in for hour 3', async () => {
  const r = await checkin(MUBARAK, '2026-11-02 18:10');
  assert.equal(r.code, 201);
  assert.equal(r.body.hourSlot, 3);
});

test('A6 check-in 1.3 km away is saved as REJECTED', async () => {
  const r = await checkin(AMIR, '2026-11-02 17:10', FAR_AWAY);
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'REJECTED_RADIUS');
  assert.ok(r.body.distanceM > 150);
});

test('A7 check-in after the lesson (19:30) is rejected', async () => {
  const r = await checkin(AMIR, '2026-11-02 19:30');
  assert.equal(r.code, 403);
  assert.equal(r.body.status, 'REJECTED_CLOSED');
});

test('A8 check-in to a CLOSED lesson is rejected', async () => {
  const r = await checkin(MUBARAK, '2026-09-07 16:10', HALL_301, 'ses-1');
  assert.equal(r.code, 403);
  assert.equal(r.body.status, 'REJECTED_CLOSED');
});

test('A9 student who is not registered for the course is rejected', async () => {
  const r = await checkin(DANIYAR, '2026-11-02 17:15');
  assert.equal(r.code, 403);
  assert.equal(r.body.status, 'REJECTED_NOT_ENROLLED');
});

test('A10 request without GPS is rejected', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: MUBARAK });
  assert.equal(r.code, 400);
});

test('A11 tracker shows every hour: Mubarak 3/3, Amir hour 2 REJECTED', async () => {
  const r = await get('/tracker?sessionId=ses-8');
  assert.equal(r.code, 200);
  assert.equal(r.body.session.tracked_hours, 3);
  const mu = r.body.students.find((s) => s.student_id === MUBARAK);
  const am = r.body.students.find((s) => s.student_id === AMIR);
  assert.equal(Number(mu.hours_present), 3);
  assert.equal(am.hour_2, 'REJECTED');
  assert.equal(r.body.students.length, 7);
});

test('A12 teacher change without a reason is rejected', async () => {
  const r = await post('/override', { sessionId: 'ses-8', studentId: AMIR, hourSlot: 2, status: 'PRESENT', reason: ' ' });
  assert.equal(r.code, 400);
  assert.equal(r.body.status, 'REASON_REQUIRED');
});

test('A13 teacher changes Amir hour 2 to PRESENT with a reason', async () => {
  const r = await post('/override', {
    sessionId: 'ses-8', studentId: AMIR, hourSlot: 2, status: 'PRESENT',
    reason: 'Student was in Hall 301, GPS failed', teacher: 'Ainur Issabek',
  });
  assert.equal(r.code, 200);
  const t = await get('/tracker?sessionId=ses-8');
  const am = t.body.students.find((s) => s.student_id === AMIR);
  assert.equal(am.hour_2, 'PRESENT');
});

test('A14 teacher cannot set hour 2 in a lesson tracked once', async () => {
  const r = await post('/override', { sessionId: 'ses-1', studentId: AMIR, hourSlot: 2, status: 'PRESENT', reason: 'test' });
  assert.equal(r.code, 400);
});

test('A15 weak GPS inside the building is saved as MANUAL_REVIEW', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: AMIR, ...FAR_AWAY, time: '2026-11-02 18:20', weakSignal: true });
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'MANUAL_REVIEW_SUBMITTED');
  assert.equal(r.body.record.verification_status, 'MANUAL_REVIEW');
});

test('A18 weak accuracy (250 m) inside the building is saved as MANUAL_REVIEW by the server', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: AIGERIM, ...HALL_301, time: '2026-11-02 16:20', accuracy: 250 });
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'MANUAL_REVIEW_SUBMITTED');
  assert.equal(r.body.record.verification_status, 'MANUAL_REVIEW');
  assert.match(r.body.record.rejection_reason, /Weak GPS accuracy/);
});

test('A19 too-perfect accuracy (0 m) inside the radius is flagged for review', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: AIGERIM, ...HALL_301, time: '2026-11-02 18:20', accuracy: 0 });
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'MANUAL_REVIEW_SUBMITTED');
  assert.equal(r.body.record.verification_status, 'MANUAL_REVIEW');
  assert.match(r.body.record.rejection_reason, /Suspicious GPS accuracy/);
});

test('A20 a forged weakSignal flag is ignored when accuracy is sent', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: DIAS, ...FAR_AWAY, time: '2026-11-02 17:20', accuracy: 8, weakSignal: true });
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'REJECTED_RADIUS');
});

test('A21 too-perfect accuracy far from the campus is a normal REJECTED_RADIUS', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: AIGERIM, ...FAR_AWAY, time: '2026-11-02 17:20', accuracy: 0 });
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'REJECTED_RADIUS');
});

test('A22 accuracy that is not a number is rejected', async () => {
  const r = await post('/checkin', { sessionId: 'ses-8', studentId: SANIYA, ...HALL_301, time: '2026-11-02 18:20', accuracy: 'abc' });
  assert.equal(r.code, 400);
  assert.equal(r.body.status, 'BAD_REQUEST');
});

test('A16 records list has the check-ins made above', async () => {
  const r = await get('/records?sessionId=ses-8');
  assert.equal(r.code, 200);
  const mine = r.body.records.filter((x) => x.student_id === MUBARAK);
  assert.deepEqual(mine.map((x) => x.hour_slot).sort(), [1, 2, 3]);
  assert.equal(typeof mine[0].gps_latitude, 'number');
});

test('A17 teacher closes ses-8, then a check-in is rejected', async () => {
  const c = await fetch(`${base}/sessions/ses-8`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CLOSED' }),
  });
  assert.equal(c.status, 200);
  const s = await get('/sessions');
  assert.equal(s.body.sessions.find((x) => x.session_id === 'ses-8').status, 'CLOSED');
  const r = await checkin('24B031666', '2026-11-02 18:30');
  assert.equal(r.code, 403);
  assert.equal(r.body.status, 'REJECTED_CLOSED');
});
