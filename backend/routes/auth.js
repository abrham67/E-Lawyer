const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const { verifyJwtToken } = require('../utils/jwtSecret');

// Returns the current session user based on JWT token from cookie or header, or null if not authenticated
router.get('/session', async (req, res) => {
  try {
    // Try to get token from cookie first (preferred method)
    let token = req.cookies && req.cookies.authToken;

    // Fall back to Authorization header for backwards compatibility
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.json({ user: null });
    }

    let decoded;
    try {
      decoded = verifyJwtToken(token);
    } catch (err) {
      return res.json({ user: null });
    }

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res.json({ user: null });
    }

    // Remove password and convert _id to id
    const { password, _id, ...rest } = user;
    res.json({ user: { id: _id.toString(), ...rest } });
  } catch (err) {
    console.error('Error in /api/auth/session:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
