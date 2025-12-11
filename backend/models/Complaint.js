const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 4000 },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    against: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved', 'rejected'],
      default: 'open'
    },
    resolution_notes: { type: String, default: null, maxlength: 2000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', ComplaintSchema);
