
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
};

const users = {};
const children = {};
const tokens = {};
const ids = {};

const as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });
const taskCount = () =>
  db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE child_id = ?').get(children.deniz).n;


const CHILD_ENDPOINTS = [
  { name: 'GET tasks', method: 'get', path: (c) => `/api/children/${c}/tasks` },
  {
    name: 'POST tasks',
    method: 'post',
    path: (c) => `/api/children/${c}/tasks`,
    body: { title: 'Tie shoelaces', area: 'self_care', dueDate: '2026-11-10' },
  },
  {
    name: 'PATCH task done',
    method: 'patch',
    path: (c) => `/api/children/${c}/tasks/${ids.task}/done`,
  },
  { name: 'GET specialists', method: 'get', path: (c) => `/api/children/${c}/specialists` },
  {
    name: 'POST specialists',
    method: 'post',
    path: (c) => `/api/children/${c}/specialists`,
    body: { email: EMAILS.doctor, type: 'doctor' },
  },
  {
    name: 'DELETE specialist',
    method: 'delete',
    path: (c) => `/api/children/${c}/specialists/${ids.teacher}`,
  },
];

function send(endpoint, childId, who) {
  const req = request(app)[endpoint.method](endpoint.path(childId));
  if (who) req.set(as(who));
  return endpoint.body ? req.send(endpoint.body) : req;
}

const endpointCases = CHILD_ENDPOINTS.map((endpoint) => [endpoint.name, endpoint]);

beforeAll(() => {
  seed(db);

  const userRow = db.prepare('SELECT id, role FROM users WHERE email = ?');
  for (const [name, email] of Object.entries(EMAILS)) {
    users[name] = userRow.get(email);
    tokens[name] = jwt.sign({ id: users[name].id, role: users[name].role }, JWT_SECRET);
  }

  children.deniz = db.prepare('SELECT id FROM children WHERE name = ?').get('Deniz Demir').id;
  ids.teacher = users.teacher.id;
  ids.task = db.prepare('SELECT id FROM tasks WHERE child_id = ? LIMIT 1').get(children.deniz).id;
});

// Every test starts from the same demo data (the ids stay the same after a reseed).
beforeEach(() => {
  seed(db);
});

afterAll(() => {
  db.close();
});

describe('A specialist who was never linked is blocked everywhere (FR-M2-05)', () => {
  test.each(endpointCases)('%s answers 403 and returns no data', async (_name, endpoint) => {
    const res = await send(endpoint, children.deniz, 'unlinked');

    expect(res.status).toBe(403);
    expect(res.body.tasks).toBeUndefined();
    expect(res.body.task).toBeUndefined();
    expect(res.body.specialists).toBeUndefined();
  });

  test('a blocked POST does not change the data', async () => {
    const before = taskCount();
    await send(CHILD_ENDPOINTS[1], children.deniz, 'unlinked');
    expect(taskCount()).toBe(before);
  });
});

describe("A specialist linked to another child is blocked on this child's endpoints", () => {
  test.each(endpointCases)('%s answers 403', async (_name, endpoint) => {
    // The doctor is linked to Ela only, not to Deniz.
    const res = await send(endpoint, children.deniz, 'doctor');
    expect(res.status).toBe(403);
  });
});

describe('Requests without a token are rejected (FR-M1-05)', () => {
  test.each(endpointCases)('%s answers 401', async (_name, endpoint) => {
    const res = await send(endpoint, children.deniz, null);
    expect(res.status).toBe(401);
  });
});

describe('Flow 2: access ends as soon as the parent unlinks the specialist (SRS Section 4)', () => {
  test('works while linked, is blocked after unlinking, works again after linking again', async () => {
    const tasksUrl = `/api/children/${children.deniz}/tasks`;
    const newTask = { title: 'Water the plant', area: 'self_care', dueDate: '2026-11-10' };

    // 1. The psychologist is linked to Deniz and can use the child's data.
    const linked = await request(app).get(tasksUrl).set(as('psychologist'));
    expect(linked.status).toBe(200);

    // 2. The parent unlinks the psychologist.
    const unlink = await request(app)
      .delete(`/api/children/${children.deniz}/specialists/${users.psychologist.id}`)
      .set(as('parent1'));
    expect(unlink.status).toBe(204);

    // 3. From now on every request gets 403 and nothing is returned or saved.
    const before = taskCount();
    const blockedGet = await request(app).get(tasksUrl).set(as('psychologist'));
    const blockedPost = await request(app).post(tasksUrl).set(as('psychologist')).send(newTask);

    expect(blockedGet.status).toBe(403);
    expect(blockedGet.body.tasks).toBeUndefined();
    expect(blockedPost.status).toBe(403);
    expect(taskCount()).toBe(before);

    // 4. The other specialist keeps their access.
    const teacher = await request(app).get(tasksUrl).set(as('teacher'));
    expect(teacher.status).toBe(200);

    // 5. The parent links the psychologist again and the access is back.
    const relink = await request(app)
      .post(`/api/children/${children.deniz}/specialists`)
      .set(as('parent1'))
      .send({ email: EMAILS.psychologist, type: 'psychologist' });
    expect(relink.status).toBe(201);

    const again = await request(app).get(tasksUrl).set(as('psychologist'));
    expect(again.status).toBe(200);
  });
});