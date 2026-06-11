// Socket.io signaling server for built-in video meetings
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { getJwtSecret, verifyJwtToken } = require('./utils/jwtSecret');
const SECRET = getJwtSecret();
// Import models to validate session status before allowing joins
let CourtSession;
let User;
try {
  CourtSession = require('./models/CourtSession');
} catch (e) {
  // Model may not be available in some environments; guard joins will be skipped
  CourtSession = null;
}
try {
  User = require('./models/User');
} catch (e) {
  User = null;
}

function startSignalingServer(server) {
  const io = socketIo(server, {
    path: '/ws/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Per-room control maps live on io instance
    io._roomLocks = io._roomLocks || new Map(); // roomId -> boolean (locked)
    io._chatDisabled = io._chatDisabled || new Map(); // roomId -> boolean
    io._spotlight = io._spotlight || new Map(); // roomId -> socketId
    // Attach authenticated user info (id, role) from JWT if provided
    try {
      const authToken = (socket.handshake.auth && socket.handshake.auth.token) || (socket.handshake.query && socket.handshake.query.token);
      if (authToken) {
        const decoded = verifyJwtToken(authToken.replace(/^Bearer\s+/i, ''));
        const norm = { ...decoded };
        norm.id = norm.id || norm._id || norm.userId || norm.sub || norm.uid || null;
        norm.role = (norm.role && String(norm.role).toLowerCase()) || null;
        if (norm.id) socket.data.userId = String(norm.id);
        if (norm.role) socket.data.role = norm.role;
      }
    } catch (e) {
      console.warn('[signaling] invalid or missing JWT on socket handshake');
    }
    // Optional: if client passes userId in query, join their personal room for notifications
    try {
      const q = socket.handshake && socket.handshake.query;
      const userId = q && (q.userId || q.userid);
      if (userId) socket.join(`user-${userId}`);
    } catch (e) {}
    // Join a room for a session (room id is the session id string)
    socket.on('join-room', async (roomId) => {
      const rid = String(roomId || '');
      if (!rid) return;
      // If room is locked, reject non-court users
      try {
        const locked = !!io._roomLocks.get(rid);
        const isCourtRole = String(socket.data.role || '').toLowerCase() === 'court';
        if (locked && !isCourtRole) {
          socket.emit('join-denied', { sessionId: rid, reason: 'locked' });
          return;
        }
      } catch {}
      try {
        // Defense-in-depth: prevent joining ended/cancelled sessions
        if (CourtSession) {
          const s = await CourtSession.findById(rid).select('status is_virtual scheduleDate startTime invite_active_from').lean();
          const status = String(s && s.status || '').toLowerCase();
          if (!s) {
            socket.emit('join-denied', { sessionId: rid, reason: 'not_found' });
            return;
          }
          if (['completed', 'cancelled'].includes(status)) {
            socket.emit('join-denied', { sessionId: rid, reason: 'ended', status });
            // Also nudge client UI to end
            socket.emit('session-ended', { sessionId: rid, status });
            return;
          }
          // Time gate: if current time is before invite_active_from (or schedule+start), deny join
          try {
            const now = Date.now();
            let activeFrom = s.invite_active_from ? new Date(s.invite_active_from).getTime() : 0;
            if (!activeFrom && s.scheduleDate) {
              const date = new Date(s.scheduleDate);
              if (s.startTime) {
                const [h, m, sec] = String(s.startTime).split(':').map(n => parseInt(n, 10) || 0);
                date.setHours(h, m || 0, sec || 0, 0);
              }
              activeFrom = date.getTime();
            }
            if (activeFrom && now < activeFrom) {
              socket.emit('join-denied', { sessionId: rid, reason: 'too_early', active_from: new Date(activeFrom).toISOString() });
              return;
            }
          } catch (e) {}
        }
      } catch (e) {
        // If validation fails, fail closed to be safe
        try { socket.emit('join-denied', { sessionId: rid, reason: 'validation_error' }); } catch {}
        return;
      }
      socket.join(rid);
      // Inform others of the new user
      socket.to(rid).emit('user-joined', socket.id);
      // Send current room membership to the joining client (with enrichment)
      try {
        const buildRoomState = async () => {
          const room = io.sockets.adapter.rooms.get(rid);
          const members = Array.from(room || []);
          const details = await Promise.all(members.map(async (sid) => {
            const s = io.sockets.sockets.get(sid);
            const meta = { socketId: sid, userId: undefined, role: undefined, name: undefined };
            if (s && s.data) {
              if (s.data.userId) meta.userId = String(s.data.userId);
              if (s.data.role) meta.role = String(s.data.role);
              if (!meta.name && User && (meta.userId || meta.role)) {
                try {
                  const u = meta.userId ? await User.findById(meta.userId).select('full_name role court_name').lean() : null;
                  if (u) {
                    meta.name = String(u.role).toLowerCase() === 'court' ? (u.court_name || 'Court') : (u.full_name || 'Participant');
                    if (!meta.role && u.role) meta.role = String(u.role).toLowerCase();
                  }
                } catch {}
              }
            }
            return meta;
          }));
          return { participants: members, details };
        };
        const state = await buildRoomState();
        // attach control flags
        state.locked = !!io._roomLocks.get(rid);
        state.chatDisabled = !!io._chatDisabled.get(rid);
        state.spotlight = io._spotlight.get(rid) || null;
        socket.emit('room-state', state);
        // Also broadcast updated room state to other members so their lists refresh
        socket.to(rid).emit('room-state', state);
      } catch {}
    });

    // Helper: ensure only the court/judge for the session can control it
    const ensureCourtController = async (roomId) => {
      try {
        // If explicit role 'court', permit, but also verify session judgeId when available
        const isCourtRole = String(socket.data.role || '').toLowerCase() === 'court';
        if (!CourtSession) return isCourtRole; // best-effort check
        const sess = await CourtSession.findById(String(roomId)).select('judgeId').lean();
        if (!sess) return false;
        const judgeId = String(sess.judgeId || '');
        const userId = String(socket.data.userId || '');
        return isCourtRole && judgeId && userId && judgeId === userId;
      } catch { return false; }
    };

    // Court-only: force mute/unmute
    socket.on('force-mute', async ({ roomId, target }) => {
      if (!roomId || !target) return;
      if (!(await ensureCourtController(roomId))) {
        try { socket.emit('control-denied', { action: 'force-mute', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      try { io.to(String(target)).emit('force-mute', { by: socket.id, roomId: String(roomId) }); } catch {}
    });
    socket.on('force-unmute', async ({ roomId, target }) => {
      if (!roomId || !target) return;
      if (!(await ensureCourtController(roomId))) {
        try { socket.emit('control-denied', { action: 'force-unmute', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      try { io.to(String(target)).emit('force-unmute', { by: socket.id, roomId: String(roomId) }); } catch {}
    });

    // Optional: allow host to end session via socket (server broadcast)
    socket.on('end-session', async (roomId) => {
      const rid = String(roomId || '');
      if (!rid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'end-session', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      // Broadcast only; backend REST still updates DB state
      socket.to(rid).emit('session-ended', { sessionId: rid, by: socket.id, at: new Date().toISOString() });
    });

    // Court-only: kick a participant from the session (disconnect their socket)
    socket.on('kick-user', async ({ roomId, target }) => {
      const rid = String(roomId || '');
      const tid = String(target || '');
      if (!rid || !tid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'kick-user', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      try {
        const targetSocket = io.sockets.sockets.get(tid);
        if (targetSocket) {
          try { targetSocket.emit('kicked', { roomId: rid, by: socket.id }); } catch {}
          // Leave room and disconnect to enforce removal
          try { targetSocket.leave(rid); } catch {}
          try { targetSocket.disconnect(true); } catch {}
        }
        // Inform remaining participants
        socket.to(rid).emit('user-left', tid);
        // Broadcast fresh room state
        try {
          const room = io.sockets.adapter.rooms.get(rid);
          const members = Array.from(room || []);
          const details = await Promise.all(members.map(async (sid) => {
            const s = io.sockets.sockets.get(sid);
            const meta = { socketId: sid, userId: undefined, role: undefined, name: undefined };
            if (s && s.data) {
              if (s.data.userId) meta.userId = String(s.data.userId);
              if (s.data.role) meta.role = String(s.data.role);
              if (!meta.name && User && (meta.userId || meta.role)) {
                try {
                  const u = meta.userId ? await User.findById(meta.userId).select('full_name role court_name').lean() : null;
                  if (u) {
                    meta.name = String(u.role).toLowerCase() === 'court' ? (u.court_name || 'Court') : (u.full_name || 'Participant');
                    if (!meta.role && u.role) meta.role = String(u.role).toLowerCase();
                  }
                } catch {}
              }
            }
            return meta;
          }));
          io.to(rid).emit('room-state', { participants: members, details });
        } catch {}
      } catch {}
    });

    // Court-only: force video off/on
    socket.on('force-video-off', async ({ roomId, target }) => {
      const rid = String(roomId || '');
      const tid = String(target || '');
      if (!rid || !tid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'force-video-off', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      try { io.to(tid).emit('force-video-off', { by: socket.id, roomId: rid }); } catch {}
    });
    socket.on('force-video-on', async ({ roomId, target }) => {
      const rid = String(roomId || '');
      const tid = String(target || '');
      if (!rid || !tid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'force-video-on', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      try { io.to(tid).emit('force-video-on', { by: socket.id, roomId: rid }); } catch {}
    });

    // Court-only: stop a participant's screen share
    socket.on('stop-screen-share', async ({ roomId, target }) => {
      const rid = String(roomId || '');
      const tid = String(target || '');
      if (!rid || !tid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'stop-screen-share', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      try { io.to(tid).emit('stop-screen-share', { by: socket.id, roomId: rid }); } catch {}
    });

    // Court-only: lock/unlock room
    socket.on('lock-room', async (roomId) => {
      const rid = String(roomId || '');
      if (!rid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'lock-room', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      io._roomLocks.set(rid, true);
      io.to(rid).emit('room-locked', { roomId: rid });
      // emit updated state
      try {
        const room = io.sockets.adapter.rooms.get(rid);
        const members = Array.from(room || []);
        io.to(rid).emit('room-state', { participants: members, details: [], locked: true, chatDisabled: !!io._chatDisabled.get(rid), spotlight: io._spotlight.get(rid) || null });
      } catch {}
    });
    socket.on('unlock-room', async (roomId) => {
      const rid = String(roomId || '');
      if (!rid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'unlock-room', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      io._roomLocks.set(rid, false);
      io.to(rid).emit('room-unlocked', { roomId: rid });
      try {
        const room = io.sockets.adapter.rooms.get(rid);
        const members = Array.from(room || []);
        io.to(rid).emit('room-state', { participants: members, details: [], locked: false, chatDisabled: !!io._chatDisabled.get(rid), spotlight: io._spotlight.get(rid) || null });
      } catch {}
    });

    // Court-only: disable/enable chat
    socket.on('disable-chat', async (roomId) => {
      const rid = String(roomId || '');
      if (!rid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'disable-chat', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      io._chatDisabled.set(rid, true);
      io.to(rid).emit('chat-disabled', { roomId: rid });
    });
    socket.on('enable-chat', async (roomId) => {
      const rid = String(roomId || '');
      if (!rid) return;
      if (!(await ensureCourtController(rid))) {
        try { socket.emit('control-denied', { action: 'enable-chat', reason: 'not_court_or_not_judge' }); } catch {}
        return;
      }
      io._chatDisabled.set(rid, false);
      io.to(rid).emit('chat-enabled', { roomId: rid });
    });

    // Convenience: join a user-specific room for notifications
    socket.on('join-user-room', (userId) => {
      try {
        const room = `user-${userId}`;
        socket.join(room);
      } catch (e) {
        // ignore
      }
    });

    // Relay signaling data (SDP, ICE)
    // Supports optional direct target or broadcast to room
    socket.on('signal', ({ roomId, target, data }) => {
      if (target) {
        socket.to(target).emit('signal', { sender: socket.id, data });
      } else if (roomId) {
        socket.to(roomId).emit('signal', { sender: socket.id, data });
      }
    });

    // Simple room chat support
    socket.on('chat', ({ roomId, content, sender }) => {
      if (!roomId || !content) return;
      const disabled = !!io._chatDisabled.get(String(roomId));
      if (disabled) return; // silently drop when disabled
      io.to(roomId).emit('chat', { sender: sender || socket.id, content });
    });

    // Lightweight realtime chat relay (server also persists via REST)
    socket.on('chat:send', ({ recipientId, text, from }) => {
      if (!recipientId || !text) return;
      io.to(`user-${recipientId}`).emit('chat:message', {
        text,
        from: from || socket.id,
        date: new Date().toISOString()
      });
    });

    // Typing indicator relay
    socket.on('chat:typing', ({ to, typing }) => {
      if (!to) return;
      io.to(`user-${to}`).emit('chat:typing', { typing: !!typing });
    });

    // Announce leaving to the room(s)
    socket.on('disconnecting', () => {
      try {
        const rooms = Array.from(socket.rooms || []);
        rooms.forEach((r) => {
          if (r && r !== socket.id) {
            io.to(r).emit('user-left', socket.id);
            // Broadcast updated room state for each room the socket was in
            (async () => {
              try {
                const room = io.sockets.adapter.rooms.get(r);
                const members = Array.from(room || []);
                const details = await Promise.all(members.map(async (sid) => {
                  const s = io.sockets.sockets.get(sid);
                  const meta = { socketId: sid, userId: undefined, role: undefined, name: undefined };
                  if (s && s.data) {
                    if (s.data.userId) meta.userId = String(s.data.userId);
                    if (s.data.role) meta.role = String(s.data.role);
                    if (!meta.name && User && (meta.userId || meta.role)) {
                      try {
                        const u = meta.userId ? await User.findById(meta.userId).select('full_name role court_name').lean() : null;
                        if (u) {
                          meta.name = String(u.role).toLowerCase() === 'court' ? (u.court_name || 'Court') : (u.full_name || 'Participant');
                          if (!meta.role && u.role) meta.role = String(u.role).toLowerCase();
                        }
                      } catch {}
                    }
                  }
                  return meta;
                }));
                io.to(r).emit('room-state', { participants: members, details });
              } catch {}
            })();
          }
        });
      } catch {}
    });
    // Allow clients to request a fresh room state snapshot on demand
    socket.on('request-room-state', async (roomId) => {
      try {
        const rid = String(roomId || '');
        if (!rid) return;
        const room = io.sockets.adapter.rooms.get(rid);
        const members = Array.from(room || []);
        const details = await Promise.all(members.map(async (sid) => {
          const s = io.sockets.sockets.get(sid);
          const meta = { socketId: sid, userId: undefined, role: undefined, name: undefined };
          if (s && s.data) {
            if (s.data.userId) meta.userId = String(s.data.userId);
            if (s.data.role) meta.role = String(s.data.role);
            if (!meta.name && User && (meta.userId || meta.role)) {
              try {
                const u = meta.userId ? await User.findById(meta.userId).select('full_name role court_name').lean() : null;
                if (u) {
                  meta.name = String(u.role).toLowerCase() === 'court' ? (u.court_name || 'Court') : (u.full_name || 'Participant');
                  if (!meta.role && u.role) meta.role = String(u.role).toLowerCase();
                }
              } catch {}
            }
          }
          return meta;
        }));
        socket.emit('room-state', { participants: members, details });
      } catch {}
    });
    socket.on('disconnect', () => { /* no-op */ });
  });

  return io;
}

module.exports = { startSignalingServer };
