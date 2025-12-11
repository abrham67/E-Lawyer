const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const Complaint = require('../models/Complaint');

const router = express.Router();

// Create a new complaint (any authenticated user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, description, againstUserId } = req.body || {};
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const payload = {
      subject: subject.trim(),
      description: description.trim(),
      submittedBy: req.user.id
    };

    if (againstUserId) {
      if (!mongoose.Types.ObjectId.isValid(String(againstUserId))) {
        return res.status(400).json({ error: 'Invalid target user id' });
      }
      payload.against = againstUserId;
    }

    const complaint = await Complaint.create(payload);
    res.status(201).json({ complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List complaints
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user && ['admin', 'court'].includes(String(req.user.role || '').toLowerCase());
    const filter = isAdmin ? {} : { submittedBy: req.user.id };
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update complaint status/resolution (admin only)
router.patch('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ error: 'Invalid complaint id' });
    }

    const updates = {};
    const { status, resolution_notes } = req.body || {};
    if (status) {
      const normalized = String(status).toLowerCase();
      if (!['open', 'in_review', 'resolved', 'rejected'].includes(normalized)) {
        return res.status(400).json({ error: 'Invalid complaint status' });
      }
      updates.status = normalized;
    }
    if (typeof resolution_notes === 'string') {
      updates.resolution_notes = resolution_notes.trim() || null;
    }
    updates.reviewedBy = req.user.id;

    const updated = await Complaint.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json({ complaint: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
