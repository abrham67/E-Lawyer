const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getJwtSecret } = require('../utils/jwtSecret');
const mongoose = require('mongoose');

const SECRET = getJwtSecret();

const serializeUser = (userDoc = {}) => {
  const { password, _id, ...rest } = userDoc;
  return { id: _id ? _id.toString() : undefined, ...rest };
};

const isAdminOrCourt = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'court';
};

// Public registration (hash password, prevent duplicates)
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, ...rest } = req.body || {};
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields: email, password, full_name, role' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, full_name, role, ...rest });
    await newUser.save();
    res.status(201).json({ message: 'User registered', user: serializeUser(newUser.toObject()) });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Public login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const user = await User.findOne({ email }).select('+password').lean();
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1d' });
    res.json({ token, user: { ...serializeUser(user), role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated self profile
router.get('/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(serializeUser(user));
});

// Get all users (admin/court only, optional role filter)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    let filter = {};
    if (role) {
      const safe = String(role).replace(/[^a-zA-Z]/g, '');
      filter = { role: { $regex: new RegExp(`^${safe}$`, 'i') } };
    }
    const users = await User.find(filter).lean();
    res.json(users.map(serializeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin create user (password hashed, duplicates prevented)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { email, password, full_name, role, ...rest } = req.body || {};
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields: email, password, full_name, role' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, full_name, role, ...rest });
    await newUser.save();
    res.status(201).json(serializeUser(newUser.toObject()));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a single user by ID (self or admin/court)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const foundUser = await User.findById(String(id)).lean();
    if (!foundUser) return res.status(404).json({ error: 'User not found' });
    const isSelf = String(req.user.id) === String(id);
    if (!isSelf && !isAdminOrCourt(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(serializeUser(foundUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user (self-service or admin, limited fields)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const targetId = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const isSelf = String(req.user.id) === targetId;
    if (!isSelf && !isAdminOrCourt(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const selfAllowed = new Set(['full_name', 'email', 'specialization']);
    const privilegedAllowed = new Set(['full_name', 'email', 'specialization', 'role', 'is_suspended', 'suspension_reason']);
    const allowed = isAdminOrCourt(req)
      ? privilegedAllowed
      : (isSelf ? selfAllowed : privilegedAllowed);

    const updates = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (allowed.has(k)) updates[k] = v;
    }
    updates.updated_at = new Date();

    const updatedUser = await User.findByIdAndUpdate(targetId, updates, { new: true }).lean();
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(serializeUser(updatedUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user (self or admin/court)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const targetId = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const isSelf = String(req.user.id) === targetId;
    const role = String(req.user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    // Deleting other system users is admin-only
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: admin required to delete other users' });
    }
    const deletedUser = await User.findByIdAndDelete(targetId).lean();
    if (!deletedUser) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
