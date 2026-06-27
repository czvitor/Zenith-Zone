/* ── Suporte a Resend E Brevo — usa o que estiver configurado ──
   Prioridade: RESEND_API_KEY → BREVO_API_KEY → sem envio       */
const FROM_ADDR = process.env.SMTP_FROM || 'Zenith Zone <wear.zenith.z@gmail.com>';
const IMG_BASE  = process.env.EMAIL_IMG_BASE || 'https://czvitor.github.io/Zenith-Zone/src/images';

function img(file) { return `${IMG_BASE}/${encodeURIComponent(file)}`; }

let _transport = 'none';
let _resend    = null;
let _brevoApi  = null;

if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  _resend    = new Resend(process.env.RESEND_API_KEY);
  _transport = 'resend';
} else if (process.env.BREVO_API_KEY) {
  const { BrevoClient, BrevoEnvironment } = require('@getbrevo/brevo');
  const client = new BrevoClient({
    apiKey:      process.env.BREVO_API_KEY,
    environment: BrevoEnvironment.Production,
  });
  _brevoApi  = client.transactionalEmails;
  _transport = 'brevo';
} else {
  console.warn('[Mailer] Nenhuma chave de API configurada (RESEND_API_KEY ou BREVO_API_KEY).');
}

async function _send({ to, subject, html }) {
  if (_transport === 'resend') {
    const { error } = await _resend.emails.send({ from: FROM_ADDR, to, subject, html });
    if (error) throw new Error(error.message || JSON.stringify(error));

  } else if (_transport === 'brevo') {
    const fromMatch = FROM_ADDR.match(/^(.+?)\s*<(.+?)>$/);
    const sender    = fromMatch
      ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() }
      : { email: FROM_ADDR };
    await _brevoApi.sendTransacEmail({
      sender,
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    });

  } else {
    console.warn('[Mailer] Sem transporte configurado. Email não enviado para:', to);
  }
}

/* Preheader oculto — captado pelos clientes como preview abaixo do assunto */
function ph(text) {
  return `<div style="display:none;font-size:1px;color:#04060f;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${text}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;
}

/* ── Base visual de todos os e-mails ─────────────────────── */
function base(content) {
  const preheaderHtml = '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background-color:#04060f !important; }
  .zz-outer { background-color:#04060f !important; }
  .zz-card  { background-color:#07091A !important; }
  .zz-head  { background-color:#0c0f24 !important; }
</style>
<!--[if gte mso 9]><style>
  body    { background-color:#04060f !important; }
  .zz-outer td { background-color:#04060f !important; }
  .zz-head  { background-color:#0c0f24 !important; }
  .zz-body-td, .zz-foot-td { background-color:#07091A !important; }
</style><![endif]-->
</head>
<body bgcolor="#04060f" style="margin:0;padding:0;background-color:#04060f">
${preheaderHtml}
<table class="zz-outer" width="100%" cellpadding="0" cellspacing="0" bgcolor="#04060f" style="background-color:#04060f;padding:2rem 1rem">
  <tr><td align="center" bgcolor="#04060f" style="background-color:#04060f">
  <!--[if (gte mso 9)|(IE)]><table width="520" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table class="zz-card" width="520" cellpadding="0" cellspacing="0" bgcolor="#07091A" style="max-width:520px;width:100%;background-color:#07091A;border-radius:8px;border:1px solid #1a0a10">
    <tr>
      <td class="zz-head" bgcolor="#0c0f24" data-ogsb="#0c0f24" style="background-color:#0c0f24;padding:1.8rem 2rem 1.5rem">
        <p style="margin:0 0 .4rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#DC143C" data-ogsc="#DC143C">ゼニス・ゾーン</p>
        <p style="margin:0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.7rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#F5F0E6;line-height:1" data-ogsc="#F5F0E6">ZENITH ZONE</p>
      </td>
    </tr>
    <tr>
      <td class="zz-body-td" bgcolor="#07091A" data-ogsb="#07091A" style="background-color:#07091A;padding:2rem">
        ${content}
      </td>
    </tr>
    <tr>
      <td class="zz-foot-td" bgcolor="#07091A" data-ogsb="#07091A" style="background-color:#07091A;padding:1rem 2rem 1.5rem">
        <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.7rem;color:#4a4a5a;letter-spacing:.05em">
          Zenith Zone · wear.zenith.z@gmail.com<br>
          Shibuya Streetwear × Brooklyn Basketball
        </p>
      </td>
    </tr>
  </table>
  <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
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
  await _send({
    from:    FROM_ADDR,
    to,
    subject: 'Redefinir sua senha — Zenith Zone',
    html: base(`
      ${ph('Redefina sua senha com segurança — o link expira em 1 hora.')}
      <div style="margin: -2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-password-reset.png')}" alt="Segurança Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>

      ${label('Segurança da conta')}
      ${heading('Redefinir Senha')}

      ${body('Recebemos uma solicitação para redefinir a senha associada à sua conta na nossa plataforma. Clique no botão abaixo para escolher uma nova credencial de acesso de forma segura.')}
      ${body('Importante: Por motivos de segurança, este link de redefinição expirará em exatamente <strong style="color:#F5F0E6">1 hora</strong>.')}

      <div style="text-align: center; margin: 1.5rem 0;">
        ${btn('Redefinir Senha', resetLink)}
      </div>

      <div style="margin: 1.5rem -2rem; text-align: center;">
        <img src="${img('tags-email transp.png')}" alt="Protocolo de Segurança" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      ${divider()}

      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.3);text-align:center;">
        Se você não solicitou essa alteração, nenhuma ação é necessária. Seu acesso atual continuará seguro e você pode ignorar este e-mail.
      </p>

      <div style="margin: 1.5rem -2rem -2rem -2rem; border-top: 1px solid rgba(245,240,230,0.07);">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 2. Confirmação de pedido ────────────────────────────── */
async function sendOrderConfirmationEmail(to, order) {
  const fmt     = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const shortId = String(order._id).slice(-6).toUpperCase();
  const col     = 'font-family:\'Barlow Condensed\',Arial Narrow,sans-serif;font-size:.85rem;font-weight:700;letter-spacing:.04em';
  const sep     = 'border-bottom:1px solid rgba(245,240,230,.07);padding:.65rem .4rem';

  const itemsHtml = Array.isArray(order.items)
    ? order.items.map(i => `<tr>
        <td style="${sep};${col};color:#F5F0E6">${i.name || 'Produto'}</td>
        <td align="center" style="${sep};${col};color:rgba(245,240,230,.55)">${i.qty}</td>
        <td align="right"  style="${sep};${col};color:rgba(245,240,230,.55)">${fmt(i.price || 0)}</td>
        <td align="right"  style="${sep};${col};color:#DC143C">${fmt((i.price || 0) * (i.qty || 1))}</td>
      </tr>`).join('')
    : '';

  await _send({
    to,
    subject: `Pedido #${shortId} confirmado — Zenith Zone`,
    html: base(`
      ${ph(`Pedido #${shortId} confirmado — nossa equipe já está a preparar o envio.`)}
      <div style="margin: -2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-order.png')}" alt="Pedido Confirmado Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>

      ${label('Confirmação de pedido')}
      ${heading(`Pedido #${shortId} Recebido!`)}
      ${body('Seu pedido foi efetuado com sucesso e nossa equipe já iniciou os processos de separação e preparação para o envio. Em breve você receberá novas atualizações com o seu código de rastreamento.')}

      ${itemsHtml ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:1.5rem 0;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid rgba(245,240,230,.15)">
              <th align="left"   style="padding:.4rem .4rem .7rem 0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,240,230,.35)">Produto</th>
              <th align="center" style="padding:.4rem .4rem .7rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,240,230,.35);width:36px">Qtd</th>
              <th align="right"  style="padding:.4rem .4rem .7rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,240,230,.35);width:90px">Unitário</th>
              <th align="right"  style="padding:.4rem 0 .7rem .4rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,240,230,.35);width:90px">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" align="right" style="padding:1rem .4rem 0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,240,230,.4)">Total</td>
              <td align="right" style="padding:1rem 0 0 .4rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.15rem;font-weight:900;letter-spacing:.05em;color:#DC143C">${fmt(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      ` : ''}

      <div style="margin: 1.5rem -2rem; text-align: center;">
        <img src="${img('tags-email transp.png')}" alt="Garantia de Qualidade" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      ${divider()}

      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.3);text-align:center;">
        Obrigado por comprar na Zenith Zone.
      </p>

      <div style="margin: 1.5rem -2rem -2rem -2rem; border-top: 1px solid rgba(245,240,230,0.07);">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 3. Confirmação de inscrição no drop ─────────────────── */
async function sendDropConfirmation(to, dropTitle, dropDate) {
  const remaining = dropDate ? fmtCountdown(new Date(dropDate) - Date.now()) : 'em breve';
  await _send({
    to,
    subject: `Você está na lista — ${dropTitle} | Zenith Zone`,
    html: base(`
      ${ph(`Você está dentro — faltam ${remaining} para o ${dropTitle}. Fique de olho!`)}
      <div style="margin:-2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-drop-assign.png')}" alt="${dropTitle}" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
      ${label('Lista exclusiva do drop')}
      ${heading('Inscrição Confirmada')}
      ${body(`Você entrou na lista do drop <strong style="color:#DC143C">${dropTitle}</strong>.<br>Faltam aproximadamente <strong style="color:#F5F0E6">${remaining}</strong> para o lançamento.`)}
      <div style="margin:1.5rem -2rem;">
        <img src="${img('mockup camiseta.png')}" alt="Preview do Drop" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>
      <div style="margin:1.5rem -2rem;">
        <img src="${img('tags-email transp.png')}" alt="Tags" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>
      ${body('Você receberá alertas automáticos faltando <strong style="color:#F5F0E6">1 semana</strong>, <strong style="color:#F5F0E6">1 dia</strong> e <strong style="color:#F5F0E6">1 hora</strong> para o drop. Fique de olho na caixa de entrada.')}
      ${divider()}
      <div style="margin:1.5rem -2rem -2rem -2rem;">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 4. Alertas de contagem regressiva do drop ───────────── */
async function sendDropAlert(to, dropTitle, label_) {
  const configs = {
    week: {
      subject:    `Falta 1 semana — ${dropTitle} | Zenith Zone`,
      labelTxt:   'Contagem regressiva',
      title:      'Falta 1 Semana',
      msg:        `O grande momento está chegando. Em <strong style="color:#F5F0E6">7 dias</strong> as peças do drop <strong style="color:#DC143C">${dropTitle}</strong> estarão oficialmente disponíveis no site. Fique atento à sua caixa de entrada.`,
      bannerFile: 'banner-drop-assign-1week.png',
    },
    day: {
      subject:    `Falta 1 dia — ${dropTitle} | Zenith Zone`,
      labelTxt:   'Alerta de drop',
      title:      'Falta 1 Dia',
      msg:        `É amanhã. Faltam apenas <strong style="color:#F5F0E6">24 horas</strong> para o lançamento oficial de <strong style="color:#DC143C">${dropTitle}</strong>. Prepare seu setup.`,
      bannerFile: 'banner-drop-assign-1day.png',
    },
    hour: {
      subject:    `Falta 1 hora! — ${dropTitle} | Zenith Zone`,
      labelTxt:   '⚡ Último aviso',
      title:      'Falta 1 Hora!',
      msg:        `Chegou a hora. Em exatamente <strong style="color:#F5F0E6">60 minutos</strong> o drop de <strong style="color:#DC143C">${dropTitle}</strong> estará liberado. Acesse o site e garanta os seus itens favoritos!`,
      bannerFile: 'banner-drop-assign-1hour.png',
    },
  };
  const cfg = configs[label_] || configs.week;

  await _send({
    to,
    subject: cfg.subject,
    html: base(`
      ${ph(cfg.msg.replace(/<[^>]*>/g, ''))}
      <div style="margin: -2rem -2rem 1.5rem -2rem;">
        <img src="${img(cfg.bannerFile)}" alt="${cfg.title}" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>

      ${label(cfg.labelTxt)}
      ${heading(cfg.title)}

      <p style="margin:0 0 .5rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.1rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(245,240,230,.5)">${dropTitle}</p>

      ${body(cfg.msg)}

      <div style="margin: 1.5rem -2rem; text-align: center; background: rgba(4,6,15,0.4); padding: 1rem 0; border-top: 1px solid rgba(245,240,230,0.03); border-bottom: 1px solid rgba(245,240,230,0.03);">
        <img src="${img('mockup camiseta.png')}" alt="Preview do Produto" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      <div style="margin: 1.5rem -2rem; text-align: center;">
        <img src="${img('tags-email transp.png')}" alt="Detalhes do Drop" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      ${divider()}

      <p style="margin:0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,240,230,.2);text-align:center;">
        SHIBUYA STREETWEAR × BROOKLYN BASKETBALL
      </p>

      <div style="margin: 1.5rem -2rem -2rem -2rem; border-top: 1px solid rgba(245,240,230,0.07);">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 5. Confirmação de inscrição na waitlist do produto ──── */
async function sendWaitlistConfirmation(to, produto) {
  await _send({
    to,
    subject: `Lista de espera confirmada — ${produto.titulo} | Zenith Zone`,
    html: base(`
      ${ph(`Inscrição confirmada para ${produto.titulo} — você será notificado assim que voltar ao estoque.`)}
      <div style="margin: -2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-no-units.png')}" alt="Zenith Zone Restock" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>

      ${label('Lista de espera')}
      ${heading('Inscrição Confirmada')}

      ${body(`Sua inscrição para a lista de espera de <strong style="color:#DC143C">${produto.titulo}</strong> foi processada com sucesso.`)}
      ${body('Não se preocupe: assim que as peças retornarem ao catálogo, você receberá um alerta prioritário diretamente na sua caixa de entrada para garantir os seus itens.')}

      <div style="margin: 1.5rem -2rem; text-align: center;">
        <img src="${img('tags-email transp.png')}" alt="Especificações Zenith" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      ${divider()}

      <div style="margin: 1.5rem -2rem -2rem -2rem; border-top: 1px solid rgba(245,240,230,0.07);">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 6. Notificação de restock ───────────────────────────── */
async function sendRestockNotification(to, produto) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://czvitor.github.io';
  const productUrl  = `${frontendUrl}/src/pages/produto.html?id=${encodeURIComponent(produto.slug || produto._id)}`;

  await _send({
    to,
    subject: `Voltou ao estoque! ${produto.titulo} — Zenith Zone`,
    html: base(`
      ${ph(`${produto.titulo} voltou ao estoque — garanta os seus itens antes que esgotem!`)}
      <div style="margin: -2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-restock.png')}" alt="Restock Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>

      ${label('Alerta de reposição')}
      ${heading('Voltou ao Estoque')}

      <p style="margin:0 0 1rem;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:1.1rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(245,240,230,.6)">${produto.titulo}</p>

      ${body('A peça que você estava esperando está <strong style="color:#DC143C">disponível novamente</strong> no nosso catálogo. Acesse o site oficial pelo botão abaixo para garantir os seus itens favoritos.')}

      <div style="text-align:center;margin:1.5rem 0;">
        <a href="${productUrl}" style="display:inline-block;border:0;text-decoration:none;">
          <img src="${img('Botao-exclusivo.png')}" alt="Garantir Agora" width="260" style="width:100%;max-width:260px;display:block;height:auto;border:0;">
        </a>
      </div>

      <div style="margin: 1.5rem -2rem; text-align: center;">
        <img src="${img('tags-email transp.png')}" alt="Detalhes Zenith" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      ${divider()}

      <p style="margin:0;font-family:'Zen Kaku Gothic New',Arial,sans-serif;font-size:.75rem;color:rgba(245,240,230,.25);text-align:center;">
        Você recebeu este e-mail porque se inscreveu na lista de espera para este produto.
      </p>

      <div style="margin: 1.5rem -2rem -2rem -2rem; border-top: 1px solid rgba(245,240,230,0.07);">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 7. Confirmação de cadastro / Boas-vindas ──────────────── */
async function sendWelcomeEmail(to, userName) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://czvitor.github.io';

  await _send({
    to,
    subject: 'Bem-vindo ao Clã — Zenith Zone',
    html: base(`
      ${ph(`Bem-vindo ao clã, ${userName || 'Membro'}! O seu perfil está ativo — acesso antecipado aos drops.`)}
      <div style="margin: -2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-sign-in.png')}" alt="Bem-vindo à Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>

      ${label('Conexão estabelecida')}
      ${heading('Cadastro Concluído')}

      ${body(`Olá, <strong style="color:#F5F0E6">${userName || 'Membro'}</strong>. Seu cadastro foi efetuado com sucesso e o seu perfil já está ativo no nosso sistema.`)}
      ${body('A partir de agora, você faz parte do nosso clã e terá acesso antecipado aos novos drops de streetwear, histórico de pedidos simplificado e gerenciamento de listas de espera prioritárias.')}

      <div style="text-align: center; margin: 1.5rem 0;">
        ${btn('Explorar o Catálogo', frontendUrl)}
      </div>

      <div style="margin: 1.5rem -2rem; text-align: center;">
        <img src="${img('tags-email transp.png')}" alt="DNA Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>

      ${divider()}

      <p style="margin:0;font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,240,230,.3);text-align:center;">
        SHIBUYA STREETWEAR × BROOKLYN BASKETBALL
      </p>

      <div style="margin: 1.5rem -2rem -2rem -2rem; border-top: 1px solid rgba(245,240,230,0.07);">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
    `),
  });
}

/* ── 8. Confirmação de inscrição na newsletter (sem drop ativo) ── */
async function sendNewsletterWelcome(to) {
  await _send({
    to,
    subject: 'Você está na lista — Zenith Zone',
    html: base(`
      ${ph('Você está na lista — será o primeiro a saber quando o próximo drop for anunciado.')}
      <div style="margin:-2rem -2rem 1.5rem -2rem;">
        <img src="${img('banner-drop-assign.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
      ${label('Lista exclusiva')}
      ${heading('Inscrição Confirmada')}
      ${body('Você entrou na lista da <strong style="color:#DC143C">Zenith Zone</strong>. Assim que o próximo drop for anunciado, você será o <strong style="color:#F5F0E6">primeiro a saber</strong> — antes de qualquer um.')}
      ${body('Fique de olho na caixa de entrada. Peças limitadas, sem segunda chance.')}
      <div style="margin:1.5rem -2rem;">
        <img src="${img('tags-email transp.png')}" alt="Tags" width="520" style="width:100%;max-width:520px;display:block;height:auto;border:0;">
      </div>
      ${divider()}
      <div style="margin:1.5rem -2rem -2rem -2rem;">
        <img src="${img('email-rodape.png')}" alt="Zenith Zone" width="520" style="width:100%;max-width:520px;display:block;border:0;height:auto;">
      </div>
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
  sendWelcomeEmail,
  sendNewsletterWelcome,
};
