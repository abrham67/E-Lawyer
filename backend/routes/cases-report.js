// Case reporting endpoint for analytics/metrics
const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
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

module.exports = router;
