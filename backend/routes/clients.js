const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const User = require('../models/User');

// List clients (lawyer, court, admin can view)
router.get('/', authenticateToken, authorizeRoles('lawyer', 'court', 'admin'), async (req, res) => {
  try {
    const clients = await User.find({ role: { $regex: /^client$/i } }).select('-password');
    const normalized = (clients || []).map(u => ({
      id: u._id?.toString?.() || u.id,
      full_name: u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      email: u.email,
      role: u.role,
      contact_number: u.contact_number,
      years_of_experience: u.years_of_experience,
      specialization: u.specialization,
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
