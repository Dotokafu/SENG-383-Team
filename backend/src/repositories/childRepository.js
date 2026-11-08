const db = require('../db');

function findById(id) {
  return db
    .prepare('SELECT id, name, parent_id, user_id FROM children WHERE id = ?')
    .get(id);
}

function isSpecialistLinked(childId, specialistId) {
  const row = db
    .prepare('SELECT 1 AS linked FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
    .get(childId, specialistId);
  return Boolean(row);
}

module.exports = { findById, isSpecialistLinked };