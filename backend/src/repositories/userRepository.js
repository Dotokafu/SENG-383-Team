const db = require('../db');

function findByEmail(email) {
  return db
    .prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?')
    .get(email);
}

function findById(id) {
  return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id);
}

function findSpecialistByEmail(email) {
  return db
    .prepare("SELECT id, name, email FROM users WHERE email = ? AND role = 'specialist'")
    .get(email);
}

module.exports = { findByEmail, findById, findSpecialistByEmail };