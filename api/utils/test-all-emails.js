/**
 * Script de teste — dispara todos os tipos de e-mail para um endereço.
 *
 * Uso:
 *   cd api
 *   node utils/test-all-emails.js vitord_sousa@hotmail.com
 */

require('dotenv').config();

const TO = process.argv[2] || 'vitord_sousa@hotmail.com';

const {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendDropConfirmation,
  sendDropAlert,
  sendWaitlistConfirmation,
  sendRestockNotification,
  sendWelcomeEmail,
  sendNewsletterWelcome,
} = require('./mailer');

const PRODUTO_MOCK = {
  _id:   '6650000000000000000000ab',
  slug:  'kage-washed-tee',
  titulo: 'Camiseta Kage Washed',
  fotos:  { frente: [], costas: [] },
};

const ORDER_MOCK = {
  _id:   '6650000000000000000000cd',
  total: 349.90,
  items: [
    { name: 'Camiseta Kage Washed', qty: 1, price: 349.90 },
  ],
};

async function run() {
  console.log(`\n📨 Enviando todos os e-mails para: ${TO}\n`);

  const tests = [
    ['1. Boas-vindas (cadastro)',         () => sendWelcomeEmail(TO, 'Vitor')],
    ['2. Newsletter (genérica)',           () => sendNewsletterWelcome(TO)],
    ['3. Confirmação do drop',            () => sendDropConfirmation(TO, 'DROP #04 — KAGE SEASON', new Date(Date.now() + 7 * 86400000).toISOString())],
    ['4. Alerta — 1 semana',              () => sendDropAlert(TO, 'DROP #04 — KAGE SEASON', 'week')],
    ['5. Alerta — 1 dia',                 () => sendDropAlert(TO, 'DROP #04 — KAGE SEASON', 'day')],
    ['6. Alerta — 1 hora',                () => sendDropAlert(TO, 'DROP #04 — KAGE SEASON', 'hour')],
    ['7. Confirmação de pedido',          () => sendOrderConfirmationEmail(TO, ORDER_MOCK)],
    ['8. Lista de espera (waitlist)',      () => sendWaitlistConfirmation(TO, PRODUTO_MOCK)],
    ['9. Restock (voltou ao estoque)',     () => sendRestockNotification(TO, PRODUTO_MOCK)],
    ['10. Reset de senha',                () => sendPasswordResetEmail(TO, 'https://czvitor.github.io/src/pages/reset-password.html?token=test123')],
  ];

  for (const [name, fn] of tests) {
    try {
      process.stdout.write(`  ${name}... `);
      await fn();
      console.log('✔ enviado');
    } catch (err) {
      console.log(`✘ ERRO: ${err.message}`);
    }
    /* Pequena pausa para não saturar a API */
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✅ Concluído. Verifique a caixa de entrada.\n');
}

run().catch(console.error);
