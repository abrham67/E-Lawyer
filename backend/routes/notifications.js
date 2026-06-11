const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

function isAdminUser(req) {
  return String(req?.user?.role || '').toLowerCase() === 'admin';
}

// Send notification (admin/lawyer only)
router.post('/', authenticateToken, authorizeRoles('admin', 'lawyer'), async (req, res) => {
  try {
    const notif = new Notification({
      userId: req.body.userId,
      message: req.body.message,
      type: req.body.type || 'info'
    });
    await notif.save();

    // Emit real-time notification via Socket.IO if available
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io && notif.userId) {
        io.to(`user-${notif.userId.toString()}`).emit('notification', notif);
      }
    } catch (e) {
      // Log but do not fail the request
      console.error('Failed to emit notification:', e);
    }

    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get notifications for user
router.get('/', authenticateToken, authorizeRoles('admin', 'lawyer', 'client'), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }
  const notifs = await Notification.find(isAdminUser(req) ? {} : { userId: req.user.id }).sort({ created_at: -1 });
    res.json({ notifications: notifs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a notification as read
router.patch('/:id/read', authenticateToken, authorizeRoles('admin', 'lawyer', 'client'), async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    // Only the owner can mark their notification read
    if (notif.userId.toString() !== req.user.id && !isAdminUser(req)) return res.status(403).json({ error: 'Forbidden' });
    notif.read = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
