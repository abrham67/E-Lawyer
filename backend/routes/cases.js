// Case management API routes
const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const CourtSession = require('../models/CourtSession');
const mongoose = require('mongoose');

// Helper to map DB Case -> client-facing shape
function mapCaseToClient(c) {
  const obj = c.toObject ? c.toObject() : c;
  const id = obj._id?.toString?.() || obj.id;
  const clientDoc = obj.clientId || obj.client_id || obj.client;
  const lawyerDoc = obj.lawyerId || obj.lawyer_id || obj.lawyer;
  const client = clientDoc && typeof clientDoc === 'object' ? {
    id: (clientDoc._id?.toString?.() || clientDoc.id),
    email: clientDoc.email,
    full_name: clientDoc.full_name,
    role: clientDoc.role,
  } : undefined;
  const lawyer = lawyerDoc && typeof lawyerDoc === 'object' ? {
    id: (lawyerDoc._id?.toString?.() || lawyerDoc.id),
    email: lawyerDoc.email,
    full_name: lawyerDoc.full_name,
    role: lawyerDoc.role,
  } : undefined;
  return {
    id,
    title: obj.title,
    description: obj.description,
    status: obj.status,
    case_type: obj.case_type,
    practice_area: obj.practice_area,
    created_at: obj.created_at || obj.createdAt,
    updated_at: obj.updated_at || obj.updatedAt,
    client,
    lawyer,
    client_id: (obj.client_id || obj.clientId || client?.id),
    lawyer_id: (obj.lawyer_id || obj.lawyerId || lawyer?.id),
    court_id: (obj.court_id || obj.courtId)
  };
}

// Safely normalize an id-like value (string | ObjectId | populated doc)
function idToString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val._id) return String(val._id);
    if (val.id) return String(val.id);
    // If it's a Mongoose ObjectId or Buffer-like
    if (typeof val.toString === 'function') {
      const s = val.toString();
      // Avoid default object toString
      if (s && s !== '[object Object]') return s;
    }
  }
  return '';
}

// Normalize a list of id-like values (strings | ObjectIds | populated docs)
// into a unique array of valid ObjectId strings (24-hex). Filters out invalids.
function toValidIdStrings(values) {
  const raw = Array.isArray(values) ? values : [];
  const mapped = raw.map(idToString).filter(Boolean);
  const valid = mapped.filter((v) => mongoose.Types.ObjectId.isValid(v));
  // Ensure strings
  return Array.from(new Set(valid.map(String)));
}

// Get all cases (scoped by role)
router.get('/', authenticateToken, authorizeRoles('lawyer', 'client', 'court'), async (req, res) => {
  try {
    let results = [];
    const role = String(req.user.role || '').toLowerCase();

    if (role === 'lawyer') {
      // lawyers should only see cases assigned to them (handle both id and populated object cases)
      results = await Case.find({
        $or: [
          { lawyer_id: req.user.id },
          { lawyerId: req.user.id },
          { 'lawyer_id._id': req.user.id },
          { 'lawyerId._id': req.user.id },
        ]
      })
        .populate('clientId')
        .populate('client_id')
        .populate('lawyerId')
        .populate('lawyer_id');
    } else if (role === 'court') {
      // courts see cases assigned to them
      results = await Case.find({ $or: [{ court_id: req.user.id }, { courtId: req.user.id }] })
        .populate('clientId')
        .populate('client_id')
        .populate('lawyerId')
        .populate('lawyer_id');
    } else if (role === 'client') {
      // clients should only see their own cases
      results = await Case.find({ $or: [{ client_id: req.user.id }, { clientId: req.user.id }] })
        .populate('clientId')
        .populate('client_id')
        .populate('lawyerId')
        .populate('lawyer_id');
    }

    // Return consistent shape for frontend: { cases: [...] }
    res.json({ cases: (results || []).map(mapCaseToClient) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unique active clients for the authenticated lawyer
router.get('/active-clients', authenticateToken, authorizeRoles('lawyer'), async (req, res) => {
  try {
    const assigned = await Case.find({
      $or: [{ lawyer_id: req.user.id }, { lawyerId: req.user.id }],
      status: 'active'
    }).select('client_id clientId').lean();
    const ids = toValidIdStrings(
      assigned
        .map(c => c.client_id || c.clientId)
        .filter(Boolean)
    );
    if (ids.length === 0) return res.json([]);
  const users = await User.find({ _id: { $in: ids } }).select('-password').lean();
    const normalized = users.map(({ _id, password, ...rest }) => ({ id: _id.toString(), ...rest }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all lawyers connected to the authenticated client across their cases and prior sessions
// Placed BEFORE any param routes like '/:id' to avoid routing collisions
router.get('/me/lawyers', authenticateToken, authorizeRoles('client'), async (req, res) => {
  try {
    const clientId = String(req.user.id);
    // Find all cases owned by this client
    const myCases = await Case.find({ $or: [{ client_id: clientId }, { clientId: clientId }] })
      .select('_id lawyer_id lawyerId')
      .lean();
    if (!myCases || myCases.length === 0) return res.json([]);

    const idSet = new Set();
    for (const c of myCases) {
      const lidRaw = c.lawyer_id || c.lawyerId;
      if (lidRaw) {
        const lidStr = (() => {
          if (typeof lidRaw === 'string') return lidRaw;
          if (lidRaw && lidRaw._id) return String(lidRaw._id);
          if (lidRaw && lidRaw.id) return String(lidRaw.id);
          try { const s = lidRaw.toString(); return s && s !== '[object Object]' ? s : null; } catch { return null; }
        })();
        if (lidStr) idSet.add(lidStr);
      }
    }
    // Also include any lawyers invited to sessions for these cases
    const caseIds = myCases.map((c) => c._id);
    const sessions = await CourtSession.find({ caseId: { $in: caseIds } }).select('involvedLawyerIds').lean();
    for (const s of (sessions || [])) {
      (s.involvedLawyerIds || []).forEach((lid) => {
        const v = (typeof lid === 'string') ? lid : (lid && lid._id) ? String(lid._id) : (lid && lid.id) ? String(lid.id) : (() => { try { const t = lid.toString(); return t && t !== '[object Object]' ? t : null; } catch { return null; } })();
        if (v) idSet.add(v);
      });
    }
    const ids = toValidIdStrings(Array.from(idSet));
    if (ids.length === 0) return res.json([]);
    const users = await User.find({ _id: { $in: ids }, role: 'lawyer' }).select('-password').lean();
    const normalized = users.map(({ _id, password, ...rest }) => ({ id: _id.toString(), ...rest }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new case (lawyer only)
router.post('/', authenticateToken, authorizeRoles('lawyer'), [
  body('title').isLength({ min: 3 }).trim(),
  body('description').isLength({ min: 10 }),
  body('clientId').notEmpty(),
  body('courtId').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // Validate the courtId belongs to a court user
    const providedCourtId = req.body.courtId || req.body.court_id;
    if (!providedCourtId) {
      return res.status(400).json({ error: 'courtId is required' });
    }
    const courtUser = await User.findById(providedCourtId).lean();
    if (!courtUser || String(courtUser.role || '').toLowerCase() !== 'court') {
      return res.status(400).json({ error: 'Invalid courtId: not a court user' });
    }
    const newCase = new Case({
      ...req.body,
      // normalize incoming fields
      lawyerId: req.user.id,
      lawyer_id: req.user.id,
      client_id: req.body.clientId || req.body.client_id,
      courtId: req.body.courtId || req.body.court_id,
      court_id: req.body.courtId || req.body.court_id,
    });
    // Add initial history entry
    newCase.history = newCase.history || [];
    newCase.history.push({ status: newCase.status, by: req.user.id, reason: 'Created by lawyer' });
    await newCase.save();
    // Emit real-time notifications
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      // Inform the assigned court
      const courtTarget = newCase.court_id || newCase.courtId;
      if (io && courtTarget) {
        io.to(`user-${courtTarget}`).emit('case:assigned', newCase);
      }
      // Optionally inform the lawyer themselves too (no-op if same user)
      if (io && newCase.lawyer_id) io.to(`user-${newCase.lawyer_id}`).emit('case:created', newCase);
    } catch (e) {
      console.error('Emit failed for case connect:', e);
    }
    // Create a notification for the court
    try {
      const courtTarget = newCase.court_id || newCase.courtId;
      if (courtTarget) {
        const notifMsg = `New court case assigned: "${newCase.title || 'Untitled'}"`;
        await Notification.create({ userId: courtTarget, message: notifMsg, type: 'info' });
      }
    } catch (notifErr) {
      console.error('Failed to notify court of new case:', notifErr);
    }
    res.status(201).json(newCase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Client can request connection/create a pending case with a lawyer
router.post('/connect', authenticateToken, authorizeRoles('client'), [
  body('lawyer_id').notEmpty(),
  body('title').isLength({ min: 3 }).trim(),
  body('description').isLength({ min: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { lawyer_id, title, description } = req.body;
    const newCase = new Case({
      lawyer_id,
      lawyerId: lawyer_id,
      client_id: req.user.id,
      clientId: req.user.id,
      title: title || 'New Case',
      status: 'pending',
      description: description || 'Pending lawyer approval'
    });
    newCase.history = [{ status: 'pending', by: req.user.id, reason: 'Client requested connection' }];
    await newCase.save();
    // Notify the targeted lawyer about the connection request and emit via socket
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      const notifMsg = `Client requested to connect for case "${newCase.title || 'Untitled'}"`;
      await Notification.create({ userId: lawyer_id, message: notifMsg, type: 'info' });
      if (io && lawyer_id) {
        io.to(`user-${lawyer_id}`).emit('case:requested', newCase);
      }
    } catch (notifErr) {
      console.error('Failed to notify lawyer of connection request:', notifErr);
    }
    res.status(201).json(newCase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Check connection status between authenticated client and a lawyer
router.get('/connection-status', authenticateToken, authorizeRoles('client', 'lawyer'), async (req, res) => {
  try {
    const lawyerId = req.query.lawyer_id || req.query.lawyerId;
    if (!lawyerId) return res.status(400).json({ error: 'lawyer_id query param required' });
    const role = String(req.user.role || '').toLowerCase();

    if (role === 'client') {
      // client asking: return their connection status with the given lawyer
      const found = await Case.findOne({
        $and: [
          { $or: [{ client_id: req.user.id }, { clientId: req.user.id }] },
          { $or: [{ lawyer_id: lawyerId }, { lawyerId: lawyerId }] }
        ]
      });
      return res.json({ status: found ? (found.status || 'pending') : 'none' });
    } else if (role === 'lawyer') {
      // lawyer asking: return aggregated status for clients requesting them? return counts or 'has_pending'
      const pending = await Case.findOne({
        $and: [
          { $or: [{ lawyer_id: req.user.id }, { lawyerId: req.user.id }] },
          { $or: [{ client_id: lawyerId }, { clientId: lawyerId }] }
        ],
        status: 'pending'
      });
      // Note: this branch is unlikely in practice; keep simple
      return res.json({ status: pending ? 'pending' : 'none' });
    }
    return res.json({ status: 'none' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single case by ID (lawyer, client, court only)
router.get('/:id', authenticateToken, authorizeRoles('lawyer', 'client', 'court'), async (req, res) => {
  try {
    const foundCase = await Case.findById(req.params.id)
      .populate('clientId')
      .populate('client_id')
      .populate('lawyerId')
      .populate('lawyer_id');
  if (!foundCase) return res.status(404).json({ error: 'Case not found' });
    // Only allow lawyer, client, or court assigned to case
    const lawyerId = idToString(foundCase.lawyer_id) || idToString(foundCase.lawyerId) || idToString(foundCase.lawyer);
    const clientId = idToString(foundCase.client_id) || idToString(foundCase.clientId) || idToString(foundCase.client);
    const courtId = idToString(foundCase.court_id) || idToString(foundCase.courtId) || idToString(foundCase.court);
    const isLawyer = lawyerId && String(lawyerId) === String(req.user.id);
    const isClient = clientId && String(clientId) === String(req.user.id);
    const isCourt = courtId && String(courtId) === String(req.user.id);
    if (!isLawyer && !isClient && !isCourt) {
      return res.status(403).json({ error: 'Forbidden: not assigned to this case' });
    }
    res.json(mapCaseToClient(foundCase));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lawyer can update case status (approve/reject)
router.patch('/:id/status', authenticateToken, authorizeRoles('lawyer'), async (req, res) => {
  try {
    const caseId = req.params.id;
  const { status, reason } = req.body; // status and optional reason for rejection
  if (!['active', 'rejected', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const foundCase = await Case.findById(caseId);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });
    // Ensure only assigned lawyer can update
  // Support both field name variants
  const lidRaw = (foundCase.lawyer_id || foundCase.lawyerId || foundCase.lawyer);
  const assignedLawyerId = (() => {
      if (!lidRaw) return '';
      if (typeof lidRaw === 'string') return lidRaw;
      if (lidRaw._id) return String(lidRaw._id);
      if (lidRaw.id) return String(lidRaw.id);
      const ts = lidRaw.toString && lidRaw.toString !== Object.prototype.toString ? lidRaw.toString() : '';
      return ts && ts !== '[object Object]' ? ts : '';
    })();
  if (!assignedLawyerId) {
      return res.status(403).json({ error: 'Forbidden: case has no assigned lawyer' });
    }
  if (assignedLawyerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: not assigned to this case' });
    }
  // Update status and record history
  foundCase.status = status;
  // Try to include actor's name for easier display in history
  const actorName = req.user && req.user.full_name ? req.user.full_name : null;
  const entry = { status, by: req.user.id, by_name: actorName, reason: reason || (status === 'rejected' ? 'No reason provided' : 'Status updated') };
    foundCase.history = foundCase.history || [];
    foundCase.history.push(entry);
    await foundCase.save();

    // Create a notification for the client so they are alerted and emit via sockets
    try {
      const clientId = foundCase.client_id || foundCase.clientId;
      if (clientId) {
        const msg = `Your case "${foundCase.title || 'Untitled'}" was ${status}.${reason ? ' Reason: ' + reason : ''}`;
        const notif = await Notification.create({ userId: clientId, message: msg, type: status === 'rejected' ? 'alert' : 'info' });
        const io = req.app && req.app.locals && req.app.locals.io;
        if (io) {
          io.to(`user-${clientId}`).emit('notification', notif);
        }
      }
    } catch (notifErr) {
      console.error('Failed to create notification for case status change:', notifErr);
    }

    res.json(foundCase);

    // Realtime: notify both parties (lawyer and client) that the case was updated
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io) {
        const lawyerId = foundCase.lawyer_id || foundCase.lawyerId;
        const clientId = foundCase.client_id || foundCase.clientId;
        const payload = { ...foundCase.toObject?.() || foundCase, status };
        if (lawyerId) io.to(`user-${lawyerId}`).emit('case:updated', payload);
        if (clientId) io.to(`user-${clientId}`).emit('case:updated', payload);
      }
    } catch (e) {
      // ignore emit errors
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/disconnect', authenticateToken, authorizeRoles('client'), async (req, res) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });
    // Only the client who created the case can disconnect
    const clientId = foundCase.client_id || foundCase.clientId;
    if (!clientId || clientId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this connection' });
    }
    await Case.findByIdAndDelete(caseId);
    // Emit a notification to the lawyer that the client disconnected
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io && foundCase.lawyer_id) {
        io.to(`user-${foundCase.lawyer_id}`).emit('case:disconnected', { caseId, clientId: clientId });
      }
    } catch (e) {
      console.error('Emit failed for case disconnect:', e);
    }
    res.json({ message: 'Disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get involved lawyers for a case: assigned lawyer + any from prior sessions
router.get('/:id/involved-lawyers', authenticateToken, authorizeRoles('court', 'lawyer', 'client'), async (req, res) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId).lean();
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    // Access control: court assigned to case; assigned lawyer; the client
    const lawyerId = idToString(foundCase.lawyer_id) || idToString(foundCase.lawyerId);
    const clientId = idToString(foundCase.client_id) || idToString(foundCase.clientId);
    const courtId = idToString(foundCase.court_id) || idToString(foundCase.courtId);
    const isLawyer = lawyerId && String(lawyerId) === String(req.user.id);
    const isClient = clientId && String(clientId) === String(req.user.id);
    const isCourt = courtId && String(courtId) === String(req.user.id);
    if (!isLawyer && !isClient && !isCourt) {
      return res.status(403).json({ error: 'Forbidden: not assigned to this case' });
    }

    const idSet = new Set();
    const primaryRaw = foundCase.lawyer_id || foundCase.lawyerId || foundCase.lawyer;
    if (primaryRaw) {
      const primary = (primaryRaw && primaryRaw._id) || (primaryRaw && primaryRaw.id) || primaryRaw;
      try { idSet.add(primary.toString()); } catch { idSet.add(String(primary)); }
    }
    const sessions = await CourtSession.find({ caseId: foundCase._id }).select('involvedLawyerIds').lean();
    for (const s of (sessions || [])) {
      (s.involvedLawyerIds || []).forEach((lid) => {
        if (lid) idSet.add(lid.toString());
      });
    }
    const ids = toValidIdStrings(Array.from(idSet));
    if (ids.length === 0) return res.json([]);
    const users = await User.find({ _id: { $in: ids }, role: 'lawyer' }).select('-password').lean();
    const normalized = users.map(({ _id, password, ...rest }) => ({ id: _id.toString(), ...rest }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get involved clients for a case: assigned client + any invited to prior sessions
router.get('/:id/involved-clients', authenticateToken, authorizeRoles('court', 'lawyer'), async (req, res) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId).lean();
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    // Access control: court assigned to case; assigned lawyer
    const lawyerId = idToString(foundCase.lawyer_id) || idToString(foundCase.lawyerId);
    const courtId = idToString(foundCase.court_id) || idToString(foundCase.courtId);
    const isLawyer = lawyerId && String(lawyerId) === String(req.user.id);
    const isCourt = courtId && String(courtId) === String(req.user.id);
    if (!isLawyer && !isCourt) {
      return res.status(403).json({ error: 'Forbidden: not assigned to this case' });
    }

    const idSet = new Set();
    const primaryRaw = foundCase.client_id || foundCase.clientId || foundCase.client;
    if (primaryRaw) {
      const primary = (primaryRaw && primaryRaw._id) || (primaryRaw && primaryRaw.id) || primaryRaw;
      try { idSet.add(primary.toString()); } catch { idSet.add(String(primary)); }
    }
    const sessions = await CourtSession.find({ caseId: foundCase._id }).select('involvedClientIds').lean();
    for (const s of (sessions || [])) {
      (s.involvedClientIds || []).forEach((cid) => {
        if (cid) idSet.add(cid.toString());
      });
    }
    const ids = toValidIdStrings(Array.from(idSet));
    if (ids.length === 0) return res.json([]);
    const users = await User.find({ _id: { $in: ids }, role: 'client' }).select('-password').lean();
    const normalized = users.map(({ _id, password, ...rest }) => ({ id: _id.toString(), ...rest }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all lawyers connected to the authenticated client across their cases and prior sessions
// (Old '/my-lawyers' removed to prevent collision with '/:id')

// Delete a case (assigned lawyer or admin)
// Shared delete handler used by both DELETE and POST fallback
async function handleCaseDelete(req, res) {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });
    const lidRaw = (foundCase.lawyer_id || foundCase.lawyerId || foundCase.lawyer);
    const assignedLawyerId = (() => {
      if (!lidRaw) return '';
      if (typeof lidRaw === 'string') return lidRaw;
      if (lidRaw._id) return String(lidRaw._id);
      if (lidRaw.id) return String(lidRaw.id);
      const ts = lidRaw.toString && lidRaw.toString !== Object.prototype.toString ? lidRaw.toString() : '';
      return ts && ts !== '[object Object]' ? ts : '';
    })();
    if (!assignedLawyerId || assignedLawyerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: not assigned to this case' });
    }
    await Case.findByIdAndDelete(caseId);
    // Notify parties via sockets and add a notification for the client
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      const lawyerId = foundCase.lawyer_id || foundCase.lawyerId;
      const clientId = foundCase.client_id || foundCase.clientId;
      if (io) {
        if (lawyerId) io.to(`user-${lawyerId}`).emit('case:deleted', { caseId });
        if (clientId) io.to(`user-${clientId}`).emit('case:deleted', { caseId });
      }
      if (clientId) {
        try {
          const msg = `Your case "${foundCase.title || 'Untitled'}" was deleted.`;
          await Notification.create({ userId: clientId, message: msg, type: 'alert' });
        } catch (e) {}
      }
    } catch (e) {}
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Primary DELETE route
router.delete('/:id', authenticateToken, authorizeRoles('lawyer'), handleCaseDelete);

// Fallback POST route for environments where DELETE might be blocked by proxy/firewall
router.post('/:id/delete', authenticateToken, authorizeRoles('lawyer'), handleCaseDelete);

module.exports = router;
 
// Maintenance: Danger zone - delete all cases (admin only)
// This will delete all Case documents. Optionally pass ?with_sessions=1 to also delete related CourtSession docs.
// Optionally pass ?with_docs=1 to also delete case documents via Documents route/model if present.
router.delete('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const withSessions = String(req.query.with_sessions || '').toLowerCase() === '1' || String(req.query.with_sessions || '').toLowerCase() === 'true';
    const withDocs = String(req.query.with_docs || '').toLowerCase() === '1' || String(req.query.with_docs || '').toLowerCase() === 'true';
    const allCases = await Case.find({}).select('_id').lean();
    const ids = allCases.map(c => c._id);
    await Case.deleteMany({});
    let sessionsDeleted = 0;
    if (withSessions && ids.length > 0) {
      const r = await CourtSession.deleteMany({ caseId: { $in: ids } });
      sessionsDeleted = r && r.deletedCount ? r.deletedCount : 0;
    }
    // Soft attempt to delete documents via REST if route exists, otherwise ignore
    // Note: leaving actual file deletions to the documents route/service layer
    // We won't import Document model here to avoid coupling if it doesn't exist
    res.json({ deletedCases: ids.length, deletedSessions: sessionsDeleted, withDocsAttempted: withDocs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

