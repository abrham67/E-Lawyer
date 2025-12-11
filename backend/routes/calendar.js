const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// GET /api/calendar - Return empty events array for now
router.get('/', authenticateToken, async (req, res) => {
  res.json({ events: [] });
});

module.exports = router;
