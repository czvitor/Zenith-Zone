require('dotenv').config();
const mongoose = require('mongoose');
const Product  = require('./models/Product');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✔ MongoDB conectado.');

  const { deletedCount } = await Product.deleteMany({});
  console.log(`✔ ${deletedCount} produto(s) removido(s).`);

  await mongoose.disconnect();
  console.log('✔ Conexão encerrada.');
}

main().catch(err => { console.error('✘ Erro:', err.message); process.exit(1); });
