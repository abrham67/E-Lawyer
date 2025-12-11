const mongoose = require('mongoose');

// User (base schema)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['lawyer', 'client', 'judge', 'admin'], required: true }
}, { discriminatorKey: 'role', timestamps: true });

const User = mongoose.model('User', UserSchema);

// Lawyer
const LawyerSchema = new mongoose.Schema({
  specialty: String,
  experience: Number,
  qualifications: [String],
  barLicenseNumber: String,
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'LawyerProfile' }
});
const Lawyer = User.discriminator('Lawyer', LawyerSchema);

// Client
const ClientSchema = new mongoose.Schema({});
const Client = User.discriminator('Client', ClientSchema);

// Judge
const JudgeSchema = new mongoose.Schema({
  courtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Court' }
});
const Judge = User.discriminator('Judge', JudgeSchema);

// Admin
const AdminSchema = new mongoose.Schema({});
const Admin = User.discriminator('Admin', AdminSchema);

// LawyerProfile
const LawyerProfileSchema = new mongoose.Schema({
  lawyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lawyer', required: true },
  details: String,
  rating: Number,
  reviews: [{ reviewer: String, comment: String, rating: Number }]
});
const LawyerProfile = mongoose.model('LawyerProfile', LawyerProfileSchema);

// Case
const CaseSchema = new mongoose.Schema({
  lawyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lawyer', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  caseNumber: String,
  title: String,
  description: String,
  filingDate: Date,
  status: String,
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }]
});
const Case = mongoose.model('Case', CaseSchema);

// Document
const DocumentSchema = new mongoose.Schema({
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  lawyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lawyer' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  title: String,
  description: String,
  uploadDate: Date,
  filePath: String
});
const Document = mongoose.model('Document', DocumentSchema);

// CourtSession
const CourtSessionSchema = new mongoose.Schema({
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  judge: { type: mongoose.Schema.Types.ObjectId, ref: 'Judge', required: true },
  scheduleDate: Date,
  startTime: String,
  endTime: String,
  location: String,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const CourtSession = mongoose.model('CourtSession', CourtSessionSchema);

// Export all models
module.exports = {
  User,
  Lawyer,
  Client,
  Judge,
  Admin,
  LawyerProfile,
  Case,
  Document,
  CourtSession
};
