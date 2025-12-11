const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// Returns the current session user based on JWT token, or null if not authenticated
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.json({ user: null });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.json({ user: null });
    }
    const jwt = require('jsonwebtoken');
    const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
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
