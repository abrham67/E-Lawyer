const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

// Get all sessions (lawyer, client, judge, admin only)
router.get('/', authenticateToken, authorizeRoles('lawyer', 'client', 'judge', 'admin'), async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new session (lawyer or judge only)
router.post('/', authenticateToken, authorizeRoles('lawyer', 'judge'), [
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
    const virtual_meeting_link = `/video/room/${roomId}`;
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

// Get a single session by ID (lawyer, client, judge, admin only)
router.get('/:id', authenticateToken, authorizeRoles('lawyer', 'client', 'judge', 'admin'), async (req, res) => {
  try {
    const foundSession = await Session.findById(req.params.id);
    if (!foundSession) return res.status(404).json({ error: 'Session not found' });
    res.json(foundSession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
