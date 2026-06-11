const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

// Get all sessions (admin sees all; court sees own)
router.get('/', authenticateToken, authorizeRoles('admin', 'court'), async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const filter = role === 'admin' ? {} : { judgeId: req.user.id };
    const sessions = await Session.find(filter);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new session (court or admin)
router.post('/', authenticateToken, authorizeRoles('court', 'admin'), [
  body('caseId').notEmpty(),
  body('judgeId').notEmpty(),
  body('scheduled_date').isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // Generate built-in WebRTC meeting room
    const roomId = uuidv4();
    const virtual_meeting_link = `/meeting/${roomId}`;
    const newSession = new Session({
      ...req.body,
      virtual_meeting_link,
      meeting_platform: 'WebRTC',
    });
    await newSession.save();
    res.status(201).json(newSession);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a single session by ID (admin or owning court judge)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'court'), async (req, res) => {
  try {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) return res.status(404).json({ error: 'Session not found' });
    const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
    const judgeId = foundSession.judgeId && foundSession.judgeId.toString();
    if (!isAdmin && judgeId && judgeId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(foundSession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
