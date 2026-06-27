const router      = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit   = require('express-rate-limit');
const jwt         = require('jsonwebtoken');
const mongoose    = require('mongoose');
const Product     = require('../models/Product');
const User        = require('../models/User');
const Waitlist    = require('../models/Waitlist');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { sendRestockNotification } = require('../utils/mailer');

/* Importa a máquina de estados, helpers de stock e de erros de unicidade */
const { VALID_STATUSES, validateTransition, parseUniqueError, calcTotalStock } = Product;

/* Status que qualquer cliente pode ver no storefront */
const PUBLIC_STATUSES = ['publicado', 'pausado'];

/* Chave sanitizada: só letras, números, hífens e underscores */
const SAFE_KEY_RE = /^[a-z0-9_\-]{1,120}$/i;

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas requisições de escrita. Aguarde 15 minutos.' },
});

const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um momento.' },
});

/*
 * Campos que o admin pode editar via PUT.
 * _id, slug e __v nunca são aceitos (protegidos contra sobrescrita).
 */
const EDITABLE_FIELDS = [
  'titulo', 'tituloJP', 'preco', 'parcelas', 'descricao',
  'especificacoes', 'cores', 'fotos', 'estoque', 'logistica',
  'zonaId', 'categoriaId', 'subcategoriaId', 'modelo', 'colecao',
  'dropExclusivo', 'imagensPorCor',
  /* status é tratado separadamente via setStatus para validar transição */
];

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ errors: errors.array() }); return false; }
  return true;
}

const productRules = [
  body('titulo').notEmpty().trim().isLength({ max: 60 }).withMessage('Título obrigatório (máx 60 chars).'),
  body('preco').isFloat({ min: 0 }).withMessage('Preço inválido.'),
];

/* Retorna true para admin ou moderador com canEditProducts */
async function getAdminFlag(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return false;
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user   = await User.findById(id).select('role permissions');
    if (!user) return false;
    return user.role === 'admin' || user.permissions?.canEditProducts === true;
  } catch { return false; }
}

/* ── POST /api/products ──────────────────────────────────────
   Cria produto — status inicial deve ser 'publicado' ou 'ativo'. */
router.post('/', authenticate, authorize('canEditProducts'), writeLimiter, productRules, async (req, res) => {
  if (!validate(req, res)) return;

  const requestedStatus = req.body.status || 'publicado';
  if (!VALID_STATUSES.includes(requestedStatus))
    return res.status(422).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}.` });

  try {
    const {
      titulo, tituloJP, preco, parcelas,
      descricao, especificacoes, cores,
      fotos, imagensPorCor, estoque, logistica,
      zonaId, categoriaId, subcategoriaId,
      modelo, colecao, dropExclusivo,
    } = req.body;
    const product = await Product.create({
      titulo, tituloJP, preco, parcelas,
      descricao, especificacoes, cores,
      fotos, imagensPorCor, estoque, logistica,
      zonaId, categoriaId, subcategoriaId,
      modelo, colecao,
      dropExclusivo: !!dropExclusivo,
      status: requestedStatus,
    });
    res.status(201).json({ product: product.toPublic() });
  } catch (err) {
    console.error('products/create:', err);
    const dupMsg = parseUniqueError(err);
    if (dupMsg) return res.status(409).json({ error: dupMsg });
    res.status(500).json({ error: 'Erro interno ao criar produto.' });
  }
});

/* ── PATCH /api/products/bulk-status ─────────────────────────
   Altera status de múltiplos produtos simultaneamente.
   Cada produto tem sua transição validada individualmente. */
router.patch('/bulk-status', authenticate, authorize('canEditProducts'), writeLimiter, async (req, res) => {
  const { ids, status: newStatus } = req.body;

  if (!Array.isArray(ids) || !ids.length)
    return res.status(422).json({ error: 'Lista de IDs inválida ou vazia.' });

  if (!VALID_STATUSES.includes(newStatus))
    return res.status(422).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}.` });

  /* Valida IDs de ObjectId */
  const invalidIds = ids.filter(id => !mongoose.isValidObjectId(id));
  if (invalidIds.length)
    return res.status(422).json({ error: `IDs inválidos: ${invalidIds.slice(0, 3).join(', ')}` });

  try {
    /* Busca status atual de todos para validar transições */
    const products = await Product.find({ _id: { $in: ids } }).select('_id status');
    const rejected = [];

    products.forEach(p => {
      const err = validateTransition(p.status, newStatus);
      if (err) rejected.push({ id: p._id, reason: err });
    });

    if (rejected.length)
      return res.status(422).json({
        error: `${rejected.length} produto(s) com transição inválida.`,
        rejected,
      });

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { status: newStatus } }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    console.error('products/bulk-status:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar status em massa.' });
  }
});

/* ── GET /api/products ─────────────────────────────────────── */
router.get('/', readLimiter, async (req, res) => {
  try {
    const {
      status, sort = 'newest',
      q, skuQ, sortBy, sortDir, priceMin, priceMax,
      zonaId, categoriaId, subcategoriaId, modelo, colecao,
    } = req.query;

    /* ── Paginação: page + limit (fallback para skip legado) ── */
    const limitNum = Math.min(Math.max(parseInt(req.query.limit) || 15, 1), 500);
    const pageNum  = Math.max(parseInt(req.query.page)  || 1, 1);
    const skipNum  = req.query.page !== undefined
      ? (pageNum - 1) * limitNum        /* modo página */
      : Math.max(parseInt(req.query.skip) || 0, 0);  /* modo skip legado */

    const requestedStatuses = status
      ? status.split(',').map(s => s.trim()).filter(Boolean)
      : ['publicado'];

    const needsAuth = requestedStatuses.some(s => !PUBLIC_STATUSES.includes(s));
    if (needsAuth && !(await getAdminFlag(req)))
      return res.status(403).json({ error: 'Permissão insuficiente para ver produtos não publicados.' });

    const filter = {
      status: requestedStatuses.length === 1
        ? requestedStatuses[0]
        : { $in: requestedStatuses },
    };

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { titulo:    { $regex: escaped, $options: 'i' } },
        { descricao: { $regex: escaped, $options: 'i' } },
        { tituloJP:  { $regex: escaped, $options: 'i' } },
      ];
    }

    if (skuQ && skuQ.trim()) {
      const escapedSku = skuQ.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['logistica.sku'] = { $regex: `^${escapedSku}`, $options: 'i' };
    }

    if (priceMin || priceMax) {
      filter.preco = {};
      if (priceMin && !isNaN(priceMin)) filter.preco.$gte = parseFloat(priceMin);
      if (priceMax && !isNaN(priceMax)) filter.preco.$lte = parseFloat(priceMax);
    }

    if (zonaId)         filter.zonaId         = zonaId.trim();
    if (categoriaId)    filter.categoriaId    = categoriaId.trim();
    if (subcategoriaId) filter.subcategoriaId = subcategoriaId.trim();
    if (modelo && modelo.trim()) {
      filter.modelo = { $regex: modelo.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (colecao && colecao.trim()) {
      filter.colecao = { $regex: colecao.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const SORT_FIELDS = { titulo: 'titulo', preco: 'preco', createdAt: 'createdAt', status: 'status' };
    let sortObj;
    if (sortBy && SORT_FIELDS[sortBy]) {
      sortObj = { [SORT_FIELDS[sortBy]]: sortDir === 'asc' ? 1 : -1 };
    } else {
      const sortMap = {
        'price-asc':   { preco: 1 },
        'price-desc':  { preco: -1 },
        'newest':      { createdAt: -1 },
        'oldest':      { createdAt: 1 },
        'bestseller':  { salesCount: -1, createdAt: -1 },
      };
      sortObj = sortMap[sort] || { createdAt: -1 };
    }

    /* .lean() retorna POJO em vez de documentos Mongoose hidratados —
       elimina instanciação de getters/virtuals para cada documento,
       tornando listagens 5-10× mais rápidas.
       Campos pesados (base64, descrições longas) também excluídos. */
    const LIST_EXCLUDE = { __v:0, descricao:0, imagensPorCor:0, especificacoes:0, tituloJP:0 };

    const [products, total] = await Promise.all([
      Product.find(filter).select(LIST_EXCLUDE).sort(sortObj)
        .skip(skipNum).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    /* lean() retorna _id como ObjectId — serializa para string manualmente */
    const serialized = products.map(p => ({
      ...p,
      _id:       p._id.toString(),
      id:        p._id.toString(),
    }));

    const totalPages  = Math.ceil(total / limitNum) || 1;
    const currentPage = req.query.page !== undefined ? pageNum : undefined;

    res.json({
      products:      serialized,
      total,
      totalProducts: total,
      totalPages,
      ...(currentPage !== undefined && { currentPage }),
    });
  } catch (err) {
    console.error('products/list:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── GET /api/products/:ref ────────────────────────────────── */
router.get('/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const isId    = /^[a-f\d]{24}$/i.test(ref);
    const product = isId
      ? await Product.findById(ref)
      : await Product.findOne({ slug: ref });

    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

    if (!PUBLIC_STATUSES.includes(product.status)) {
      if (!(await getAdminFlag(req)))
        return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.json({ product: product.toPublic() });
  } catch (err) {
    console.error('products/get:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── GET /api/products/:id/variations ───────────────────────────
   Lista as variações estruturadas do produto.                      */
router.get('/:id/variations', authenticate, authorize('canEditProducts'), readLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(422).json({ error: 'ID de produto inválido.' });
  try {
    const product = await Product.findById(req.params.id).select('variacoes titulo');
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json({ variacoes: product.variacoes, titulo: product.titulo });
  } catch (err) {
    console.error('products/variations-get:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── PUT /api/products/:id/variations ───────────────────────────
   Substitui o array completo de variações estruturadas.
   Útil para sincronizar via form de edição.                       */
router.put('/:id/variations', authenticate, authorize('canEditProducts'), writeLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(422).json({ error: 'ID de produto inválido.' });

  const { variacoes } = req.body;
  if (!Array.isArray(variacoes))
    return res.status(422).json({ error: 'Campo "variacoes" deve ser um array.' });

  /* Valida cada item antes de persistir */
  for (const v of variacoes) {
    if (!v.cor  || typeof v.cor  !== 'string') return res.status(422).json({ error: 'Cada variação precisa de "cor" (string).' });
    if (!v.tamanho || typeof v.tamanho !== 'string') return res.status(422).json({ error: 'Cada variação precisa de "tamanho" (string).' });
    if (v.estoque !== undefined && (typeof v.estoque !== 'number' || v.estoque < 0)) return res.status(422).json({ error: '"estoque" deve ser número >= 0.' });
  }

  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { variacoes } },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json({ product: product.toPublic() });
  } catch (err) {
    console.error('products/variations-put:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* Rotas de pausa manual de variações removidas.
   isPausado é agora gerenciado automaticamente:
   - PUT /:id  →  Product.rebuildVariacoesFromEstoque (qtd salva)
   - orders    →  Product.deductStock (após venda)                   */

/* ── PUT /api/products/:id ────────────────────────────────────
   Atualiza campos editáveis do produto.
   Status é tratado separadamente via Product.setStatus para
   garantir a hierarquia da máquina de estados.               */
router.put('/:id', authenticate, authorize('canEditProducts'), writeLimiter, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(422).json({ error: 'ID de produto inválido.' });

  /* Separa status dos demais campos */
  const { status: newStatus, ...rest } = req.body;

  const update = {};
  EDITABLE_FIELDS.forEach(field => {
    if (rest[field] !== undefined) update[field] = rest[field];
  });

  /* Lê apenas os campos necessários para validação:
     - estoque só é necessário se o payload também trouxer estoque */
  const selectFields = update.estoque !== undefined ? 'status estoque' : 'status';
  const current = await Product.findById(req.params.id).select(selectFields).lean();
  if (!current) return res.status(404).json({ error: 'Produto não encontrado.' });

  /* Valida transição de status enviado pelo cliente */
  if (newStatus !== undefined) {
    if (!VALID_STATUSES.includes(newStatus))
      return res.status(422).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}.` });

    const transitionErr = validateTransition(current.status, newStatus);
    if (transitionErr) return res.status(422).json({ error: transitionErr });

    update.status = newStatus;
  }

  /*
   * Regra de negócio: auto-pausa/reposição por estoque.
   * Só dispara quando o total de estoque MUDOU de faixa (>0 → 0 ou 0 → >0).
   * Salvar outros campos (ex: dropExclusivo, modelo, fotos) sem alterar
   * o estoque não deve modificar o status de publicação do produto.
   */
  let stockActuallyChanged = false;
  if (update.estoque !== undefined) {
    const newStockTotal  = calcTotalStock(update.estoque);
    const prevStockTotal = calcTotalStock(current.estoque);
    const statusAfterForm = update.status ?? current.status;

    /* Auto-pausa apenas quando o estoque CAIU de >0 para 0 */
    if (newStockTotal === 0 && prevStockTotal > 0 && statusAfterForm === 'publicado') {
      update.status = 'pausado';
      stockActuallyChanged = true;
    /* Reposição: estoque subiu de 0 para >0 */
    } else if (newStockTotal > 0 && prevStockTotal === 0 && statusAfterForm === 'pausado') {
      update.status = 'publicado';
      stockActuallyChanged = true;
    /* Qualquer outra mudança de quantidade (mas dentro da mesma faixa) */
    } else if (newStockTotal !== prevStockTotal) {
      stockActuallyChanged = true;
    }
  }

  if (!Object.keys(update).length)
    return res.status(422).json({ error: 'Nenhum campo editável fornecido.' });

  try {
    await Product.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { runValidators: true }
    );

    /* Reconstrói variacoes[].isPausado e re-sincroniza status APENAS
       quando o estoque realmente mudou — evita auto-pausa acidental
       ao salvar outros campos com estoque zerado preexistente. */
    if (stockActuallyChanged) {
      if (update.estoque !== undefined || update.cores !== undefined) {
        await Product.rebuildVariacoesFromEstoque(req.params.id);
      }
      await Product.syncStatusFromStock(req.params.id);
    }

    /* Re-fetch único após todas as mutações para resposta consistente */
    const finalProduct = await Product.findById(req.params.id);
    if (!finalProduct) return res.status(404).json({ error: 'Produto não encontrado.' });

    /* Notifica waitlist se o produto voltou ao estoque (pausado → publicado) */
    if (stockActuallyChanged && finalProduct.status === 'publicado') {
      Waitlist.find({ productId: req.params.id, notified: false })
        .then(async entries => {
          for (const entry of entries) {
            try {
              await sendRestockNotification(entry.email, finalProduct);
              await Waitlist.updateOne({ _id: entry._id }, { $set: { notified: true } });
            } catch (e) {
              console.error('[Restock] Falha ao notificar', entry.email, e.message);
            }
          }
        })
        .catch(e => console.error('[Restock] Erro ao buscar waitlist:', e.message));
    }

    res.json({ product: finalProduct.toPublic() });
  } catch (err) {
    console.error('products/update:', err);
    const dupMsg = parseUniqueError(err);
    if (dupMsg) return res.status(409).json({ error: dupMsg });
    res.status(500).json({ error: 'Erro interno.' });
  }
});

/* ── DELETE /api/products/:id ─────────────────────────────── */
/* ── POST /api/products/bulk-discount ────────────────────────
   Aplica ou remove desconto em massa.
   Body: { scope, scopeValue, discountPct, productIds? }
     scope: 'global' | 'zona' | 'categoria' | 'subcategoria' | 'produto'
     discountPct: 0–100 (0 remove o desconto)
     productIds: array de ids (só para scope='produto') */
router.post('/bulk-discount', authenticate, authorize('canEditProducts'), writeLimiter, async (req, res) => {
  try {
    const { scope = 'global', scopeValue = '', scopeValues = [], discountPct, productIds = [] } = req.body;
    const pct = parseFloat(discountPct);

    if (isNaN(pct) || pct < 0 || pct > 100)
      return res.status(422).json({ error: 'discountPct deve ser entre 0 e 100.' });

    /* Suporta scopeValues (array) ou scopeValue (string singular) */
    const vals = (Array.isArray(scopeValues) && scopeValues.length)
      ? scopeValues
      : (scopeValue ? [scopeValue] : []);
    const useIn = vals.length > 1;

    /* Monta filtro MongoDB */
    const filter = { status: { $in: ['publicado', 'pausado', 'ativo'] } };
    if (scope === 'zona')              filter.zonaId         = useIn ? { $in: vals } : vals[0];
    else if (scope === 'categoria')    filter.categoriaId    = useIn ? { $in: vals } : vals[0];
    else if (scope === 'subcategoria') filter.subcategoriaId = useIn ? { $in: vals } : vals[0];
    else if (scope === 'colecao')      filter.colecao        = useIn ? { $in: vals } : vals[0];
    else if (scope === 'produto') {
      if (!productIds.length)
        return res.status(422).json({ error: 'Forneça pelo menos um productId.' });
      const validIds = productIds.filter(id => mongoose.isValidObjectId(id));
      filter._id = { $in: validIds };
    }

    let update;
    if (pct === 0) {
      /* Remove o desconto — volta ao preço original */
      update = { $unset: { precoPromocional: '' } };
      const result = await Product.updateMany(filter, update);
      return res.json({ updated: result.modifiedCount, action: 'removed' });
    }

    /* Aplica desconto: precoPromocional = preco * (1 - pct/100) */
    const products = await Product.find(filter).select('_id preco').lean();
    if (!products.length)
      return res.json({ updated: 0, action: 'applied', message: 'Nenhum produto encontrado para este escopo.' });

    const bulkOps = products.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { precoPromocional: Math.round(p.preco * (1 - pct / 100) * 100) / 100 } },
      },
    }));
    const result = await Product.bulkWrite(bulkOps);
    res.json({ updated: result.modifiedCount, action: 'applied', discountPct: pct });
  } catch (err) {
    console.error('products/bulk-discount:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

router.delete('/:id', authenticate, authorize('canEditProducts'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(422).json({ error: 'ID de produto inválido.' });

  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json({ message: 'Produto removido com sucesso.' });
  } catch (err) {
    console.error('products/delete:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
