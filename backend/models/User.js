const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: {
    type: String,
    required: function () { return this.role !== 'court'; },
    match: [/^[A-Za-z\s.'-]+$/, 'Full name must contain letters and spaces only']
  },
  role: { type: String, enum: ['lawyer', 'client', 'court', 'admin'], required: true },
  bar_number: { type: String, validate: { validator: v => !v || /^\d+$/.test(String(v)), message: 'Bar number must contain digits only' } },
  specialization: { type: String, validate: { validator: v => !v || /^[A-Za-z\s.'-]+$/.test(v), message: 'Specialization must contain letters and spaces only' } },
  court_name: {
    type: String,
    validate: {
  validator: v => !v || /^[A-Za-z0-9\s.'\-&,()/:–—’]+$/.test(v),
      message: 'Court name contains invalid characters'
    }
  },
  jurisdiction: String,
  court_type: String,
  // KYC fields
  id_number: { type: String, validate: { validator: v => !v || /^[A-Za-z0-9]+$/.test(String(v)), message: 'ID number must be letters and digits only' } },
  id_photo_path: String,
  id_verified: { type: Boolean, default: false },
  is_suspended: { type: Boolean, default: false },
  suspension_reason: {
    type: String,
    maxlength: 500,
    default: null,
    validate: {
      validator: v => !v || v.trim().length > 0,
      message: 'Suspension reason cannot be blank'
    }
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
