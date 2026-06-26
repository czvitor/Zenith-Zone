const nodemailer = require('nodemailer');

const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const PORT = Number(process.env.SMTP_PORT) || 587;
const transporter = configured
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   PORT,
      secure: PORT === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

/* ── Base visual de todos os e-mails ─────────────────────── */
function base(content) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#04060f; }
  @media (prefers-color-scheme:dark) { body { background:#04060f; } }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#04060f;padding:2rem 1rem">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#07091A;border-radius:8px;overflow:hidden;border:1px solid rgba(220,20,60,0.2)">

    <!-- HEADER -->
    <tr>
      <td style="background:linear-gradient(135deg,#0c0f24 0%,#07091A 60%,#130508 100%);padding:1.8rem 2rem 1.5rem;border-bottom:1px solid rgba(220,20,60,0.25)">
        <p style="margin:0 0 .4rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#DC143C">ゼニス・ゾーン</p>
        <p style="margin:0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.7rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#F5F0E6;line-height:1">ZENITH ZONE</p>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td style="padding:2rem">
        ${content}
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding:1rem 2rem 1.5rem;border-top:1px solid rgba(245,240,230,0.07)">
        <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.7rem;color:rgba(245,240,230,0.25);letter-spacing:.05em">
          Zenith Zone · wear.zenith.z@gmail.com<br>
          Shibuya Streetwear × Brooklyn Basketball
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function label(text) {
  return `<p style="margin:0 0 .6rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#DC143C">${text}</p>`;
}

function heading(text) {
  return `<h2 style="margin:0 0 1.2rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.6rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#F5F0E6;line-height:1.1">${text}</h2>`;
}

function body(text) {
  return `<p style="margin:0 0 1.2rem;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.9rem;line-height:1.75;color:rgba(245,240,230,.75)">${text}</p>`;
}

function btn(text, href) {
  return `<a href="${href}" style="display:inline-block;margin-top:.5rem;padding:.75rem 1.8rem;background:#DC143C;color:#fff;text-decoration:none;border-radius:3px;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.85rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase">${text}</a>`;
}

function divider() {
  return `<hr style="margin:1.5rem 0;border:none;border-top:1px solid rgba(245,240,230,0.08)">`;
}

function fmtCountdown(ms) {
  if (ms <= 0) return 'em breve';
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 7) return `${Math.floor(d / 7)} semana(s)`;
  if (d >= 1) return `${d} dia(s)`;
  return `${h} hora(s)`;
}

/* ── 1. Reset de senha ───────────────────────────────────── */
async function sendPasswordResetEmail(to, resetLink) {
  if (!transporter) { console.warn('[Mailer] SMTP não configurado. Reset link:', resetLink); return; }
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Redefinir sua senha — Zenith Zone',
    html: base(`
      ${label('Segurança da conta')}
      ${heading('Redefinir Senha')}
      ${body('Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link expira em <strong style="color:#F5F0E6">1 hora</strong>.')}
      ${btn('Redefinir Senha', resetLink)}
      ${divider()}
      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.3)">Se você não solicitou essa alteração, ignore este e-mail.</p>
    `),
  });
}

/* ── 2. Confirmação de pedido ────────────────────────────── */
async function sendOrderConfirmationEmail(to, order) {
  if (!transporter) { console.warn('[Mailer] SMTP não configurado. Pedido:', String(order._id)); return; }

  const fmt     = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const shortId = String(order._id).slice(-6).toUpperCase();

  const itemsHtml = Array.isArray(order.items)
    ? order.items.map(i => {
        const meta  = [i.size, i.color].filter(Boolean).join(' / ');
        const sub   = meta ? ` <span style="color:rgba(245,240,230,.45);font-size:.8rem">(${meta})</span>` : '';
        return `<tr>
          <td style="padding:.5rem 0;border-bottom:1px solid rgba(245,240,230,.06);font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.85rem;color:rgba(245,240,230,.8)">
            ${i.name || 'Produto'}${sub} × ${i.qty}
          </td>
          <td style="padding:.5rem 0;border-bottom:1px solid rgba(245,240,230,.06);font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.9rem;font-weight:700;color:#F5F0E6;text-align:right">
            ${fmt((i.price || 0) * (i.qty || 1))}
          </td>
        </tr>`;
      }).join('')
    : '';

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Pedido #${shortId} confirmado — Zenith Zone`,
    html: base(`
      ${label('Confirmação de pedido')}
      ${heading(`Pedido #${shortId} Recebido!`)}
      ${body('Seu pedido foi confirmado com sucesso. Em breve você receberá atualizações sobre o envio.')}
      ${itemsHtml ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1.2rem">${itemsHtml}</table>
        <p style="margin:.8rem 0 0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.1rem;font-weight:900;letter-spacing:.05em;color:#DC143C">
          TOTAL: ${fmt(order.total)}
        </p>` : ''}
      ${divider()}
      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.3)">Obrigado por comprar na Zenith Zone.</p>
    `),
  });
}

/* ── 3. Confirmação de inscrição no drop ─────────────────── */
async function sendDropConfirmation(to, dropTitle, dropDate) {
  if (!transporter) { console.warn('[Mailer] SMTP não configurado. Drop confirmation:', to); return; }
  const path = require('path');
  const root = path.resolve(__dirname, '../../src/images');
  const remaining = dropDate ? fmtCountdown(new Date(dropDate) - Date.now()) : 'em breve';

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Você está na lista — ${dropTitle} | Zenith Zone`,
    html: base(`
      <div style="margin:-2rem -2rem 1.5rem -2rem;">
        <img src="cid:banner" alt="${dropTitle}" style="width:100%;max-width:520px;display:block;border:0;">
      </div>
      ${label('Lista exclusiva do drop')}
      ${heading('Inscrição Confirmada')}
      ${body(`Você entrou na lista do drop <strong style="color:#DC143C">${dropTitle}</strong>.<br>Faltam aproximadamente <strong style="color:#F5F0E6">${remaining}</strong> para o lançamento.`)}
      <div style="margin:1.5rem 0;text-align:center;background:rgba(4,6,15,0.4);padding:1rem;border:1px solid rgba(245,240,230,0.05);border-radius:4px;">
        <img src="cid:mockup" alt="Preview do Drop" style="width:100%;max-width:400px;display:inline-block;border-radius:2px;">
      </div>
      <div style="margin:1.5rem 0;text-align:center;">
        <img src="cid:tags" alt="Tags" style="width:100%;max-width:440px;display:inline-block;">
      </div>
      ${body('Você receberá alertas automáticos faltando <strong style="color:#F5F0E6">1 semana</strong>, <strong style="color:#F5F0E6">1 dia</strong> e <strong style="color:#F5F0E6">1 hora</strong> para o drop. Fique de olho na caixa de entrada.')}
      ${divider()}
      <div style="margin:1.5rem -2rem -2rem -2rem;">
        <img src="cid:rodape" alt="Zenith Zone" style="width:100%;max-width:520px;display:block;border:0;">
      </div>
    `),
    attachments: [
      { filename: 'banner.png',  path: path.join(root, 'mailbody.png'),          cid: 'banner'  },
      { filename: 'mockup.png',  path: path.join(root, 'mockup camiseta.png'),   cid: 'mockup'  },
      { filename: 'tags.png',    path: path.join(root, 'tags-email transp.png'), cid: 'tags'    },
      { filename: 'rodape.png',  path: path.join(root, 'email-rodape.png'),      cid: 'rodape'  },
    ],
  });
}

/* ── 4. Alertas de contagem regressiva do drop ───────────── */
async function sendDropAlert(to, dropTitle, label_) {
  if (!transporter) { console.warn('[Mailer] SMTP não configurado. Drop alert:', to); return; }

  const configs = {
    week: {
      subject:  `Falta 1 semana — ${dropTitle} | Zenith Zone`,
      labelTxt: 'Contagem regressiva',
      title:    'Falta 1 Semana',
      msg:      'O drop está chegando. Em <strong style="color:#F5F0E6">7 dias</strong> as peças entram ao vivo — e saem rápido.',
    },
    day: {
      subject:  `Falta 1 dia — ${dropTitle} | Zenith Zone`,
      labelTxt: 'Alerta de drop',
      title:    'Falta 1 Dia',
      msg:      'Amanhã é o dia. <strong style="color:#F5F0E6">24 horas</strong> para o drop de <strong style="color:#DC143C">${dropTitle}</strong>. Prepare-se.',
    },
    hour: {
      subject:  `Falta 1 hora! — ${dropTitle} | Zenith Zone`,
      labelTxt: '⚡ Último aviso',
      title:    'Falta 1 Hora!',
      msg:      'É agora. Em <strong style="color:#F5F0E6">60 minutos</strong> o drop começa. Estoque limitado — não perca.',
    },
  };

  const cfg = configs[label_] || configs.week;
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: cfg.subject,
    html: base(`
      ${label(cfg.labelTxt)}
      ${heading(cfg.title)}
      <p style="margin:0 0 .5rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(245,240,230,.5)">${dropTitle}</p>
      ${body(cfg.msg)}
      ${divider()}
      <p style="margin:0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,240,230,.2)">Peças limitadas · Sem segunda chance</p>
    `),
  });
}

/* ── 5. Confirmação de inscrição na waitlist do produto ──── */
async function sendWaitlistConfirmation(to, produto) {
  if (!transporter) { console.warn('[Mailer] SMTP não configurado. Waitlist:', to); return; }
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Lista de espera confirmada — ${produto.titulo} | Zenith Zone`,
    html: base(`
      ${label('Lista de espera')}
      ${heading('Você Está na Lista')}
      ${body(`Sua inscrição para <strong style="color:#DC143C">${produto.titulo}</strong> foi confirmada.`)}
      ${body('Assim que o produto voltar ao estoque, você será o <strong style="color:#F5F0E6">primeiro a saber</strong>.')}
      ${divider()}
      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.25)">Peças limitadas — garantimos a notificação, mas não a disponibilidade.</p>
    `),
  });
}

/* ── 6. Notificação de restock ───────────────────────────── */
async function sendRestockNotification(to, produto) {
  if (!transporter) { console.warn('[Mailer] SMTP não configurado. Restock:', to); return; }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  const productUrl  = `${frontendUrl}/src/pages/produto.html?id=${encodeURIComponent(produto.slug || produto._id)}`;
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Voltou ao estoque! ${produto.titulo} — Zenith Zone`,
    html: base(`
      ${label('Alerta de reposição')}
      ${heading('Voltou ao Estoque')}
      <p style="margin:0 0 1rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.1rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(245,240,230,.6)">${produto.titulo}</p>
      ${body('A peça que você estava esperando está <strong style="color:#DC143C">disponível novamente</strong>. O estoque é limitado — garanta a sua agora.')}
      ${btn('Garantir Agora', productUrl)}
      ${divider()}
      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.25)">Você recebeu este e-mail porque entrou na lista de espera para este produto.</p>
    `),
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendDropConfirmation,
  sendDropAlert,
  sendWaitlistConfirmation,
  sendRestockNotification,
};
