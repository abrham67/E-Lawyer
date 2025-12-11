const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Dummy monthly activity endpoint
router.get('/monthly', authenticateToken, async (req, res) => {
  // Replace with real aggregation logic as needed
  res.json({ activity: null });
});

module.exports = router;
