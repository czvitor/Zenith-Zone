const router       = require('express').Router();
const SiteSettings = require('../models/SiteSettings');
const Newsletter   = require('../models/Newsletter');
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
    const prev      = await SiteSettings.findById('global').lean();
    const wasActive = !!prev?.dropActive;
    const nowActive = !!dropActive;

    const settings = await SiteSettings.findByIdAndUpdate(
      'global',
      { $set: { dropTitle, dropDate: dropDate || null, dropActive: nowActive } },
      { upsert: true, new: true },
    );

    /* Sempre que o drop é desativado, reseta os alertsSent de todos os inscritos
       para que possam entrar na lista do próximo drop com lousa limpa */
    if (wasActive && !nowActive) {
      await Newsletter.updateMany({}, {
        $set: {
          'alertsSent.confirmation': false,
          'alertsSent.week':         false,
          'alertsSent.day':          false,
          'alertsSent.hour':         false,
        },
      });
      console.log('[Settings] Drop desativado — alertsSent resetados para todos os inscritos.');
    }

    res.json(settings);
  } catch (err) {
    console.error('settings/put:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
