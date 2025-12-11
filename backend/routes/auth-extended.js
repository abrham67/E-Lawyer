const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Registration endpoint
router.post('/register', async (req, res) => {
  try {
  const { email, password, full_name, role, bar_number, specialization, court_name, jurisdiction, court_type, id_number } = req.body;
    if (process.env.NODE_ENV !== 'production') {
      console.log('REGISTER PAYLOAD:', { email, hasPassword: !!password, full_name, role, bar_number, specialization, court_name, jurisdiction, court_type, id_number });
    }
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (role !== 'court' && !full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    // Basic server-side validation
  const lettersOnly = /^[A-Za-z\s.'-]+$/;
  const digitsOnly = /^\d+$/;
  const alphaNum = /^[A-Za-z0-9]+$/;
  const courtNameAllowed = /^[A-Za-z0-9\s.'\-&,()/:–—’]+$/;
    if (full_name && role !== 'court' && !lettersOnly.test(full_name)) {
      return res.status(400).json({ error: 'Full name must contain letters and spaces only' });
    }
    if (role === 'lawyer') {
      if (!bar_number || !digitsOnly.test(String(bar_number))) {
        return res.status(400).json({ error: 'Bar number must contain digits only' });
      }
      if (specialization && !lettersOnly.test(specialization)) {
        return res.status(400).json({ error: 'Specialization must contain letters and spaces only' });
      }
    }
    if (role === 'court') {
      if (!court_name || !courtNameAllowed.test(court_name)) {
        return res.status(400).json({ error: 'Court name contains invalid characters' });
      }
      if (!jurisdiction) {
        return res.status(400).json({ error: 'Jurisdiction is required for court registration' });
      }
      if (!court_type) {
        return res.status(400).json({ error: 'Court type is required for court registration' });
      }
    }
    if (id_number && !alphaNum.test(String(id_number))) {
      return res.status(400).json({ error: 'ID number must be letters and digits only' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      email,
      password: hashedPassword,
      role,
    };
    if (role !== 'court' && full_name) userData.full_name = full_name;
    if (role === 'lawyer') {
      if (bar_number) userData.bar_number = bar_number;
      if (specialization) userData.specialization = specialization;
    }
    if (role === 'court') {
      userData.court_name = court_name;
      userData.jurisdiction = jurisdiction;
      userData.court_type = court_type;
    }
    if (id_number) userData.id_number = id_number;
    const user = new User(userData);
    await user.save();
    const u = user.toObject();
    delete u.password;
    res.status(201).json({ message: 'User registered successfully', user: u });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
  if (process.env.NODE_ENV !== 'production') console.log('LOGIN ATTEMPT:', { email });
    if (!email || !password) {
  if (process.env.NODE_ENV !== 'production') console.log('Missing email or password');
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const user = await User.findOne({ email });
    if (!user) {
  if (process.env.NODE_ENV !== 'production') console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.is_suspended) {
      if (process.env.NODE_ENV !== 'production') console.log('Suspended account attempted login:', email);
      return res.status(403).json({ error: 'Account suspended', suspension_reason: user.suspension_reason || null });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
  if (process.env.NODE_ENV !== 'production') console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userObj = user.toObject();
    delete userObj.password;
    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1d' });
  if (process.env.NODE_ENV !== 'production') console.log('LOGIN SUCCESS:', { email, role: user.role });
    res.json({ token, user: userObj });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Protected route: get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const id = req.user && (req.user.id || req.user._id || req.user.userId || req.user.sub);
    if (!id) {
      return res.status(401).json({ error: 'Invalid auth payload' });
    }
    // Validate ObjectId to avoid CastError 500s
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(401).json({ error: 'Invalid user id in token' });
    }
    const user = await User.findById(String(id)).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    // Gracefully downgrade common cast errors to 401
    if (err && (err.name === 'CastError' || /Cast to ObjectId failed/i.test(err.message || ''))) {
      return res.status(401).json({ error: 'Invalid user id in token' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
