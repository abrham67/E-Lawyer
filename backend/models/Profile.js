const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: String,
  qualifications: [String],
  expertise: [String],
  experience: String,
  caseHistory: [{
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    title: String,
    description: String,
    outcome: String,
    date: Date
  }],
  credentials: [{
    filename: String,
    filepath: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  rating: { type: Number, default: 0 },
  reviews: [{
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    rating: Number
  }]
});

module.exports = mongoose.model('Profile', profileSchema);
