const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const Waitlist  = require('../models/Waitlist');
const Product   = require('../models/Product');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { sendWaitlistConfirmation } = require('../utils/mailer');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { error: 'Muitas tentativas. Aguarde uma hora.' },
});

/* ── POST /api/waitlist ──────────────────────────────────────
   Registra interesse — não exige autenticação.              */
router.post('/', limiter, async (req, res) => {
  const { email, productId, cor, tamanho } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(422).json({ error: 'E-mail inválido.' });
  if (!productId)
    return res.status(422).json({ error: 'Produto não informado.' });

  try {
    const product = await Product.findById(productId).select('status titulo slug');
    if (!product)
      return res.status(404).json({ error: 'Produto não encontrado.' });
    if (product.status !== 'pausado')
      return res.status(422).json({ error: 'Este produto não está pausado.' });

    const doc = await Waitlist.findOneAndUpdate(
      { email, productId },
      { $set: { variacao: { cor: cor || '', tamanho: tamanho || '' } } },
      { upsert: true, new: true },
    );

    /* Envia confirmação apenas na primeira inscrição */
    if (doc.createdAt.getTime() >= Date.now() - 5000) {
      sendWaitlistConfirmation(email, product).catch(err =>
        console.error('[Waitlist] Falha no e-mail de confirmação:', err.message),
      );
    }

    res.status(201).json({ success: true, message: 'Você entrou na lista de espera!' });
  } catch (err) {
    if (err.code === 11000)
      return res.json({ success: true, message: 'Você já está na lista de espera!' });
    console.error('waitlist/create:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── GET /api/waitlist/:productId ────────────────────────────
   Lista interessados — apenas admin.                        */
router.get('/:productId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const entries = await Waitlist.find({ productId: req.params.productId })
      .sort({ createdAt: -1 });
    res.json({ entries, total: entries.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
