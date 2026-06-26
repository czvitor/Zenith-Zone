const router      = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit   = require('express-rate-limit');
const Newsletter  = require('../models/Newsletter');
const SiteSettings = require('../models/SiteSettings');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { sendDropConfirmation, sendNewsletterWelcome } = require('../utils/mailer');

const subLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: { error: 'Muitas tentativas. Aguarde um minuto.' },
});

/* ── POST /api/newsletter ────────────────────────────────────
   Inscrição na waitlist global do próximo drop               */
router.post('/', subLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { email, source = 'site' } = req.body;

    const doc = await Newsletter.findOneAndUpdate(
      { email },
      { $set: { email, source, ativo: true } },
      { upsert: true, new: true },
    );

    /* Envia e-mail de confirmação apenas na primeira inscrição */
    if (!doc.alertsSent?.confirmation) {
      const cfg = await SiteSettings.findById('global').lean();
      if (cfg?.dropActive && cfg?.dropTitle) {
        sendDropConfirmation(email, cfg.dropTitle, cfg.dropDate).catch(err =>
          console.error('[Newsletter] Falha no e-mail de confirmação (drop):', err.message),
        );
      } else {
        sendNewsletterWelcome(email).catch(err =>
          console.error('[Newsletter] Falha no e-mail de confirmação (genérico):', err.message),
        );
      }
      await Newsletter.updateOne({ _id: doc._id }, { $set: { 'alertsSent.confirmation': true } });
    }

    res.json({ message: 'Inscrição confirmada! Você será avisado em primeira mão.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ message: 'Você já está na lista! Fique de olho no e-mail.' });
    }
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
