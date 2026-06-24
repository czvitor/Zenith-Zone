/**
 * Script pontual: atualiza o status do produto "Floral Sakura" para "ativo".
 * Uso: node api/utils/fix-floral-sakura.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dns      = require('dns');
const mongoose = require('mongoose');
const Product  = require('../models/Product');

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado ao MongoDB.');

  const result = await Product.findOneAndUpdate(
    { titulo: { $regex: 'floral sakura', $options: 'i' } },
    { $set: { status: 'ativo' } },
    { new: true }
  );

  if (!result) {
    console.error('Produto "Floral Sakura" não encontrado.');
  } else {
    console.log(`✔ Atualizado: "${result.titulo}" → status: ${result.status}`);
    console.log(`  ID: ${result._id}  |  Slug: ${result.slug}`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
