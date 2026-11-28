import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.js';

let qa;

before(async () => {
  qa = await fixture();
});

after(async () => {
  await qa?.close();
});

test('Protected API requires authentication', async () => {
  const result = await qa.call(
    'GET',
    '/records'
  );

  assert.equal(result.code, 401);
});

test('Invalid token is rejected', async () => {
  const result = await qa.call(
    'GET',
    '/records',
    undefined,
    'invalid-token'
  );

  assert.equal(result.code, 401);
});

test('Student cannot override attendance', async () => {
  const login = await qa.login('a_bagdat');

  assert.equal(login.code, 200);

  const result = await qa.call(
    'POST',
    '/override',
    {},
    login.body.token
  );

  assert.equal(result.code, 403);
});

test('Student cannot close a lesson', async () => {
  const login = await qa.login('a_bagdat');

  const result = await qa.call(
    'PATCH',
    '/sessions/ses-8',
    { status: 'CLOSED' },
    login.body.token
  );

  assert.equal(result.code, 403);
});

test('Student cannot update attestation', async () => {
  const login = await qa.login('a_bagdat');

  const result = await qa.call(
    'PUT',
    '/attestation',
    {},
    login.body.token
  );

  assert.equal(result.code, 403);
});

test('Admin cannot approve enrollment', async () => {
  const login = await qa.login('admin');

  const result = await qa.call(
    'PATCH',
    '/enrollments/1',
    { status: 'Approved' },
    login.body.token
  );

  assert.equal(result.code, 403);
});

test('Account locks after five incorrect passwords', async () => {
  const username = 't_issabek';

  await qa.pool.query(
    'SELECT login_ok($1)',
    [username]
  );

  for (let i = 1; i <= 5; i++) {
    const result = await qa.call(
      'POST',
      '/login',
      {
        username,
        password: 'incorrect-password'
      }
    );

    assert.equal(
      result.code,
      i === 5 ? 423 : 401
    );
  }

  const blocked = await qa.login(username);

  assert.equal(blocked.code, 423);

  await qa.pool.query(
    'SELECT login_ok($1)',
    [username]
  );
});

test('Weak password is rejected', async () => {
  const login = await qa.login('a_bagdat');

  const result = await qa.call(
    'POST',
    '/change-password',
    {
      currentPassword: qa.password,
      newPassword: '123'
    },
    login.body.token
  );

  assert.equal(result.code, 400);
});

test('Password history prevents reuse', async () => {
  const login = await qa.login('a_bagdat');
  const token = login.body.token;

  const change = (currentPassword, newPassword) =>
    qa.call(
      'POST',
      '/change-password',
      { currentPassword, newPassword },
      token
    );

  assert.equal(
    (await change(qa.password, 'Granite-Fox-905')).code,
    200
  );

  assert.equal(
    (await change('Granite-Fox-905', 'Silver-Moon-82')).code,
    200
  );

  const reused = await change(
    'Silver-Moon-82',
    'Granite-Fox-905'
  );

  assert.equal(reused.code, 400);
  assert.equal(reused.body.status, 'PASSWORD_REUSED');
});

test('Expired semester password requires a change', async () => {
  const username = 'e_yugai';

  // Initialize the database password first.
  const initial = await qa.login(username);

  assert.equal(initial.code, 200);

  // Set the password date to the previous year.
  await qa.pool.query(
    `UPDATE user_credentials
     SET password_changed_at = now() - interval '1 year'
     WHERE username = $1`,
    [username]
  );

  const login = await qa.login(username);

  assert.equal(login.code, 200);

  assert.equal(
    login.body.user.passwordChangeRequired,
    true
  );

  const result = await qa.call(
    'GET',
    '/records',
    undefined,
    login.body.token
  );

  assert.equal(result.code, 403);
});