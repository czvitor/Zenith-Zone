const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user:  {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  items: {
    type:     mongoose.Schema.Types.Mixed,
    required: true,
  },
  total: {
    type:     Number,
    required: true,
    min:      0,
  },
  status: {
    type:    String,
    enum:    ['pendente', 'confirmado', 'enviado', 'entregue', 'cancelado'],
    default: 'pendente',
  },
  couponCode:   { type: String, default: null },
  discount:     { type: Number, default: 0 },
  subtotal:     { type: Number, default: 0 },
}, { timestamps: true });

orderSchema.methods.toPublic = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Order', orderSchema);
