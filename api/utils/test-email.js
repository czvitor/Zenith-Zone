require('dotenv').config();
const {
  sendDropConfirmation,
  sendWaitlistConfirmation,
  sendRestockNotification,
  sendDropAlert,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require('./mailer');

const TO = 'vitord_sousa@hotmail.com';

const produtoFake = {
  _id:    '665f1a2b3c4d5e6f7a8b9c0d',
  slug:   'quarter-zip-pullover',
  titulo: 'Quarter Zip Pullover',
  fotos: {
    frente: ['https://picsum.photos/seed/zz-tee1-f1/800/1000'],
    costas: ['https://picsum.photos/seed/zz-tee1-c1/800/1000'],
  },
};

const pedidoFake = {
  _id:   '665f1a2b3c4d5e6f7a8b9c0e',
  total: 389,
  items: [
    { name: 'Quarter Zip Pullover', size: 'M', color: 'Preto', price: 389, qty: 1 },
  ],
};

const EMAILS = {
  '1': {
    desc: 'Confirmação de inscrição no Drop',
    fn:   () => sendDropConfirmation(TO, 'Drop #04 Sakura Season', new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
  },
  '2': {
    desc: 'Alerta — Falta 1 semana para o drop',
    fn:   () => sendDropAlert(TO, 'Drop #04 Sakura Season', 'week'),
  },
  '3': {
    desc: 'Alerta — Falta 1 dia para o drop',
    fn:   () => sendDropAlert(TO, 'Drop #04 Sakura Season', 'day'),
  },
  '4': {
    desc: 'Alerta — Falta 1 hora para o drop',
    fn:   () => sendDropAlert(TO, 'Drop #04 Sakura Season', 'hour'),
  },
  '5': {
    desc: 'Confirmação de waitlist do produto',
    fn:   () => sendWaitlistConfirmation(TO, produtoFake),
  },
  '6': {
    desc: 'Notificação de restock do produto',
    fn:   () => sendRestockNotification(TO, produtoFake),
  },
  '7': {
    desc: 'Confirmação de pedido',
    fn:   () => sendOrderConfirmationEmail(TO, pedidoFake),
  },
  '8': {
    desc: 'Reset de senha',
    fn:   () => sendPasswordResetEmail(TO, 'http://localhost:5500/src/pages/reset-password.html?token=TESTE123'),
  },
  '9': {
    desc: 'Boas-vindas (cadastro efetuado)',
    fn:   () => sendWelcomeEmail(TO, 'Vitor'),
  },
};

const arg = process.argv[2];

if (!arg) {
  console.log('\nUso: node utils/test-email.js <número>\n');
  Object.entries(EMAILS).forEach(([k, v]) => console.log(`  ${k} — ${v.desc}`));
  console.log('');
  process.exit(0);
}

const email = EMAILS[arg];
if (!email) {
  console.error(`\nNúmero inválido: ${arg}. Use um número de 1 a ${Object.keys(EMAILS).length}.\n`);
  process.exit(1);
}

console.log(`\nEnviando para ${TO}: ${email.desc}...`);
email.fn()
  .then(() => console.log(`✔ Enviado! Verifique a caixa de entrada (e o spam) de ${TO}\n`))
  .catch(err => { console.error('✘ Erro:', err.message); process.exit(1); });
