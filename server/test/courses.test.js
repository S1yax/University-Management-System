// API tests for courses, registration and attestation: npm test
// They use the database from .env (run database/01-03 first).
// Everything the tests change is put back at the end, so they can run again.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.js';

const MUBARAK = '24B031901'; // BIS201 (Mon), CS101 (Wed), DB202 (Tue 14-17) = 10 credits
const SANIYA = '24B031926';  // BIS201, CS101, DB202, NET203, MATH101 = 16 credits, has attestation points

let qa;
let pool;
before(async () => { qa = await fixture(); pool = qa.pool; });
after(async () => { await qa?.close(); });
const call = (method, path, body) => {
  const username = method === 'PUT' ? (body.courseCode === 'FIN201' ? 't_sadykova' : 't_issabek')
    : method === 'PATCH' || path === '/clashes' || path.startsWith('/enrollments?') ? 'm_askarova'
    : path.includes(SANIYA) || body?.studentId === SANIYA || method === 'DELETE' ? 's_niyazkhan' : 'm_nurlybay';
  return qa.request(method, path, body, username);
};
const register = (studentId, courseCode) => call('POST', '/enrollments', { studentId, courseCode });
const points = (body) => call('PUT', '/attestation', body);
let mubarakNet;
let saniyaFin;

test('C1 catalog has all 8 subjects with schedule and free places', async () => {
  const r = await call('GET', '/courses');
  assert.equal(r.code, 200);
  assert.equal(r.body.courses.length, 8);
  const db = r.body.courses.find((c) => c.course_code === 'DB202');
  assert.equal(db.free_places, 31);
  assert.equal(db.day, 'Tue');
  assert.equal(db.start_time, '14:00');
  assert.equal(db.teacher, 'Miras Asubay');
});

test('C2 timetable of Mubarak: 3 courses, 10 credits', async () => {
  const r = await call('GET', `/schedule?studentId=${MUBARAK}`);
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.lessons.map((l) => l.course_code), ['BIS201', 'DB202', 'CS101']);
  assert.equal(r.body.credits, 10);
});

test('C3 registration for NET203 is saved as Pending', async () => {
  const r = await register(MUBARAK, 'NET203');
  assert.equal(r.code, 201);
  assert.equal(r.body.status, 'REGISTERED');
  assert.equal(r.body.enrollment.status, 'Pending');
  mubarakNet = r.body.enrollment.enrollment_id;
});

test('C4 the same course again is rejected', async () => {
  const r = await register(MUBARAK, 'NET203');
  assert.equal(r.code, 409);
  assert.equal(r.body.status, 'ALREADY_REGISTERED');
});

test('C5 a course at the same time is rejected (IS202 Tue 16-19 vs DB202 Tue 14-17)', async () => {
  const r = await register(MUBARAK, 'IS202');
  assert.equal(r.code, 409);
  assert.equal(r.body.status, 'TIME_CLASH');
  assert.match(r.body.message, /DB202/);
});

test('C6 more than 21 ECTS is rejected, preserving legacy pending registrations', async () => {
  const legacy = await pool.query("INSERT INTO enrollments (student_id,course_code,semester,status) VALUES ($1,'FIN201','Fall 2026','Pending') RETURNING enrollment_id", [SANIYA]);
  saniyaFin = legacy.rows[0].enrollment_id;
  const r = await register(SANIYA, 'ENG102');
  assert.equal(r.code, 409);
  assert.equal(r.body.status, 'CREDIT_LIMIT');
});

test('C7 a course that does not exist is rejected', async () => {
  const r = await register(MUBARAK, 'XYZ999');
  assert.equal(r.code, 404);
});

test('C8 a request without courseCode is rejected', async () => {
  const r = await call('POST', '/enrollments', { studentId: MUBARAK });
  assert.equal(r.code, 400);
});

test('C9 the manager approves the registration', async () => {
  const r = await call('PATCH', `/enrollments/${mubarakNet}`, { status: 'Approved' });
  assert.equal(r.code, 200);
  const list = await call('GET', `/enrollments?studentId=${MUBARAK}&courseCode=NET203`);
  assert.equal(list.body.enrollments[0].status, 'Approved');
});

test('C10 an unknown status is rejected', async () => {
  const r = await call('PATCH', `/enrollments/${mubarakNet}`, { status: 'Maybe' });
  assert.equal(r.code, 400);
});

test('C11 timetable problems: Lab 204 double-booked, 2 students with a clash', async () => {
  const r = await call('GET', '/clashes');
  assert.equal(r.body.rooms.length, 1);
  assert.equal(r.body.rooms[0].room, 'Computer Lab 204');
  assert.equal(r.body.students.length, 2);
});

test('C12 attestation of Saniya: 5 courses, BIS201 55.5 points, can still reach 95.5', async () => {
  const r = await call('GET', `/attestation?studentId=${SANIYA}`);
  assert.equal(r.body.items.length, 5);
  const bis = r.body.items.find((i) => i.course_code === 'BIS201');
  assert.equal(bis.rating, 55.5);
  assert.equal(bis.max_possible, 95.5);
  assert.equal(bis.admitted, true);
});

test('C13 the teacher saves the 1st attestation', async () => {
  const r = await points({ studentId: MUBARAK, courseCode: 'BIS201', attestation1: 14 });
  assert.equal(r.code, 200);
  assert.equal(r.body.item.attestation_1, 14);
  assert.equal(r.body.item.admitted, false);
});

test('C14 more than 30 points is rejected', async () => {
  const r = await points({ studentId: MUBARAK, courseCode: 'BIS201', attestation2: 31 });
  assert.equal(r.code, 400);
  assert.equal(r.body.status, 'BAD_VALUE');
});

test('C15 the final exam without 30 attestation points is rejected', async () => {
  const r = await points({ studentId: MUBARAK, courseCode: 'BIS201', attestation2: 15, finalExam: 30 });
  assert.equal(r.code, 400);
  assert.equal(r.body.status, 'NOT_ADMITTED');
});

test('C16 with 30 points the final exam gives the total and the grade', async () => {
  await points({ studentId: MUBARAK, courseCode: 'BIS201', attestation2: 16 });
  const r = await points({ studentId: MUBARAK, courseCode: 'BIS201', finalExam: 35 });
  assert.equal(r.code, 200);
  assert.equal(r.body.item.total, 65);
  assert.equal(r.body.item.letter, 'C');
});

test('C17 no points for a course the student did not register for, or that is not approved', async () => {
  const none = await points({ studentId: MUBARAK, courseCode: 'MATH101', attestation1: 20 });
  assert.equal(none.code, 403);
  assert.equal(none.body.status, 'NOT_APPROVED');
  const pending = await points({ studentId: SANIYA, courseCode: 'FIN201', attestation1: 20 });
  assert.equal(pending.code, 403);
  assert.equal(pending.body.status, 'NOT_APPROVED');
});

test('C18 the student cancels a registration, the credits go back', async () => {
  const r = await call('DELETE', `/enrollments/${saniyaFin}`);
  assert.equal(r.code, 200);
  const s = await call('GET', `/schedule?studentId=${SANIYA}`);
  assert.equal(s.body.credits, 16);
});

test('C19 cancelling a registration that does not exist', async () => {
  const r = await call('DELETE', '/enrollments/999999');
  assert.equal(r.code, 404);
});
