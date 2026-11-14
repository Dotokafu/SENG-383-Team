// Starts the backend for the E2E tests with a fresh database that only holds the demo data.
// The real steptrack.db of the developer is never touched.
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'e2e-test.db');
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  fs.rmSync(dbPath + suffix, { force: true });
}

process.env.DB_PATH = dbPath;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
process.env.PORT = process.env.PORT || '3001';

const db = require('../../backend/src/db');
const { seed } = require('../../backend/src/seed');
seed(db);

require('../../backend/src/server');
