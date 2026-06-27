const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usedAt: { type: Date, default: Date.now },
}, { _id: false });

const couponSchema = new mongoose.Schema({
  code: {
    type: String, required: true, unique: true,
    uppercase: true, trim: true,
    match: /^[A-Z0-9_-]{2,32}$/,
  },

  /* ── Tipo de promoção ───────────────────────────────── */
  promoType: {
    type: String,
    enum: ['coupon', 'bxgy'], // cupom ou "compre X leve Y"
    default: 'coupon',
  },

  /* ── Desconto (promoType = coupon) ─────────────────── */
  discountType:  { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, min: 0, default: 0 },

  /* ── Compre X Leve Y (promoType = bxgy) ────────────── */
  buyQty:   { type: Number, min: 1, default: 2 },
  getQty:   { type: Number, min: 1, default: 1 },
  freeRule: { type: String, enum: ['cheapest', 'same'], default: 'cheapest' },

  /* ── Escopo de aplicação ────────────────────────────── */
  scope: {
    type: String,
    enum: ['global', 'colecao', 'categoria', 'subcategoria', 'zona', 'produto'],
    default: 'global',
  },
  scopeValue:  { type: String, default: '' },
  scopeValues: { type: [String], default: [] }, // múltiplos valores do mesmo scope

  /* ── Regras de activação ────────────────────────────── */
  startsAt:       { type: Date, default: null },
  expiresAt:      { type: Date, default: null },
  maxUses:        { type: Number, default: 0, min: 0 }, // 0 = ilimitado
  maxUsesPerUser: { type: Number, default: 0, min: 0 }, // 0 = ilimitado
  minCartValue:   { type: Number, default: 0, min: 0 },

  /* ── Estado ─────────────────────────────────────────── */
  active:    { type: Boolean, default: true },
  usedCount: { type: Number, default: 0 },
  usedBy:    [usageSchema],
}, { timestamps: true });

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ active: 1, expiresAt: 1 });

/* Remove usedBy do retorno público para não expor dados de users */
couponSchema.methods.toPublic = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  delete obj.usedBy;
  return obj;
};

module.exports = mongoose.model('Coupon', couponSchema);
