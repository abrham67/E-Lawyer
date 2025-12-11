const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const User = require('../models/User');
const Case = require('../models/Case');
const CourtSession = require('../models/CourtSession');
const Session = require('../models/Session');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const Profile = require('../models/Profile');

// Danger zone: Purge all user data and created cases (admin only)
// Query params to customize:
// - keep_admin=1: keep any users with role 'admin' (recommended)
// - keep_courts=1: keep users with role 'court'
// - keep_schema=1: do not drop collections, only delete documents (default)
// - drop_collections=1: attempt to drop entire collections for a hard reset
router.delete('/purge', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const keepAdmin = String(req.query.keep_admin || '1').toLowerCase() !== '0';
    const keepCourts = String(req.query.keep_courts || '1').toLowerCase() !== '0';
    const dropCollections = String(req.query.drop_collections || '0').toLowerCase() === '1';

    // 1) Cases and related
    const cases = await Case.find({}).select('_id').lean();
    const caseIds = cases.map(c => c._id);
    const casesDel = await Case.deleteMany({});
    const sessionsDel = await CourtSession.deleteMany({ caseId: { $in: caseIds } });
    // Legacy Session model cleanup
    const legacySessionsDel = await Session.deleteMany({ caseId: { $in: caseIds } }).catch(() => ({ deletedCount: 0 }));
    const docsDel = await Document.deleteMany({ caseId: { $in: caseIds } }).catch(() => ({ deletedCount: 0 }));

    // 2) Notifications (all)
    const notifsDel = await Notification.deleteMany({});

    // 3) Profiles (all)
    const profilesDel = await Profile.deleteMany({});

    // 4) Users (optionally keep admin/courts for access)
    const userFilter = {};
    if (keepAdmin || keepCourts) {
      userFilter.role = {};
      if (keepAdmin && keepCourts) {
        userFilter.role.$nin = ['admin', 'court'];
      } else if (keepAdmin) {
        userFilter.role.$ne = 'admin';
      } else if (keepCourts) {
        userFilter.role.$ne = 'court';
      }
    }
    const usersDel = await User.deleteMany(userFilter);

    // Optional: drop collections for a hard reset
    let dropped = [];
    if (dropCollections) {
      const conn = require('mongoose').connection;
      for (const name of ['cases', 'courtsessions', 'sessions', 'documents', 'notifications', 'profiles', 'users']) {
        try {
          if (conn.collections[name]) {
            await conn.collections[name].drop();
            dropped.push(name);
          }
        } catch (e) {
          // ignore if namespace not found
        }
      }
    }

    res.json({
      deleted: {
        cases: casesDel.deletedCount || 0,
        courtSessions: sessionsDel.deletedCount || 0,
        legacySessions: legacySessionsDel.deletedCount || 0,
        documents: docsDel.deletedCount || 0,
        notifications: notifsDel.deletedCount || 0,
        profiles: profilesDel.deletedCount || 0,
        users: usersDel.deletedCount || 0,
      },
      keptUsers: { admin: keepAdmin, court: keepCourts },
      droppedCollections: dropped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List users (admin oversight)
router.get('/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role, includeSuspended } = req.query || {};
    const filter = {};
    if (role) {
      filter.role = { $regex: new RegExp(`^${String(role).trim()}$`, 'i') };
    }
    if (!String(includeSuspended || '').toLowerCase().startsWith('t')) {
      filter.is_suspended = { $ne: true };
    }
    const users = await User.find(filter).lean();
    const sanitized = users.map(({ password, __v, ...rest }) => ({ id: rest._id.toString(), ...rest }));
    res.json({ users: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify user credentials (set id_verified flag)
router.patch('/users/:id/verify', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const { verified } = req.body || {};
    const updated = await User.findByIdAndUpdate(
      id,
      { id_verified: Boolean(verified), updated_at: new Date() },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'User not found' });
    const { password, __v, ...rest } = updated;
    res.json({ user: { id: rest._id.toString(), ...rest } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suspend or unsuspend user accounts
router.patch('/users/:id/suspension', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const { suspend, reason } = req.body || {};
    const updates = {
      is_suspended: Boolean(suspend),
      suspension_reason: suspend ? (reason || null) : null,
      updated_at: new Date()
    };
    const updated = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'User not found' });
    const { password, __v, ...rest } = updated;
    res.json({ user: { id: rest._id.toString(), ...rest } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
