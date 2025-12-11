const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', DocumentSchema);
