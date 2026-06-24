/* =============================================================
   ZENITH ZONE — Configuração Global do Frontend
   Carregue este script ANTES de auth.js, navbar.js e qualquer
   script que use window.ZZ_API_BASE.
   ============================================================= */

/* Detecta ambiente automaticamente:
   - Em localhost → usa a API local
   - Em produção (GitHub Pages, etc.) → usa a URL da API hospedada */
window.ZZ_API_BASE = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
)
  ? 'http://localhost:3001/api'
  : 'https://zenith-zone-api.onrender.com/api'; /* ← URL do Render (ajuste se necessário) */
