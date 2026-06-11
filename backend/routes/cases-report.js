// Case reporting endpoint for analytics/metrics
const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const User = require('../models/User');
const Session = require('../models/Session');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/cases/report?user_id=...&role=...
router.get('/report', authenticateToken, authorizeRoles('lawyer', 'client', 'admin', 'court'), async (req, res) => {
  try {
    const { user_id, role } = req.query;
    let query = {};
    if (role === 'lawyer') query.lawyerId = user_id;
    if (role === 'client') query.clientId = user_id;
    // For admin/court, show all
    const cases = await Case.find(query);
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/report/cases
router.get('/cases', authenticateToken, authorizeRoles('admin', 'lawyer', 'court'), async (req, res) => {
  try {
    const cases = await Case.find({});
    res.json({ total: cases.length, cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/report/users
router.get('/users', authenticateToken, authorizeRoles('admin', 'court'), async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ total: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/report/sessions
router.get('/sessions', authenticateToken, authorizeRoles('admin', 'lawyer', 'court'), async (req, res) => {
  try {
    const sessions = await Session.find({});
    res.json({ total: sessions.length, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
