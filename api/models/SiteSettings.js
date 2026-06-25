const mongoose = require('mongoose');

/* Singleton — sempre um único documento com _id = 'global' */
const siteSettingsSchema = new mongoose.Schema({
  _id:        { type: String, default: 'global' },
  dropTitle:  { type: String, default: '' },
  dropDate:   { type: Date,   default: null },
  dropActive: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
