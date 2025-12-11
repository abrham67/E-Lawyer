const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const mongoose = require('mongoose');

// Get all users (optionally filter by role via ?role=...)
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    let filter = {};
    if (role) {
      // Case-insensitive exact match for role
      const safe = String(role).replace(/[^a-zA-Z]/g, '');
      filter = { role: { $regex: new RegExp(`^${safe}$`, 'i') } };
    }
    const users = await User.find(filter).lean();
    // Remove password and convert _id to id for each user
    const safeUsers = users.map(({ password, _id, ...rest }) => ({ id: _id.toString(), ...rest }));
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    // Sanitize user object for response
    const { password, _id, ...userRest } = newUser.toObject();
    res.status(201).json({ id: _id.toString(), ...userRest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const foundUser = await User.findById(String(id)).lean();
    if (!foundUser) return res.status(404).json({ error: 'User not found' });
    // Remove password and convert _id to id
    const { password, _id, ...rest } = foundUser;
    res.json({ id: _id.toString(), ...rest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user (self-service only, limited fields; sensitive IDs locked)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const targetId = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    // Only the authenticated user can update their own account
    if (String(req.user.id) !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Whitelist of editable fields (sensitive identifiers excluded)
    const allowed = new Set(['full_name', 'email', 'specialization']);
    const updates = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (allowed.has(k)) updates[k] = v;
    }
    // Always update timestamp
    updates.updated_at = new Date();

    const updatedUser = await User.findByIdAndUpdate(targetId, updates, { new: true }).lean();
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    const { password, _id, ...rest } = updatedUser;
    res.json({ id: _id.toString(), ...rest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id).lean();
    if (!deletedUser) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, ...rest } = req.body;
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields: email, password, full_name, role' });
    }
    // Prevent duplicate email registration
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, full_name, role, ...rest });
    await newUser.save();
    // Sanitize user object for response
    const { password: pw, _id, ...userRest } = newUser.toObject();
    res.status(201).json({ message: 'User registered', user: { id: _id.toString(), ...userRest } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    // Explicitly select password field
    const user = await User.findOne({ email }).select('+password').lean();
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1d' });
    // Sanitize user object for response
    const { password: pw, _id, ...userRest } = user;
    // Ensure role is present in userRest
    res.json({ token, user: { id: _id.toString(), role: user.role, ...userRest } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected route example
router.get('/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Remove password and convert _id to id
  const { password, _id, ...rest } = user;
  res.json({ id: _id.toString(), ...rest });
});

module.exports = router;
