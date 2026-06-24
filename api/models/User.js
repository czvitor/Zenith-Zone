const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  username:   { type: String, required: false, unique: true, sparse: true, trim: true, lowercase: true },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  address:    { type: String, trim: true, default: '' },
  password:   { type: String, required: true },
  role:       { type: String, enum: ['admin', 'moderator', 'client'], default: 'client' },

  permissions: {
    canEditProducts:  { type: Boolean, default: false },
    canViewOrders:    { type: Boolean, default: false },
    canManageUsers:   { type: Boolean, default: false },
    canConfigureSite: { type: Boolean, default: false },
  },

  resetToken:       { type: String,  default: null },
  resetTokenExpiry: { type: Date,    default: null },
}, { timestamps: true });

// Hash senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Comparar senha na autenticação
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Retornar objeto sem campos sensíveis
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
