const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const userRepository = require('../repositories/userRepository');

// Returns { token, user } or null.
// The same null is returned for an unknown email and for a wrong password,
// so the error never reveals which field was wrong (FR-M1-02).
async function login(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') return null;

  const user = userRepository.findByEmail(email.trim().toLowerCase());
  if (!user) return null;

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) return null;

  // The role comes from the account, never from the request (FR-M1-03).
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

module.exports = { login };