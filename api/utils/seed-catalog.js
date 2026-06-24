/**
 * seed-catalog.js
 * Cria 10 produtos de exemplo com imagens aleatórias do Picsum Photos
 * (fotos sem copyright, Unsplash License — uso comercial permitido).
 *
 * Uso:
 *   node api/utils/seed-catalog.js           → cria apenas os que não existem
 *   node api/utils/seed-catalog.js --reset   → apaga e recria todos
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const Product  = require('../models/Product');

/* ──────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────── */

/** Converte nome de cor em slug idêntico ao do backend */
function colorSlug(nome) {
  return (nome || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sem-nome';
}

/**
 * Gera URL do Picsum Photos.
 * Seed determinístico → mesma imagem em reruns; leve variação por produto.
 * Licença: Unsplash License — uso comercial livre, sem necessidade de atribuição.
 */
const picsum = (seed, w = 800, h = 1000) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

/**
 * Monta o objeto estoque no formato Mixed do schema:
 *   { colorSlug: { tamanho: { qtd, largura, comprimento, manga } } }
 *
 * @param {Array}  coresQtd   [ { cor: 'Nome Cor', P: 8, M: 12, G: 10, GG: 6, XGG: 3 } ]
 * @param {Object} medidas    { P: [larg,comp,manga], M: [...], ... }
 */
function buildEstoque(coresQtd, medidas) {
  const estoque = {};
  for (const { cor, ...sizes } of coresQtd) {
    const slug = colorSlug(cor);
    estoque[slug] = {};
    for (const [size, qtd] of Object.entries(sizes)) {
      const [largura, comprimento, manga] = medidas[size] || [0, 0, 0];
      estoque[slug][size] = { qtd: qtd ?? 0, largura, comprimento, manga };
    }
  }
  return estoque;
}

/* Medidas padrão por categoria (cm) — baseadas em tabelas reais de streetwear */
const MEDIDAS = {
  tee: {
    P: [50, 65, 0], M: [54, 68, 0], G: [58, 71, 0], GG: [62, 74, 0], XGG: [66, 77, 0],
  },
  hoodie: {
    P: [58, 66, 62], M: [62, 69, 64], G: [66, 72, 66], GG: [70, 75, 68], XGG: [74, 78, 70],
  },
  crewneck: {
    P: [56, 64, 60], M: [60, 67, 62], G: [64, 70, 64], GG: [68, 73, 66], XGG: [72, 76, 68],
  },
  longsleeve: {
    P: [50, 65, 58], M: [54, 68, 61], G: [58, 71, 64], GG: [62, 74, 67], XGG: [66, 77, 70],
  },
  jacket: {
    P: [56, 62, 60], M: [60, 65, 63], G: [64, 68, 66], GG: [68, 71, 69], XGG: [72, 74, 72],
  },
  pants: {
    P: [40, 98, 0], M: [43, 101, 0], G: [46, 104, 0], GG: [49, 107, 0], XGG: [52, 110, 0],
  },
};

/* ──────────────────────────────────────────────────────────────
   CATÁLOGO DE PRODUTOS
────────────────────────────────────────────────────────────── */
const CATALOG = [

  /* ── 1. Heavyweight Tee Oversized ─────────────────────────── */
  {
    titulo:   'Heavyweight Tee Oversized',
    tituloJP: 'ヘビーウェイト・ティー — ゼニス・ゾーン',
    preco: 249.90, parcelas: 3,
    descricao: `A **Heavyweight Tee** da Zenith Zone é construída em cotton *320GSM* com modelagem Boxy Fit — o equilíbrio perfeito entre peso e silhueta.

- Bordado autoral no peito (fio acetinado)
- Patch de tecido costurado na barra lateral
- Tag 3D numerada e lacrada
- Costuras duplas em todas as extremidades`,
    especificacoes: [
      { label: 'Tecido',    valor: 'Cotton 320GSM' },
      { label: 'Modelagem', valor: 'Boxy Fit / Oversized' },
      { label: 'Composição',valor: '100% Algodão penteado' },
      { label: 'Gola',      valor: 'Careca com ribana 2×2' },
      { label: 'Drop',      valor: '#01 — Founding Collection' },
    ],
    cores: [
      { hex: '#0a0a0a', nome: 'Midnight Black' },
      { hex: '#f0ece4', nome: 'Off White' },
    ],
    fotos: {
      frente:  [picsum('zz-tee1-f1'), picsum('zz-tee1-f2')],
      costas:  [picsum('zz-tee1-c1')],
      detalhe: [picsum('zz-tee1-d1', 600, 600), picsum('zz-tee1-d2', 600, 600)],
      patch:   [picsum('zz-tee1-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Midnight Black', P: 10, M: 18, G: 15, GG: 8,  XGG: 4 },
      { cor: 'Off White',      P: 7,  M: 12, G: 10, GG: 5,  XGG: 2 },
    ], MEDIDAS.tee),
    logistica: {
      sku: 'ZZ-HVY-TEE-001', ean: '', peso: 0.34,
      dimensoes: { altura: 3, largura: 32, comprimento: 42 },
    },
    status: 'publicado',
  },

  /* ── 2. Boxy Fit Hoodie ────────────────────────────────────── */
  {
    titulo:   'Boxy Fit Hoodie',
    tituloJP: 'ボクシー・フィット・フーディー — 重量級',
    preco: 389.90, parcelas: 5,
    descricao: `O **Boxy Fit Hoodie** define a essência do inverno streetwear. Fleece *380GSM* com interior escovado e capuz duplo estruturado.

- Bolso canguru com divisória interna
- Cordão encerado resistente à chuva
- Estampa autoral nas costas (serigrafia water-based)
- Ribana em 2×2 nas punhos e barra`,
    especificacoes: [
      { label: 'Tecido',    valor: 'Fleece 380GSM' },
      { label: 'Modelagem', valor: 'Boxy Fit' },
      { label: 'Composição',valor: '80% Algodão / 20% Poliéster' },
      { label: 'Capuz',     valor: 'Duplo com cordão encerado' },
      { label: 'Bolso',     valor: 'Canguru com divisória' },
    ],
    cores: [
      { hex: '#1a1a1a', nome: 'Charcoal Black' },
      { hex: '#2d4a6e', nome: 'Washed Navy' },
      { hex: '#7a3030', nome: 'Brick Red' },
    ],
    fotos: {
      frente:  [picsum('zz-hd2-f1'), picsum('zz-hd2-f2')],
      costas:  [picsum('zz-hd2-c1'), picsum('zz-hd2-c2')],
      detalhe: [picsum('zz-hd2-d1', 600, 600)],
      patch:   [picsum('zz-hd2-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Charcoal Black', P: 8,  M: 14, G: 12, GG: 6, XGG: 3 },
      { cor: 'Washed Navy',    P: 6,  M: 10, G: 8,  GG: 4, XGG: 2 },
      { cor: 'Brick Red',      P: 5,  M: 9,  G: 7,  GG: 3, XGG: 1 },
    ], MEDIDAS.hoodie),
    logistica: {
      sku: 'ZZ-BOX-HDD-002', ean: '', peso: 0.72,
      dimensoes: { altura: 5, largura: 38, comprimento: 48 },
    },
    status: 'publicado',
  },

  /* ── 3. Coach Jacket ───────────────────────────────────────── */
  {
    titulo:   'Coach Jacket Oversized',
    tituloJP: 'コーチ・ジャケット — オーバーサイズ',
    preco: 459.00, parcelas: 6,
    descricao: `A **Coach Jacket** revisitada com proporções oversized. Nylon ripstop 210T leve e impermeável — do skatepark ao café.

- Forro 100% tafetá com bolso interno
- Zíper YKK de alumínio anodizado
- Manga raglã para amplitude de movimento
- Logo bordado em relevo no peito esquerdo`,
    especificacoes: [
      { label: 'Tecido',        valor: 'Nylon Ripstop 210T' },
      { label: 'Forro',         valor: 'Tafetá 100% Poliéster' },
      { label: 'Impermeabilidade', valor: 'DWR tratamento' },
      { label: 'Zíper',         valor: 'YKK Alumínio' },
      { label: 'Modelagem',     valor: 'Oversized Raglan' },
    ],
    cores: [
      { hex: '#111111', nome: 'All Black' },
      { hex: '#1e3a1e', nome: 'Forest Green' },
    ],
    fotos: {
      frente:  [picsum('zz-cj3-f1'), picsum('zz-cj3-f2')],
      costas:  [picsum('zz-cj3-c1')],
      detalhe: [picsum('zz-cj3-d1', 600, 600), picsum('zz-cj3-d2', 600, 600)],
      patch:   [picsum('zz-cj3-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'All Black',     P: 6,  M: 10, G: 9,  GG: 5, XGG: 2 },
      { cor: 'Forest Green',  P: 4,  M: 8,  G: 7,  GG: 3, XGG: 1 },
    ], MEDIDAS.jacket),
    logistica: {
      sku: 'ZZ-CCH-JKT-003', ean: '', peso: 0.48,
      dimensoes: { altura: 4, largura: 36, comprimento: 46 },
    },
    status: 'publicado',
  },

  /* ── 4. Crewneck Sweatshirt ────────────────────────────────── */
  {
    titulo:   'Crewneck Sweatshirt',
    tituloJP: 'クルーネック・スウェットシャツ',
    preco: 299.90, parcelas: 4,
    descricao: `O **Crewneck** essencial do guarda-roupa streetwear. Fleece cotton 340GSM sem capuz — clean e versátil.

- Gráfico de arquivo impresso em serigrafia
- Ribana em 2×2 no colarinho, punhos e barra
- Costura flatlock nas costuras laterais
- Interior com escovado leve para conforto térmico`,
    especificacoes: [
      { label: 'Tecido',    valor: 'Cotton Fleece 340GSM' },
      { label: 'Composição',valor: '70% Algodão / 30% Poliéster' },
      { label: 'Gola',      valor: 'Careca com ribana 2×2' },
      { label: 'Impressão', valor: 'Serigrafia de arquivo' },
    ],
    cores: [
      { hex: '#6b7280', nome: 'Slate Grey' },
      { hex: '#f9f5ef', nome: 'Cream White' },
      { hex: '#0a0a0a', nome: 'Jet Black' },
    ],
    fotos: {
      frente:  [picsum('zz-cn4-f1'), picsum('zz-cn4-f2')],
      costas:  [picsum('zz-cn4-c1')],
      detalhe: [picsum('zz-cn4-d1', 600, 600)],
      patch:   [picsum('zz-cn4-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Slate Grey',  P: 9,  M: 16, G: 13, GG: 7,  XGG: 3 },
      { cor: 'Cream White', P: 7,  M: 12, G: 10, GG: 5,  XGG: 2 },
      { cor: 'Jet Black',   P: 11, M: 20, G: 16, GG: 9,  XGG: 4 },
    ], MEDIDAS.crewneck),
    logistica: {
      sku: 'ZZ-CRW-SWT-004', ean: '', peso: 0.58,
      dimensoes: { altura: 4, largura: 35, comprimento: 44 },
    },
    status: 'publicado',
  },

  /* ── 5. Cargo Pants ────────────────────────────────────────── */
  {
    titulo:   'Cargo Pants Wide Leg',
    tituloJP: 'カーゴ・パンツ — ワイドレッグ',
    preco: 349.00, parcelas: 5,
    descricao: `O **Cargo Pants** Wide Leg da Zenith Zone redefine o utilitário no streetwear moderno. Twill cotton 280GSM com queda perfeita.

- 6 bolsos funcionais (2 laterais cargo com velcro)
- Elástico + cordão ajustável na cintura
- Barra com abertura lateral e velcro
- Lavagem enzimática para aspecto washed`,
    especificacoes: [
      { label: 'Tecido',    valor: 'Cotton Twill 280GSM' },
      { label: 'Composição',valor: '100% Algodão' },
      { label: 'Modelagem', valor: 'Wide Leg / Straight' },
      { label: 'Cintura',   valor: 'Elástico + cordão' },
      { label: 'Bolsos',    valor: '6 (incluindo 2 cargo)' },
    ],
    cores: [
      { hex: '#4a5240', nome: 'Olive Drab' },
      { hex: '#b8a88a', nome: 'Khaki Sand' },
    ],
    fotos: {
      frente:  [picsum('zz-cp5-f1'), picsum('zz-cp5-f2')],
      costas:  [picsum('zz-cp5-c1')],
      detalhe: [picsum('zz-cp5-d1', 600, 600), picsum('zz-cp5-d2', 600, 600)],
      patch:   [picsum('zz-cp5-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Olive Drab',  P: 7,  M: 11, G: 10, GG: 6, XGG: 2 },
      { cor: 'Khaki Sand',  P: 5,  M: 9,  G: 8,  GG: 4, XGG: 1 },
    ], MEDIDAS.pants),
    logistica: {
      sku: 'ZZ-CRG-PNT-005', ean: '', peso: 0.65,
      dimensoes: { altura: 5, largura: 40, comprimento: 55 },
    },
    status: 'publicado',
  },

  /* ── 6. Baggy Jogger ───────────────────────────────────────── */
  {
    titulo:   'Baggy Jogger Premium',
    tituloJP: 'バギー・ジョガー — プレミアム',
    preco: 289.90, parcelas: 4,
    descricao: `O **Baggy Jogger** combina o conforto extremo do French Terry com a silhueta deslocada que domina as ruas.

- French Terry 300GSM macio ao toque
- Cintura dupla com cadarço chato
- Punhos com ribana canelada
- Logo estampado na lateral da perna esquerda`,
    especificacoes: [
      { label: 'Tecido',    valor: 'French Terry 300GSM' },
      { label: 'Composição',valor: '80% Algodão / 20% Poliéster' },
      { label: 'Modelagem', valor: 'Baggy / Relaxed' },
      { label: 'Punhos',    valor: 'Ribana canelada' },
    ],
    cores: [
      { hex: '#0a0a0a', nome: 'Jet Black' },
      { hex: '#9ca3af', nome: 'Ash Grey' },
    ],
    fotos: {
      frente:  [picsum('zz-jg6-f1'), picsum('zz-jg6-f2')],
      costas:  [picsum('zz-jg6-c1')],
      detalhe: [picsum('zz-jg6-d1', 600, 600)],
      patch:   [picsum('zz-jg6-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Jet Black', P: 10, M: 17, G: 14, GG: 8,  XGG: 3 },
      { cor: 'Ash Grey',  P: 8,  M: 13, G: 11, GG: 6,  XGG: 2 },
    ], MEDIDAS.pants),
    logistica: {
      sku: 'ZZ-BGG-JGR-006', ean: '', peso: 0.52,
      dimensoes: { altura: 4, largura: 38, comprimento: 52 },
    },
    status: 'publicado',
  },

  /* ── 7. Bomber Jacket ──────────────────────────────────────── */
  {
    titulo:   'Bomber Jacket Satin',
    tituloJP: 'ボンバー・ジャケット — サテン',
    preco: 529.00, parcelas: 7,
    descricao: `O **Bomber Jacket Satin** da Zenith Zone é a peça de destaque do armário. Cetim de poliéster com brilho suave e forro listrado.

- Cetim 100% Poliéster de alto brilho
- Forro listrado com gráfico de arquivo
- Punhos e gola em ribana canelada
- Bordado 3D grande nas costas
- Zíper frontal YKK com puxador personalizado`,
    especificacoes: [
      { label: 'Tecido',  valor: 'Cetim Poliéster 210GSM' },
      { label: 'Forro',   valor: 'Tafetá listrado' },
      { label: 'Bordado', valor: '3D nas costas (12×14cm)' },
      { label: 'Zíper',   valor: 'YKK com puxador custom' },
      { label: 'Drop',    valor: '#02 — Tokyo Nights' },
    ],
    cores: [
      { hex: '#0f172a', nome: 'Midnight Navy' },
      { hex: '#7f1d1d', nome: 'Varsity Red' },
    ],
    fotos: {
      frente:  [picsum('zz-bm7-f1'), picsum('zz-bm7-f2')],
      costas:  [picsum('zz-bm7-c1'), picsum('zz-bm7-c2')],
      detalhe: [picsum('zz-bm7-d1', 600, 600), picsum('zz-bm7-d2', 600, 600)],
      patch:   [picsum('zz-bm7-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Midnight Navy', P: 5,  M: 9,  G: 8,  GG: 4, XGG: 2 },
      { cor: 'Varsity Red',   P: 4,  M: 7,  G: 6,  GG: 3, XGG: 1 },
    ], MEDIDAS.jacket),
    logistica: {
      sku: 'ZZ-BMB-JKT-007', ean: '', peso: 0.60,
      dimensoes: { altura: 5, largura: 38, comprimento: 50 },
    },
    status: 'publicado',
  },

  /* ── 8. Track Jacket ───────────────────────────────────────── */
  {
    titulo:   'Track Jacket Classic',
    tituloJP: 'トラック・ジャケット — クラシック',
    preco: 399.00, parcelas: 5,
    descricao: `O **Track Jacket Classic** une o DNA das quadras de basquete dos anos 90 com o guarda-roupa streetwear contemporâneo.

- Poliéster piquê com toque dry-fit
- Listras laterais em contraste (fita de 2cm)
- Gola mandarim com zíper até o topo
- Bolsos laterais com zíper oculto
- Fit levemente oversized`,
    especificacoes: [
      { label: 'Tecido',    valor: 'Poliéster Piquê 220GSM' },
      { label: 'Listras',   valor: 'Fita jacquard 2cm' },
      { label: 'Gola',      valor: 'Mandarim com zíper' },
      { label: 'Modelagem', valor: 'Oversized leve' },
    ],
    cores: [
      { hex: '#111827', nome: 'Black Anthracite' },
      { hex: '#1d4ed8', nome: 'Electric Blue' },
    ],
    fotos: {
      frente:  [picsum('zz-tk8-f1'), picsum('zz-tk8-f2')],
      costas:  [picsum('zz-tk8-c1')],
      detalhe: [picsum('zz-tk8-d1', 600, 600)],
      patch:   [picsum('zz-tk8-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Black Anthracite', P: 7,  M: 12, G: 10, GG: 5, XGG: 2 },
      { cor: 'Electric Blue',    P: 5,  M: 8,  G: 7,  GG: 3, XGG: 1 },
    ], MEDIDAS.jacket),
    logistica: {
      sku: 'ZZ-TRK-JKT-008', ean: '', peso: 0.44,
      dimensoes: { altura: 4, largura: 36, comprimento: 46 },
    },
    status: 'publicado',
  },

  /* ── 9. Long Sleeve Graphic Tee ────────────────────────────── */
  {
    titulo:   'Long Sleeve Graphic Tee',
    tituloJP: 'ロングスリーブ・グラフィックティー',
    preco: 219.90, parcelas: 3,
    descricao: `A **Long Sleeve Graphic Tee** é o básico elevado da Zenith Zone. Cotton premium 200GSM com mangas compridas e gráfico frontal de arquivo.

- Estampa frontal em serigrafia plastisol
- Punhos ribana canelada
- Etiqueta interna com QR code de autenticação
- Gola careca com estrutura reforçada`,
    especificacoes: [
      { label: 'Tecido',    valor: 'Cotton 200GSM' },
      { label: 'Composição',valor: '100% Algodão' },
      { label: 'Impressão', valor: 'Plastisol frontal' },
      { label: 'Manga',     valor: 'Comprida com ribana' },
    ],
    cores: [
      { hex: '#111111', nome: 'Washed Black' },
      { hex: '#d6d3d1', nome: 'Dust Stone' },
    ],
    fotos: {
      frente:  [picsum('zz-ls9-f1'), picsum('zz-ls9-f2')],
      costas:  [picsum('zz-ls9-c1')],
      detalhe: [picsum('zz-ls9-d1', 600, 600), picsum('zz-ls9-d2', 600, 600)],
      patch:   [picsum('zz-ls9-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Washed Black', P: 12, M: 20, G: 16, GG: 9,  XGG: 4 },
      { cor: 'Dust Stone',   P: 8,  M: 13, G: 11, GG: 6,  XGG: 2 },
    ], MEDIDAS.longsleeve),
    logistica: {
      sku: 'ZZ-LSL-TEE-009', ean: '', peso: 0.28,
      dimensoes: { altura: 3, largura: 30, comprimento: 40 },
    },
    status: 'publicado',
  },

  /* ── 10. Quarter Zip Pullover ──────────────────────────────── */
  {
    titulo:   'Quarter Zip Pullover',
    tituloJP: 'クォーター・ジップ・プルオーバー',
    preco: 339.00, parcelas: 4,
    descricao: `O **Quarter Zip Pullover** fecha o guarda-roupa de inverno da Zenith Zone com sofisticação. French Terry 320GSM com zíper ¼ metálico.

- Zíper YKK ¼ com puxador de metal pesado
- Gola alta estruturada com zíper
- Logo bordado minimalista no peito
- Punhos e barra com ribana 2×2 premium`,
    especificacoes: [
      { label: 'Tecido',    valor: 'French Terry 320GSM' },
      { label: 'Composição',valor: '80% Algodão / 20% Poliéster' },
      { label: 'Zíper',     valor: 'YKK ¼ Metal pesado' },
      { label: 'Gola',      valor: 'Alta estruturada' },
      { label: 'Drop',      valor: '#03 — Sakura Season' },
    ],
    cores: [
      { hex: '#9ca3af', nome: 'Washed Concrete' },
      { hex: '#d9bc8a', nome: 'Desert Tan' },
      { hex: '#0a0a0a', nome: 'Carbon Black' },
    ],
    fotos: {
      frente:  [picsum('zz-qz10-f1'), picsum('zz-qz10-f2')],
      costas:  [picsum('zz-qz10-c1')],
      detalhe: [picsum('zz-qz10-d1', 600, 600), picsum('zz-qz10-d2', 600, 600)],
      patch:   [picsum('zz-qz10-p1', 600, 600)],
    },
    estoque: buildEstoque([
      { cor: 'Washed Concrete', P: 8,  M: 14, G: 12, GG: 6, XGG: 3 },
      { cor: 'Desert Tan',      P: 6,  M: 10, G: 9,  GG: 4, XGG: 2 },
      { cor: 'Carbon Black',    P: 9,  M: 15, G: 13, GG: 7, XGG: 3 },
    ], MEDIDAS.crewneck),
    logistica: {
      sku: 'ZZ-QTR-ZIP-010', ean: '', peso: 0.55,
      dimensoes: { altura: 4, largura: 34, comprimento: 44 },
    },
    status: 'publicado',
  },
];

/* ──────────────────────────────────────────────────────────────
   RUNNER
────────────────────────────────────────────────────────────── */
async function seed() {
  const isReset = process.argv.includes('--reset');

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGO_URI não encontrada no .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✔ MongoDB conectado\n');

  if (isReset) {
    const { deletedCount } = await Product.deleteMany({
      'logistica.sku': { $regex: '^ZZ-' },
    });
    console.log(`⚠  Modo --reset: ${deletedCount} produto(s) removido(s)\n`);
  }

  let created = 0;
  let skipped = 0;

  for (const data of CATALOG) {
    const exists = await Product.findOne({ 'logistica.sku': data.logistica.sku });
    if (exists) {
      console.log(`  → [skip] "${data.titulo}" já existe (${exists._id})`);
      skipped++;
      continue;
    }

    const product = await Product.create(data);

    /* Reconstrói variacoes[] com isPausado automático por estoque */
    await Product.rebuildVariacoesFromEstoque(product._id);

    console.log(`  ✔ [ok]   "${product.titulo}"`);
    console.log(`           ID:   ${product._id}`);
    console.log(`           Slug: ${product.slug}`);
    created++;
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`  Criados: ${created}   Ignorados: ${skipped}   Total: ${CATALOG.length}`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✔ Conexão encerrada.');
}

seed().catch(err => {
  console.error('✗ Erro fatal:', err.message);
  process.exit(1);
});
