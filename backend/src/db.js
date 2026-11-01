const Database = require('better-sqlite3');
const path = require('path');
const { createTables } = require('./schema');
 
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'steptrack.db');
const db = new Database(dbPath);
 
db.pragma('foreign_keys = ON'); 
createTables(db); 
 
module.exports = db;