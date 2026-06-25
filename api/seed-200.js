require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const Product  = require('./models/Product');

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function colorSlug(nome) { return slugify(nome) || 'sem-nome'; }
function rand(min, max)  { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr].sort(() => Math.random() - 0.5);
  return copy.slice(0, Math.min(n, copy.length));
}
function pic(seed) { return `https://picsum.photos/seed/${seed}/800/1000`; }
function oid()     { return new mongoose.Types.ObjectId(); }

// ── Fotos por produto ─────────────────────────────────────────────────────────
function buildFotos(tipo, idx) {
  return {
    frente:  [pic(`${tipo}-f1-${idx}`), pic(`${tipo}-f2-${idx}`)],
    costas:  [pic(`${tipo}-b1-${idx}`), pic(`${tipo}-b2-${idx}`)],
    detalhe: [pic(`${tipo}-d1-${idx}`), pic(`${tipo}-d2-${idx}`)],
    patch:   [pic(`${tipo}-p1-${idx}`)],
  };
}

// ── Dados de catálogo ─────────────────────────────────────────────────────────
const CORES_POOL = [
  { hex: '#07091A', nome: 'Midnight Indigo' },
  { hex: '#DC143C', nome: 'Crimson Red' },
  { hex: '#F5F0E6', nome: 'Off-White' },
  { hex: '#1A1A1A', nome: 'Preto Matte' },
  { hex: '#2C2C2C', nome: 'Graphite' },
  { hex: '#4A4A4A', nome: 'Cinza Escuro' },
  { hex: '#8B0000', nome: 'Bordô' },
  { hex: '#003366', nome: 'Navy' },
  { hex: '#228B22', nome: 'Forest Green' },
  { hex: '#C4A882', nome: 'Sand' },
  { hex: '#8B4513', nome: 'Marrom Vintage' },
  { hex: '#E8D5B7', nome: 'Creme' },
  { hex: '#2F4F4F', nome: 'Verde Militar' },
  { hex: '#800080', nome: 'Roxo' },
  { hex: '#FF6B35', nome: 'Laranja Terra' },
  { hex: '#708090', nome: 'Slate Grey' },
  { hex: '#4B0082', nome: 'Índigo Profundo' },
  { hex: '#B8860B', nome: 'Dourado Antigo' },
];

const COLECOES = [
  'Shadow Series', 'Red Label', 'Core Collection', 'Inverno 25', 'Verão 25',
  'Drop Zero', 'Tokyo Edit', 'Blackout Series', 'Ghost Line', 'Zenith Classics',
  'Street Archive', 'Monochrome Vol.I', 'Raw Cut', 'Silent Season', 'The Foundation',
];

const MATERIAIS = [
  '100% Algodão Fio 30.1', '100% Algodão Penteado', '95% Algodão / 5% Elastano',
  '80% Algodão / 20% Poliéster', 'French Terry 320g/m²', 'Fleece 400g/m²',
  '100% Poliéster Reciclado', '70% Algodão / 30% Poliéster',
  '100% Nylon Ripstop', '100% Algodão Orgânico', 'Denim Washed 12oz',
];

const CORTES = ['Oversized', 'Regular', 'Slim', 'Relaxed', 'Boxy', 'Cropped'];
const ACABAMENTOS = ['Bordado', 'Silk Screen', 'Transfer', 'Patch Bordado', 'Bordado 3D', 'DTF Print'];

// Tipos de produto com todas as dimensões logísticas
const TIPOS = [
  {
    key: 'tshirt-m', modelo: 'Camiseta', jp: 'Tシャツ',
    zonaId: 'masculino', catId: 'c-roup-m', subId: 's-cam-m',
    sizes: ['P','M','G','GG','XGG'], price: [89, 179], peso: 0.30,
    medidas: { P: 48, M: 52, G: 56, GG: 60, XGG: 64 },   // largura por tamanho
    comprimento: 70, manga: 21,
  },
  {
    key: 'moletom', modelo: 'Moletom', jp: 'パーカー',
    zonaId: 'masculino', catId: 'c-roup-m', subId: 's-mol-m',
    sizes: ['P','M','G','GG','XGG'], price: [199, 399], peso: 0.72,
    medidas: { P: 56, M: 60, G: 64, GG: 68, XGG: 72 },
    comprimento: 70, manga: 62,
  },
  {
    key: 'calca', modelo: 'Calça', jp: 'パンツ',
    zonaId: 'masculino', catId: 'c-roup-m', subId: 's-cal-m',
    sizes: ['P','M','G','GG','XGG'], price: [199, 449], peso: 0.78,
    medidas: { P: 74, M: 78, G: 82, GG: 86, XGG: 90 },
    comprimento: 100, manga: 0,
  },
  {
    key: 'jaqueta', modelo: 'Jaqueta', jp: 'ジャケット',
    zonaId: 'masculino', catId: 'c-roup-m', subId: 's-jak-m',
    sizes: ['P','M','G','GG'], price: [349, 699], peso: 1.10,
    medidas: { P: 52, M: 56, G: 60, GG: 64 },
    comprimento: 66, manga: 63,
  },
  {
    key: 'bone', modelo: 'Boné', jp: 'キャップ',
    zonaId: 'masculino', catId: 'c-aces-m', subId: 's-bon-m',
    sizes: ['U'], price: [79, 179], peso: 0.18,
    medidas: { U: 20 }, comprimento: 25, manga: 0,
  },
  {
    key: 'bag', modelo: 'Bag', jp: 'バッグ',
    zonaId: 'masculino', catId: 'c-aces-m', subId: 's-bag-m',
    sizes: ['U'], price: [99, 299], peso: 0.42,
    medidas: { U: 35 }, comprimento: 40, manga: 0,
  },
  {
    key: 'tshirt-f', modelo: 'Camiseta', jp: 'Tシャツ',
    zonaId: 'feminino', catId: 'c-roup-f', subId: 's-cam-f',
    sizes: ['P','M','G','GG'], price: [79, 159], peso: 0.25,
    medidas: { P: 44, M: 48, G: 52, GG: 56 },
    comprimento: 61, manga: 19,
  },
  {
    key: 'vestido', modelo: 'Vestido', jp: 'ドレス',
    zonaId: 'feminino', catId: 'c-roup-f', subId: 's-vest-f',
    sizes: ['P','M','G','GG'], price: [189, 429], peso: 0.55,
    medidas: { P: 40, M: 44, G: 48, GG: 52 },
    comprimento: 95, manga: 0,
  },
  {
    key: 'short-f', modelo: 'Short', jp: 'ショーツ',
    zonaId: 'feminino', catId: 'c-roup-f', subId: 's-sho-f',
    sizes: ['P','M','G','GG'], price: [99, 249], peso: 0.35,
    medidas: { P: 38, M: 42, G: 46, GG: 50 },
    comprimento: 42, manga: 0,
  },
  {
    key: 'meias', modelo: 'Meias', jp: 'ソックス',
    zonaId: 'masculino', catId: 'c-aces-m', subId: 's-mei-m',
    sizes: ['U'], price: [29, 79], peso: 0.10,
    medidas: { U: 10 }, comprimento: 25, manga: 0,
  },
];

// 40 palavras para compor títulos únicos
const WORDS = [
  'Zero','Void','Dark','Neon','Core','Raw','Slate','Ghost',
  'Shadow','Noir','Arch','Flux','Grid','Apex','Edge','Prime',
  'Wave','Shift','Mono','Zen','Drift','Blaze','Haze','Fade',
  'Glitch','Blur','Storm','Echo','Pulse','Vibe','Night','Dusk',
  'Dawn','Rust','Ash','Ink','Coal','Mist','Fog','Smoke',
];

// ── Gera um produto ───────────────────────────────────────────────────────────
function buildProduct(titulo, tipo, idx) {
  const colecao  = pick(COLECOES);
  const material = pick(MATERIAIS);
  const preco    = rand(tipo.price[0], tipo.price[1]);
  const parcelas = preco >= 200 ? rand(2, 6) : 1;
  const cores    = pickN(CORES_POOL, rand(2, 3));
  const fotos    = buildFotos(tipo.key, idx);

  // ── Estoque por cor × tamanho ─────────────────────────────────────────────
  const estoque   = {};
  const variacoes = [];

  for (const cor of cores) {
    const cs = colorSlug(cor.nome);
    estoque[cs] = {};
    for (const tam of tipo.sizes) {
      const qtd = rand(6, 45);
      estoque[cs][tam] = {
        qtd,
        largura:     tipo.medidas[tam] || 0,
        comprimento: tipo.comprimento,
        manga:       tipo.manga,
      };
      variacoes.push({
        _id:       oid(),
        cor:       cor.nome,
        tamanho:   tam,
        estoque:   qtd,
        isPausado: false,
      });
    }
  }

  // ── Fotos por cor (imagensPorCor) ─────────────────────────────────────────
  const imagensPorCor = {};
  for (const cor of cores) {
    const cs = colorSlug(cor.nome);
    imagensPorCor[cs] = {
      frente:  [pic(`${tipo.key}-${cs}-f1-${idx}`), pic(`${tipo.key}-${cs}-f2-${idx}`)],
      costas:  [pic(`${tipo.key}-${cs}-b1-${idx}`), pic(`${tipo.key}-${cs}-b2-${idx}`)],
      detalhe: [pic(`${tipo.key}-${cs}-d1-${idx}`), pic(`${tipo.key}-${cs}-d2-${idx}`)],
      patch:   [pic(`${tipo.key}-${cs}-p1-${idx}`)],
    };
  }

  const sku = `ZZ-${tipo.key.replace(/-/g,'').toUpperCase()}-${String(idx + 1).padStart(4,'0')}`;
  const now = new Date();

  return {
    titulo,
    tituloJP:  `ZZ ${tipo.jp}`,
    slug:      slugify(titulo),
    preco,
    parcelas,
    descricao: pick([
      `Peça essencial da ${colecao}. Confeccionada em ${material.toLowerCase()}, com acabamento ${pick(ACABAMENTOS).toLowerCase()} e corte ${pick(CORTES).toLowerCase()}. Feita para durar.`,
      `Da coleção ${colecao}. ${material} com corte ${pick(CORTES).toLowerCase()} e acabamento ${pick(ACABAMENTOS).toLowerCase()}. O básico que nunca é básico.`,
      `${colecao} drop. Construída em ${material.toLowerCase()}, entrega conforto e estética urbana sem compromisso. Cada detalhe pensado para as ruas.`,
      `Essencial da ${colecao}. ${material}, corte ${pick(CORTES).toLowerCase()}, acabamento ${pick(ACABAMENTOS).toLowerCase()}. Design minimalista, impacto máximo.`,
    ]),
    especificacoes: [
      { label: 'Material',    valor: material },
      { label: 'Corte',       valor: pick(CORTES) },
      { label: 'Acabamento',  valor: pick(ACABAMENTOS) },
      { label: 'Coleção',     valor: colecao },
      { label: 'Origem',      valor: 'Brasil' },
      { label: 'Lavagem',     valor: pick(['Lavar à mão', 'Lavar a 30°C', 'Lavar a 40°C', 'Não lavar na máquina']) },
    ],
    cores,
    fotos,
    estoque,
    variacoes,
    imagensPorCor,
    pausedVariations: { combos: {}, cores: {}, tamanhos: {} },
    logistica: {
      sku,
      ean: '',
      peso: tipo.peso,
      dimensoes: {
        altura:      rand(1, 5),
        largura:     (tipo.medidas[tipo.sizes[1]] || tipo.medidas['U'] || 30) + 10,
        comprimento: tipo.comprimento + 5,
      },
    },
    zonaId:         tipo.zonaId,
    categoriaId:    tipo.catId,
    subcategoriaId: tipo.subId,
    modelo:         tipo.modelo,
    colecao,
    dropExclusivo:  Math.random() < 0.12,
    salesCount:     rand(0, 800),
    status:         'publicado',
    createdAt:      now,
    updatedAt:      now,
    __v:            0,
  };
}

// ── Gera 200 produtos com títulos únicos ──────────────────────────────────────
function generateAll(total) {
  const docs       = [];
  const usedTitles = new Set();
  let idx = 0;

  outer:
  for (const word of WORDS) {
    for (const tipo of TIPOS) {
      const titulo = `${word} ${tipo.modelo}`;
      if (!usedTitles.has(titulo)) {
        usedTitles.add(titulo);
        docs.push(buildProduct(titulo, tipo, idx++));
        if (docs.length >= total) break outer;
      }
    }
  }

  return docs;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✔ MongoDB conectado.');

  const docs = generateAll(200);
  console.log(`✔ ${docs.length} produtos gerados. Inserindo no Atlas...`);

  const BATCH = 25;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    await Product.collection.insertMany(docs.slice(i, i + BATCH), { ordered: false });
    inserted += Math.min(BATCH, docs.length - i);
    process.stdout.write(`\r  → ${inserted}/${docs.length} inseridos...`);
  }

  console.log(`\n✔ Concluído: ${inserted} produtos publicados no Atlas.`);
  await mongoose.disconnect();
  console.log('✔ Conexão encerrada.');
}

main().catch(err => {
  console.error('\n✘ Erro:', err.message);
  process.exit(1);
});
