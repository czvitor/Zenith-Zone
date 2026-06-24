require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const Product  = require('../models/Product');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB conectado.');

  const existing = await Product.findOne({ slug: 'heavy-court-hoodie' });
  if (existing) {
    console.log('→ Produto de teste já existe:', existing._id.toString());
    console.log('  URL: src/anuncios/produto.html?id=' + existing._id);
    await mongoose.disconnect();
    return;
  }

  const product = await Product.create({
    titulo:   'Heavy Court Hoodie',
    tituloJP: 'ヘビー・コート・フーディー — 重量級バスケットボール',
    preco:    389,
    parcelas: 10,
    descricao: `## A Peça Definitiva do Inverno

O **Heavy Court Hoodie** é a fusão entre o **peso premium** de 380GSM e o estilo inconfundível das quadras de Brooklyn.

Desenvolvido para quem não abre mão de qualidade em nenhum momento — seja no treino, nas ruas de Shibuya ou nas noites frias do Brooklyn.

### Por que é diferente?

- Tecido **fleece 380GSM** com interior escovado para máximo calor
- Modelagem **Boxy Fit** oversized — silhueta larga e curta
- Bordado frontal **Bunny Samurai** em 3D com fio metálico
- Estampa exclusiva nas costas — arte autoral da coleção Sakura Season
- Tag numerada e certificado de autenticidade incluso`,
    especificacoes: [
      { label: 'Tecido',     valor: 'Fleece 380GSM' },
      { label: 'Modelagem',  valor: 'Boxy Fit Oversized' },
      { label: 'Composição', valor: '80% Algodão / 20% Poliéster' },
      { label: 'Acabamento', valor: 'Bordado 3D + Estampa Costas' },
      { label: 'Cor',        valor: 'Midnight Indigo' },
      { label: 'Drop',       valor: '#03 — Sakura Season' },
      { label: 'Bolso',      valor: 'Canguru duplo com zíper oculto' },
      { label: 'Capuz',      valor: 'Duplo com cordão encerado' },
    ],
    cores: [
      { hex: '#07091A', nome: 'Midnight Indigo' },
      { hex: '#DC143C', nome: 'Crimson Red' },
      { hex: '#1a1a2e', nome: 'Deep Navy' },
    ],
    fotos: {
      frente:  [],
      costas:  [],
      detalhe: [],
      patch:   [],
    },
    estoque: {
      P:   { qtd: 8,  largura: 58, comprimento: 65, manga: 62 },
      M:   { qtd: 15, largura: 62, comprimento: 68, manga: 64 },
      G:   { qtd: 12, largura: 66, comprimento: 71, manga: 66 },
      GG:  { qtd: 5,  largura: 70, comprimento: 74, manga: 68 },
      XGG: { qtd: 0,  largura: 74, comprimento: 77, manga: 70 },
    },
    status: 'publicado',
  });

  console.log('✔ Produto criado:', product.titulo);
  console.log('  ID:   ', product._id.toString());
  console.log('  Slug: ', product.slug);
  console.log('\n  URL para testar:');
  console.log('  src/anuncios/produto.html?id=' + product._id);
  console.log('  src/anuncios/produto.html?slug=' + product.slug);

  await mongoose.disconnect();
  console.log('Conexão encerrada.');
}

seed().catch(err => { console.error('Erro:', err.message); process.exit(1); });
