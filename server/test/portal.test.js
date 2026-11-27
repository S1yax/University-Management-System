import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fixture } from './fixture.js';

let qa;
before(async () => { qa = await fixture(); });
after(async () => { await qa?.close(); });
const names = [
  's_niyazkhan','m_nurlybay','e_yugai','a_bagdat','a_zholdassali','d_tleubay','a_kanat','d_serik','m_bazarbay','a_omar',
  't_issabek','t_myrzakanurov','t_asubay','t_sadykova','t_kim','m_askarova','admin',
];

test('Database constraints and reporting views pass the existing SQL suite', async () => {
  const client = await qa.pool.connect();
  try {
    const notices = [];
    client.on('notice', (notice) => notices.push(notice.message));
    await client.query(await readFile(new URL('../../database/04_tests.sql', import.meta.url), 'utf8'));
    assert.ok(notices.length > 20);
    assert.ok(notices.every((notice) => !/FAIL/.test(notice)), notices.join('\n'));
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('All 17 named accounts authenticate and load their scoped workspace', async () => {
  for (const [index, username] of names.entries()) {
    const response = await qa.request('GET', '/workspace', undefined, username);
    assert.equal(response.code, 200, username);
    const workspace = response.body;
    assert.equal(workspace.user.username, username);
    assert.equal(workspace.user.role, index < 10 ? 'STUDENT' : index < 15 ? 'TEACHER' : index === 15 ? 'MANAGER' : 'ADMIN');
    if (index < 10) {
      assert.equal(workspace.users.length, 1);
      assert.ok(workspace.enrollments.every((row) => row.studentId === workspace.user.studentId));
      assert.ok(workspace.attendanceRecords.every((row) => row.studentId === workspace.user.studentId));
    }
    if (workspace.user.role === 'TEACHER') {
      assert.ok(workspace.courses.length > 0);
      assert.ok(workspace.courses.every((row) => row.instructorId === workspace.user.teacherId));
    }
  }
});

test('Academic data and staff operations require an authorized session', async () => {
  assert.equal((await qa.request('GET', '/workspace')).code, 401);
  assert.equal((await qa.request('GET', '/attestation?studentId=24B031926', undefined, 'e_yugai')).code, 403);
  assert.equal((await qa.request('GET', '/admin/students', undefined, 'e_yugai')).code, 403);
  assert.equal((await qa.request('PUT', '/attestation', {
    studentId: '24B031926', courseCode: 'BIS201', attestation1: 10,
  }, 't_myrzakanurov')).code, 403);
});

test('Approved grade sync is visible to the right student and manager', async () => {
  const get = (user) => qa.request('GET', '/attestation?courseCode=BIS201', undefined, user);
  const before = await get('e_yugai');
  const result = await qa.request('PUT', '/attestation', {
    studentId: '24B031926', courseCode: 'BIS201', attestation1: 28, attestation2: 27, finalExam: 34,
  }, 't_issabek');
  assert.equal(result.code, 200);
  assert.equal((await get('s_niyazkhan')).body.items[0].total, 89);
  assert.deepEqual((await get('e_yugai')).body.items, before.body.items);
  const manager = await qa.request('GET', '/workspace', undefined, 'm_askarova');
  assert.equal(manager.body.enrollments.find((row) => row.studentId === '24B031926' && row.courseCode === 'BIS201').score, 89);
  assert.ok(manager.body.auditLogs.some((row) => row.action === 'GRADE_SAVED'));
});

test('Authorized admin registers a new identity and student registration reaches teacher', async () => {
  const password = randomBytes(20).toString('base64url');
  const created = await qa.request('POST', '/admin/students', {
    student_id: 'QA0001', username: 'qa_new_student', full_name: 'QA Student', email: 'qa.student@example.test',
    major: 'QA', year: 1, password,
  }, 'admin');
  assert.equal(created.code, 201);
  const auth = await qa.call('POST', '/auth/login', { username: 'qa_new_student', password });
  assert.equal(auth.code, 200);
  const { token } = auth.body;
  assert.equal(auth.body.user.passwordChangeRequired, true);
  assert.equal((await qa.call('GET', '/courses', undefined, token)).code, 403);
  const updatedPassword = randomBytes(20).toString('base64url');
  assert.equal((await qa.call('PUT', '/auth/password', { currentPassword: password, newPassword: updatedPassword }, token)).code, 200);
  const registration = await qa.call('POST', '/enrollments', { studentId: 'QA0001', courseCode: 'BIS201' }, token);
  assert.equal(registration.code, 201);
  const decision = await qa.request('PATCH', '/enrollments/' + registration.body.enrollment.enrollment_id, { status: 'Approved' }, 'admin');
  assert.equal(decision.code, 200);
  assert.ok((await qa.request('GET', '/workspace', undefined, 't_issabek')).body.users.some((row) => row.id === 'QA0001'));
  const actual = await qa.call('GET', '/workspace', undefined, token);
  assert.equal(actual.body.enrollments[0].status, 'Approved');
  await qa.restart();
  const secondDevice = await qa.call('POST', '/auth/login', { username: 'qa_new_student', password: updatedPassword });
  assert.equal(secondDevice.code, 200);
  const persisted = await qa.call('GET', '/workspace', undefined, secondDevice.body.token);
  assert.equal(persisted.body.enrollments[0].status, 'Approved');
  await qa.call('POST', '/auth/logout', undefined, token);
  assert.equal((await qa.call('GET', '/workspace', undefined, token)).code, 401);
});

test('Two students competing for the last seat cannot both register', async () => {
  await qa.pool.query("UPDATE courses SET max_places = 1 WHERE course_code = 'ENG102'");
  const password = randomBytes(20).toString('base64url');
  const students = [[ 'qa_race_one', 'QAR1' ], [ 'qa_race_two', 'QAR2' ]];
  const tokens = [];
  for (const [username, student_id] of students) {
    assert.equal((await qa.request('POST', '/admin/students', {
      student_id, username, full_name: 'QA Concurrent Student', email: username + '@example.test', major: 'QA', year: 1, password,
    }, 'admin')).code, 201);
    const login = await qa.call('POST', '/auth/login', { username, password });
    assert.equal(login.code, 200);
    assert.equal((await qa.call('PUT', '/auth/password', { currentPassword: password, newPassword: randomBytes(20).toString('base64url') }, login.body.token)).code, 200);
    tokens.push(login.body.token);
  }
  const results = await Promise.all(students.map(([, studentId], index) =>
    qa.call('POST', '/enrollments', { studentId, courseCode: 'ENG102' }, tokens[index])));
  assert.deepEqual(results.map((r) => r.code).sort(), [201, 409]);
  assert.equal(results.find((r) => r.code === 409).body.status, 'COURSE_FULL');
});
