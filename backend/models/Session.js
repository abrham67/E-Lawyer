const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  judgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduled_date: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  virtual_meeting_link: String,
  recording_url: String,
  meeting_platform: { type: String, enum: ['Zoom', 'Jitsi', 'WebRTC'], default: 'WebRTC' },
  meeting_password: String,
  notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Session', SessionSchema);
