const express = require('express');
const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  const user = userRepository.findById(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'Account no longer exists' });
  }
  res.json({ user });
});

module.exports = router;