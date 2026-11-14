process.env.DB_PATH = ':memory:';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db');
const { seed } = require('../src/seed');
const { JWT_SECRET } = require('../src/config');
const app = require('../src/app');
const { isValidDate, addSixDays, isValidTime } = require('../src/utils/dates');

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
const listEvents = (who, child, query = '') =>
  call('get', `/api/children/${children[child]}/events${query}`, who);
const addEvent = (who, child, body) =>
  call('post', `/api/children/${children[child]}/events`, who, body);

const validEvent = {
  title: 'Speech therapy session',
  date: '2026-11-12',
  startTime: '14:00',
  endTime: '15:00',
};

function eventCount(childKey) {
  return db.prepare('SELECT COUNT(*) AS n FROM events WHERE child_id = ?').get(children[childKey]).n;
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

describe('Date and time helpers (utils/dates)', () => {
  test('isValidDate accepts real YYYY-MM-DD dates and rejects invalid ones', () => {
    expect(isValidDate('2026-10-26')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('26-10-2026')).toBe(false);
    expect(isValidDate('')).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });

  test('addSixDays returns the Sunday of the week starting on Monday', () => {
    expect(addSixDays('2026-10-26')).toBe('2026-11-01');
    expect(addSixDays('2026-11-02')).toBe('2026-11-08');
  });

  test('isValidTime accepts 24-hour HH:MM strings and rejects invalid times', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:30')).toBe(false);
    expect(isValidTime('12:60')).toBe(false);
    expect(isValidTime(null)).toBe(false);
  });
});

describe('GET /api/children/:childId/events (FR-M3-03, FR-M3-04)', () => {
  test('a parent gets all events of their child, with who created them', async () => {
    const res = await listEvents('parent1', 'deniz');

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(7); // seed data: 5 in week 2026-10-26 + 2 in week 2026-11-02
    const event = res.body.events[0];
    expect(Object.keys(event).sort()).toEqual([
      'childId',
      'createdBy',
      'date',
      'endTime',
      'id',
      'startTime',
      'title',
    ]);
    expect(event.childId).toBe(children.deniz);
    expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event.createdBy).toEqual({ id: expect.any(Number), name: expect.any(String) });
  });

  test('events are sorted by date and start time', async () => {
    const res = await listEvents('parent1', 'deniz');
    const keys = res.body.events.map((e) => `${e.date} ${e.startTime || ''}`);
    expect(keys).toEqual([...keys].sort());
  });

  test('a linked specialist sees the events created by the parent and other specialists', async () => {
    const res = await listEvents('psychologist', 'deniz');

    expect(res.status).toBe(200);
    const creators = new Set(res.body.events.map((e) => e.createdBy.name));
    expect(creators).toContain('Ayse Demir'); // the parent
    expect(creators).toContain('Zeynep Arslan'); // the teacher
  });

  test('the child sees their own events (FR-M3-04)', async () => {
    const res = await listEvents('child1', 'deniz');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(7);
  });

  test("the child cannot see another child's events", async () => {
    const res = await listEvents('child1', 'ela');
    expect(res.status).toBe(403);
    expect(res.body.events).toBeUndefined();
  });

  test('?week= returns only the events in that week, Monday to Sunday (FR-M3-03)', async () => {
    const res = await listEvents('parent1', 'deniz', '?week=2026-10-26');

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(5);
    for (const event of res.body.events) {
      expect(event.date >= '2026-10-26' && event.date <= '2026-11-01').toBe(true);
    }
  });

  test('a week without events gives an empty list, not an error', async () => {
    const res = await listEvents('parent1', 'deniz', '?week=2026-11-09');
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
  });

  test.each(['abc', '2026-13-01', '2026-02-31', '26-10-2026'])(
    'rejects week=%s with 400',
    async (week) => {
      const res = await listEvents('parent1', 'deniz', `?week=${week}`);
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('week');
    }
  );

  test('an unlinked specialist gets 403 and no event data (FR-M2-05)', async () => {
    const res = await listEvents('unlinked', 'deniz');
    expect(res.status).toBe(403);
    expect(res.body.events).toBeUndefined();
  });

  test('a specialist linked to another child only gets 403', async () => {
    const res = await listEvents('doctor', 'deniz');
    expect(res.status).toBe(403);
  });

  test("a parent cannot see another family's child's events", async () => {
    const res = await listEvents('parent2', 'deniz');
    expect(res.status).toBe(403);
  });

  test('a request without a token gets 401 (FR-M1-05)', async () => {
    const res = await listEvents(null, 'deniz');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/children/:childId/events (FR-M3-01, FR-M3-02, FR-M3-04)', () => {
  test('a parent adds an event to the schedule', async () => {
    const res = await addEvent('parent1', 'deniz', validEvent);

    expect(res.status).toBe(201);
    expect(res.body.event).toMatchObject({
      childId: children.deniz,
      title: 'Speech therapy session',
      date: '2026-11-12',
      startTime: '14:00',
      endTime: '15:00',
      createdBy: { id: users.parent1.id, name: 'Ayse Demir' },
    });
  });

  test('a linked specialist adds an event and is recorded as the creator', async () => {
    const res = await addEvent('teacher', 'deniz', {
      ...validEvent,
      title: 'Extra reading session',
    });

    expect(res.status).toBe(201);
    expect(res.body.event.createdBy).toEqual({ id: users.teacher.id, name: 'Zeynep Arslan' });
  });

  test('the new event shows up in the weekly schedule of the child', async () => {
    const created = await addEvent('parent1', 'deniz', {
      ...validEvent,
      title: 'Dentist check-up',
      date: '2026-11-13',
    });
    const list = await listEvents('child1', 'deniz', '?week=2026-11-09');

    expect(list.body.events.map((e) => e.id)).toContain(created.body.event.id);
  });

  test('start and end times are optional and the title is trimmed', async () => {
    const res = await addEvent('parent1', 'deniz', {
      title: '  School trip  ',
      date: '2026-11-14',
    });

    expect(res.status).toBe(201);
    expect(res.body.event.title).toBe('School trip');
    expect(res.body.event.startTime).toBeNull();
    expect(res.body.event.endTime).toBeNull();
  });

  test('a child cannot add an event, not even to their own schedule (FR-M3-04)', async () => {
    const before = eventCount('deniz');
    const res = await addEvent('child1', 'deniz', validEvent);

    expect(res.status).toBe(403);
    expect(eventCount('deniz')).toBe(before);
  });

  test('an unlinked specialist cannot add an event (FR-M2-05)', async () => {
    const before = eventCount('deniz');
    const res = await addEvent('unlinked', 'deniz', validEvent);

    expect(res.status).toBe(403);
    expect(eventCount('deniz')).toBe(before);
  });

  test("a parent cannot add an event for another family's child", async () => {
    const res = await addEvent('parent2', 'deniz', validEvent);
    expect(res.status).toBe(403);
  });

  test('a request without a token gets 401', async () => {
    const res = await addEvent(null, 'deniz', validEvent);
    expect(res.status).toBe(401);
  });

  // [description of invalid input, request body, field named in the error]
  test.each([
    ['title is missing', { ...validEvent, title: undefined }, 'title'],
    ['title is blank', { ...validEvent, title: '   ' }, 'title'],
    ['date is missing', { ...validEvent, date: undefined }, 'date'],
    ['date is not YYYY-MM-DD', { ...validEvent, date: '12/11/2026' }, 'date'],
    ['date does not exist', { ...validEvent, date: '2026-02-30' }, 'date'],
    ['start time is invalid', { ...validEvent, startTime: '25:00' }, 'startTime'],
    ['end time is invalid', { ...validEvent, endTime: '9:5' }, 'endTime'],
    ['end time is given without start time', { title: 'Test', date: '2026-11-12', endTime: '15:00' }, 'startTime'],
    ['end time equals start time', { ...validEvent, startTime: '14:00', endTime: '14:00' }, 'endTime'],
    ['end time is before start time', { ...validEvent, startTime: '15:00', endTime: '14:00' }, 'endTime'],
  ])('rejects the event when %s, and names the field (FR-M3-02)', async (_name, body, field) => {
    const before = eventCount('deniz');
    const res = await addEvent('parent1', 'deniz', body);

    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
    expect(eventCount('deniz')).toBe(before);
  });

  test('an empty request body gets 400, not a crash', async () => {
    const res = await call('post', `/api/children/${children.deniz}/events`, 'parent1');
    expect(res.status).toBe(400);
  });
});
