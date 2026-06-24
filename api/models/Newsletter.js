const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email:  { type: String, required: true, trim: true, lowercase: true },
  source: { type: String, default: 'site' }, /* 'site', 'produto', 'lista-espera' */
  produto:{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  ativo:  { type: Boolean, default: true },
}, { timestamps: true });

newsletterSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);
