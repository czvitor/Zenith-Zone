const router       = require('express').Router();
const { body, validationResult } = require('express-validator');
const User         = require('../models/User');
const authenticate = require('../middleware/authenticate');

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// ── PUT /api/users/update ─────────────────────────────────────────────────────
// Atualiza nome do usuário autenticado
router.put('/update', authenticate, [
  body('firstName').notEmpty().trim().withMessage('Nome é obrigatório.'),
  body('lastName').notEmpty().trim().withMessage('Sobrenome é obrigatório.'),
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { firstName, lastName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName },
      { new: true, runValidators: true }
    ).select('-password -resetToken -resetTokenExpiry');

    res.json({ user });
  } catch (err) {
    console.error('users/update:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar dados.' });
  }
});

// ── PUT /api/users/change-password ────────────────────────────────────────────
// Altera a senha do usuário autenticado
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória.'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres.')
    .matches(/[A-Z]/).withMessage('Nova senha deve conter pelo menos 1 letra maiúscula.')
    .matches(/[@#$%!&*]/).withMessage('Nova senha deve conter pelo menos 1 caractere especial (@#$%!&*).'),
], async (req, res) => {
  if (!validate(req, res)) return;

  try {
    const { currentPassword, newPassword } = req.body;

    // Busca com a senha (select foi excluído no middleware)
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta.' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('users/change-password:', err);
    res.status(500).json({ error: 'Erro interno ao alterar senha.' });
  }
});

module.exports = router;
