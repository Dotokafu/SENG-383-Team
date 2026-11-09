
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const { seed, DEMO_PASSWORD } = require('../src/seed');
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

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
}

// Small helpers so every test reads as "who does what".
function call(method, path, who, body) {
  const req = request(app)[method](path);
  if (who) req.set('Authorization', `Bearer ${tokenFor(users[who])}`);
  return body ? req.send(body) : req;
}
const listTasks = (who, child, query = '') => call('get', `/api/children/${children[child]}/tasks${query}`, who);
const addTask = (who, child, body) => call('post', `/api/children/${children[child]}/tasks`, who, body);
const markDone = (who, child, taskId) =>
  call('patch', `/api/children/${children[child]}/tasks/${taskId}/done`, who);

const validTask = {
  title: 'Tie shoelaces',
  description: 'Tie both shoes without help',
  area: 'self_care',
  dueDate: '2026-11-10',
};

function taskCount(childKey) {
  return db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE child_id = ?').get(children[childKey]).n;
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
});

afterAll(() => {
  db.close();
});

describe('GET /api/children/:childId/tasks (FR-M4-02, FR-M4-04)', () => {
  test('a parent gets all tasks of their child, with who assigned them', async () => {
    const res = await listTasks('parent1', 'deniz');

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(10); // seed data: 2 + 6 + 2 tasks
    const task = res.body.tasks[0];
    expect(Object.keys(task).sort()).toEqual(
      ['area', 'assignedBy', 'childId', 'description', 'doneAt', 'dueDate', 'id', 'status', 'title']
    );
    expect(task.childId).toBe(children.deniz);
    expect(task.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(task.assignedBy).toEqual({ id: expect.any(Number), name: expect.any(String) });
  });

  test('tasks are sorted by due date', async () => {
    const res = await listTasks('parent1', 'deniz');
    const dates = res.body.tasks.map((t) => t.dueDate);
    expect(dates).toEqual([...dates].sort());
  });

  test('a linked specialist sees the tasks of every assigner, including the parent', async () => {
    const res = await listTasks('psychologist', 'deniz');

    expect(res.status).toBe(200);
    const assigners = new Set(res.body.tasks.map((t) => t.assignedBy.name));
    expect(assigners).toContain('Ayse Demir'); // the parent
    expect(assigners).toContain('Zeynep Arslan'); // the teacher
  });

  test('the child sees their own tasks', async () => {
    const res = await listTasks('child1', 'deniz');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(10);
  });

  test("the child cannot see another child's tasks", async () => {
    const res = await listTasks('child1', 'ela');
    expect(res.status).toBe(403);
    expect(res.body.tasks).toBeUndefined();
  });

  test('?week= returns only the tasks due in that week, Monday to Sunday', async () => {
    const res = await listTasks('parent1', 'deniz', '?week=2026-10-26');

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(6);
    expect(res.body.tasks.filter((t) => t.status === 'done')).toHaveLength(3);
    for (const task of res.body.tasks) {
      expect(task.dueDate >= '2026-10-26' && task.dueDate <= '2026-11-01').toBe(true);
    }
  });

  test('a week without tasks gives an empty list, not an error (FR-M7-03)', async () => {
    const res = await listTasks('parent1', 'deniz', '?week=2026-11-09');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });

  test.each(['abc', '2026-13-01', '2026-02-31', '26-10-2026'])('rejects week=%s with 400', async (week) => {
    const res = await listTasks('parent1', 'deniz', `?week=${week}`);
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('week');
  });

  test('an unlinked specialist gets 403 and no task data (FR-M2-05)', async () => {
    const res = await listTasks('unlinked', 'deniz');
    expect(res.status).toBe(403);
    expect(res.body.tasks).toBeUndefined();
  });

  test('a specialist linked to another child only gets 403', async () => {
    const res = await listTasks('doctor', 'deniz');
    expect(res.status).toBe(403);
  });

  test('a request without a token gets 401 (FR-M1-05)', async () => {
    const res = await listTasks(null, 'deniz');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/children/:childId/tasks (FR-M4-01, FR-M4-05)', () => {
  test('a parent assigns a task, which starts as open', async () => {
    const res = await addTask('parent1', 'deniz', validTask);

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      childId: children.deniz,
      title: 'Tie shoelaces',
      description: 'Tie both shoes without help',
      area: 'self_care',
      dueDate: '2026-11-10',
      status: 'open',
      doneAt: null,
      assignedBy: { id: users.parent1.id, name: 'Ayse Demir' },
    });
  });

  test('a linked specialist assigns a task and is recorded as the assigner', async () => {
    const res = await addTask('teacher', 'deniz', { ...validTask, title: 'Name five animals', area: 'language' });

    expect(res.status).toBe(201);
    expect(res.body.task.assignedBy).toEqual({ id: users.teacher.id, name: 'Zeynep Arslan' });
  });

  test('the new task shows up in the list of the child', async () => {
    const created = await addTask('parent1', 'deniz', { ...validTask, title: 'Water the plant' });
    const list = await listTasks('child1', 'deniz');

    expect(list.body.tasks.map((t) => t.id)).toContain(created.body.task.id);
  });

  test('the description is optional and trimmed values are stored', async () => {
    const res = await addTask('parent1', 'deniz', { title: '  Brush teeth  ', area: 'self_care', dueDate: '2026-11-10' });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Brush teeth');
    expect(res.body.task.description).toBeNull();
  });

  test('a child cannot create a task, not even for themselves (FR-M4-05)', async () => {
    const before = taskCount('deniz');
    const res = await addTask('child1', 'deniz', validTask);

    expect(res.status).toBe(403);
    expect(taskCount('deniz')).toBe(before);
  });

  test('an unlinked specialist cannot create a task (FR-M2-05)', async () => {
    const before = taskCount('deniz');
    const res = await addTask('unlinked', 'deniz', validTask);

    expect(res.status).toBe(403);
    expect(taskCount('deniz')).toBe(before);
  });

  test("a parent cannot create a task for another family's child", async () => {
    const res = await addTask('parent2', 'deniz', validTask);
    expect(res.status).toBe(403);
  });

  test('a request without a token gets 401', async () => {
    const res = await addTask(null, 'deniz', validTask);
    expect(res.status).toBe(401);
  });

  // [name of the missing part, body, field named in the error]
  test.each([
    ['title is missing', { ...validTask, title: undefined }, 'title'],
    ['title is blank', { ...validTask, title: '   ' }, 'title'],
    ['area is missing', { ...validTask, area: undefined }, 'area'],
    ['area is unknown', { ...validTask, area: 'music' }, 'area'],
    ['due date is missing', { ...validTask, dueDate: undefined }, 'dueDate'],
    ['due date is not a date', { ...validTask, dueDate: 'tomorrow' }, 'dueDate'],
    ['due date does not exist', { ...validTask, dueDate: '2026-02-30' }, 'dueDate'],
    ['description is not text', { ...validTask, description: 42 }, 'description'],
  ])('rejects the task when the %s, and names the field', async (_name, body, field) => {
    const before = taskCount('deniz');
    const res = await addTask('parent1', 'deniz', body);

    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
    expect(taskCount('deniz')).toBe(before); // nothing was saved
  });

  test('an empty request body gets 400, not a crash', async () => {
    const res = await call('post', `/api/children/${children.deniz}/tasks`, 'parent1');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/children/:childId/tasks/:taskId/done (FR-M4-03, FR-M4-05)', () => {
  // Every test gets its own open task, so the tests do not depend on each other.
  async function newOpenTask(child = 'deniz', assigner = 'parent1') {
    const res = await addTask(assigner, child, validTask);
    return res.body.task.id;
  }

  test('the child marks their task as done', async () => {
    const taskId = await newOpenTask();
    const res = await markDone('child1', 'deniz', taskId);

    expect(res.status).toBe(200);
    expect(res.body.task.id).toBe(taskId);
    expect(res.body.task.status).toBe('done');
    expect(res.body.task.doneAt).toEqual(expect.any(String));
  });

  test('marking the same task twice is allowed and keeps the first done time', async () => {
    const taskId = await newOpenTask();
    const first = await markDone('child1', 'deniz', taskId);
    const second = await markDone('child1', 'deniz', taskId);

    expect(second.status).toBe(200);
    expect(second.body.task.status).toBe('done');
    expect(second.body.task.doneAt).toBe(first.body.task.doneAt);
  });

  test('a parent cannot mark a task as done', async () => {
    const taskId = await newOpenTask();
    const res = await markDone('parent1', 'deniz', taskId);

    expect(res.status).toBe(403);
    expect(db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId).status).toBe('open');
  });

  test('a linked specialist cannot mark a task as done', async () => {
    const taskId = await newOpenTask();
    const res = await markDone('teacher', 'deniz', taskId);

    expect(res.status).toBe(403);
    expect(db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId).status).toBe('open');
  });

  test("a child cannot mark a task of another child, even by using their own child id in the URL", async () => {
    const elaTask = await newOpenTask('ela', 'parent2');
    const res = await markDone('child1', 'deniz', elaTask);

    expect(res.status).toBe(404);
    expect(db.prepare('SELECT status FROM tasks WHERE id = ?').get(elaTask).status).toBe('open');
  });

  test("a child cannot use another child's URL", async () => {
    const elaTask = await newOpenTask('ela', 'parent2');
    const res = await markDone('child1', 'ela', elaTask);

    expect(res.status).toBe(403);
    expect(db.prepare('SELECT status FROM tasks WHERE id = ?').get(elaTask).status).toBe('open');
  });

  test('an unknown task gets 404', async () => {
    const res = await markDone('child1', 'deniz', 99999);
    expect(res.status).toBe(404);
  });

  test('a task id that is not a number gets 400', async () => {
    const res = await markDone('child1', 'deniz', 'abc');
    expect(res.status).toBe(400);
  });

  test('a request without a token gets 401', async () => {
    const res = await markDone(null, 'deniz', 1);
    expect(res.status).toBe(401);
  });

  test('a child cannot edit or delete a task: there is no such endpoint (FR-M4-05)', async () => {
    const taskId = await newOpenTask();
    const base = `/api/children/${children.deniz}/tasks/${taskId}`;

    const put = await call('put', base, 'child1', { title: 'Changed' });
    const del = await call('delete', base, 'child1');

    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
    expect(db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId).title).toBe('Tie shoelaces');
  });
});

describe('Flow 1: link, assign, complete (SRS Section 4)', () => {
  test('the teacher assigns a task, the child completes it, the teacher sees it as done', async () => {
    // Real logins, no hand-made tokens: this is the path the E2E test will use in the browser.
    const login = (email) => request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
    const teacherToken = (await login(EMAILS.teacher)).body.token;
    const childToken = (await login(EMAILS.child1)).body.token;
    const auth = (token) => ({ Authorization: `Bearer ${token}` });
    const base = `/api/children/${children.deniz}/tasks`;

    const created = await request(app).post(base).set(auth(teacherToken)).send(validTask);
    expect(created.status).toBe(201);
    const taskId = created.body.task.id;

    const done = await request(app).patch(`${base}/${taskId}/done`).set(auth(childToken));
    expect(done.status).toBe(200);

    const list = await request(app).get(base).set(auth(teacherToken));
    const task = list.body.tasks.find((t) => t.id === taskId);
    expect(task.status).toBe('done');
    expect(task.assignedBy.id).toBe(users.teacher.id);
  });
});