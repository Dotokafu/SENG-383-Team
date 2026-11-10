const db = require('../db');

function findById(id) {
  return db
    .prepare('SELECT id, name, parent_id, user_id FROM children WHERE id = ?')
    .get(id);
}


function findByUserId(userId) {
  return db.prepare('SELECT id, name FROM children WHERE user_id = ?').get(userId);
}

function isSpecialistLinked(childId, specialistId) {
  const row = db
    .prepare('SELECT 1 AS linked FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
    .get(childId, specialistId);
  return Boolean(row);
}

function listByParent(parentId) {
  return db.prepare('SELECT id, name FROM children WHERE parent_id = ? ORDER BY id').all(parentId);
}


function listForSpecialist(specialistId) {
  return db
    .prepare(
      `SELECT c.id, c.name, l.specialist_type
       FROM specialist_links l
       JOIN children c ON c.id = l.child_id
       WHERE l.specialist_id = ?
       ORDER BY c.id`
    )
    .all(specialistId);
}

module.exports = { findById, findByUserId, isSpecialistLinked, listByParent, listForSpecialist };