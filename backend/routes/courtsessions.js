const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CourtSession = require('../models/CourtSession');
const Case = require('../models/Case');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');

const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper to map DB model -> frontend shape
function mapSessionToClient(s) {
  const caseDoc = s.caseId;
  const clientRaw = caseDoc && (caseDoc.clientId || caseDoc.client_id || caseDoc.client);
  const lawyerRaw = caseDoc && (caseDoc.lawyerId || caseDoc.lawyer_id || caseDoc.lawyer);
  const caseClient = clientRaw && typeof clientRaw === 'object' ? {
    id: (clientRaw._id?.toString?.() || clientRaw.id),
    full_name: clientRaw.full_name,
    email: clientRaw.email,
    role: clientRaw.role,
  } : undefined;
  const caseLawyer = lawyerRaw && typeof lawyerRaw === 'object' ? {
    id: (lawyerRaw._id?.toString?.() || lawyerRaw.id),
    full_name: lawyerRaw.full_name,
    email: lawyerRaw.email,
    role: lawyerRaw.role,
  } : undefined;
  return {
    id: s._id?.toString?.() || s.id,
    case_id: s.caseId?._id?.toString?.() || s.caseId?.toString?.() || s.case_id,
    judge_id: s.judgeId?._id?.toString?.() || s.judgeId?.toString?.() || s.judge_id,
    scheduled_date: s.scheduleDate || s.scheduled_date,
    start_time: s.startTime || s.start_time || '',
    end_time: s.endTime || s.end_time || '',
    involved_lawyer_ids: Array.isArray(s.involvedLawyerIds) ? s.involvedLawyerIds.map((id) => id?.toString?.() || id) : [],
    involved_client_ids: Array.isArray(s.involvedClientIds) ? s.involvedClientIds.map((id) => id?.toString?.() || id) : [],
    location: s.location || '',
    status: s.status || 'scheduled',
    is_virtual: s.is_virtual || false,
    virtual_meeting_link: s.virtual_meeting_link || `/meeting/${(s._id?.toString?.() || s.id)}`,
  invite_token: s.invite_token,
  invite_active_from: s.invite_active_from,
    // Optional case embed if populated
    case: caseDoc && caseDoc.title ? {
      id: caseDoc._id?.toString?.(),
      title: caseDoc.title,
      case_type: caseDoc.case_type,
      practice_area: caseDoc.practice_area,
      lawyer: caseLawyer,
      client: caseClient,
    } : undefined,
  };
}

// Build an absolute or relative join URL for a session
function buildJoinUrl(session) {
  const base = (process.env.APP_ORIGIN || process.env.FRONTEND_BASE_URL || '').trim();
  const path = session && (session.virtual_meeting_link || `/meeting/${(session._id?.toString?.() || session.id)}`);
  if (!base) return path; // relative path; frontend will resolve
  return `${base.replace(/\/+$/, '')}${String(path).startsWith('/') ? '' : '/'}${path}`;
}

// Build an invite URL that uses the time-gated token when available
function buildInviteUrl(session) {
  const base = (process.env.APP_ORIGIN || process.env.FRONTEND_BASE_URL || '').trim();
  const token = session && session.invite_token;
  const path = token ? `/invite/${token}` : buildJoinUrl(session);
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}${String(path).startsWith('/') ? '' : '/'}${path}`;
}

async function createAndEmitNotification(req, userId, message, type = 'info') {
  try {
    const notif = await Notification.create({ userId, message, type });
    const io = req.app && req.app.locals && req.app.locals.io;
    if (io) io.to(`user-${userId}`).emit('notification', notif);
  } catch (e) {
    console.error('Failed to create/emit notification', e);
  }
}

// Get court sessions with optional filters
// Supports:
// - GET /api/courtsessions?case_id=... -> sessions for a case
// - GET /api/courtsessions?court_id=... -> sessions for a judge/court user
// - GET /api/courtsessions -> defaults to current user as judge
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { case_id, court_id, lawyer_id, client_id } = req.query;
    const filter = {};
      const safeId = (v) => (v && v !== 'undefined' && v !== 'null' ? String(v) : '');
      const sid_case = safeId(case_id);
      const sid_court = safeId(court_id);
      const sid_lawyer = safeId(lawyer_id);
      const sid_client = safeId(client_id);
      if (sid_case) {
        try { filter.caseId = new mongoose.Types.ObjectId(sid_case); } catch { filter.caseId = sid_case; }
      }
      if (sid_court) {
        try { filter.judgeId = new mongoose.Types.ObjectId(sid_court); } catch { filter.judgeId = sid_court; }
      }
    // Explicit filter by involved lawyer
      if (sid_lawyer) {
        try { filter.involvedLawyerIds = new mongoose.Types.ObjectId(sid_lawyer); }
        catch { filter.involvedLawyerIds = sid_lawyer; }
      }
    // Explicit filter by involved client
      if (sid_client) {
        try { filter.involvedClientIds = new mongoose.Types.ObjectId(sid_client); }
        catch { filter.involvedClientIds = sid_client; }
      }

    // Default behavior: if no filters provided, scope to current user as judge
    // If user is a lawyer, return sessions where they are involved
    // If user is a client, return sessions where they are invited
    if (!case_id && !court_id && !lawyer_id && !client_id) {
      const role = String(req.user.role || '').toLowerCase();
      const uid = req.user && (req.user.id || req.user._id);
      if (uid) {
        if (role === 'lawyer') {
          try { filter.involvedLawyerIds = new mongoose.Types.ObjectId(uid); }
          catch { filter.involvedLawyerIds = String(uid); }
        } else if (role === 'client') {
          try { filter.involvedClientIds = new mongoose.Types.ObjectId(uid); }
          catch { filter.involvedClientIds = String(uid); }
        } else {
          try { filter.judgeId = new mongoose.Types.ObjectId(uid); }
          catch { filter.judgeId = String(uid); }
        }
      }
    }

  const query = CourtSession.find(filter).populate({ path: 'caseId', populate: [
    { path: 'clientId' },
    { path: 'lawyerId' },
    { path: 'client_id' },
    { path: 'lawyer_id' }
  ] });
    const sessions = await query.exec();

    res.json((sessions || []).map(mapSessionToClient));
  } catch (err) {
    console.error('Error fetching court sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single court session by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
  const session = await CourtSession.findById(req.params.id).populate({ path: 'caseId', populate: [
    { path: 'clientId' },
    { path: 'lawyerId' },
    { path: 'client_id' },
    { path: 'lawyer_id' }
  ] });
    if (!session) return res.status(404).json({ error: 'Court session not found' });
    res.json(mapSessionToClient(session));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new court session (authenticated)
// Only lawyers/judges/admins can create court sessions
router.post('/', authenticateToken, authorizeRoles('judge', 'admin', 'court'), async (req, res) => {
  try {
    // Basic validation
    const { caseId, case: caseField, judgeId, judge: judgeField, scheduleDate, startTime, endTime, location, is_virtual } = req.body;
    let { involvedLawyerIds, involvedClientIds } = req.body;
    const caseRef = caseId || caseField;
    const judgeRef = judgeId || judgeField || req.user.id; // default to authenticated user if judge
    if (!caseRef) return res.status(400).json({ error: 'caseId is required' });
    if (!judgeRef) return res.status(400).json({ error: 'judgeId is required' });
    if (!scheduleDate) return res.status(400).json({ error: 'scheduleDate is required' });

    // normalize involvedLawyerIds: ensure array of strings ObjectIds
    let normalizedInvolved = [];
    if (Array.isArray(involvedLawyerIds)) {
      normalizedInvolved = involvedLawyerIds
        .map(String)
        .filter((v, i, a) => v && a.indexOf(v) === i);
    }

    // normalize involvedClientIds
    let normalizedClients = [];
    if (Array.isArray(involvedClientIds)) {
      normalizedClients = involvedClientIds
        .map(String)
        .filter((v, i, a) => v && a.indexOf(v) === i);
    }

    // If lists are empty, try default to the case's assigned participants
    if (normalizedInvolved.length === 0 || normalizedClients.length === 0) {
      try {
        const theCase = await Case.findById(caseRef).select('lawyer_id lawyerId client_id clientId title').lean();
        if (normalizedInvolved.length === 0) {
          const assignedLawyer = theCase && (theCase.lawyer_id || theCase.lawyerId);
          if (assignedLawyer) normalizedInvolved = [assignedLawyer.toString()];
        }
        if (normalizedClients.length === 0) {
          const assignedClient = theCase && (theCase.client_id || theCase.clientId);
          if (assignedClient) normalizedClients = [assignedClient.toString()];
        }
      } catch {}
    }

    const sessionData = {
      caseId: caseRef,
      judgeId: judgeRef,
      scheduleDate: new Date(scheduleDate),
      startTime: startTime || '',
      endTime: endTime || '',
      involvedLawyerIds: normalizedInvolved,
      involvedClientIds: normalizedClients,
      location: location || '',
      is_virtual: Boolean(is_virtual) || false,
      virtual_meeting_link: Boolean(is_virtual) ? undefined : undefined
    };

    console.log('Creating court session with data:', sessionData);
    // Ensure virtual meeting link defaults when virtual
    if (sessionData.is_virtual && !sessionData.virtual_meeting_link) {
      // temp session doc id will be available after save; fallback to a placeholder and remap after save
    }
    // If virtual, define invite activation time and token
    if (sessionData.is_virtual) {
      try {
        const activeFrom = new Date(sessionData.scheduleDate);
        if (sessionData.startTime) {
          const [h, m, s] = String(sessionData.startTime).split(':').map(n => parseInt(n, 10) || 0);
          activeFrom.setHours(h, m || 0, s || 0, 0);
        }
        sessionData.invite_active_from = activeFrom;
      } catch {}
      sessionData.invite_token = crypto.randomBytes(16).toString('hex');
    }

    const newSession = new CourtSession(sessionData);
    await newSession.save();
    if (newSession.is_virtual && !newSession.virtual_meeting_link) {
      newSession.virtual_meeting_link = `/meeting/${newSession._id.toString()}`;
      await newSession.save();
    }

    // Notify involved users with join link (for virtual sessions)
    try {
      const whenParts = [];
      if (sessionData.scheduleDate) {
        try { whenParts.push(new Date(sessionData.scheduleDate).toLocaleString()); } catch {}
      }
      if (sessionData.startTime) whenParts.push(`Start: ${sessionData.startTime}`);
      if (sessionData.endTime) whenParts.push(`End: ${sessionData.endTime}`);
      const whenStr = whenParts.length ? ` (${whenParts.join(' · ')})` : '';
  const joinUrl = buildInviteUrl(newSession);

      // Lawyers always get a notification; include link if virtual
      for (const lid of normalizedInvolved) {
        const msg = sessionData.is_virtual
          ? `Virtual court session scheduled${whenStr}. Join link: ${joinUrl}`
          : `Court session scheduled${whenStr}.`;
        await createAndEmitNotification(req, lid, msg, 'info');
      }
      // Clients get notifications only for virtual sessions
      if (sessionData.is_virtual && Array.isArray(normalizedClients)) {
        for (const cid of normalizedClients) {
          const cmsg = `You are invited to a virtual court session${whenStr}. Join link: ${joinUrl}`;
          await createAndEmitNotification(req, cid, cmsg, 'info');
        }
      }
    } catch (notifyErr) {
      console.error('Error notifying participants:', notifyErr);
    }

    res.status(201).json(mapSessionToClient(newSession));
  } catch (err) {
    console.error('Error creating court session:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update a court session
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await CourtSession.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Court session not found' });
  res.json(mapSessionToClient(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a court session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await CourtSession.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Court session not found' });
    res.json({ message: 'Court session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/update notes for a session
router.put('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { notes } = req.body;
    const updated = await CourtSession.findByIdAndUpdate(
      req.params.id,
      { $set: { notes } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Court session not found' });
    res.json(mapSessionToClient(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// End a session (mark completed and optionally save notes)
router.put('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { status = 'completed', notes } = req.body || {};
    const session = await CourtSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Court session not found' });

    // Permission: only the assigned judge/court can end the session (no admin override by default)
    const role = String(req.user.role || '').toLowerCase();
    const judgeId = session.judgeId?.toString?.() || session.judgeId;
    const isJudge = judgeId && String(judgeId) === String(req.user.id);
    const allowAdmin = String(process.env.ALLOW_ADMIN_SESSION_CONTROL || '').toLowerCase() === 'true';
    const isAdmin = role === 'admin' && allowAdmin;
    if (!(role === 'court' && isJudge) && !isAdmin) {
      return res.status(403).json({ error: 'Only the court can end this session' });
    }

    // Update fields
    session.status = status || 'completed';
    if (typeof notes === 'string') session.notes = notes;
    await session.save();

    // Update related Case status and history when session ends
    try {
      const caseId = session.caseId?.toString?.() || session.caseId;
      if (caseId) {
        const newCaseStatus = session.status === 'completed'
          ? 'closed'
          : (session.status === 'cancelled' ? 'cancelled' : undefined);
        const historyEntry = {
          status: `session_${session.status}`,
          by: req.user && req.user.id ? req.user.id : undefined,
          reason: notes ? `Session ${session.status}. Notes: ${notes}` : `Session ${session.status}.`
        };
        const update = newCaseStatus
          ? { $set: { status: newCaseStatus }, $push: { history: historyEntry } }
          : { $push: { history: historyEntry } };
        await Case.findByIdAndUpdate(caseId, update, { new: true });
      }
    } catch (caseUpdateErr) {
      console.error('Failed to update related case on session end:', caseUpdateErr);
      // Do not fail the request if case update fails
    }

    // Notify all participants via Socket.IO room (room id = session id)
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io) {
        io.to(String(session._id)).emit('session-ended', {
          sessionId: String(session._id),
          by: String(req.user.id),
          at: new Date().toISOString(),
          status: session.status,
        });
      }
    } catch (e) {
      // Log but do not fail the request
      console.error('Failed to emit session-ended:', e);
    }

    res.json(mapSessionToClient(session));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Open/start a session (mark in_progress). Court judge only (optionally admin if env allows)
router.put('/:id/open', authenticateToken, async (req, res) => {
  try {
    const session = await CourtSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Court session not found' });

    const role = String(req.user.role || '').toLowerCase();
    const judgeId = session.judgeId?.toString?.() || session.judgeId;
    const isJudge = judgeId && String(judgeId) === String(req.user.id);
    const allowAdmin = String(process.env.ALLOW_ADMIN_SESSION_CONTROL || '').toLowerCase() === 'true';
    const isAdmin = role === 'admin' && allowAdmin;
    if (!(role === 'court' && isJudge) && !isAdmin) {
      return res.status(403).json({ error: 'Only the court can open this session' });
    }

    session.status = 'in_progress';
    await session.save();

    // Notify participants that session is opened
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      if (io) {
        io.to(String(session._id)).emit('session-opened', {
          sessionId: String(session._id),
          by: String(req.user.id),
          at: new Date().toISOString(),
          status: session.status,
        });
      }
    } catch (e) {
      console.error('Failed to emit session-opened:', e);
    }

    res.json(mapSessionToClient(session));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

// Live participants snapshot for a session (requires auth, any role who can view the session)
// GET /api/courtsessions/:id/participants -> { participants: [ { socketId, userId, role, name } ] }
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const session = await CourtSession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: 'Court session not found' });
    // Basic authorization: user must be judge, involved lawyer/client, or admin
    const role = String(req.user.role || '').toLowerCase();
    const uid = String(req.user.id || '');
    const isJudge = String(session.judgeId || '') === uid;
    const isLawyer = Array.isArray(session.involvedLawyerIds) && session.involvedLawyerIds.map(String).includes(uid);
    const isClient = Array.isArray(session.involvedClientIds) && session.involvedClientIds.map(String).includes(uid);
    const isAdmin = role === 'admin';
    if (!(isJudge || isLawyer || isClient || isAdmin)) {
      return res.status(403).json({ error: 'Not authorized to view participants' });
    }
    const io = req.app && req.app.locals && req.app.locals.io;
    if (!io) return res.json({ participants: [] });
    const rid = String(req.params.id);
    const room = io.sockets.adapter.rooms.get(rid);
    const members = Array.from(room || []);
    const participants = await Promise.all(members.map(async (sid) => {
      const s = io.sockets.sockets.get(sid);
      const meta = { socketId: sid, userId: undefined, role: undefined, name: undefined };
      if (s && s.data) {
        if (s.data.userId) meta.userId = String(s.data.userId);
        if (s.data.role) meta.role = String(s.data.role);
        if (!meta.name && meta.userId) {
          try {
            const User = require('../models/User');
            const u = await User.findById(meta.userId).select('full_name role court_name').lean();
            if (u) {
              meta.name = String(u.role).toLowerCase() === 'court' ? (u.court_name || 'Court') : (u.full_name || 'Participant');
              if (!meta.role && u.role) meta.role = String(u.role).toLowerCase();
            }
          } catch {}
        }
      }
      return meta;
    }));
    res.json({ participants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resend invitations with join link (court/judge/admin only)
router.post('/:id/invite', authenticateToken, authorizeRoles('judge', 'court', 'admin'), async (req, res) => {
  try {
    const session = await CourtSession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: 'Court session not found' });
    if (!session.is_virtual) return res.status(400).json({ error: 'Invites applicable only to virtual sessions' });
    const joinUrl = buildInviteUrl(session);
    const whenParts = [];
    if (session.scheduleDate) { try { whenParts.push(new Date(session.scheduleDate).toLocaleString()); } catch {} }
    if (session.startTime) whenParts.push(`Start: ${session.startTime}`);
    if (session.endTime) whenParts.push(`End: ${session.endTime}`);
    const whenStr = whenParts.length ? ` (${whenParts.join(' · ')})` : '';

    const lawIds = (session.involvedLawyerIds || []).map((x) => x.toString());
    const cliIds = (session.involvedClientIds || []).map((x) => x.toString());

    for (const lid of lawIds) {
      await createAndEmitNotification(req, lid, `Virtual court session scheduled${whenStr}. Join link: ${joinUrl}`, 'info');
    }
    for (const cid of cliIds) {
      await createAndEmitNotification(req, cid, `You are invited to a virtual court session${whenStr}. Join link: ${joinUrl}`, 'info');
    }
    res.json({ ok: true, invited_lawyers: lawIds.length, invited_clients: cliIds.length });
  } catch (err) {
    console.error('Failed to resend invites:', err);
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint to validate an invite token and whether it's active
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const session = await CourtSession.findOne({ invite_token: token }).lean();
    if (!session) return res.status(404).json({ error: 'Invalid invite token' });
    const status = String(session.status || '').toLowerCase();
    if ([ 'completed', 'cancelled' ].includes(status)) {
      return res.status(410).json({ error: 'Session ended' });
    }
    const now = Date.now();
    let activeFrom = session.invite_active_from ? new Date(session.invite_active_from).getTime() : 0;
    if (!activeFrom && session.scheduleDate) {
      try {
        const date = new Date(session.scheduleDate);
        if (session.startTime) {
          const [h, m, s] = String(session.startTime).split(':').map(n => parseInt(n, 10) || 0);
          date.setHours(h, m || 0, s || 0, 0);
        }
        activeFrom = date.getTime();
      } catch {}
    }
    const active = now >= (activeFrom || 0);
    res.json({
      active,
      session_id: String(session._id),
      join_path: session.virtual_meeting_link || `/meeting/${String(session._id)}`,
      active_from: session.invite_active_from || null,
      is_virtual: !!session.is_virtual,
      status: session.status || 'scheduled'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
