const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../recordings');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Upload a recording (POST /api/recordings)
router.post('/', authenticateToken, upload.single('recording'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Only allow judge or admin
  if (!['judge', 'admin', 'court'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  res.json({
    url: `/api/recordings/${req.file.filename}`,
    name: req.file.originalname,
    uploadedBy: req.user.full_name || req.user.email,
    time: new Date().toISOString(),
  });
});

// Serve recordings securely
router.get('/:filename', authenticateToken, (req, res) => {
  if (!['judge', 'admin', 'court'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const filePath = path.join(__dirname, '../../recordings', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filePath);
});

module.exports = router;
