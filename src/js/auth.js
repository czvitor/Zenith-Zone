/**
 * ZZAuth — Módulo de autenticação frontend Zenith Zone
 * Gerencia JWT, estado do usuário e proteção de rotas.
 *
 * Expõe o objeto global ZZAuth para uso em todas as páginas.
 *
 * Configuração de ambiente:
 *   window.ZZ_API_BASE  — URL base da API (padrão: http://localhost:3001/api)
 *   window.ZZ_ROOT      — raiz do projeto para redirects (inferido automaticamente)
 */

const ZZAuth = (() => {
  /* ── Configuração de ambiente ───────────────────────────────────────────────
     Em produção, adicione antes deste script:
     <script>window.ZZ_API_BASE = 'https://api.zenithzone.com/api';</script>    */
  const API_BASE  = window.ZZ_API_BASE || 'http://localhost:3001/api';
  const TOKEN_KEY = 'zz_token';
  const USER_KEY  = 'zz_user';

  /* ── Descobre a raiz do projeto no servidor ─────────────────────────────────
     Funciona se o projeto está em / ou em subdiretório (ex: /app/).
     Exemplo: pathname = "/app/src/pages/admin.html" → root = "/app/"          */
  function _projectRoot() {
    const path = window.location.pathname;
    const srcIdx = path.indexOf('/src/');
    if (srcIdx !== -1) {
      return window.location.origin + path.substring(0, srcIdx + 1);
    }
    // Sem /src/ no caminho (ex: index.html na raiz) — sobe até o último '/'
    const dir = path.substring(0, path.lastIndexOf('/') + 1);
    return window.location.origin + dir;
  }

  /* ── Decodifica o payload de um JWT sem verificar assinatura ────────────────
     Usado apenas para leitura de claims (exp, iat) no lado cliente.            */
  function _decodeJWT(token) {
    try {
      const segment = token.split('.')[1];
      /* base64url → base64 (substitui - por + e _ por /) + padding */
      const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
      const padded  = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      return JSON.parse(atob(padded));
    } catch { return null; }
  }

  // ── Storage ─────────────────────────────────────────────────────────────────
  function getToken()   { return localStorage.getItem(TOKEN_KEY); }
  function getUser()    { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }

  /* Verifica se o token existe E ainda não expirou.
     Se estiver expirado, limpa o storage automaticamente. */
  function isLoggedIn() {
    const token = getToken();
    if (!token) return false;
    const payload = _decodeJWT(token);
    if (!payload?.exp) {
      /* Token mal-formado — descarta */
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return false;
    }
    /* payload.exp está em segundos Unix; Date.now() em milissegundos */
    if (payload.exp * 1000 <= Date.now()) {
      /* Token expirado — descarta para forçar novo login */
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return false;
    }
    return true;
  }

  function isAdmin()    { return getUser()?.role === 'admin'; }
  function isMod()      { return ['admin', 'moderator'].includes(getUser()?.role); }

  /* Verifica permissão granular.
     Admin sempre retorna true; moderador depende da flag salva no objeto user. */
  function hasPermission(key) {
    const user = getUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.[key] === true;
  }

  function _store(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    /* index.html está na raiz — redireciona para '/' */
    const root = _projectRoot();
    window.location.replace(root.endsWith('/') ? root : root + '/');
  }

  // ── Fetch helper (injeta Authorization header automaticamente) ──────────────
  async function _fetch(endpoint, options = {}) {
    const token   = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw data;
    return data;
  }

  // ── Ações de autenticação ───────────────────────────────────────────────────
  async function register(payload) {
    const data = await _fetch('/auth/register', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    _store(data.token, data.user);
    return data;
  }

  async function login(email, password) {
    const data = await _fetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    });
    _store(data.token, data.user);
    return data;
  }

  async function forgotPassword(email) {
    return _fetch('/auth/forgot-password', {
      method: 'POST',
      body:   JSON.stringify({ email }),
    });
  }

  async function resetPassword(token, password, confirmPassword) {
    return _fetch('/auth/reset-password', {
      method: 'POST',
      body:   JSON.stringify({ token, password, confirmPassword }),
    });
  }

  async function registerModerator(payload) {
    return _fetch('/auth/register-moderator', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
  }

  async function getModerators() {
    return _fetch('/auth/moderators');
  }

  // ── Guards de rota ──────────────────────────────────────────────────────────
  /* Usa _projectRoot() para funcionar tanto com Live Server quanto em deploys
     em subdiretórios (ex: example.com/app/src/…).                             */
  function requireAuth() {
    if (!isLoggedIn()) window.location.replace(_projectRoot() + 'src/pages/login.html');
  }

  function requireAdmin() {
    if (!isLoggedIn()) { window.location.replace(_projectRoot() + 'src/pages/login.html'); return; }
    if (!isAdmin())    { const r = _projectRoot(); window.location.replace(r.endsWith('/') ? r : r + '/'); }
  }

  /* Permite entrada de admin E moderadores com qualquer permissão */
  function requireMod() {
    if (!isLoggedIn()) { window.location.replace(_projectRoot() + 'src/pages/login.html'); return; }
    if (!isMod())      { window.location.replace(_projectRoot() + 'index.html'); }
  }

  function requireGuest() {
    if (!isLoggedIn()) return;
    window.location.replace(
      isAdmin()
        ? _projectRoot() + 'src/pages/admin-panel.html'
        : _projectRoot() + 'index.html'
    );
  }

  // ── Validação de senha (frontend) ───────────────────────────────────────────
  function validatePassword(password) {
    const errors = [];
    if (password.length < 6)          errors.push('Mínimo de 6 caracteres.');
    if (!/[A-Z]/.test(password))      errors.push('Pelo menos 1 letra maiúscula.');
    if (!/[@#$%!&*]/.test(password))  errors.push('Pelo menos 1 caractere especial (@#$%!&*).');
    return errors; // array vazio = senha válida
  }

  // ── UI: atualiza elementos baseados no estado de auth ──────────────────────
  // Use nos elementos HTML:
  //   data-auth-show   → visível apenas logado
  //   data-guest-show  → visível apenas deslogado
  //   data-admin-show  → visível apenas para admin
  //   data-mod-show    → visível para admin e moderador
  //   data-username    → preenchido com o username atual
  //   data-logout      → clique faz logout
  function updateNavUI() {
    const user     = getUser();
    const loggedIn = isLoggedIn();

    document.querySelectorAll('[data-auth-show]').forEach(el => {
      el.style.display = loggedIn ? '' : 'none';
    });
    document.querySelectorAll('[data-guest-show]').forEach(el => {
      el.style.display = !loggedIn ? '' : 'none';
    });
    document.querySelectorAll('[data-admin-show]').forEach(el => {
      el.style.display = isAdmin() ? '' : 'none';
    });
    document.querySelectorAll('[data-mod-show]').forEach(el => {
      el.style.display = isMod() ? '' : 'none';
    });
    document.querySelectorAll('[data-perm-show]').forEach(el => {
      el.style.display = hasPermission(el.dataset.permShow) ? '' : 'none';
    });
    document.querySelectorAll('[data-username]').forEach(el => {
      el.textContent = user?.firstName || user?.username || '';
    });
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); logout(); });
    });
  }

  // Executa automaticamente ao carregar a página
  document.addEventListener('DOMContentLoaded', updateNavUI);

  // API pública
  return {
    getToken, getUser, isLoggedIn, isAdmin, isMod, hasPermission,
    logout, register, login, forgotPassword, resetPassword, registerModerator, getModerators,
    requireAuth, requireAdmin, requireMod, requireGuest,
    validatePassword, updateNavUI,
  };
})();
