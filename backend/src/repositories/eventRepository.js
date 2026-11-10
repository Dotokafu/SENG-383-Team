const db = require('../db');

const SELECT_EVENT = `
  SELECT e.id, e.child_id, e.title, e.event_date, e.start_time, e.end_time,
         e.created_by, u.name AS created_by_name
  FROM events e
  JOIN users u ON u.id = e.created_by
`;

// With `from` and `to` (inclusive, YYYY-MM-DD) only that range is returned.
function findByChild(childId, from, to) {
  if (from && to) {
    return db
      .prepare(
        `${SELECT_EVENT} WHERE e.child_id = ? AND e.event_date BETWEEN ? AND ?
         ORDER BY e.event_date, e.start_time, e.id`
      )
      .all(childId, from, to);
  }
  return db
    .prepare(`${SELECT_EVENT} WHERE e.child_id = ? ORDER BY e.event_date, e.start_time, e.id`)
    .all(childId);
}

function findById(id) {
  return db.prepare(`${SELECT_EVENT} WHERE e.id = ?`).get(id);
}

function create({ childId, createdBy, title, eventDate, startTime, endTime }) {
  const result = db
    .prepare(
      `INSERT INTO events (child_id, created_by, title, event_date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(childId, createdBy, title, eventDate, startTime, endTime);
  return findById(Number(result.lastInsertRowid));
}

module.exports = { findByChild, findById, create };
