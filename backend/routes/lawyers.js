const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const mongoose = require('mongoose');

// GET /api/lawyers - List/search lawyers
// Optional query params:
// - bar_number: partial or full match (case-insensitive)
// - q: general text search across name, email, specialization, bar_number
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { bar_number, q } = req.query;
    const filter = { role: 'lawyer' };
    const and = [filter];

    if (bar_number) {
      and.push({ bar_number: { $regex: String(bar_number), $options: 'i' } });
    }

    if (q) {
      const rx = { $regex: String(q), $options: 'i' };
      and.push({
        $or: [
          { full_name: rx },
          { email: rx },
          { specialization: rx },
          { bar_number: rx },
        ],
      });
    }

    const finalFilter = and.length > 1 ? { $and: and } : filter;
    const lawyers = await User.find(finalFilter).select('-password');
    res.json(lawyers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lawyers/:id - Get single lawyer profile
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const lawyer = await User.findById(id).select('-password');
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ error: 'Lawyer not found' });
    }
    res.json(lawyer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lawyers/batch - fetch multiple lawyers by IDs
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const raw = req.body.ids || req.body || [];
    if (!Array.isArray(raw)) return res.status(400).json({ error: 'ids must be an array' });
    const ids = raw
      .map((v) => {
        if (!v) return null;
        if (typeof v === 'string') return v;
        if (typeof v === 'object') {
          if (v._id) return String(v._id);
          if (v.id) return String(v.id);
          try { const s = v.toString(); return s && s !== '[object Object]' ? s : null; } catch { return null; }
        }
        try { return String(v); } catch { return null; }
      })
      .filter((s) => typeof s === 'string' && mongoose.Types.ObjectId.isValid(String(s)));
    if (ids.length === 0) return res.json([]);
    const lawyers = await User.find({ _id: { $in: ids }, role: 'lawyer' }).select('-password');
    res.json(lawyers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
