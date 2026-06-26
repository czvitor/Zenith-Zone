const router       = require('express').Router();
const SiteSettings = require('../models/SiteSettings');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');

/* ── GET /api/site-settings ──────────────────────────────────
   Retorna as configurações globais (público — lido pelo frontend) */
router.get('/', async (req, res) => {
  try {
    const cfg = await SiteSettings.findById('global').lean();
    res.json(cfg || { dropActive: false, dropTitle: '', dropDate: null });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── PUT /api/site-settings ──────────────────────────────────
   Atualiza as configurações — admin only */
router.put('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { dropActive, dropTitle, dropDate } = req.body;

    const cfg = await SiteSettings.findByIdAndUpdate(
      'global',
      { $set: { dropActive: !!dropActive, dropTitle: dropTitle || '', dropDate: dropDate || null } },
      { upsert: true, new: true }
    );

    res.json({ success: true, cfg });
  } catch (err) {
    console.error('site-settings/update:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
