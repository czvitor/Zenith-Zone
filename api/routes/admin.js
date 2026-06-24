const router       = require('express').Router();
const { body, validationResult } = require('express-validator');
const User         = require('../models/User');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');

const PERM_KEYS = ['canEditProducts', 'canViewOrders', 'canManageUsers', 'canConfigureSite'];

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ errors: errors.array() }); return false; }
  return true;
}

// PUT /api/admin/users/:id/permissions
// Atualiza as flags de permissão de um moderador. Apenas admin.
router.put('/users/:id/permissions',
  authenticate,
  authorize('admin'),
  PERM_KEYS.map(k => body(k).optional().isBoolean().withMessage(`${k} deve ser booleano.`)),
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const target = await User.findById(req.params.id).select('-password -resetToken -resetTokenExpiry');

      if (!target) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      if (target.role !== 'moderator') {
        return res.status(400).json({ error: 'Permissões só podem ser editadas em moderadores.' });
      }

      const update = {};
      PERM_KEYS.forEach(k => {
        if (typeof req.body[k] === 'boolean') {
          update[`permissions.${k}`] = req.body[k];
        }
      });

      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      ).select('-password -resetToken -resetTokenExpiry');

      res.json({ user: updated });
    } catch (err) {
      console.error('admin/permissions:', err);
      res.status(500).json({ error: 'Erro interno ao atualizar permissões.' });
    }
  }
);

module.exports = router;
