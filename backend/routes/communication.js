const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Message = require('../models/Message');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Attachment upload storage
// Use a stable absolute base aligned with app.use('/uploads', express.static(...)) in app.js
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const base = path.join(__dirname, '..', 'uploads', 'messages');
    try { fs.mkdirSync(base, { recursive: true }); } catch {}
    cb(null, base);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname || ''));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
  fileFilter: (req, file, cb) => {
    const mt = String(file.mimetype || '').toLowerCase();
    const ext = path.extname(String(file.originalname || '')).toLowerCase();
    // Allow broad classes + explicit office/pdf types + safe extension fallback (for octet-stream uploads)
    const allowedMime = /^(image|audio|video)\//.test(mt)
      || mt === 'application/pdf'
      || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
      || mt === 'application/msword'; // .doc
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mkv', '.mov', '.aac', '.mp3', '.wav', '.pdf', '.docx', '.doc']
      .includes(ext);
    if (!(allowedMime || allowedExt)) {
      return cb(new Error('Only images, audio, video, PDF, DOCX, and DOC are allowed'));
    }
    cb(null, true);
  },
});

// Optional encryption for message text at rest
const ENC_ALGO = 'aes-256-gcm';
const ENC_KEY = process.env.MESSAGE_SECRET && process.env.MESSAGE_SECRET.length >= 32
  ? crypto.createHash('sha256').update(process.env.MESSAGE_SECRET).digest()
  : null;

function isAdminUser(req) {
  return String(req?.user?.role || '').toLowerCase() === 'admin';
}

function encryptText(plain) {
  if (!ENC_KEY) return { text: plain };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    text: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function decryptMessage(msg) {
  if (!msg) return msg;
  if (!ENC_KEY || !msg.iv || !msg.authTag) return msg;
  try {
    const iv = Buffer.from(msg.iv, 'base64');
    const authTag = Buffer.from(msg.authTag, 'base64');
    const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
    decipher.setAuthTag(authTag);
    const buf = Buffer.concat([
      decipher.update(Buffer.from(msg.text || '', 'base64')),
      decipher.final(),
    ]);
    const clone = msg.toObject ? msg.toObject() : { ...msg };
    clone.text = buf.toString('utf8');
    return clone;
  } catch {
    // If decryption fails, return as-is to avoid data loss
    return msg.toObject ? msg.toObject() : { ...msg };
  }
}

// Base GET: simple ping with counts for the authenticated user
// Optional query recipientId: if provided, also include unread count for that thread
router.get('/', authenticateToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipientId: req.user.id, read: false });
    const recipientId = req.query.recipientId;
    let threadUnread = 0;
    if (recipientId && String(recipientId).match(/^[a-fA-F0-9]{24}$/)) {
      threadUnread = await Message.countDocuments({ recipientId: req.user.id, senderId: recipientId, read: false });
    }
    res.json({ messages: [], unread: count, threadUnread });
  } catch (e) {
    res.json({ messages: [] });
  }
});

// Conversation history between auth user and a recipient
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const recipientId = req.query.recipientId;
    if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });
    const userId = req.user.id;
    const isAdmin = isAdminUser(req);
    // Validate ObjectId format; if invalid (e.g., demo-client), return empty history gracefully
    const isValidId = String(recipientId).match(/^[a-fA-F0-9]{24}$/);
    if (!isValidId) return res.json({ messages: [] });
    const query = isAdmin
      ? { $or: [{ senderId: recipientId }, { recipientId: recipientId }] }
      : {
        $or: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId }
        ]
      };
  const raw = await Message.find(query).sort({ created_at: 1 });
  const messages = raw.map(m => decryptMessage(m));
  res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all messages for the user (latest 100)
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
  const raw = await Message.find(isAdminUser(req) ? {} : { $or: [{ senderId: userId }, { recipientId: userId }] })
      .sort({ created_at: -1 })
      .limit(100);
  const messages = raw.map(m => decryptMessage(m));
  res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEND message
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { recipientId, message, text } = req.body;
    const content = message || text; // support both names
    if (!recipientId || !content) return res.status(400).json({ error: 'recipientId and message are required' });
    // Validate ObjectId format to prevent CastError
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(String(recipientId))) {
      return res.status(400).json({ error: 'Invalid recipientId' });
    }
    const payload = encryptText(content);
  const doc = await Message.create({ senderId: req.user.id, recipientId, ...payload, delivered_at: new Date() });
    // emit to recipient via socket (if signaling server attached)
    try {
      const io = req.app && req.app.locals && req.app.locals.io;
      // Emit plaintext over socket for client UX; store encrypted at rest
      if (io) io.to(`user-${recipientId}`).emit('chat:message', { ...decryptMessage(doc), id: doc._id });
    } catch (e) {
      // ignore emit errors
    }
    // Return plaintext to sender as well, maintaining existing API expectations
    res.status(201).json(decryptMessage(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEND message with attachment
router.post('/messages/with-attachment', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || (!text && !req.file)) return res.status(400).json({ error: 'recipientId and text or file is required' });
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(String(recipientId))) {
      return res.status(400).json({ error: 'Invalid recipientId' });
    }
    const payload = text ? encryptText(text) : { text: '' };
    // Compute a web-facing path for the file (always forward slashes)
    const webPath = req.file
      ? ['uploads', 'messages', req.file.filename].join('/')
      : undefined;
    const attachment = req.file ? {
      filename: req.file.originalname,
      filepath: webPath, // relative to domain root, served by /uploads static
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : undefined;
    const doc = await Message.create({ senderId: req.user.id, recipientId, ...payload, attachment, delivered_at: new Date() });
    const io = req.app?.locals?.io;
    if (io) io.to(`user-${recipientId}`).emit('chat:message', { ...decryptMessage(doc), id: doc._id });
    res.status(201).json(decryptMessage(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET message by ID
router.get('/messages/:id', authenticateToken, async (req, res) => {
  try {
  const raw = await Message.findById(req.params.id);
  const msg = decryptMessage(raw);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (String(msg.senderId) !== req.user.id && String(msg.recipientId) !== req.user.id && !isAdminUser(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a message as delivered (server acknowledges recipient online). Typically called when recipient fetches/receives.
router.post('/messages/:id/delivered', authenticateToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (String(msg.recipientId) !== req.user.id && String(msg.senderId) !== req.user.id && !isAdminUser(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!msg.delivered_at) msg.delivered_at = new Date();
    await msg.save();
    const io = req.app?.locals?.io;
    if (io) io.to(`user-${msg.senderId}`).emit('chat:delivered', { id: msg._id, delivered_at: msg.delivered_at });
    res.json({ id: msg._id, delivered_at: msg.delivered_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a message as read
router.post('/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (String(msg.recipientId) !== req.user.id && !isAdminUser(req)) {
      return res.status(403).json({ error: 'Forbidden: only recipient can read' });
    }
    msg.read = true;
    msg.read_at = new Date();
    await msg.save();
    const io = req.app?.locals?.io;
    if (io) io.to(`user-${msg.senderId}`).emit('chat:read', { id: msg._id, read_at: msg.read_at });
    res.json({ id: msg._id, read_at: msg.read_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// React to a message
router.post('/messages/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) return res.status(400).json({ error: 'reaction type is required' });
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    // Only participants can react
    if (![String(msg.senderId), String(msg.recipientId)].includes(String(req.user.id)) && !isAdminUser(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const react = { userId: req.user.id, type, created_at: new Date() };
    msg.reactions = msg.reactions || [];
    msg.reactions.push(react);
    await msg.save();
    const io = req.app?.locals?.io;
    if (io) {
      const toRooms = [`user-${msg.senderId}`, `user-${msg.recipientId}`];
      toRooms.forEach(r => io.to(r).emit('chat:reaction', { messageId: msg._id, reaction: react }));
    }
    res.status(201).json({ messageId: msg._id, reaction: react });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE message
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (String(msg.senderId) !== req.user.id && !isAdminUser(req)) {
      return res.status(403).json({ error: 'Forbidden: only sender can delete' });
    }
    await Message.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
