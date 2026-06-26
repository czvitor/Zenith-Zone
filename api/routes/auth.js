const router    = require('express').Router();
const { body, validationResult } = require('express-validator');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const User      = require('../models/User');
const authenticate  = require('../middleware/authenticate');
const authorize     = require('../middleware/authorize');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/mailer');

// ── Regras de senha reutilizáveis ─────────────────────────────────────────────
const passwordRules = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres.')
    .matches(/[A-Z]/)
    .withMessage('Senha deve conter pelo menos 1 letra maiúscula.')
    .matches(/[@#$%!&*]/)
    .withMessage('Senha deve conter pelo menos 1 caractere especial (@#$%!&*).'),
];

// Campos de cadastro comuns a clientes e moderadores
const registerRules = [
  body('firstName').notEmpty().trim().withMessage('Nome é obrigatório.'),
  body('lastName').notEmpty().trim().withMessage('Sobrenome é obrigatório.'),
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
  ...passwordRules,
];

// Gera username único a partir do e-mail
async function generateUsername(email) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  let username = base;
  let i = 1;
  while (await User.findOne({ username })) {
    username = base + i++;
  }
  return username;
}

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Cadastro público — cria apenas perfil 'client'
router.post('/register', registerRules, async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { firstName, lastName, email, password } = req.body;

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const username = await generateUsername(email);
    const user     = await User.create({ firstName, lastName, username, email, password, role: 'client' });
    const token    = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeObject() });
    sendWelcomeEmail(email, firstName).catch(err =>
      console.error('[Auth] Falha no e-mail de boas-vindas:', err.message),
    );
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
  body('password').notEmpty().withMessage('Senha é obrigatória.'),
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const user = await User.findOne({ email: req.body.email });

    // Sempre responde com 200 para não revelar se o e-mail existe
    if (!user) {
      return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken       = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save({ validateBeforeSave: false });

    const resetLink = `${process.env.FRONTEND_URL}/src/pages/reset-password.html?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (mailErr) {
      console.error('[Mailer] Falha ao enviar e-mail de reset:', mailErr.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV] Link de reset de senha:', resetLink);
      }
    }

    res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' });
  } catch (err) {
    console.error('forgot-password:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token é obrigatório.'),
  ...passwordRules,
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('As senhas não coincidem.');
    return true;
  }),
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    user.password         = password;
    user.resetToken       = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
  } catch (err) {
    console.error('reset-password:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── POST /api/auth/register-moderator ────────────────────────────────────────
// Protegida: apenas admin
router.post('/register-moderator', authenticate, authorize('admin'), registerRules, async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { firstName, lastName, email, password } = req.body;

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const username = await generateUsername(email);
    const user     = await User.create({ firstName, lastName, username, email, password, role: 'moderator' });
    res.status(201).json({ message: 'Moderador criado com sucesso.', user: user.toSafeObject() });
  } catch (err) {
    console.error('register-moderator:', err);
    res.status(500).json({ error: 'Erro interno ao criar moderador.' });
  }
});

// ── GET /api/auth/moderators ──────────────────────────────────────────────────
// Lista todos os moderadores — protegida: apenas admin
router.get('/moderators', authenticate, authorize('admin'), async (req, res) => {
  try {
    const moderators = await User.find({ role: 'moderator' })
      .select('-password -resetToken -resetTokenExpiry')
      .sort({ createdAt: -1 });
    res.json({ moderators });
  } catch (err) {
    console.error('moderators:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Retorna o usuário autenticado atual (usado para verificar sessão)
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
