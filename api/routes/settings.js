const router       = require('express').Router();
const SiteSettings = require('../models/SiteSettings');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');

/* ── GET /api/settings ───────────────────────────────────────
   Leitura pública — frontend usa para exibir contador do drop */
router.get('/', async (_req, res) => {
  try {
    const settings = await SiteSettings.findById('global').lean();
    res.json(settings || { dropTitle: '', dropDate: null, dropActive: false });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── PUT /api/settings ───────────────────────────────────────
   Atualiza configurações do drop — apenas admin              */
router.put('/', authenticate, authorize('admin'), async (req, res) => {
  const { dropTitle, dropDate, dropActive } = req.body;

  try {
    const settings = await SiteSettings.findByIdAndUpdate(
      'global',
      { $set: { dropTitle, dropDate: dropDate || null, dropActive: !!dropActive } },
      { upsert: true, new: true },
    );
    res.json(settings);
  } catch (err) {
    console.error('settings/put:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
