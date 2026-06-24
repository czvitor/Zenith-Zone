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

module.exports = { sendPasswordResetEmail, sendOrderConfirmationEmail };
