const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const row = db.prepare('SELECT 1 AS ok').get();
  res.json({
    status: 'ok',
    database: row.ok === 1 ? 'connected' : 'error',
  });
});

module.exports = router;