const nodemailer = require('nodemailer');

const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp-mail.outlook.com',
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendPasswordResetEmail(to, resetLink) {
  if (!transporter) {
    console.warn('[Mailer] SMTP não configurado. Link de reset:', resetLink);
    return;
  }
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Redefinir sua senha — Zenith Zone',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#07091A;color:#F5F0E6;border-radius:8px">
        <h2 style="color:#DC143C;font-size:1.4rem;margin-bottom:1rem">Redefinir Senha</h2>
        <p style="margin-bottom:1.5rem;line-height:1.6;color:rgba(245,240,230,0.8)">
          Recebemos uma solicitação para redefinir a senha da sua conta Zenith Zone.
          Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;padding:0.75rem 1.5rem;background:#DC143C;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase">
          Redefinir Senha
        </a>
        <p style="margin-top:1.5rem;font-size:0.8rem;color:rgba(245,240,230,0.45)">
          Se você não solicitou essa alteração, ignore este e-mail. Sua senha permanece a mesma.
        </p>
        <hr style="margin-top:2rem;border-color:rgba(245,240,230,0.1)">
        <p style="font-size:0.75rem;color:rgba(245,240,230,0.3)">
          Link direto: <a href="${resetLink}" style="color:rgba(245,240,230,0.4)">${resetLink}</a>
        </p>
      </div>`,
  });
}

async function sendOrderConfirmationEmail(to, order) {
  if (!transporter) {
    console.warn('[Mailer] SMTP não configurado. Confirmação de pedido:', String(order._id));
    return;
  }

  const fmt = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const shortId = String(order._id).slice(-6).toUpperCase();

  const itemsHtml = Array.isArray(order.items)
    ? order.items.map(i => {
        const meta  = [i.size, i.color].filter(Boolean).join(' / ');
        const sub   = meta ? ` <span style="color:rgba(245,240,230,.5)">(${meta})</span>` : '';
        const total = fmt((i.price || 0) * (i.qty || 1));
        return `<li style="padding:.3rem 0;border-bottom:1px solid rgba(245,240,230,.08)">
                  ${i.name || 'Produto'}${sub} × ${i.qty} — <strong>${total}</strong>
                </li>`;
      }).join('')
    : '';

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Pedido #${shortId} recebido — Zenith Zone`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#07091A;color:#F5F0E6;border-radius:8px">
        <h2 style="color:#DC143C;font-size:1.4rem;margin-bottom:.5rem">Pedido Recebido!</h2>
        <p style="color:rgba(245,240,230,.7);margin-bottom:1.5rem">
          Pedido <strong style="color:#F5F0E6">#${shortId}</strong> confirmado com sucesso.
        </p>
        ${itemsHtml ? `<ul style="list-style:none;padding:0;margin-bottom:1.5rem">${itemsHtml}</ul>` : ''}
        <p style="font-size:1.1rem;margin-bottom:1.5rem">
          Total: <strong style="color:#DC143C">${fmt(order.total)}</strong>
        </p>
        <p style="font-size:.8rem;color:rgba(245,240,230,.45)">
          Em breve você receberá atualizações sobre o envio. Obrigado por comprar na Zenith Zone!
        </p>
        <hr style="margin-top:1.5rem;border-color:rgba(245,240,230,.1)">
        <p style="font-size:.75rem;color:rgba(245,240,230,.3)">Zenith Zone — ゼニス・ゾーン</p>
      </div>`,
  });
}

/* ── Utilitário interno ────────────────────────────────────── */
function fmtCountdown(ms) {
  if (ms <= 0) return 'em breve';
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 7) return `${Math.floor(d / 7)} semana(s)`;
  if (d >= 1) return `${d} dia(s)`;
  return `${h} hora(s)`;
}

function dropEmailBase(title, body) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#07091A;color:#F5F0E6;border-radius:8px">
      <p style="font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;color:#DC143C;margin-bottom:.5rem">ZENITH ZONE — DROP</p>
      <h2 style="font-size:1.4rem;margin-bottom:1rem;color:#F5F0E6">${title}</h2>
      ${body}
      <hr style="margin-top:2rem;border-color:rgba(245,240,230,.1)">
      <p style="font-size:.75rem;color:rgba(245,240,230,.3)">Zenith Zone — ゼニス・ゾーン</p>
    </div>`;
}

async function sendDropConfirmation(to, dropTitle, dropDate) {
  if (!transporter) {
    console.warn('[Mailer] SMTP não configurado. Drop confirmation para:', to);
    return;
  }
  const remaining = dropDate ? fmtCountdown(new Date(dropDate) - Date.now()) : 'em breve';
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Você está na lista! ${dropTitle} — Zenith Zone`,
    html: dropEmailBase(
      'Inscrição Confirmada!',
      `<p style="line-height:1.7;color:rgba(245,240,230,.8)">
        Você entrou na lista do drop <strong style="color:#DC143C">${dropTitle}</strong>.<br>
        Faltam aproximadamente <strong>${remaining}</strong> para o lançamento.<br><br>
        Avisaremos você com 1 semana, 1 dia e 1 hora de antecedência. Fique de olho na caixa de entrada.
      </p>`,
    ),
  });
}

async function sendDropAlert(to, dropTitle, label) {
  if (!transporter) {
    console.warn('[Mailer] SMTP não configurado. Drop alert para:', to);
    return;
  }
  const subjects = {
    week: `Falta 1 semana para o drop! — ${dropTitle}`,
    day:  `Falta apenas 1 dia! — ${dropTitle}`,
    hour: `Falta 1 HORA! Prepare-se! — ${dropTitle}`,
  };
  const messages = {
    week: 'Falta exatamente <strong>1 semana</strong> para o lançamento. Vai ser exclusivo.',
    day:  'Falta <strong>1 dia</strong>. Prepare-se — as peças são limitadas e não voltam.',
    hour: 'Falta <strong>1 hora</strong>! O drop começa em instantes. Não perca.',
  };
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: subjects[label] || `Alerta de Drop — ${dropTitle}`,
    html: dropEmailBase(
      dropTitle,
      `<p style="line-height:1.7;color:rgba(245,240,230,.8)">${messages[label] || ''}</p>`,
    ),
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendDropConfirmation,
  sendDropAlert,
};
