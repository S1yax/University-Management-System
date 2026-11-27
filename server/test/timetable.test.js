import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fixture } from './fixture.js';

const student = 'e_yugai';
const classmate = 'a_bagdat';
const base = '/timetable/tasks';
let qa;

before(async () => {
  qa = await fixture({ demoContent: true });
  const seed = await readFile(new URL('../../database/demo_smart_timetable.sql', import.meta.url), 'utf8');
  await qa.pool.query(seed);
  await qa.pool.query(seed);
});
after(async () => { await qa?.close(); });

test('Timetable lists enrolled assignments and tracks shared tasks per student', async () => {
  const { code, body } = await qa.request('GET', base, undefined, student);
  assert.equal(code, 200);
  const shared = body.tasks.find((task) => task.courseCode === 'BIS201' && task.kind === 'Quiz');
  assert.ok(shared?.demo);
  assert.ok(Date.parse(shared.dueAt) < Date.now());
  assert.equal(shared.completedAt, null);
  const path = base + '/' + shared.id;
  assert.equal((await qa.request('PATCH', path, { completed: true }, student)).code, 200);
  const marked = await qa.request('GET', base, undefined, student);
  assert.ok(marked.body.tasks.find((task) => task.id === shared.id).completedAt);
  const classmateView = await qa.request('GET', base, undefined, classmate);
  assert.equal(classmateView.body.tasks.find((task) => task.id === shared.id).completedAt, null);
  assert.equal((await qa.request('PATCH', path, { completed: false }, student)).code, 200);
});

test('Private deadlines use Almaty time and generate a single reminder', async () => {
  const minutesFromNow = 15 * 60_000;
  const offset = 5 * 3_600_000;
  const dueLocal = new Date(Date.now() + minutesFromNow + offset).toISOString().slice(0, 16);
  const payload = { title: 'Private timetable test', kind: 'TSIS', dueLocal };
  const denied = await qa.request('POST', base, { ...payload, courseCode: 'NOT-ENROLLED' }, student);
  assert.equal(denied.code, 403);
  const created = await qa.request('POST', base, payload, student);
  assert.equal(created.code, 201);
  const mine = await qa.request('GET', base, undefined, student);
  const task = mine.body.tasks.find((row) => row.id === created.body.id);
  assert.equal(Date.parse(task.dueAt) + offset, Date.parse(dueLocal + 'Z'));
  assert.equal((await qa.request('PATCH', base + '/' + task.id, { completed: true }, classmate)).code, 404);

  const reminders = '/timetable/reminders';
  assert.equal((await qa.request('POST', reminders, undefined, student)).code, 200);
  assert.equal((await qa.request('POST', reminders, undefined, student)).body.created, 0);
  const rows = await qa.pool.query('SELECT subject FROM portal_notifications WHERE recipient = $1 AND timetable_key = $2',
    [student, 'timetable-' + task.id + '-upcoming']);
  assert.equal(rows.rowCount, 1);
  assert.match(rows.rows[0].subject, /Due within 24 hours/);
  assert.equal((await qa.request('GET', base, undefined, 't_issabek')).code, 403);
});
