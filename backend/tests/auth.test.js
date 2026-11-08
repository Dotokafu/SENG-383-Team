// Use a temporary in-memory database so the tests never touch steptrack.db.
process.env.DB_PATH = ':memory:';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const { seed, DEMO_PASSWORD } = require('../src/seed');
const { JWT_SECRET } = require('../src/config');
const app = require('../src/app');
const { requireAuth, requireRole } = require('../src/middleware/auth');

beforeAll(() => {
  seed(db);
});

afterAll(() => {
  db.close();
});

function login(email, password = DEMO_PASSWORD, extra = {}) {
  return request(app).post('/api/auth/login').send({ email, password, ...extra });
}

describe('POST /api/auth/login (FR-M1-01, FR-M1-02, FR-M1-03)', () => {
  test('logs in a registered user and returns a token and the user', async () => {
    const res = await login('parent1@example.com');

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'parent1@example.com', role: 'parent' });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test.each([
    ['parent1@example.com', 'parent'],
    ['teacher1@example.com', 'specialist'],
    ['child1@example.com', 'child'],
  ])('%s logs in with the role %s', async (email, role) => {
    const res = await login(email);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
  });

  test('takes the role from the account, not from the request', async () => {
    const res = await login('parent1@example.com', DEMO_PASSWORD, { role: 'specialist' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('parent');
    expect(jwt.decode(res.body.token).role).toBe('parent');
  });

  test('rejects a wrong password with 401', async () => {
    const res = await login('parent1@example.com', 'wrong-password');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
    expect(res.body.token).toBeUndefined();
  });

  test('rejects an unknown email with exactly the same answer as a wrong password', async () => {
    const wrongPassword = await login('parent1@example.com', 'wrong-password');
    const unknownEmail = await login('nobody@example.com');

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  test('returns 400 when the email or the password is missing', async () => {
    const empty = await request(app).post('/api/auth/login').send({});
    const noPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'parent1@example.com' });

    expect(empty.status).toBe(400);
    expect(noPassword.status).toBe(400);
  });

  test('rejects values that are not strings', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: DEMO_PASSWORD });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me and requireAuth (FR-M1-05)', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 when the header is not a Bearer token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  test('returns 401 for a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  test('returns 401 for an expired token', async () => {
    const expired = jwt.sign({ id: 1, role: 'parent' }, JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ id: 1, role: 'parent' }, 'some-other-secret');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('returns the logged-in user for a valid token', async () => {
    const { body } = await login('teacher1@example.com');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'teacher1@example.com', role: 'specialist' });
  });
});

describe('requireRole (FR-M1-04, FR-M1-05)', () => {
  const guarded = express();
  guarded.get('/parent-only', requireAuth, requireRole('parent'), (req, res) =>
    res.json({ ok: true })
  );
  guarded.get('/adults', requireAuth, requireRole('parent', 'specialist'), (req, res) =>
    res.json({ ok: true })
  );

  async function tokenFor(email) {
    const { body } = await login(email);
    return body.token;
  }

  test('lets the allowed role in', async () => {
    const token = await tokenFor('parent1@example.com');
    const res = await request(guarded).get('/parent-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('answers 403 for a role that is not allowed', async () => {
    const token = await tokenFor('child1@example.com');
    const res = await request(guarded).get('/parent-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('accepts several allowed roles', async () => {
    const specialist = await tokenFor('teacher1@example.com');
    const child = await tokenFor('child1@example.com');

    const ok = await request(guarded).get('/adults').set('Authorization', `Bearer ${specialist}`);
    const denied = await request(guarded).get('/adults').set('Authorization', `Bearer ${child}`);

    expect(ok.status).toBe(200);
    expect(denied.status).toBe(403);
  });

  test('answers 401 when there is no token at all', async () => {
    const res = await request(guarded).get('/parent-only');
    expect(res.status).toBe(401);
  });
});