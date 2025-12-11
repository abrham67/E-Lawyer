const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const Case = require('../models/Case');
const User = require('../models/User');
const Session = require('../models/Session');

// Case report
router.get('/cases', authorize(['admin', 'lawyer']), async (req, res) => {
  try {
    const cases = await Case.find();
    res.json({ total: cases.length, cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User report
router.get('/users', authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find();
    res.json({ total: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Session report
router.get('/sessions', authorize(['admin', 'lawyer']), async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json({ total: sessions.length, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
