const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/credentials/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Upload credentials (documents) to lawyer profile
router.post('/:id/credentials', upload.single('file'), async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    profile.credentials.push({
      filename: req.file.originalname,
      filepath: req.file.path
    });
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update qualifications, expertise, experience, case history
router.put('/:id/details', async (req, res) => {
  try {
    const { qualifications, expertise, experience, caseHistory } = req.body;
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (qualifications) profile.qualifications = qualifications;
    if (expertise) profile.expertise = expertise;
    if (experience) profile.experience = experience;
    if (caseHistory) profile.caseHistory = caseHistory;
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const Profile = require('../models/Profile');

// Get all profiles, or all users with a specific role (e.g., clients)
const User = require('../models/User');
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    if (role) {
      // Return all users with the requested role (case-insensitive)
      const safeRole = String(role).replace(/[^a-zA-Z]/g, '');
      const usersByRole = await User.find({ role: { $regex: new RegExp(`^${safeRole}$`, 'i') } }).select('-password').lean();
      // normalize id field for frontend select
      const normalized = usersByRole.map(({ _id, password, ...rest }) => ({ id: _id.toString(), ...rest }));
      return res.json(normalized);
    }
    // Default: return all profiles
    const profiles = await Profile.find().lean();
    const normalized = profiles.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single profile by ID
router.get('/:id', async (req, res) => {
  try {
    // Try Profile first; if not found, fall back to User for basic info
    let profile = await Profile.findById(req.params.id).lean();
    if (profile) {
      const { _id, ...rest } = profile;
      return res.json({ id: _id.toString(), ...rest });
    }
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    const { _id, password, ...rest } = user;
    return res.json({ id: _id.toString(), ...rest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new profile
router.post('/', async (req, res) => {
  try {
    const newProfile = new Profile(req.body);
    await newProfile.save();
    res.status(201).json(newProfile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a profile
router.put('/:id', async (req, res) => {
  try {
    const updated = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Profile not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a profile
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Profile.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Profile not found' });
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// --- KYC: Upload ID photo for current user ---
const { authenticateToken } = require('../middleware/auth');
router.post('/me/id-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.id_photo_path = req.file.path;
    await user.save();
    res.status(201).json({ id_photo_path: user.id_photo_path });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
