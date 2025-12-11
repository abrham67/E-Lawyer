const mongoose = require('mongoose');

const courtSessionSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  judgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduleDate: { type: Date, required: true },
  startTime: String,
  endTime: String,
  involvedLawyerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Clients invited to/part of the session (especially for virtual)
  involvedClientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: String,
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' },
  is_virtual: { type: Boolean, default: false },
  virtual_meeting_link: { type: String },
  // Optional time-gated invite support
  invite_token: { type: String, index: true, unique: false },
  invite_active_from: { type: Date },
  notes: { type: String }
});

module.exports = mongoose.model('CourtSession', courtSessionSchema);
