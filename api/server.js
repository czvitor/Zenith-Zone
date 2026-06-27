require('dotenv').config();

/* Força DNS do Google para resolver registros SRV do MongoDB Atlas
   (o DNS padrão do roteador não suporta SRV queries) */
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const adminRoutes      = require('./routes/admin');
const productRoutes    = require('./routes/products');
const orderRoutes      = require('./routes/orders');
const newsletterRoutes = require('./routes/newsletter');
const waitlistRoutes      = require('./routes/waitlist');
const settingsRoutes      = require('./routes/settings');
const siteSettingsRoutes  = require('./routes/site-settings');
const couponRoutes        = require('./routes/coupons');
const { startDropCron } = require('./utils/dropCron');

const app = express();

// Necessário para o express-rate-limit funcionar corretamente atrás do proxy do Render
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://czvitor.github.io',        // GitHub Pages (produção)
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Permite requisições sem origin (ex: curl, Postman, mobile)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado para origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '25mb' }));

// ── Rate limit nas rotas de auth (anti-brute-force) ───────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' },
});

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/waitlist',       waitlistRoutes);
app.use('/api/settings',       settingsRoutes);
app.use('/api/site-settings',  siteSettingsRoutes);
app.use('/api/coupons',        couponRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Rota não encontrada
app.use((_, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// Handler global de erros (captura next(err) de qualquer middleware ou rota)
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno.' });
});

// ── Inicialização ─────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✔ MongoDB conectado.');
    startDropCron();
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`✔ API Zenith Zone rodando em http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('✘ Falha ao conectar MongoDB:', err.message);
    process.exit(1);
  });
