const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/auth/me - Return current user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const id = req.user && (req.user.id || req.user._id || req.user.userId || req.user.sub);
    if (!id) {
      return res.status(401).json({ error: 'Invalid auth payload' });
    }
    // Use lean to return a plain object and normalize id field for frontend
    const userDoc = await User.findById(id).select('-password').lean();
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { _id, password, ...rest } = userDoc;
    const normalized = { id: _id.toString(), ...rest };
    // Disable caching for this endpoint
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.json({ user: normalized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
