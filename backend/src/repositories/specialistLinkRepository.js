const db = require('../db');

function create(childId, specialistId, specialistType) {
  const info = db
    .prepare(
      'INSERT INTO specialist_links (child_id, specialist_id, specialist_type) VALUES (?, ?, ?)'
    )
    .run(childId, specialistId, specialistType);
  return Number(info.lastInsertRowid);
}

function exists(childId, specialistId) {
  const row = db
    .prepare('SELECT 1 AS found FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
    .get(childId, specialistId);
  return Boolean(row);
}

// Returns true when a link was deleted.
function remove(childId, specialistId) {
  const info = db
    .prepare('DELETE FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
    .run(childId, specialistId);
  return info.changes > 0;
}

function listForChild(childId) {
  return db
    .prepare(
      `SELECT l.id, l.specialist_id, l.specialist_type, l.created_at, u.name, u.email
       FROM specialist_links l
       JOIN users u ON u.id = l.specialist_id
       WHERE l.child_id = ?
       ORDER BY l.id`
    )
    .all(childId);
}

module.exports = { create, exists, remove, listForChild };