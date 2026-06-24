// Uso:
//   authorize('admin')                        — apenas admin
//   authorize('admin', 'moderator')           — admin ou moderador
//   authorize('canEditProducts')              — admin sempre; moderador só se tiver a flag
//   authorize('admin', 'canViewOrders')       — admin por role; moderador por permissão
module.exports = (...required) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  // Admin tem acesso total, independente do que for exigido
  if (req.user.role === 'admin') return next();

  for (const r of required) {
    if (r === req.user.role) return next();
    if (r.startsWith('can') && req.user.permissions?.[r] === true) return next();
  }

  return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
};
