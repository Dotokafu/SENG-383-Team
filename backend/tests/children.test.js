// Use a temporary in-memory database so the tests never touch steptrack.db.
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const { seed } = require('../src/seed');
const { JWT_SECRET } = require('../src/config');
const app = require('../src/app');

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
const tokens = {};

const as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });
const countLinks = () => db.prepare('SELECT COUNT(*) AS n FROM specialist_links').get().n;

beforeAll(() => {
  seed(db);

  const userRow = db.prepare('SELECT id, role FROM users WHERE email = ?');
  for (const [name, email] of Object.entries(EMAILS)) {
    users[name] = userRow.get(email);
    tokens[name] = jwt.sign({ id: users[name].id, role: users[name].role }, JWT_SECRET);
  }

  const childRow = db.prepare('SELECT id FROM children WHERE name = ?');
  children.deniz = childRow.get('Deniz Demir').id;
  children.ela = childRow.get('Ela Kaya').id;
});

// Every test starts from the same demo data (the ids stay the same after a reseed).
beforeEach(() => {
  seed(db);
});

afterAll(() => {
  db.close();
});

describe('GET /api/children (FR-M2-06)', () => {
  test('answers 401 without a token', async () => {
    const res = await request(app).get('/api/children');
    expect(res.status).toBe(401);
  });

  test.each([
    ['parent1', ['Deniz Demir']],
    ['parent2', ['Ela Kaya']],
    ['teacher', ['Deniz Demir', 'Ela Kaya']],
    ['psychologist', ['Deniz Demir']],
    ['doctor', ['Ela Kaya']],
    ['unlinked', []],
    ['child1', ['Deniz Demir']],
    ['child2', ['Ela Kaya']],
  ])('%s sees %j', async (who, names) => {
    const res = await request(app).get('/api/children').set(as(who));

    expect(res.status).toBe(200);
    expect(res.body.children.map((c) => c.name)).toEqual(names);
  });
});

describe('GET /api/children/:childId/specialists (FR-M2-03)', () => {
  test('a parent sees the specialists linked to their child', async () => {
    const res = await request(app)
      .get(`/api/children/${children.deniz}/specialists`)
      .set(as('parent1'));

    expect(res.status).toBe(200);
    expect(res.body.specialists.map((s) => s.email).sort()).toEqual([
      'psychologist1@example.com',
      'teacher1@example.com',
    ]);
    expect(res.body.specialists[0].password_hash).toBeUndefined();
  });

  test('answers 401 without a token', async () => {
    const res = await request(app).get(`/api/children/${children.deniz}/specialists`);
    expect(res.status).toBe(401);
  });

  test.each([
    ['parent2', "another child's parent"],
    ['teacher', 'a linked specialist'],
    ['unlinked', 'an unlinked specialist'],
    ['child1', 'the child'],
  ])('answers 403 for %s (%s)', async (who) => {
    const res = await request(app)
      .get(`/api/children/${children.deniz}/specialists`)
      .set(as(who));

    expect(res.status).toBe(403);
    expect(res.body.specialists).toBeUndefined();
  });

  test('answers 403 for a child that does not exist', async () => {
    const res = await request(app).get('/api/children/9999/specialists').set(as('parent1'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/children/:childId/specialists (FR-M2-01, FR-M2-02)', () => {
  function link(who, childId, body) {
    return request(app).post(`/api/children/${childId}/specialists`).set(as(who)).send(body);
  }

  test('a parent links a registered specialist', async () => {
    const before = countLinks();
    const res = await link('parent1', children.deniz, {
      email: 'specialist-unlinked@example.com',
      type: 'coach',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'specialist-unlinked@example.com',
      specialist_type: 'coach',
    });
    expect(countLinks()).toBe(before + 1);
  });

  test('the new specialist sees the child and shows up in the list', async () => {
    await link('parent1', children.deniz, { email: 'specialist-unlinked@example.com', type: 'coach' });

    const mine = await request(app).get('/api/children').set(as('unlinked'));
    expect(mine.body.children.map((c) => c.name)).toEqual(['Deniz Demir']);

    const list = await request(app)
      .get(`/api/children/${children.deniz}/specialists`)
      .set(as('parent1'));
    expect(list.body.specialists).toHaveLength(3);
  });

  test('ignores capital letters and spaces around the email', async () => {
    const res = await link('parent1', children.deniz, {
      email: '  Specialist-Unlinked@Example.com ',
      type: 'coach',
    });
    expect(res.status).toBe(201);
  });

  test('answers 404 and creates no link for an email that is not registered', async () => {
    const before = countLinks();
    const res = await link('parent1', children.deniz, { email: 'nobody@example.com', type: 'coach' });

    expect(res.status).toBe(404);
    expect(countLinks()).toBe(before);
  });

  test('answers 404 for an email that belongs to a parent, not a specialist', async () => {
    const before = countLinks();
    const res = await link('parent1', children.deniz, { email: 'parent2@example.com', type: 'coach' });

    expect(res.status).toBe(404);
    expect(countLinks()).toBe(before);
  });

  test('answers 409 when the specialist is already linked', async () => {
    const before = countLinks();
    const res = await link('parent1', children.deniz, { email: 'teacher1@example.com', type: 'teacher' });

    expect(res.status).toBe(409);
    expect(countLinks()).toBe(before);
  });

  test('answers 400 for a specialist type that does not exist', async () => {
    const res = await link('parent1', children.deniz, {
      email: 'specialist-unlinked@example.com',
      type: 'wizard',
    });
    expect(res.status).toBe(400);
  });

  test('answers 400 when the email is missing', async () => {
    const res = await link('parent1', children.deniz, { type: 'coach' });
    expect(res.status).toBe(400);
  });

  test('answers 403 for the parent of another child and creates no link', async () => {
    const before = countLinks();
    const res = await link('parent2', children.deniz, {
      email: 'specialist-unlinked@example.com',
      type: 'coach',
    });

    expect(res.status).toBe(403);
    expect(countLinks()).toBe(before);
  });

  test.each(['teacher', 'unlinked', 'child1'])('answers 403 for %s', async (who) => {
    const before = countLinks();
    const res = await link(who, children.deniz, {
      email: 'specialist-unlinked@example.com',
      type: 'coach',
    });

    expect(res.status).toBe(403);
    expect(countLinks()).toBe(before);
  });
});

describe('DELETE /api/children/:childId/specialists/:specialistId (FR-M2-04, FR-M2-05)', () => {
  function unlink(who, childId, specialistId) {
    return request(app)
      .delete(`/api/children/${childId}/specialists/${specialistId}`)
      .set(as(who));
  }

  test('a parent unlinks a specialist and the specialist loses access at once', async () => {
    const before = countLinks();
    const res = await unlink('parent1', children.deniz, users.psychologist.id);

    expect(res.status).toBe(204);
    expect(countLinks()).toBe(before - 1);

    const mine = await request(app).get('/api/children').set(as('psychologist'));
    expect(mine.body.children).toEqual([]);
  });

  test('the other specialists keep their access', async () => {
    await unlink('parent1', children.deniz, users.psychologist.id);

    const mine = await request(app).get('/api/children').set(as('teacher'));
    expect(mine.body.children.map((c) => c.name)).toEqual(['Deniz Demir', 'Ela Kaya']);
  });

  test('answers 404 for a specialist who is not linked', async () => {
    const res = await unlink('parent1', children.deniz, users.unlinked.id);
    expect(res.status).toBe(404);
  });

  test('answers 404 for an id that is not a number', async () => {
    const res = await unlink('parent1', children.deniz, 'abc');
    expect(res.status).toBe(404);
  });

  test('answers 403 for the parent of another child and keeps the link', async () => {
    const before = countLinks();
    const res = await unlink('parent2', children.deniz, users.psychologist.id);

    expect(res.status).toBe(403);
    expect(countLinks()).toBe(before);
  });

  test.each(['teacher', 'psychologist', 'child1'])('answers 403 for %s', async (who) => {
    const before = countLinks();
    const res = await unlink(who, children.deniz, users.psychologist.id);

    expect(res.status).toBe(403);
    expect(countLinks()).toBe(before);
  });
});