const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Text is required only when there is no attachment
  text: { type: String, required: function() { return !(this.attachment && (this.attachment.filepath || this.attachment.filename)); } },
  // Encryption metadata (when enabled)
  iv: { type: String },
  authTag: { type: String },
  read: { type: Boolean, default: false },
  delivered_at: { type: Date },
  read_at: { type: Date },
  attachment: {
    filename: String,
    filepath: String,
    mimetype: String,
    size: Number,
  },
  reactions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: String, // e.g., '👍','❤️','😂','😮','😢','🙏'
      created_at: { type: Date, default: Date.now },
    },
  ],
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
