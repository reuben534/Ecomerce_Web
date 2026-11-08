import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { authenticator } from 'otplib';
import { createAuthApp } from './auth-app.mjs';

let server;
let database;
let baseUrl;

before(async () => {
  const auth = createAuthApp({ databasePath: ':memory:', production: false });
  database = auth.database;
  server = auth.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  database.close();
});

async function post(path, body, cookie) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

test('registration, email verification, login, and password reset work end to end', async () => {
  const registration = await post('/api/auth/register', {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'Ada@example.com',
    phone: '+27123456789',
    password: 'StrongPass123!',
  });
  assert.equal(registration.status, 201);
  const registrationBody = await registration.json();
  assert.match(registrationBody.devVerificationToken, /^[\w-]{40,}$/);

  const storedUser = database.prepare('SELECT password_hash FROM users WHERE email = ?').get('ada@example.com');
  assert.notEqual(storedUser.password_hash, 'StrongPass123!');
  assert.match(storedUser.password_hash, /^\$2[aby]\$/);

  const unverifiedLogin = await post('/api/auth/login', {
    email: 'ada@example.com',
    password: 'StrongPass123!',
  });
  assert.equal(unverifiedLogin.status, 403);
  assert.equal((await unverifiedLogin.json()).code, 'EMAIL_NOT_VERIFIED');

  const verification = await post('/api/auth/verify-email', { token: registrationBody.devVerificationToken });
  assert.equal(verification.status, 200);
  assert.match((await verification.json()).message, /Email verified successfully/);

  const login = await post('/api/auth/login', {
    email: 'ada@example.com',
    password: 'StrongPass123!',
  });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.match(sessionCookie ?? '', /^smartshop_session=/);
  assert.match(login.headers.get('set-cookie') ?? '', /HttpOnly/i);

  const profile = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: sessionCookie } });
  assert.deepEqual((await profile.json()).user, {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '+27123456789',
    emailVerified: true,
    mfaEnabled: false,
  });

  const setup = await post('/api/auth/mfa/setup', { password: 'StrongPass123!' }, sessionCookie);
  assert.equal(setup.status, 200);
  const setupBody = await setup.json();
  assert.match(setupBody.qrCode, /^data:image\/png;base64,/);
  assert.ok(authenticator.check(authenticator.generate(setupBody.secret), setupBody.secret));

  const enableMfa = await post('/api/auth/mfa/enable', { code: authenticator.generate(setupBody.secret) }, sessionCookie);
  assert.equal(enableMfa.status, 200);
  assert.equal((await enableMfa.json()).user.mfaEnabled, true);

  const missingMfa = await post('/api/auth/login', { email: 'ada@example.com', password: 'StrongPass123!' });
  assert.equal(missingMfa.status, 401);
  assert.equal((await missingMfa.json()).code, 'MFA_REQUIRED');

  const mfaCode = authenticator.generate(setupBody.secret);
  const mfaLogin = await post('/api/auth/login', { email: 'ada@example.com', password: 'StrongPass123!', mfaCode });
  assert.equal(mfaLogin.status, 200);
  const mfaSession = mfaLogin.headers.get('set-cookie')?.split(';')[0];

  const disableMfa = await post('/api/auth/mfa/disable', {
    password: 'StrongPass123!',
    code: authenticator.generate(setupBody.secret),
  }, sessionCookie);
  assert.equal(disableMfa.status, 200);
  assert.equal((await disableMfa.json()).user.mfaEnabled, false);

  const resetRequest = await post('/api/auth/forgot-password', { email: 'ada@example.com' });
  assert.equal(resetRequest.status, 200);
  const resetBody = await resetRequest.json();
  assert.match(resetBody.devResetCode, /^\d{6}$/);

  const badReset = await post('/api/auth/reset-password', {
    email: 'ada@example.com',
    code: '000000',
    password: 'DifferentPass456!',
  });
  assert.equal(badReset.status, 400);

  const reset = await post('/api/auth/reset-password', {
    email: 'ada@example.com',
    code: resetBody.devResetCode,
    password: 'DifferentPass456!',
  });
  assert.equal(reset.status, 200);

  const expiredSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: sessionCookie } });
  assert.equal((await expiredSession.json()).user, null);
  const expiredMfaSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: mfaSession } });
  assert.equal((await expiredMfaSession.json()).user, null);

  const oldPasswordLogin = await post('/api/auth/login', {
    email: 'ada@example.com',
    password: 'StrongPass123!',
  });
  assert.equal(oldPasswordLogin.status, 401);

  const newPasswordLogin = await post('/api/auth/login', {
    email: 'ada@example.com',
    password: 'DifferentPass456!',
  });
  assert.equal(newPasswordLogin.status, 200);
});