const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Case = require('../models/Case');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Base GET /api/documents - return the authenticated user's uploads for now
router.get('/', authenticateToken, async (req, res) => {
  try {
    const docs = await Document.find({ uploaderId: req.user.id }).limit(50);
    res.json(docs.map(mapDocToClient));
  } catch (err) {
    res.json([]);
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '..', 'uploads', 'documents');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '-' + (file.originalname || 'upload');
    cb(null, name);
  }
});
const upload = multer({ storage });

function mapDocToClient(d) {
  return {
    id: d._id?.toString?.() || d.id,
    case_id: d.caseId?._id?.toString?.() || d.caseId?.toString?.(),
    uploader_id: d.uploaderId?._id?.toString?.() || d.uploaderId?.toString?.(),
    file_name: d.filename,
    file_path: d.filepath,
    filename: d.filename,
    filepath: d.filepath,
    url: d.filepath ? ('/' + String(d.filepath).replace(/^\/+/, '')) : undefined,
    created_at: d.uploaded_at || d.created_at || d.updated_at || new Date(),
  };
}

// Safely coerce id-ish value to string
function idToString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val._id) return String(val._id);
    if (val.id) return String(val.id);
    if (typeof val.toString === 'function') {
      const s = val.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  return '';
}

// Upload document
router.post('/:caseId', authenticateToken, authorizeRoles('lawyer', 'client'), upload.single('file'), async (req, res) => {
  try {
    const webPath = req.file ? ['uploads', 'documents', req.file.filename].join('/') : undefined;
    const doc = new Document({
      caseId: req.params.caseId,
      uploaderId: req.user.id,
      filename: req.file?.originalname || req.file?.filename || 'file',
      filepath: webPath,
    });
    await doc.save();
    res.status(201).json(mapDocToClient(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get documents for a case
// Allow lawyer, client, and court participants assigned to the case
router.get('/:caseId', authenticateToken, authorizeRoles('lawyer', 'client', 'court'), async (req, res) => {
  try {
    const caseId = req.params.caseId;
    const foundCase = await Case.findById(caseId).select('lawyer_id lawyerId client_id clientId court_id courtId').lean();
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });
    const lawyerId = idToString(foundCase.lawyer_id) || idToString(foundCase.lawyerId);
    const clientId = idToString(foundCase.client_id) || idToString(foundCase.clientId);
    const courtId = idToString(foundCase.court_id) || idToString(foundCase.courtId);
    const uid = String(req.user.id || '');
    const isLawyer = lawyerId && lawyerId === uid;
    const isClient = clientId && clientId === uid;
    const isCourt = courtId && courtId === uid;
    if (!isLawyer && !isClient && !isCourt) {
      return res.status(403).json({ error: 'Forbidden: not assigned to this case' });
    }
    const docs = await Document.find({ caseId });
    res.json((docs || []).map(mapDocToClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure document download endpoint
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    // Allow uploader or assigned case participants (lawyer/client/court)
  const isUploader = String(doc.uploaderId || '') === String(req.user.id || '');
    let allowed = isUploader;
    if (!allowed && doc.caseId) {
      try {
        const foundCase = await Case.findById(doc.caseId).select('lawyer_id lawyerId client_id clientId court_id courtId').lean();
        const lawyerId = idToString(foundCase?.lawyer_id) || idToString(foundCase?.lawyerId);
        const clientId = idToString(foundCase?.client_id) || idToString(foundCase?.clientId);
        const courtId = idToString(foundCase?.court_id) || idToString(foundCase?.courtId);
        const uid = String(req.user.id || '');
        allowed = Boolean((lawyerId && lawyerId === uid) || (clientId && clientId === uid) || (courtId && courtId === uid));
      } catch {}
    }
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    // Resolve absolute path from stored relative filepath (uploads/...)
    const abs = path.join(__dirname, '..', doc.filepath);
    res.download(abs, doc.filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
