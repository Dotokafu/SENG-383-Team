// Use a temporary in-memory database so the tests never touch steptrack.db.
process.env.DB_PATH = ':memory:';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const { seed } = require('../src/seed');
const { JWT_SECRET } = require('../src/config');
const { canAccessChild } = require('../src/services/accessService');
const { requireAuth } = require('../src/middleware/auth');
const { requireChildAccess } = require('../src/middleware/childAccess');

const EMAILS = {
  parent1: 'parent1@example.com',
  parent2: 'parent2@example.com',
  teacher: 'teacher1@example.com',
  psychologist: 'psychologist1@example.com',
  doctor: 'doctor1@example.com',
  unlinked: 'specialist-unlinked@example.com',
  child1: 'child1@example.com',
  child2: 'child2@example.com',
};

const users = {};
const children = {};
let app;

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
}

beforeAll(() => {
  seed(db);

  const userRow = db.prepare('SELECT id, role FROM users WHERE email = ?');
  for (const [name, email] of Object.entries(EMAILS)) {
    users[name] = userRow.get(email);
  }

  const childRow = db.prepare('SELECT id FROM children WHERE name = ?');
  children.deniz = childRow.get('Deniz Demir').id;
  children.ela = childRow.get('Ela Kaya').id;

  app = express();
  app.get('/children/:childId/data', requireAuth, requireChildAccess(), (req, res) =>
    res.json({ childId: req.childId })
  );
});

afterAll(() => {
  db.close();
});

describe('canAccessChild (FR-M2-05, FR-M2-06)', () => {
  // [who, child, expected]
  test.each([
    ['parent1', 'deniz', true],
    ['parent1', 'ela', false],
    ['parent2', 'ela', true],
    ['parent2', 'deniz', false],
    ['child1', 'deniz', true],
    ['child1', 'ela', false],
    ['child2', 'ela', true],
    ['child2', 'deniz', false],
    ['teacher', 'deniz', true],
    ['teacher', 'ela', true],
    ['psychologist', 'deniz', true],
    ['psychologist', 'ela', false],
    ['doctor', 'ela', true],
    ['doctor', 'deniz', false],
    ['unlinked', 'deniz', false],
    ['unlinked', 'ela', false],
  ])('%s -> %s: %s', (who, child, expected) => {
    expect(canAccessChild(users[who], children[child])).toBe(expected);
  });

  test('denies a child that does not exist', () => {
    expect(canAccessChild(users.parent1, 9999)).toBe(false);
  });

  test('denies invalid input', () => {
    expect(canAccessChild(users.parent1, 'abc')).toBe(false);
    expect(canAccessChild(null, children.deniz)).toBe(false);
    expect(canAccessChild({ id: 1, role: 'admin' }, children.deniz)).toBe(false);
  });

  test('a specialist loses access as soon as the parent unlinks them', () => {
    const link = db
      .prepare('SELECT id, specialist_type FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
      .get(children.deniz, users.psychologist.id);

    db.prepare('DELETE FROM specialist_links WHERE id = ?').run(link.id);
    expect(canAccessChild(users.psychologist, children.deniz)).toBe(false);

    // Put the link back so the other tests are not affected.
    db.prepare(
      'INSERT INTO specialist_links (child_id, specialist_id, specialist_type) VALUES (?, ?, ?)'
    ).run(children.deniz, users.psychologist.id, link.specialist_type);
    expect(canAccessChild(users.psychologist, children.deniz)).toBe(true);
  });
});

describe('requireChildAccess middleware', () => {
  function get(path, user) {
    const req = request(app).get(path);
    return user ? req.set('Authorization', `Bearer ${tokenFor(user)}`) : req;
  }

  test('lets a linked specialist in', async () => {
    const res = await get(`/children/${children.deniz}/data`, users.teacher);
    expect(res.status).toBe(200);
    expect(res.body.childId).toBe(children.deniz);
  });

  test('answers 403 for an unlinked specialist', async () => {
    const res = await get(`/children/${children.deniz}/data`, users.unlinked);
    expect(res.status).toBe(403);
    expect(res.body.childId).toBeUndefined();
  });

  test('answers 403 for the parent of another child', async () => {
    const res = await get(`/children/${children.deniz}/data`, users.parent2);
    expect(res.status).toBe(403);
  });

  test('answers 403 for a child that does not exist, same as for an unlinked specialist', async () => {
    const res = await get('/children/9999/data', users.teacher);
    expect(res.status).toBe(403);
  });

  test('answers 400 for an id that is not a number', async () => {
    const res = await get('/children/abc/data', users.teacher);
    expect(res.status).toBe(400);
  });

  test('answers 401 without a token', async () => {
    const res = await get(`/children/${children.deniz}/data`);
    expect(res.status).toBe(401);
  });
});