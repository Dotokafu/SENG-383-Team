const db = require('../db');


const SELECT_TASK = `
  SELECT t.id, t.child_id, t.title, t.description, t.area, t.due_date,
         t.status, t.done_at, t.assigned_by, u.name AS assigned_by_name
  FROM tasks t
  JOIN users u ON u.id = t.assigned_by
`;


function findByChild(childId, from, to) {
  if (from && to) {
    return db
      .prepare(`${SELECT_TASK} WHERE t.child_id = ? AND t.due_date BETWEEN ? AND ? ORDER BY t.due_date, t.id`)
      .all(childId, from, to);
  }
  return db.prepare(`${SELECT_TASK} WHERE t.child_id = ? ORDER BY t.due_date, t.id`).all(childId);
}

function findById(id) {
  return db.prepare(`${SELECT_TASK} WHERE t.id = ?`).get(id);
}

function create({ childId, assignedBy, title, description, area, dueDate }) {
  const result = db
    .prepare(
      `INSERT INTO tasks (child_id, assigned_by, title, description, area, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(childId, assignedBy, title, description, area, dueDate);
  return findById(Number(result.lastInsertRowid));
}

function markDone(id) {
  db.prepare("UPDATE tasks SET status = 'done', done_at = datetime('now') WHERE id = ?").run(id);
  return findById(id);
}

module.exports = { findByChild, findById, create, markDone };