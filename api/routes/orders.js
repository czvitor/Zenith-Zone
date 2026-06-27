const router       = require('express').Router();
const mongoose     = require('mongoose');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const Order        = require('../models/Order');
const Product      = require('../models/Product');
const Coupon       = require('../models/Coupon');
const { sendOrderConfirmationEmail } = require('../utils/mailer');

/* ── POST /api/orders ────────────────────────────────────────
   Cria pedido, deduz estoque e aciona auto-pause se zerado. */
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, total, couponCode } = req.body;

    if (!Array.isArray(items) || !items.length)
      return res.status(422).json({ error: 'Carrinho vazio.' });
    if (typeof total !== 'number' || total < 0)
      return res.status(422).json({ error: 'Total inválido.' });

    let expectedTotal = 0;

    /* ── Validação de cada item ─────────────────────────── */
    for (const item of items) {
      if (!item.id || !mongoose.isValidObjectId(item.id))
        return res.status(422).json({ error: 'ID de produto inválido.' });

      const product = await Product.findById(item.id)
        .select('titulo preco status estoque pausedVariations');

      if (!product || !['publicado', 'pausado'].includes(product.status))
        return res.status(422).json({
          error: `Produto "${item.name || item.id}" não está disponível.`,
        });

      if (Math.abs(product.preco - (item.price || 0)) > 0.01)
        return res.status(422).json({
          error: `Preço desatualizado para "${product.titulo}". Recarregue a página.`,
        });

      expectedTotal += product.preco * Math.max(1, parseInt(item.qty) || 1);
    }

    if (Math.abs(expectedTotal - total) > 0.02)
      return res.status(422).json({ error: 'Total inconsistente. Recarregue a página.' });

    /* ── Valida e aplica cupão (server-side) ────────────── */
    let discount   = 0;
    let appliedCode = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      const now = new Date();
      const valid =
        coupon && coupon.active &&
        (!coupon.startsAt  || coupon.startsAt  <= now) &&
        (!coupon.expiresAt || coupon.expiresAt >= now) &&
        (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses) &&
        (coupon.minCartValue === 0 || expectedTotal >= coupon.minCartValue);

      if (valid) {
        if (coupon.promoType === 'bxgy') {
          const prices = items.flatMap(i =>
            Array(Math.max(1, parseInt(i.qty) || 1)).fill(i.price || 0),
          ).sort((a, b) => a - b);
          const groupSize = coupon.buyQty + coupon.getQty;
          const groups = Math.floor(prices.length / groupSize);
          let free = 0;
          for (let g = 0; g < groups; g++) {
            for (let k = 0; k < coupon.getQty; k++) free += prices[k] || 0;
            prices.splice(0, groupSize);
          }
          discount = free;
        } else if (coupon.discountType === 'percentage') {
          discount = expectedTotal * (coupon.discountValue / 100);
        } else {
          discount = Math.min(expectedTotal, coupon.discountValue);
        }
        discount = Math.round(discount * 100) / 100;
        appliedCode = coupon.code;

        /* Registar uso */
        await Coupon.findByIdAndUpdate(coupon._id, {
          $inc: { usedCount: 1 },
          $push: { usedBy: { userId: req.user._id, usedAt: now } },
        });
      }
    }

    const finalTotal = Math.max(0, expectedTotal - discount);

    /* ── Cria pedido ────────────────────────────────────── */
    const order = await Order.create({
      user:       req.user._id,
      items,
      subtotal:   expectedTotal,
      discount,
      total:      finalTotal,
      couponCode: appliedCode,
    });

    /* ── Deduz estoque + auto-pause + contagem de vendas ─── */
    const processedIds = new Set();
    for (const item of items) {
      if (item.color && item.size) {
        await Product.deductStock(item.id, item.color, item.size, item.qty || 1);
      }
      /* Incrementa salesCount com a quantidade comprada deste item */
      const qty = Math.max(1, parseInt(item.qty) || 1);
      await Product.findByIdAndUpdate(item.id, { $inc: { salesCount: qty } });
      processedIds.add(item.id);
    }
    for (const productId of processedIds) {
      await Product.checkAndAutoPause(productId);
    }

    sendOrderConfirmationEmail(req.user.email, order)
      .catch(e => console.error('[Mailer]', e.message));

    res.status(201).json({ order: order.toPublic() });
  } catch (err) {
    console.error('orders/create:', err);
    res.status(500).json({ error: 'Erro interno ao criar pedido.' });
  }
});

/* ── GET /api/orders/my ──────────────────────────────────── */
router.get('/my', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ orders: orders.map(o => o.toPublic()) });
  } catch (err) {
    console.error('orders/my:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── GET /api/orders/admin ───────────────────────────────── */
router.get('/admin', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip))
        .populate('user', 'firstName lastName email username'),
      Order.countDocuments(filter),
    ]);

    const result = orders.map(o => {
      const pub = o.toPublic();
      pub.userEmail = o.user?.email || '';
      pub.userName  = (`${o.user?.firstName || ''} ${o.user?.lastName || ''}`).trim() || o.user?.username || '';
      return pub;
    });

    res.json({ orders: result, total });
  } catch (err) {
    console.error('orders/admin:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── PATCH /api/orders/:id/status ────────────────────────── */
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  const VALID = ['pendente', 'confirmado', 'enviado', 'entregue', 'cancelado'];
  const { status } = req.body;

  if (!VALID.includes(status))
    return res.status(422).json({ error: `Status inválido. Use: ${VALID.join(', ')}.` });
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(422).json({ error: 'ID de pedido inválido.' });

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    res.json({ order: order.toPublic() });
  } catch (err) {
    console.error('orders/status:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
