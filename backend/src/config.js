require('dotenv').config({ quiet: true });

const JWT_SECRET =
  process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : undefined);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a value.');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: '8h',
};