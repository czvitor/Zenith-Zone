/**
 * seed-catalog-200.js
 * Gera e insere 200 anúncios aleatórios no MongoDB.
 * Imagens: Picsum Photos — Unsplash License (uso comercial livre).
 *
 * Uso:
 *   node utils/seed-catalog-200.js           → insere apenas os que não existem
 *   node utils/seed-catalog-200.js --reset   → apaga todos os ZZ-* e recria
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const Product  = require('../models/Product');

/* ═══════════════════════════════════════════════════════════
   UTILITÁRIOS
═══════════════════════════════════════════════════════════ */

const rand     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick     = arr => arr[rand(0, arr.length - 1)];
const shuffle  = arr => [...arr].sort(() => Math.random() - 0.5);
const pickN    = (arr, n) => shuffle(arr).slice(0, n);

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function colorSlug(nome) {
  return (nome || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sem-nome';
}

const picsum = (seed, w = 800, h = 1000) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/* ═══════════════════════════════════════════════════════════
   POOLS DE DADOS
═══════════════════════════════════════════════════════════ */

const TIPOS = [
  {
    key: 'tee', label: 'Tee', labelPT: 'Camiseta', labelJP: 'ティー',
    medidas: { P:[50,65,0], M:[54,68,0], G:[58,71,0], GG:[62,74,0], XGG:[66,77,0] },
    precoMin: 199, precoMax: 279, parcMax: 3, peso: [0.24, 0.38],
    dim: [3, 30, 40],
  },
  {
    key: 'longsleeve', label: 'Long Sleeve Tee', labelPT: 'Manga Longa', labelJP: 'ロングスリーブ',
    medidas: { P:[50,65,58], M:[54,68,61], G:[58,71,64], GG:[62,74,67], XGG:[66,77,70] },
    precoMin: 219, precoMax: 299, parcMax: 3, peso: [0.26, 0.40],
    dim: [3, 30, 40],
  },
  {
    key: 'graphictee', label: 'Graphic Tee', labelPT: 'Camiseta Estampada', labelJP: 'グラフィックティー',
    medidas: { P:[50,65,0], M:[54,68,0], G:[58,71,0], GG:[62,74,0], XGG:[66,77,0] },
    precoMin: 229, precoMax: 319, parcMax: 3, peso: [0.25, 0.36],
    dim: [3, 30, 40],
  },
  {
    key: 'hoodie', label: 'Hoodie', labelPT: 'Moletom com Capuz', labelJP: 'フーディー',
    medidas: { P:[58,66,62], M:[62,69,64], G:[66,72,66], GG:[70,75,68], XGG:[74,78,70] },
    precoMin: 349, precoMax: 499, parcMax: 6, peso: [0.60, 0.85],
    dim: [5, 38, 48],
  },
  {
    key: 'ziphoodie', label: 'Zip Hoodie', labelPT: 'Moletom Zíper', labelJP: 'ジップフーディー',
    medidas: { P:[58,66,62], M:[62,69,64], G:[66,72,66], GG:[70,75,68], XGG:[74,78,70] },
    precoMin: 379, precoMax: 529, parcMax: 6, peso: [0.65, 0.90],
    dim: [5, 38, 50],
  },
  {
    key: 'crewneck', label: 'Crewneck', labelPT: 'Moletom Careca', labelJP: 'クルーネック',
    medidas: { P:[56,64,60], M:[60,67,62], G:[64,70,64], GG:[68,73,66], XGG:[72,76,68] },
    precoMin: 299, precoMax: 429, parcMax: 5, peso: [0.55, 0.75],
    dim: [4, 35, 44],
  },
  {
    key: 'quartzip', label: 'Quarter Zip', labelPT: 'Pullover ¼ Zíper', labelJP: 'クォーターzip',
    medidas: { P:[56,64,60], M:[60,67,62], G:[64,70,64], GG:[68,73,66], XGG:[72,76,68] },
    precoMin: 319, precoMax: 449, parcMax: 5, peso: [0.52, 0.72],
    dim: [4, 34, 44],
  },
  {
    key: 'coachjacket', label: 'Coach Jacket', labelPT: 'Jaqueta Coach', labelJP: 'コーチジャケット',
    medidas: { P:[56,62,60], M:[60,65,63], G:[64,68,66], GG:[68,71,69], XGG:[72,74,72] },
    precoMin: 399, precoMax: 549, parcMax: 7, peso: [0.44, 0.60],
    dim: [4, 36, 46],
  },
  {
    key: 'bomber', label: 'Bomber Jacket', labelPT: 'Jaqueta Bomber', labelJP: 'ボンバージャケット',
    medidas: { P:[56,62,60], M:[60,65,63], G:[64,68,66], GG:[68,71,69], XGG:[72,74,72] },
    precoMin: 489, precoMax: 649, parcMax: 8, peso: [0.55, 0.75],
    dim: [5, 38, 50],
  },
  {
    key: 'trackjacket', label: 'Track Jacket', labelPT: 'Jaqueta Track', labelJP: 'トラックジャケット',
    medidas: { P:[56,62,60], M:[60,65,63], G:[64,68,66], GG:[68,71,69], XGG:[72,74,72] },
    precoMin: 369, precoMax: 499, parcMax: 6, peso: [0.42, 0.58],
    dim: [4, 36, 46],
  },
  {
    key: 'windbreaker', label: 'Windbreaker', labelPT: 'Corta-vento', labelJP: 'ウィンドブレーカー',
    medidas: { P:[56,62,60], M:[60,65,63], G:[64,68,66], GG:[68,71,69], XGG:[72,74,72] },
    precoMin: 429, precoMax: 599, parcMax: 7, peso: [0.38, 0.52],
    dim: [4, 36, 46],
  },
  {
    key: 'cargo', label: 'Cargo Pants', labelPT: 'Calça Cargo', labelJP: 'カーゴパンツ',
    medidas: { P:[40,98,0], M:[43,101,0], G:[46,104,0], GG:[49,107,0], XGG:[52,110,0] },
    precoMin: 299, precoMax: 429, parcMax: 5, peso: [0.60, 0.80],
    dim: [5, 40, 55],
  },
  {
    key: 'jogger', label: 'Baggy Jogger', labelPT: 'Calça Jogger', labelJP: 'バギージョガー',
    medidas: { P:[40,98,0], M:[43,101,0], G:[46,104,0], GG:[49,107,0], XGG:[52,110,0] },
    precoMin: 269, precoMax: 389, parcMax: 5, peso: [0.50, 0.68],
    dim: [4, 38, 52],
  },
  {
    key: 'shorts', label: 'Sweat Shorts', labelPT: 'Shorts', labelJP: 'ショーツ',
    medidas: { P:[40,48,0], M:[43,50,0], G:[46,52,0], GG:[49,54,0], XGG:[52,56,0] },
    precoMin: 219, precoMax: 319, parcMax: 3, peso: [0.32, 0.45],
    dim: [3, 36, 44],
  },
  {
    key: 'vest', label: 'Puffer Vest', labelPT: 'Colete', labelJP: 'ベスト',
    medidas: { P:[56,64,0], M:[60,67,0], G:[64,70,0], GG:[68,73,0], XGG:[72,76,0] },
    precoMin: 349, precoMax: 489, parcMax: 6, peso: [0.40, 0.55],
    dim: [4, 34, 44],
  },
];

const ADJETIVOS = [
  { key: 'hvw',  label: 'Heavyweight',   jp: 'ヘビーウェイト' },
  { key: 'prm',  label: 'Premium',       jp: 'プレミアム' },
  { key: 'cls',  label: 'Classic',       jp: 'クラシック' },
  { key: 'ess',  label: 'Essential',     jp: 'エッセンシャル' },
  { key: 'arc',  label: 'Archive',       jp: 'アーカイブ' },
  { key: 'lim',  label: 'Limited',       jp: 'リミテッド' },
  { key: 'wsh',  label: 'Washed',        jp: 'ウォッシュド' },
  { key: 'vnt',  label: 'Vintage',       jp: 'ヴィンテージ' },
  { key: 'ovs',  label: 'Oversized',     jp: 'オーバーサイズ' },
  { key: 'bxy',  label: 'Boxy',          jp: 'ボクシー' },
  { key: 'rlx',  label: 'Relaxed',       jp: 'リラックス' },
  { key: 'raw',  label: 'Raw Edge',      jp: 'ローエッジ' },
  { key: 'cor',  label: 'Core',          jp: 'コア' },
  { key: 'drp',  label: 'Drop',          jp: 'ドロップ' },
  { key: 'sea',  label: 'Seasonal',      jp: 'シーズナル' },
  { key: 'dst',  label: 'Distressed',    jp: 'ディストレスド' },
  { key: 'exc',  label: 'Exclusive',     jp: 'エクスクルーシブ' },
  { key: 'num',  label: 'Numbered',      jp: 'ナンバード' },
  { key: 'ctn',  label: 'Cotton',        jp: 'コットン' },
  { key: 'wdl',  label: 'Wide Leg',      jp: 'ワイドレッグ' },
];

const CORES = [
  { hex: '#0a0a0a', nome: 'Midnight Black' },
  { hex: '#f0ece4', nome: 'Off White' },
  { hex: '#f5f5f4', nome: 'Stone White' },
  { hex: '#1a1a1a', nome: 'Charcoal' },
  { hex: '#374151', nome: 'Iron Grey' },
  { hex: '#9ca3af', nome: 'Ash Grey' },
  { hex: '#6b7280', nome: 'Slate Grey' },
  { hex: '#0f172a', nome: 'Midnight Navy' },
  { hex: '#1d4ed8', nome: 'Electric Blue' },
  { hex: '#2d4a6e', nome: 'Washed Navy' },
  { hex: '#1e3a1e', nome: 'Forest Green' },
  { hex: '#4a5240', nome: 'Olive Drab' },
  { hex: '#7f1d1d', nome: 'Varsity Red' },
  { hex: '#dc2626', nome: 'Crimson Red' },
  { hex: '#7c2d12', nome: 'Burnt Orange' },
  { hex: '#d9bc8a', nome: 'Desert Tan' },
  { hex: '#b8a88a', nome: 'Khaki Sand' },
  { hex: '#c4b5a0', nome: 'Warm Beige' },
  { hex: '#7c3aed', nome: 'Deep Purple' },
  { hex: '#be185d', nome: 'Hot Pink' },
  { hex: '#0e7490', nome: 'Teal' },
  { hex: '#854d0e', nome: 'Caramel Brown' },
];

const DROPS = [
  '#01 — Founding Collection',
  '#02 — Tokyo Nights',
  '#03 — Sakura Season',
  '#04 — Urban Core',
  '#05 — Monochrome Vol.I',
  '#06 — Raw Edge',
  '#07 — Zero Gravity',
  '#08 — Street Ritual',
];

const TECIDOS_TOPO = [
  'Cotton 300GSM', 'Cotton 320GSM', 'Cotton 340GSM', 'Cotton 280GSM',
];
const TECIDOS_MOLETOM = [
  'Fleece 340GSM', 'Fleece 360GSM', 'Fleece 380GSM',
  'French Terry 300GSM', 'French Terry 320GSM', 'Cotton Fleece 340GSM',
];
const TECIDOS_JAQUETA = [
  'Nylon Ripstop 210T', 'Nylon 420D', 'Poliéster Cetim 210GSM',
  'Cotton Twill 300GSM', 'Poliéster Piquê 220GSM',
];
const TECIDOS_CALCA = [
  'Cotton Twill 280GSM', 'Cotton Canvas 300GSM',
  'French Terry 300GSM', 'Cotton Fleece 320GSM',
];

/* ═══════════════════════════════════════════════════════════
   GERADORES DE CONTEÚDO
═══════════════════════════════════════════════════════════ */

function getTecido(tipoKey) {
  if (['tee','longsleeve','graphictee'].includes(tipoKey)) return pick(TECIDOS_TOPO);
  if (['hoodie','ziphoodie','crewneck','quartzip'].includes(tipoKey)) return pick(TECIDOS_MOLETOM);
  if (['coachjacket','bomber','trackjacket','windbreaker','vest'].includes(tipoKey)) return pick(TECIDOS_JAQUETA);
  return pick(TECIDOS_CALCA);
}

function buildSpecs(tipo, adj, cores, tecido, drop) {
  const base = [
    { label: 'Tecido',    valor: tecido },
    { label: 'Modelagem', valor: adj.label + (adj.key === 'ovs' ? '' : ' Fit') },
    { label: 'Drop',      valor: drop },
  ];
  if (['tee','longsleeve','graphictee'].includes(tipo.key)) {
    const impressao = pick(['Serigrafia plastisol','Bordado autoral','Serigrafia water-based','Transfer DTG','Patch bordado']);
    base.push({ label: 'Composição', valor: '100% Algodão penteado' });
    base.push({ label: 'Impressão',  valor: impressao });
    base.push({ label: 'Gola',       valor: pick(['Careca com ribana 2×2','Careca estruturada','Gola V reforçada']) });
  }
  if (['hoodie','ziphoodie'].includes(tipo.key)) {
    base.push({ label: 'Composição', valor: pick(['80% Algodão / 20% Poliéster','70% Algodão / 30% Poliéster']) });
    base.push({ label: 'Capuz', valor: pick(['Duplo com cordão encerado','Estruturado com cordão chato']) });
    base.push({ label: 'Bolso', valor: pick(['Canguru com divisória','Canguru simples','Lateral com zíper']) });
  }
  if (['crewneck','quartzip'].includes(tipo.key)) {
    base.push({ label: 'Composição', valor: pick(['80% Algodão / 20% Poliéster','70% Algodão / 30% Poliéster']) });
    base.push({ label: 'Gola', valor: pick(['Careca com ribana','Alta estruturada','V-neck']) });
  }
  if (['coachjacket','bomber','trackjacket','windbreaker'].includes(tipo.key)) {
    base.push({ label: 'Zíper',  valor: pick(['YKK Alumínio','YKK Metal Pesado','YKK Coil']) });
    base.push({ label: 'Forro',  valor: pick(['Tafetá 100% Poliéster','Malha de poliéster','Tafetá listrado']) });
  }
  if (['cargo','jogger','shorts'].includes(tipo.key)) {
    base.push({ label: 'Cintura', valor: pick(['Elástico + cordão','Cintura ajustável']) });
    base.push({ label: 'Bolsos',  valor: tipo.key === 'cargo' ? pick(['6 funcionais','4 + 2 cargo']) : '4 funcionais' });
  }
  return base;
}

const DESC_TEMPLATES = {
  tee: [
    (t,a,c) => `A **${a.label} Tee** da Zenith Zone é construída em *${t}* com modelagem ${a.label} — a peça essencial do guarda-roupa streetwear.\n\n- Gráfico autoral ${pick(['bordado','impresso em serigrafia'])} no peito\n- Patch de tecido costurado na barra\n- Tag 3D numerada e lacrada\n- Costuras duplas em todas as extremidades`,
    (t,a,c) => `A camiseta mais versátil do catálogo. *${t}* de alta gramatura com caimento perfeito para a modelagem ${a.label} Fit.\n\n- Impressão ${pick(['plastisol','water-based','DTG'])} de alta definição\n- Etiqueta interna com QR code de autenticação\n- Disponível em ${c.length} ${c.length > 1 ? 'cores exclusivas' : 'cor exclusiva'}\n- Barra com acabamento overloque duplo`,
  ],
  hoodie: [
    (t,a,c) => `O **${a.label} Hoodie** define o inverno streetwear. *${t}* com interior escovado e capuz duplo estruturado.\n\n- Bolso canguru com divisória interna\n- Cordão encerado resistente\n- Estampa autoral nas costas\n- Ribana 2×2 nos punhos e barra`,
    (t,a,c) => `Fleece de alta gramatura para os dias frios. O **${a.label} Hoodie** combina conforto extremo com estética streetwear contemporânea.\n\n- Interior com escovado leve para calor extra\n- Bordado 3D na parte frontal\n- Zíper de metal no bolso lateral\n- Fit ${a.label.toLowerCase()} ideal para layering`,
  ],
  jacket: [
    (t,a,c) => `A **${a.label} Jacket** revisitada com proporções contemporâneas. *${t}* leve e funcional — do skatepark ao café.\n\n- Forro 100% tafetá com bolso interno\n- Zíper YKK de alumínio\n- Manga raglã para amplitude de movimento\n- Logo bordado no peito esquerdo`,
    (t,a,c) => `Construída em *${t}* com acabamentos premium. A **${a.label} Jacket** é a escolha certa para transição de clima.\n\n- Costuras termocoladas nas emendas principais\n- Bolsos laterais com zíper oculto\n- Punhos com elástico interno\n- Estampa de arquivo nas costas`,
  ],
  pants: [
    (t,a,c) => `A **${a.label} ${pick(['Pants','Trousers'])}** da Zenith Zone redefine o utilitário no streetwear moderno. *${t}* com caimento perfeito.\n\n- Cintura dupla com cadarço chato\n- Barra com abertura lateral e velcro\n- Lavagem enzimática para aspecto washed\n- Logo bordado na lateral`,
    (t,a,c) => `Conforto e estilo em *${t}* de alta qualidade. Modelagem ${a.label} com silhueta relaxada e funcionalidade maximizada.\n\n- Elástico + cordão ajustável na cintura\n- Bolsos laterais espaçosos\n- Costuras flatlock resistentes\n- Tag numerada de autenticação`,
  ],
  other: [
    (t,a,c) => `O **${a.label} ${pick(['Piece','Staple','Essential'])}** da Zenith Zone eleva o básico ao nível premium. *${t}* com detalhes que fazem a diferença.\n\n- Materiais selecionados para durabilidade máxima\n- Ribana premium em punhos e barra\n- Logo bordado minimalista\n- Disponível em ${c.length} ${c.length > 1 ? 'colorways exclusivos' : 'colorway exclusivo'}`,
  ],
};

function buildDesc(tipo, adj, cores, tecido) {
  let pool;
  if (['tee','longsleeve','graphictee'].includes(tipo.key)) pool = DESC_TEMPLATES.tee;
  else if (['hoodie','ziphoodie','crewneck','quartzip'].includes(tipo.key)) pool = DESC_TEMPLATES.hoodie;
  else if (['coachjacket','bomber','trackjacket','windbreaker','vest'].includes(tipo.key)) pool = DESC_TEMPLATES.jacket;
  else if (['cargo','jogger','shorts'].includes(tipo.key)) pool = DESC_TEMPLATES.pants;
  else pool = DESC_TEMPLATES.other;
  return pick(pool)(tecido, adj, cores);
}

function buildJP(adj, tipo) {
  return `${adj.jp}・${tipo.labelJP} — ゼニス・ゾーン`;
}

/* ═══════════════════════════════════════════════════════════
   GERADOR DE ESTOQUE
═══════════════════════════════════════════════════════════ */

function genQtd(tier) {
  /* full=abundante, normal=regular, limited=escasso, scarce=quase esgotado */
  const r = { full:[15,35], normal:[5,18], limited:[1,6], scarce:[0,3] }[tier] || [5,18];
  return rand(r[0], r[1]);
}

function buildEstoqueEVariacoes(cores, tipo) {
  const tier = weightedPick(['full','normal','limited','scarce'], [0.25, 0.45, 0.20, 0.10]);
  const SIZES = ['P','M','G','GG','XGG'];
  const estoque = {};
  const variacoes = [];

  for (const { nome } of cores) {
    const slug = colorSlug(nome);
    estoque[slug] = {};
    for (const sz of SIZES) {
      /* M e G têm estoque ligeiramente maior (perfil real de vendas) */
      const mult = (sz === 'M' || sz === 'G') ? 1 : (sz === 'P' ? 0.8 : 0.6);
      const qtd  = Math.round(genQtd(tier) * mult);
      const [largura, comprimento, manga] = tipo.medidas[sz] || [0,0,0];
      estoque[slug][sz] = { qtd, largura, comprimento, manga };
      variacoes.push({ cor: nome, tamanho: sz, estoque: qtd, isPausado: qtd === 0 });
    }
  }
  return { estoque, variacoes };
}

/* ═══════════════════════════════════════════════════════════
   GERADOR DE FOTOS
═══════════════════════════════════════════════════════════ */

function buildFotos(seed) {
  /* 1-3 fotos por ângulo; seed garante consistência entre reruns */
  const nFrente  = rand(1, 3);
  const nCostas  = rand(1, 2);
  const nDetalhe = rand(1, 3);
  const nPatch   = rand(1, 2);

  const imgs = (prefix, n, w, h) =>
    Array.from({ length: n }, (_, i) => picsum(`${prefix}-${i+1}`, w, h));

  return {
    frente:  imgs(`${seed}-fr`, nFrente,  800, 1000),
    costas:  imgs(`${seed}-bk`, nCostas,  800, 1000),
    detalhe: imgs(`${seed}-dt`, nDetalhe, 600, 600),
    patch:   imgs(`${seed}-pt`, nPatch,   600, 600),
  };
}

/* ═══════════════════════════════════════════════════════════
   GERADOR PRINCIPAL DE PRODUTO
═══════════════════════════════════════════════════════════ */

function gerarProduto(tipo, adj, idx) {
  const nCores = weightedPick([1, 2, 3], [0.15, 0.55, 0.30]);
  const cores  = pickN(CORES, nCores);
  const drop   = pick(DROPS);
  const tecido = getTecido(tipo.key);

  const titulo   = `${adj.label} ${tipo.label}`;
  const tituloJP = buildJP(adj, tipo);
  const descricao = buildDesc(tipo, adj, cores, tecido);
  const especificacoes = buildSpecs(tipo, adj, cores, tecido, drop);

  const preco    = rand(tipo.precoMin, tipo.precoMax);
  /* Arredonda para .90 ou .00 */
  const precoFmt = Math.round(preco / 10) * 10 - (Math.random() > 0.5 ? 0.10 : 0);
  const parcelas = rand(1, tipo.parcMax);

  const peso  = parseFloat((tipo.peso[0] + Math.random() * (tipo.peso[1] - tipo.peso[0])).toFixed(2));
  const [dimA, dimL, dimC] = tipo.dim;
  const sku  = `ZZ-${tipo.key.slice(0,4).toUpperCase()}-${adj.key.toUpperCase()}-${String(idx + 1).padStart(3, '0')}`;

  const seed = `zz-${tipo.key}-${adj.key}-${idx}`;
  const fotos = buildFotos(seed);

  const { estoque, variacoes } = buildEstoqueEVariacoes(cores, tipo);

  return {
    titulo, tituloJP, preco: precoFmt, parcelas, descricao, especificacoes,
    cores: cores.map(({ hex, nome }) => ({ hex, nome })),
    fotos, estoque, variacoes,
    logistica: {
      sku, ean: '',
      peso,
      dimensoes: { altura: dimA, largura: dimL, comprimento: dimC },
    },
    status: 'publicado',
  };
}

/* ═══════════════════════════════════════════════════════════
   GERAÇÃO DO CATÁLOGO COMPLETO (200 produtos únicos)
═══════════════════════════════════════════════════════════ */

function gerarCatalogo(total = 200) {
  /* Cria todas as combinações tipo × adjetivo */
  const combos = [];
  for (const tipo of TIPOS) {
    for (const adj of ADJETIVOS) {
      combos.push({ tipo, adj });
    }
  }
  /* Embaralha para distribuição variada no banco */
  const shuffled = shuffle(combos).slice(0, total);
  return shuffled.map(({ tipo, adj }, i) => gerarProduto(tipo, adj, i));
}

/* ═══════════════════════════════════════════════════════════
   RUNNER
═══════════════════════════════════════════════════════════ */

async function seed() {
  const isReset = process.argv.includes('--reset');
  const TOTAL   = 200;
  const BATCH   = 20;

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) { console.error('✗ MONGO_URI não encontrada no .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('✔ MongoDB conectado\n');

  if (isReset) {
    const { deletedCount } = await Product.deleteMany({
      'logistica.sku': { $regex: '^ZZ-' },
    });
    console.log(`⚠  Modo --reset: ${deletedCount} produto(s) removido(s)\n`);
  }

  /* Verifica SKUs já existentes para evitar duplicatas */
  const catalog = gerarCatalogo(TOTAL);
  const allSkus = catalog.map(p => p.logistica.sku);
  const existing = new Set(
    (await Product.find({ 'logistica.sku': { $in: allSkus } }).select('logistica.sku').lean())
      .map(p => p.logistica.sku)
  );

  const toInsert = catalog.filter(p => !existing.has(p.logistica.sku));

  console.log(`  Total gerados : ${catalog.length}`);
  console.log(`  Já existem    : ${existing.size}`);
  console.log(`  A inserir     : ${toInsert.length}\n`);

  if (!toInsert.length) {
    console.log('Nada para inserir. Use --reset para recriar tudo.');
    await mongoose.disconnect();
    return;
  }

  let inserted = 0;
  const batches = Math.ceil(toInsert.length / BATCH);

  for (let b = 0; b < batches; b++) {
    const batch = toInsert.slice(b * BATCH, (b + 1) * BATCH);
    try {
      await Product.create(batch);
      inserted += batch.length;
      const pct = Math.round((inserted / toInsert.length) * 100);
      process.stdout.write(`\r  Inserindo… ${inserted}/${toInsert.length} (${pct}%)`);
    } catch (err) {
      console.error(`\n  ✗ Erro no batch ${b + 1}:`, err.message);
    }
  }

  console.log(`\n\n  ✔ ${inserted} produto(s) inserido(s) com sucesso!`);
  console.log('\n─────────────────────────────────────────────');
  console.log(`  Total no banco agora: ${await Product.countDocuments()} produto(s)`);
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✔ Conexão encerrada.');
}

seed().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
