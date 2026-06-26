const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  email:     { type: String, required: true, trim: true, lowercase: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variacao:  {
    cor:     { type: String, trim: true, default: '' },
    tamanho: { type: String, trim: true, default: '' },
  },
  notified:  { type: Boolean, default: false },
}, { timestamps: true });

/* Impede e-mails duplicados para o mesmo produto */
waitlistSchema.index({ email: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Waitlist', waitlistSchema);
