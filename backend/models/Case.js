const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3 },
  description: { type: String, required: true, minlength: 10 },
  status: { type: String, enum: ['pending', 'active', 'closed', 'cancelled', 'rejected'], default: 'pending' },
  // Optional classification fields used in UI filters/cards
  case_type: { type: String },
  practice_area: { type: String },
  // Keep common variations because other files use different naming conventions
  lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lawyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Optional court assignment (court user)
  courtId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  court_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Audit history for status changes and important actions
  history: [
    {
      status: { type: String },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Case', CaseSchema);
