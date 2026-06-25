const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email:  { type: String, required: true, trim: true, lowercase: true },
  source: { type: String, default: 'site' },
  ativo:  { type: Boolean, default: true },
  alertsSent: {
    confirmation: { type: Boolean, default: false },
    week:         { type: Boolean, default: false },
    day:          { type: Boolean, default: false },
    hour:         { type: Boolean, default: false },
  },
}, { timestamps: true });

newsletterSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);
