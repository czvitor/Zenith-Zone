const mongoose = require('mongoose');

/* ──────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────── */
function slugify(str) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function colorSlug(nome) {
  return (nome || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sem-nome';
}

/*
 * Soma todas as qtd de estoque[colorSlug][tamanho].qtd.
 * Fonte de verdade para as regras de esgotamento / reposição.
 */
function calcTotalStock(estoqueObj) {
  if (!estoqueObj || typeof estoqueObj !== 'object') return 0;
  let total = 0;
  Object.values(estoqueObj).forEach(colorData => {
    if (typeof colorData !== 'object' || colorData === null) return;
    Object.values(colorData).forEach(sizeData => {
      total += (typeof sizeData === 'object' && sizeData !== null)
        ? (Number(sizeData.qtd) || 0)
        : (Number(sizeData) || 0);
    });
  });
  return total;
}

/* ──────────────────────────────────────────────────────────
   MÁQUINA DE ESTADOS
   Hierarquia obrigatória:
     inativo → ativo → publicado ⇄ pausado
   Flags booleanas derivadas do status (virtuals):
     isAtivo     = status ∈ {ativo, publicado, pausado}
     isPublicado = status ∈ {publicado, pausado}
     isPausado   = status === pausado
────────────────────────────────────────────────────────── */
const VALID_STATUSES = ['ativo', 'publicado', 'pausado', 'inativo'];

/*
 * Transições permitidas (de → [para...])
 * Qualquer transição não listada é rejeitada.
 */
const STATUS_TRANSITIONS = {
  inativo:   ['ativo'],
  ativo:     ['publicado', 'inativo'],
  publicado: ['pausado',   'ativo',    'inativo'],
  pausado:   ['publicado', 'ativo',    'inativo'],
  rascunho:  ['ativo'],           /* legado: normalizado para ativo */
};

/**
 * Valida se uma transição de status é permitida.
 * Retorna null se válida, ou string com mensagem de erro.
 */
function validateTransition(from, to) {
  /* Normaliza legado */
  const src = from === 'rascunho' ? 'ativo' : from;
  if (!VALID_STATUSES.includes(to))
    return `Status "${to}" inválido. Use: ${VALID_STATUSES.join(', ')}.`;
  if (src === to) return null;           /* sem mudança — ok */
  const allowed = STATUS_TRANSITIONS[src] || [];
  if (!allowed.includes(to))
    return `Transição "${src}" → "${to}" não permitida. ` +
           `De "${src}" só é possível ir para: ${allowed.join(', ')}.`;
  return null;
}

/* ──────────────────────────────────────────────────────────
   SUBDOCUMENTO: Variação estruturada (cor + tamanho + estoque)
   _id gerado automaticamente pelo Mongoose (ObjectId).
   Coexiste com o campo `estoque` (Mixed) legado — não o substitui.
────────────────────────────────────────────────────────── */
const variacaoSchema = new mongoose.Schema({
  cor:      { type: String, trim: true, required: true },
  tamanho:  { type: String, trim: true, required: true },
  estoque:  { type: Number, default: 0, min: 0 },
  isPausado: { type: Boolean, default: false },
}, { _id: true });   /* _id = ObjectId auto-gerado — chave imutável de cada variação */

/* ──────────────────────────────────────────────────────────
   SCHEMA
────────────────────────────────────────────────────────── */
const productSchema = new mongoose.Schema({
  titulo:   { type: String, required: true, trim: true, maxlength: 60, unique: true },
  tituloJP: { type: String, trim: true, default: '' },
  slug:     { type: String, unique: true, lowercase: true, trim: true },

  preco:             { type: Number, required: true, min: 0 },
  precoPromocional:  { type: Number, default: null, min: 0 },
  parcelas:          { type: Number, default: 1, min: 1 },

  descricao:     { type: String, default: '' },
  especificacoes: [{
    label: { type: String, trim: true },
    valor: { type: String, trim: true },
    _id: false,
  }],
  cores: [{
    hex:  { type: String, default: '#000000' },
    nome: { type: String, trim: true },
    _id: false,
  }],

  fotos: {
    frente:  { type: [String], default: [] },
    costas:  { type: [String], default: [] },
    detalhe: { type: [String], default: [] },
    patch:   { type: [String], default: [] },
  },

  /*
   * Estoque por cor-slug → tamanho → { qtd, largura, comprimento, manga }
   * Mixed para suportar chaves dinâmicas (nomes de cor como slugs).
   */
  estoque: { type: mongoose.Schema.Types.Mixed, default: {} },

  /*
   * Pausa Granular Multi-Eixo — estrutura legada (mantida para compatibilidade).
   * Novos produtos devem usar o campo `variacoes` abaixo.
   */
  pausedVariations: {
    combos:   { type: mongoose.Schema.Types.Mixed, default: {} },
    cores:    { type: mongoose.Schema.Types.Mixed, default: {} },
    tamanhos: { type: mongoose.Schema.Types.Mixed, default: {} },
  },

  /*
   * Grade de Variações Estruturadas — nova arquitetura.
   * Cada item tem _id próprio (ObjectId), cor, tamanho, estoque e flag isPausado.
   * Permite toggle atômico via arrayFilters sem race condition.
   * Coexiste com `estoque` (Mixed) e `pausedVariations` para retrocompatibilidade.
   */
  variacoes: { type: [variacaoSchema], default: [] },

  logistica: {
    sku:  { type: String, trim: true, default: '' },
    ean:  { type: String, trim: true, default: '' },
    peso: { type: Number, default: 0 },
    dimensoes: {
      altura:      { type: Number, default: 0 },
      largura:     { type: Number, default: 0 },
      comprimento: { type: Number, default: 0 },
    },
  },

  zonaId:         { type: String, default: '' },
  categoriaId:    { type: String, default: '' },
  subcategoriaId: { type: String, default: '' },
  modelo:         { type: String, default: '', trim: true },
  colecao:        { type: String, default: '', trim: true },
  dropExclusivo:  { type: Boolean, default: false },
  imagensPorCor:  { type: mongoose.Schema.Types.Mixed, default: {} },
  salesCount:     { type: Number, default: 0, min: 0 },

  /*
   * Status — fonte de verdade central.
   * Flags booleanas são virtuals computados a partir daqui.
   *   ativo    → isAtivo=true,  isPublicado=false, isPausado=false
   *   publicado → isAtivo=true, isPublicado=true,  isPausado=false
   *   pausado  → isAtivo=true,  isPublicado=true,  isPausado=true
   *   inativo  → isAtivo=false, isPublicado=false, isPausado=false
   */
  status: {
    type:    String,
    enum:    [...VALID_STATUSES, 'rascunho'],   /* rascunho = legado */
    default: 'ativo',
  },
}, { timestamps: true });

/* ── Virtuals: flags booleanas derivadas do status ──────── */
productSchema.virtual('isAtivo').get(function() {
  return ['ativo', 'publicado', 'pausado'].includes(this.status);
});
productSchema.virtual('isPublicado').get(function() {
  return this.status === 'publicado' || this.status === 'pausado';
});
productSchema.virtual('isPausado').get(function() {
  return this.status === 'pausado';
});

/*
 * statusExibicao — status computado para exibição.
 * Retorna 'parcial' quando o produto está publicado mas tem ao menos
 * uma variação granular pausada em pausedVariations.
 * Nunca sobrescreve o status real do banco — é leitura apenas.
 */
productSchema.virtual('statusExibicao').get(function() {
  if (this.status !== 'publicado') return this.status;

  /* Verifica estrutura legada (pausedVariations) */
  const pv = this.pausedVariations || {};
  const hasPausedLegacy =
    Object.values(pv.combos   || {}).some(Boolean) ||
    Object.values(pv.cores    || {}).some(Boolean) ||
    Object.values(pv.tamanhos || {}).some(Boolean);

  /* Verifica nova estrutura (variacoes[].isPausado) */
  const hasPausedVariacao = (this.variacoes || []).some(v => v.isPausado === true);

  return (hasPausedLegacy || hasPausedVariacao) ? 'parcial' : 'publicado';
});

/* ── Índices compostos / sparse para unicidade de negócio ──
   titulo já tem unique:true inline (acima).
   SKU e EAN usam índice sparse com partialFilterExpression para
   ignorar strings vazias — muitos produtos não têm EAN.
────────────────────────────────────────────────────────── */
productSchema.index(
  { 'logistica.sku': 1 },
  { unique: true, sparse: true,
    partialFilterExpression: { 'logistica.sku': { $exists: true, $type: 'string', $ne: '' } } }
);
productSchema.index(
  { 'logistica.ean': 1 },
  { unique: true, sparse: true,
    partialFilterExpression: { 'logistica.ean': { $exists: true, $type: 'string', $ne: '' } } }
);

/* ── Índices de performance para as queries do catálogo ─────── */
/* Cobre: GET /products?status=...&sort=newest (default do catálogo e admin) */
productSchema.index({ status: 1, createdAt: -1 });
/* Cobre: GET /products?sort=bestseller (home page) */
productSchema.index({ status: 1, salesCount: -1, createdAt: -1 });
/* Cobre: GET /products?sort=price-asc/price-desc */
productSchema.index({ status: 1, preco: 1 });
/* Cobre: GET /products?sort=az */
productSchema.index({ status: 1, titulo: 1 });
/* Cobre: filtros por zona/categoria na nav e catálogo */
productSchema.index({ status: 1, zonaId: 1, categoriaId: 1 });

/* ── Pre-save: automação de status por estoque ──────────────
   Actua quando o documento é salvo directamente (.save() / .create()).
   Para paths que usam findByIdAndUpdate, o static syncStatusFromStock
   é chamado explicitamente pelo route handler.
────────────────────────────────────────────────────────── */
productSchema.pre('save', function(next) {
  if (this.isModified('estoque')) {
    const total = calcTotalStock(this.estoque);
    if (this.status === 'publicado' && total === 0) this.status = 'pausado';
    else if (this.status === 'pausado' && total > 0)  this.status = 'publicado';
  }
  next();
});

/* ── Pre-validate: normalização + slug ──────────────────── */
productSchema.pre('validate', async function(next) {
  /* Normaliza legado → não rejeita, apenas converte */
  if (this.status === 'rascunho') this.status = 'ativo';

  /* Auto-gera slug único a partir do título */
  if (this.isNew || this.isModified('titulo')) {
    let base = slugify(this.titulo);
    let slug = base, n = 1;
    while (await mongoose.model('Product').exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${n++}`;
    }
    this.slug = slug;
  }

  next();
});

/* ── Statics ─────────────────────────────────────────────── */

/**
 * Altera o status do produto com validação de transição.
 * Lança ValidationError se a transição não for permitida.
 * Use este método em vez de findByIdAndUpdate direto para
 * garantir a hierarquia da máquina de estados.
 */
productSchema.statics.setStatus = async function(productId, newStatus) {
  const product = await this.findById(productId).select('status');
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 });

  const err = validateTransition(product.status, newStatus);
  if (err) throw Object.assign(new Error(err), { statusCode: 422 });

  return this.findByIdAndUpdate(
    productId,
    { $set: { status: newStatus } },
    { new: true }
  );
};

/**
 * Sincroniza o status global do produto com o total de estoque.
 * Só actua nos status 'publicado' e 'pausado':
 *   publicado  +  total === 0  →  pausado    (esgotamento)
 *   pausado    +  total  >  0  →  publicado  (reposição)
 * Outros status (ativo, inativo) não são tocados.
 */
productSchema.statics.syncStatusFromStock = async function(productId) {
  /* .lean() devolve plain JS object — evita problemas com Mixed type
     que o Mongoose pode serializar de forma diferente de um POJO. */
  const product = await this.findById(productId).select('estoque status').lean();
  if (!product) return null;
  if (product.status !== 'publicado' && product.status !== 'pausado') return product;

  const total = calcTotalStock(product.estoque);

  let newStatus = null;
  if (product.status === 'publicado' && total === 0) newStatus = 'pausado';
  if (product.status === 'pausado'   && total >  0) newStatus = 'publicado';

  if (!newStatus) return product;

  const updated = await this.findByIdAndUpdate(
    productId,
    { $set: { status: newStatus } },
    { new: true }
  );
  console.log(`[AutoStatus] ${productId}: ${product.status}→${newStatus} (total=${total})`);
  return updated;
};

/* Alias legado — mantido para retrocompatibilidade com routes/orders.js */
productSchema.statics.checkAndAutoPause = async function(productId) {
  return this.syncStatusFromStock(productId);
};

/**
 * Reconstrói variacoes[] a partir de estoque (Mixed) + cores do produto.
 *
 * Regra automática:
 *   isPausado = true   quando  estoque[colorSlug][tamanho].qtd === 0
 *   isPausado = false  quando  estoque[colorSlug][tamanho].qtd  >  0
 *
 * Chamado após qualquer PUT que altere o campo `estoque`.
 * Preserva o _id de variações já existentes para não invalidar referências.
 */
productSchema.statics.rebuildVariacoesFromEstoque = async function(productId) {
  const PE_SIZES = ['P', 'M', 'G', 'GG', 'XGG'];
  const product  = await this.findById(productId).select('estoque cores variacoes');
  if (!product) return null;

  const estoqueObj = (product.estoque && typeof product.estoque === 'object')
    ? product.estoque : {};

  const newVariacoes = [];
  for (const cor of (product.cores || [])) {
    if (!cor.nome) continue;
    const slug       = colorSlug(cor.nome);
    const colorStock = estoqueObj[slug] || {};

    for (const tamanho of PE_SIZES) {
      const sizeData = colorStock[tamanho];
      if (!sizeData) continue; /* pula tamanhos sem entrada no estoque */

      const qty      = Number(sizeData.qtd) || 0;
      const existing = (product.variacoes || [])
        .find(v => v.cor === cor.nome && v.tamanho === tamanho);

      const entry = { cor: cor.nome, tamanho, estoque: qty, isPausado: qty === 0 };
      if (existing?._id) entry._id = existing._id;
      newVariacoes.push(entry);
    }
  }

  return this.findByIdAndUpdate(
    productId,
    { $set: { variacoes: newVariacoes } },
    { new: true }
  );
};

/**
 * Decrementa estoque de uma combinação cor+tamanho de forma atômica.
 * Usa aggregation pipeline para, na mesma operação:
 *   1. Decrementar estoque[slug][size].qtd (floor em 0)
 *   2. Atualizar variacoes[].isPausado da variação correspondente
 *      (true quando novo qty chega a 0, false quando > 0)
 */
productSchema.statics.deductStock = async function(productId, colorName, size, qty) {
  const slug = colorSlug(colorName);
  const key  = `estoque.${slug}.${size}.qtd`;

  await this.findByIdAndUpdate(
    productId,
    [{
      $set: {
        /* Decrementa, sem cair abaixo de 0 */
        [key]: { $max: [0, { $subtract: [`$${key}`, qty || 1] }] },

        /* Sincroniza isPausado da variação correspondente */
        variacoes: {
          $map: {
            input: { $ifNull: ['$variacoes', []] },
            as: 'v',
            in: {
              $mergeObjects: ['$$v', {
                isPausado: {
                  $cond: [
                    { $and: [
                      { $eq: ['$$v.cor', colorName] },
                      { $eq: ['$$v.tamanho', size] },
                    ]},
                    /* variação correspondente: isPausado = (novo qty <= 0) */
                    { $lte: [{ $max: [0, { $subtract: [`$${key}`, qty || 1] }] }, 0] },
                    /* demais variações: mantém isPausado atual */
                    '$$v.isPausado',
                  ],
                },
              }],
            },
          },
        },
      },
    }]
  );

  /* Sincroniza status global (pausado ↔ publicado) com base no novo total de estoque */
  await this.syncStatusFromStock(productId);
};

/* ── toPublic ─────────────────────────────────────────────── */
productSchema.methods.toPublic = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
module.exports.colorSlug           = colorSlug;
module.exports.calcTotalStock      = calcTotalStock;
module.exports.VALID_STATUSES      = VALID_STATUSES;
module.exports.validateTransition  = validateTransition;

/**
 * Converte um erro E11000 do MongoDB em mensagem amigável.
 * Retorna null se o erro não for de chave duplicada.
 */
module.exports.parseUniqueError = function parseUniqueError(err) {
  if (err.code !== 11000) return null;
  const key = Object.keys(err.keyPattern || err.keyValue || {})[0] || '';
  if (key === 'titulo')           return 'Já existe um anúncio cadastrado com este título.';
  if (key === 'slug')             return 'Conflito de slug — tente um título ligeiramente diferente.';
  if (key.includes('sku'))        return 'Já existe um produto cadastrado com este SKU.';
  if (key.includes('ean'))        return 'Já existe um produto cadastrado com este EAN/GTIN.';
  return 'Dados duplicados — verifique título, SKU ou EAN.';
};
