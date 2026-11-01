const TABLES = [
  'ai_summaries',
  'documents',
  'entries',
  'tasks',
  'events',
  'specialist_links',
  'children',
  'users',
]; 
 
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('parent', 'specialist', 'child'))
);
 
CREATE TABLE IF NOT EXISTS children (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  parent_id INTEGER NOT NULL REFERENCES users(id),
  user_id   INTEGER UNIQUE REFERENCES users(id) -- the child's own login account
);
 
CREATE TABLE IF NOT EXISTS specialist_links (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id        INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  specialist_id   INTEGER NOT NULL REFERENCES users(id),
  specialist_type TEXT NOT NULL CHECK (specialist_type IN
                    ('teacher', 'psychologist', 'doctor', 'special_education', 'coach')),
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (child_id, specialist_id)
);
 
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id   INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  event_date TEXT NOT NULL,  -- YYYY-MM-DD
  start_time TEXT,           -- HH:MM
  end_time   TEXT            -- HH:MM
);
 
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id    INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT,
  area        TEXT NOT NULL CHECK (area IN
                ('language', 'motor', 'social', 'emotional', 'cognitive', 'self_care')),
  due_date    TEXT NOT NULL, -- YYYY-MM-DD
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  done_at     TEXT
);
 
CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id   INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id),
  entry_date TEXT NOT NULL,  -- YYYY-MM-DD
  content    TEXT NOT NULL,
  edited     INTEGER NOT NULL DEFAULT 0 CHECK (edited IN (0, 1)),
  updated_at TEXT
);
 
CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id      INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  uploaded_by   INTEGER NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  uploaded_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE IF NOT EXISTS ai_summaries (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id       INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  requested_by   INTEGER NOT NULL REFERENCES users(id),
  reader_role    TEXT NOT NULL CHECK (reader_role IN ('parent', 'specialist')),
  week_start     TEXT NOT NULL, -- Monday of the week, YYYY-MM-DD
  text           TEXT NOT NULL,
  source_records TEXT NOT NULL, -- JSON list of the record ids the summary is based on
  feedback       TEXT CHECK (feedback IN ('helpful', 'incorrect')),
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
 
function createTables(db) {
  db.exec(CREATE_SQL);
}
 
function dropTables(db) {
  for (const table of TABLES) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
}
 
module.exports = { createTables, dropTables };