const cron         = require('node-cron');
const Newsletter   = require('../models/Newsletter');
const SiteSettings = require('../models/SiteSettings');
const { sendDropAlert } = require('./mailer');

/* Roda a cada 30 minutos e envia alertas para quem ainda não recebeu */
function startDropCron() {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const cfg = await SiteSettings.findById('global').lean();
      if (!cfg?.dropActive || !cfg?.dropDate) return;

      const dropDate = new Date(cfg.dropDate);
      const now      = Date.now();
      const ms       = dropDate - now;

      const WEEK = 7 * 24 * 60 * 60 * 1000;
      const DAY  = 24 * 60 * 60 * 1000;
      const HOUR = 60 * 60 * 1000;

      /* Para cada limiar, busca os inscritos que ainda não receberam esse alerta
         e estão dentro da janela (já passou o limiar mas o drop ainda não ocorreu) */
      const alerts = [
        { key: 'alertsSent.week', label: 'week', threshold: WEEK, minSubscribedBefore: WEEK },
        { key: 'alertsSent.day',  label: 'day',  threshold: DAY,  minSubscribedBefore: DAY  },
        { key: 'alertsSent.hour', label: 'hour', threshold: HOUR, minSubscribedBefore: null },
      ];

      for (const { key, label, threshold, minSubscribedBefore } of alerts) {
        if (ms > threshold || ms < -HOUR) continue; /* ainda não é hora ou já passou demais */

        /* Só envia o alerta para quem estava inscrito antes da janela abrir.
           Ex.: alerta da semana só vai para quem se inscreveu há ≥ 7 dias antes do drop. */
        const cutoff = minSubscribedBefore ? new Date(dropDate - minSubscribedBefore) : null;
        const filter = { ativo: true, [key]: false };
        if (cutoff) filter.createdAt = { $lte: cutoff };

        const subscribers = await Newsletter.find(filter);
        if (!subscribers.length) continue;

        console.log(`[DropCron] Enviando alerta "${label}" para ${subscribers.length} inscritos.`);

        for (const sub of subscribers) {
          try {
            await sendDropAlert(sub.email, cfg.dropTitle, label);
            await Newsletter.updateOne({ _id: sub._id }, { $set: { [key]: true } });
          } catch (err) {
            console.error(`[DropCron] Falha ao enviar para ${sub.email}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('[DropCron] Erro geral:', err.message);
    }
  });

  console.log('✔ Drop cron iniciado (verifica a cada 30 min).');
}

module.exports = { startDropCron };
