const router      = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit   = require('express-rate-limit');
const Newsletter  = require('../models/Newsletter');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');

const subLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: { error: 'Muitas tentativas. Aguarde um minuto.' },
});

/* ── POST /api/newsletter ────────────────────────────────────
   Inscrição pública — idempotente (e-mail já cadastrado = ok) */
router.post('/', subLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { email, source = 'site', produto = null } = req.body;

    await Newsletter.findOneAndUpdate(
      { email },
      { $set: { email, source, produto: produto || null, ativo: true } },
      { upsert: true, new: true },
    );

    res.json({ message: 'Inscrição confirmada! Você será avisado em primeira mão.' });
  } catch (err) {
    console.error('newsletter/subscribe:', err);
    res.status(500).json({ error: 'Erro interno ao registrar inscrição.' });
  }
});

/* ── GET /api/newsletter ─────────────────────────────────────
   Lista inscritos — admin only                               */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { limit = 100, skip = 0, source } = req.query;
    const filter = { ativo: true };
    if (source) filter.source = source;

    const [subs, total] = await Promise.all([
      Newsletter.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip)),
      Newsletter.countDocuments(filter),
    ]);
    res.json({ subscribers: subs, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
