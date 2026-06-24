/* ==========================================================
   ZENITH ZONE — WISHLIST (Favoritos)
   Persiste favoritos por usuário no LocalStorage.
   Expõe ZZWishlist globalmente para todas as páginas.
   ========================================================== */

const ZZWishlist = (() => {

  /* Chave de storage: por usuário (garante isolamento entre contas) */
  function _key() {
    const user = typeof ZZAuth !== 'undefined' ? ZZAuth.getUser() : null;
    return user?._id ? `zz_fav_${user._id}` : null;
  }

  function _load() {
    const k = _key();
    if (!k) return [];
    try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
  }

  function _save(list) {
    const k = _key();
    if (!k) return;
    localStorage.setItem(k, JSON.stringify(list));
  }

  /* Verifica se um produto está nos favoritos */
  function has(pid) {
    return _load().includes(String(pid));
  }

  /* Retorna todos os IDs favoritados */
  function getAll() {
    return _load();
  }

  /* Abre o modal de login via trigger existente no DOM */
  function _openAuth() {
    const trigger = document.querySelector('[data-open-auth="login"]');
    if (trigger) trigger.click();
  }

  /* Animação de pulso no botão */
  function _pulse(btn) {
    btn.classList.remove('zz-heart-pop');
    void btn.offsetWidth;
    btn.classList.add('zz-heart-pop');
    btn.addEventListener('animationend', () => btn.classList.remove('zz-heart-pop'), { once: true });
  }

  /* Toggle favorito — retorna true=adicionado, false=removido, null=bloqueado */
  function toggle(pid) {
    if (!pid) return null;
    if (typeof ZZAuth === 'undefined' || !ZZAuth.isLoggedIn()) {
      _openAuth();
      return null;
    }

    pid = String(pid);
    const list   = _load();
    const idx    = list.indexOf(pid);
    const adding = idx === -1;

    if (adding) list.push(pid);
    else        list.splice(idx, 1);

    _save(list);
    _syncButtons(pid, adding);
    _syncCounter();
    return adding;
  }

  /* Atualiza visual de todos os botões de coração para um pid específico */
  function _syncButtons(pid, active) {
    document.querySelectorAll(`.zz-heart-btn[data-pid="${pid}"]`).forEach(btn => {
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-label', active ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      if (active) _pulse(btn);
    });
  }

  /* Atualiza o contador da navbar */
  function _syncCounter() {
    const count = _load().length;
    document.querySelectorAll('.zz-fav-badge').forEach(el => {
      el.textContent = count;
      el.classList.toggle('is-visible', count > 0);
    });
    document.querySelectorAll('.zz-fav-btn').forEach(btn => {
      btn.classList.toggle('has-favs', count > 0);
    });
  }

  /* Sincroniza estado visual de todos os botões de coração na página */
  function syncCards() {
    const list = _load();
    document.querySelectorAll('.zz-heart-btn[data-pid]').forEach(btn => {
      const active = list.includes(String(btn.dataset.pid));
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-label', active ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    });
    _syncCounter();
  }

  let _initDone = false;

  /* Inicializa a página: estado inicial + delegação de cliques (idempotente) */
  function initPage() {
    syncCards();
    if (_initDone) return;
    _initDone = true;

    /* Delegação no bubble — preventDefault bloqueia navegação do <a> pai */
    document.addEventListener('click', e => {
      const btn = e.target.closest('.zz-heart-btn[data-pid]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      toggle(btn.dataset.pid);
    });
  }

  return { has, getAll, toggle, syncCards, initPage };
})();

/* Auto-inicializa o contador e o estado dos botões quando o DOM estiver pronto.
   As páginas podem chamar initPage() manualmente para configurar os event listeners. */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ZZWishlist.initPage());
} else {
  ZZWishlist.initPage();
}
