import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fixture } from './fixture.js';

let qa;
const user = 'e_yugai';
const student = '25B032145';
before(async () => {
  qa = await fixture({ demoContent: true });
  const seed = await readFile(new URL('../../database/demo_portal_content.sql', import.meta.url), 'utf8');
  await qa.pool.query(seed);
  await qa.pool.query(seed);
});
after(async () => { await qa?.close(); });

test('Demo results and messages extend the student workspace without adding academic grades', async () => {
  const workspace = await qa.request('GET', '/workspace', undefined, user);
  assert.equal(workspace.code, 200);
  assert.equal(workspace.body.user.gpa, null);
  assert.ok(workspace.body.user.demoGpa > 0);
  assert.ok(workspace.body.enrollments.some((row) => row.demoScore > 0 && !row.grade));
  assert.equal(workspace.body.notifications.filter((message) => message.demo).length, 3);
  const grades = await qa.request('GET', '/attestation?studentId=' + student, undefined, user);
  assert.ok(grades.body.items.length > 0 && grades.body.items.every((row) => row.demo && row.total > 0));
  const registrar = await qa.request('GET', '/attestation?studentId=' + student, undefined, 'm_askarova');
  assert.ok(registrar.body.items.every((item) => !item.demo));
  const news = await qa.request('GET', '/events', undefined, user);
  assert.equal(news.body.events.filter((event) => event.demo_key).length, 3);
  assert.ok(workspace.body.classSessions.some((session) => session.hasAttendanceRecords));
});

test('Course feedback is scoped, accepts one submission, and stores answers separately', async () => {
  const listed = await qa.request('GET', '/surveys/course-feedback', undefined, user);
  const course = listed.body.courses[0];
  assert.ok(course && !course.submitted);
  const request = { courseCode: course.code, clarity: 5, workload: 4, materials: 4, feedback: 'More workshop time.' };
  const first = await qa.request('POST', '/surveys/course-feedback', { ...request, courseCode: 'NOT-ENROLLED' }, user);
  assert.equal(first.code, 409);
  const results = await Promise.all([
    qa.request('POST', '/surveys/course-feedback', request, user),
    qa.request('POST', '/surveys/course-feedback', request, user),
  ]);
  assert.deepEqual(results.map((value) => value.code).sort(), [201, 409]);
  const after = await qa.request('GET', '/surveys/course-feedback', undefined, user);
  assert.equal(after.body.courses.find((item) => item.code === course.code).submitted, true);
  const saved = await qa.pool.query('SELECT * FROM portal_survey_responses');
  assert.equal(saved.rowCount, 1);
  assert.equal(saved.rows[0].clarity, 5);
  assert.equal(saved.rows[0].student_id, undefined);
});
