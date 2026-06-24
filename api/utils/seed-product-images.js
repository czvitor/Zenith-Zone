require('dotenv').config();
const dns     = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const Product  = require('../models/Product');

/* Imagens do picsum.photos — licença CC0, sem copyright.
   Formato: https://picsum.photos/seed/{seed}/{w}/{h}
   Seeds escolhidos para remeter a streetwear/textura/urbano */
const fotos = {
  frente: [
    'https://picsum.photos/seed/hoodie-front-1/800/1000',
    'https://picsum.photos/seed/hoodie-front-2/800/1000',
    'https://picsum.photos/seed/hoodie-front-3/800/1000',
    'https://picsum.photos/seed/street-dark-1/800/1000',
    'https://picsum.photos/seed/urban-night-4/800/1000',
  ],
  costas: [
    'https://picsum.photos/seed/hoodie-back-1/800/1000',
    'https://picsum.photos/seed/hoodie-back-2/800/1000',
    'https://picsum.photos/seed/street-dark-2/800/1000',
    'https://picsum.photos/seed/urban-night-5/800/1000',
  ],
  detalhe: [
    'https://picsum.photos/seed/fabric-detail-1/800/800',
    'https://picsum.photos/seed/fabric-detail-2/800/800',
    'https://picsum.photos/seed/embroidery-1/800/800',
    'https://picsum.photos/seed/texture-close-1/800/800',
  ],
  patch: [
    'https://picsum.photos/seed/patch-tag-1/800/800',
    'https://picsum.photos/seed/label-close-1/800/800',
    'https://picsum.photos/seed/woven-label-1/800/800',
  ],
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB conectado.');

  const product = await Product.findOne({ slug: 'heavy-court-hoodie' });
  if (!product) {
    console.error('Produto heavy-court-hoodie não encontrado.');
    await mongoose.disconnect();
    return;
  }

  product.fotos = fotos;
  await product.save();

  console.log('✔ Imagens adicionadas ao produto:', product.titulo);
  console.log(`  Frente:  ${fotos.frente.length} imagens`);
  console.log(`  Costas:  ${fotos.costas.length} imagens`);
  console.log(`  Detalhe: ${fotos.detalhe.length} imagens`);
  console.log(`  Patch:   ${fotos.patch.length} imagens`);
  console.log('\n  URL: src/anuncios/produto.html?slug=heavy-court-hoodie');

  await mongoose.disconnect();
  console.log('Conexão encerrada.');
}

run().catch(err => { console.error('Erro:', err.message); process.exit(1); });
