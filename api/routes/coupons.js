const router       = require('express').Router();
const mongoose     = require('mongoose');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const Coupon       = require('../models/Coupon');
const Product      = require('../models/Product');

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */

/**
 * Verifica se os itens do carrinho estão dentro do escopo do cupão.
 * Para scope='global' sempre retorna true.
 * Para outros scopes, pelo menos 1 item deve corresponder.
 */
async function itemsMatchScope(coupon, cartItems) {
  if (coupon.scope === 'global') return true;
  if (!cartItems?.length) return false;

  for (const item of cartItems) {
    if (!item.id || !mongoose.isValidObjectId(item.id)) continue;

    if (coupon.scope === 'produto') {
      if (String(item.id) === String(coupon.scopeValue)) return true;
      continue;
    }

    const product = await Product.findById(item.id)
      .select('colecao categoriaId subcategoriaId zonaId').lean();
    if (!product) continue;

    if (coupon.scope === 'colecao'       && product.colecao       === coupon.scopeValue) return true;
    if (coupon.scope === 'categoria'     && product.categoriaId   === coupon.scopeValue) return true;
    if (coupon.scope === 'subcategoria'  && product.subcategoriaId === coupon.scopeValue) return true;
    if (coupon.scope === 'zona'          && product.zonaId        === coupon.scopeValue) return true;
  }
  return false;
}

/**
 * Calcula o valor do desconto em R$ para o carrinho fornecido.
 */
async function calcDiscount(coupon, cartItems, cartTotal) {
  if (coupon.promoType === 'bxgy') {
    return calcBxgyDiscount(coupon, cartItems);
  }

  if (coupon.discountType === 'percentage') {
    return Math.min(cartTotal, cartTotal * (coupon.discountValue / 100));
  }
  return Math.min(cartTotal, coupon.discountValue);
}

/**
 * Calcula desconto para promoções "Compre X Leve Y".
 * O(s) item(ns) gratuito(s) é/são o(s) de menor valor.
 */
function calcBxgyDiscount(coupon, cartItems) {
  // Expande itens por quantidade
  const expanded = [];
  for (const item of cartItems) {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    for (let i = 0; i < qty; i++) {
      expanded.push(item.price || 0);
    }
  }

  const total = coupon.buyQty + coupon.getQty;
  if (expanded.length < total) return 0;

  const sorted = [...expanded].sort((a, b) => a - b); // menor para maior
  let freeTotal = 0;
  const groups = Math.floor(expanded.length / total);

  for (let g = 0; g < groups; g++) {
    // Os getQty menores valores de cada grupo são gratuitos
    for (let i = 0; i < coupon.getQty; i++) {
      freeTotal += sorted[i] || 0;
    }
    sorted.splice(0, total);
  }
  return freeTotal;
}

/* ═══════════════════════════════════════════════════════
   ROTAS ADMIN (CRUD)
═══════════════════════════════════════════════════════ */

/* GET /api/coupons — lista todos (admin) */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { active, promoType, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';
    if (promoType) filter.promoType = promoType;

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 })
        .limit(Number(limit)).skip(Number(skip))
        .select('-usedBy'),
      Coupon.countDocuments(filter),
    ]);
    res.json({ coupons: coupons.map(c => c.toPublic()), total });
  } catch (err) {
    console.error('coupons/list:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* GET /api/coupons/:id — detalhes (admin) */
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(422).json({ error: 'ID inválido.' });

    const coupon = await Coupon.findById(req.params.id).select('-usedBy');
    if (!coupon) return res.status(404).json({ error: 'Cupão não encontrado.' });
    res.json({ coupon: coupon.toPublic() });
  } catch (err) {
    console.error('coupons/get:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* POST /api/coupons — cria cupão (admin) */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ coupon: coupon.toPublic() });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'Código de cupão já existe.' });
    if (err.name === 'ValidationError')
      return res.status(422).json({ error: err.message });
    console.error('coupons/create:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* PUT /api/coupons/:id — actualiza cupão (admin) */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(422).json({ error: 'ID inválido.' });

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).select('-usedBy');

    if (!coupon) return res.status(404).json({ error: 'Cupão não encontrado.' });
    res.json({ coupon: coupon.toPublic() });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'Código de cupão já existe.' });
    if (err.name === 'ValidationError')
      return res.status(422).json({ error: err.message });
    console.error('coupons/update:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* DELETE /api/coupons/:id — remove cupão (admin) */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(422).json({ error: 'ID inválido.' });

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Cupão não encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('coupons/delete:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ═══════════════════════════════════════════════════════
   ROTA PÚBLICA — VALIDAR CUPÃO
   POST /api/coupons/validate
   Body: { code, cartItems, cartTotal }
   Não exige auth — guest pode ver se é válido,
   mas o uso real é registado ao criar o pedido.
═══════════════════════════════════════════════════════ */
router.post('/validate', async (req, res) => {
  try {
    const { code, cartItems = [], cartTotal = 0 } = req.body;
    if (!code) return res.status(422).json({ error: 'Código obrigatório.' });

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon || !coupon.active)
      return res.status(404).json({ error: 'Cupão inválido ou inactivo.' });

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now)
      return res.status(400).json({ error: 'Este cupão ainda não está activo.' });
    if (coupon.expiresAt && coupon.expiresAt < now)
      return res.status(400).json({ error: 'Este cupão expirou.' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
      return res.status(400).json({ error: 'Este cupão atingiu o limite de utilizações.' });
    if (coupon.minCartValue > 0 && cartTotal < coupon.minCartValue)
      return res.status(400).json({
        error: `Carrinho mínimo de R$ ${coupon.minCartValue.toFixed(2)} para este cupão.`,
      });

    const scopeOk = await itemsMatchScope(coupon, cartItems);
    if (!scopeOk)
      return res.status(400).json({ error: 'Nenhum produto no carrinho é elegível para este cupão.' });

    /* Verifica limite por utilizador (se autenticado) */
    const authHeader = req.headers.authorization;
    if (coupon.maxUsesPerUser > 0 && authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        const userUsage = coupon.usedBy.filter(u => String(u.userId) === String(payload._id)).length;
        if (userUsage >= coupon.maxUsesPerUser)
          return res.status(400).json({ error: 'Já utilizou este cupão o número máximo de vezes.' });
      } catch { /* token inválido — ignora verificação por utilizador */ }
    }

    const discount = await calcDiscount(coupon, cartItems, cartTotal);
    const finalTotal = Math.max(0, cartTotal - discount);

    res.json({
      valid: true,
      code:          coupon.code,
      promoType:     coupon.promoType,
      discountType:  coupon.discountType,
      discountValue: coupon.discountValue,
      discount:      Math.round(discount * 100) / 100,
      finalTotal:    Math.round(finalTotal * 100) / 100,
      message: coupon.promoType === 'bxgy'
        ? `Compre ${coupon.buyQty} Leve ${coupon.buyQty + coupon.getQty} aplicado!`
        : coupon.discountType === 'percentage'
          ? `${coupon.discountValue}% de desconto aplicado!`
          : `Desconto de R$ ${coupon.discountValue.toFixed(2)} aplicado!`,
    });
  } catch (err) {
    console.error('coupons/validate:', err);
    res.status(500).json({ error: 'Erro interno ao validar cupão.' });
  }
});

module.exports = router;
