/* ==========================================================
   ZENITH ZONE — NAVBAR: Mega Menu + Pesquisa + Carrinho
   Vanilla JS puro. Sem dependências.
   ========================================================== */

;(function () {

  /* ── Referências globais ─────────────────────────────────── */
  const header   = document.getElementById('zz-header');
  const overlay  = document.getElementById('zz-mega-overlay');

  if (!header) return;

  /* ══════════════════════════════════════════════════════════
     1. MEGA MENU
  ══════════════════════════════════════════════════════════ */
  let activeMegaId  = null;
  let megaCloseTimer = null;
  const MEGA_CLOSE_DELAY = 160;

  function megaOpen(id) {
    clearTimeout(megaCloseTimer);
    if (activeMegaId === id) return;
    if (activeMegaId) _megaDeactivate(activeMegaId);

    /* Fecha pesquisa se estiver aberta */
    searchClose();

    activeMegaId = id;
    const panel   = header.querySelector(`.zz-mega-panel[data-panel="${id}"]`);
    const trigger = header.querySelector(`.zz-nav-trigger[data-mega="${id}"]`);

    panel?.classList.add('is-active');
    panel?.setAttribute('aria-hidden', 'false');
    trigger?.setAttribute('aria-expanded', 'true');
    trigger?.closest('.zz-nav-item')?.classList.add('is-active');

    overlay?.classList.add('is-visible');
    header.classList.add('zz-header--open');
  }

  function megaClose(immediate) {
    clearTimeout(megaCloseTimer);
    if (!activeMegaId) return;
    if (immediate) _megaCloseAll();
    else megaCloseTimer = setTimeout(_megaCloseAll, MEGA_CLOSE_DELAY);
  }

  function _megaCloseAll() {
    header.querySelectorAll('.zz-mega-panel[data-panel]').forEach(p => {
      p.classList.remove('is-active');
      p.setAttribute('aria-hidden', 'true');
    });
    header.querySelectorAll('.zz-nav-trigger[data-mega]').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      t.closest('.zz-nav-item')?.classList.remove('is-active');
    });
    overlay?.classList.remove('is-visible');
    header.classList.remove('zz-header--open');
    activeMegaId = null;
  }

  function _megaDeactivate(id) {
    const panel   = header.querySelector(`.zz-mega-panel[data-panel="${id}"]`);
    const trigger = header.querySelector(`.zz-nav-trigger[data-mega="${id}"]`);
    panel?.classList.remove('is-active');
    panel?.setAttribute('aria-hidden', 'true');
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.closest('.zz-nav-item')?.classList.remove('is-active');
  }

  /* Eventos: hover + click — delegado para suportar zonas injetadas dinamicamente */
  function _catalogUrl(params) {
    const p    = location.pathname;
    const base = p.includes('/src/pages/') ? 'catalogo.html' : 'src/pages/catalogo.html';
    return base + (params ? '?' + params : '');
  }

  function _bindMegaEvents() {
    header.querySelectorAll('.zz-nav-trigger[data-mega]').forEach(trigger => {
      const li = trigger.closest('.zz-nav-item');
      if (li._megaBound) return;
      li._megaBound = true;
      li.addEventListener('mouseenter', () => megaOpen(trigger.dataset.mega));
      li.addEventListener('mouseleave', () => megaClose(false));
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        window.location.href = _catalogUrl('zona=' + encodeURIComponent(trigger.dataset.mega));
      });
    });
    header.querySelectorAll('.zz-mega-panel[data-panel]').forEach(panel => {
      if (panel._megaBound) return;
      panel._megaBound = true;
      panel.addEventListener('mouseenter', () => clearTimeout(megaCloseTimer));
      panel.addEventListener('mouseleave', () => megaClose(false));
    });
  }

  _bindMegaEvents();
  document.addEventListener('zz:nav-zones-injected', _bindMegaEvents);

  /* ══════════════════════════════════════════════════════════
     2. PESQUISA INTELIGENTE
  ══════════════════════════════════════════════════════════ */
  const srchWrap      = document.getElementById('zz-srch');
  const srchTrigger   = document.getElementById('zz-srch-trigger');
  const srchForm      = document.getElementById('zz-srch-form');
  const srchInput     = document.getElementById('zz-srch-input');
  const srchClear     = document.getElementById('zz-srch-clear');
  const srchCancel    = document.getElementById('zz-srch-cancel');
  const srchPanel     = document.getElementById('zz-srch-panel');
  const recentList    = document.getElementById('zz-recent-list');
  const clearHistory  = document.getElementById('zz-srch-history-clear');
  const emptyMsg      = document.getElementById('zz-srch-empty');

  /* Termos sugeridos (estáticos) — clicáveis preenchem o input */
  const trendingLinks = header.querySelectorAll('.zz-srch-suggestion');

  /* Resultados dinâmicos de busca */
  const srchResultsWrap = document.getElementById('zz-srch-results-wrap');
  const srchResultList  = document.getElementById('zz-srch-result-list');
  const srchNoResults   = document.getElementById('zz-srch-no-results');
  const srchPanelInner  = document.querySelector('.zz-srch-panel-inner');

  /* LocalStorage — histórico de buscas (max 5) */
  const HISTORY_KEY = 'zz_search_history';
  let searchTimer = null;

  function historyGet() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }

  function historyAdd(term) {
    if (!term.trim()) return;
    let h = historyGet().filter(t => t.toLowerCase() !== term.toLowerCase());
    h.unshift(term.trim());
    if (h.length > 5) h = h.slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  function historyRemove(term) {
    const h = historyGet().filter(t => t !== term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    renderRecent();
  }

  function historyClear() {
    localStorage.removeItem(HISTORY_KEY);
    renderRecent();
  }

  /* Renderiza a lista de buscas recentes */
  function renderRecent() {
    if (!recentList) return;
    const history = historyGet();
    recentList.innerHTML = '';

    if (!history.length) {
      emptyMsg && (emptyMsg.hidden = false);
      return;
    }
    emptyMsg && (emptyMsg.hidden = true);

    history.forEach(term => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');

      const a = document.createElement('a');
      a.className = 'zz-srch-suggestion';
      a.href = '#';
      a.dataset.term = term;

      /* Ícone de relógio */
      a.innerHTML = `
        <svg class="zz-srch-sug-icon" viewBox="0 0 16 16" fill="none"
             stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="8" cy="8" r="6"/>
          <polyline points="8 5 8 8 10.5 10"/>
        </svg>
        <span>${_escHtml(term)}</span>
        <button type="button" class="zz-srch-remove"
                aria-label="Remover ${_escHtml(term)} do histórico">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="3" x2="13" y2="13"/>
            <line x1="13" y1="3" x2="3"  y2="13"/>
          </svg>
        </button>`;

      /* Clique no link → preenche input */
      a.addEventListener('click', e => {
        if (e.target.closest('.zz-srch-remove')) return;
        e.preventDefault();
        fillSearch(term);
      });

      /* Clique no X → remove do histórico */
      a.querySelector('.zz-srch-remove').addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        historyRemove(term);
      });

      li.appendChild(a);
      recentList.appendChild(li);
    });
  }

  function _escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* Preenche o input com um termo (sugestão ou histórico) */
  function fillSearch(term) {
    if (!srchInput) return;
    srchInput.value = term;
    _onInputChange();
    srchInput.focus();
  }

  /* Atualiza o botão X e aria conforme texto no input */
  function _onInputChange() {
    const hasText = srchInput && srchInput.value.trim().length > 0;
    if (srchClear) srchClear.hidden = !hasText;
  }

  /* Abre a pesquisa */
  function searchOpen() {
    if (!srchWrap) return;
    megaClose(true); /* fecha mega menu */

    srchWrap.classList.add('is-open');
    srchTrigger?.setAttribute('aria-expanded', 'true');
    srchInput?.setAttribute('aria-expanded', 'true');

    renderRecent();

    /* Painel de sugestões */
    srchPanel?.classList.add('is-active');
    srchPanel?.setAttribute('aria-hidden', 'false');

    overlay?.classList.add('is-visible');
    header.classList.add('zz-header--search');

    /* Foco com leve delay para aguardar a transição de expansão */
    setTimeout(() => srchInput?.focus(), 50);
  }

  /* Busca dinâmica: exibe resultados da API no painel, ocultando as colunas */
  function searchResults(q) {
    if (!srchResultsWrap) return;
    if (!q || q.length < 2) {
      srchResultsWrap.hidden = true;
      if (srchPanelInner) srchPanelInner.hidden = false;
      return;
    }
    srchResultsWrap.hidden = false;
    if (srchPanelInner) srchPanelInner.hidden = true;
    if (srchResultList) srchResultList.innerHTML = '<li class="zz-srch-empty">Buscando…</li>';
    if (srchNoResults) srchNoResults.hidden = true;

    const API = window.ZZ_API_BASE || 'http://localhost:3001/api';
    fetch(`${API}/products?q=${encodeURIComponent(q)}&limit=8`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!srchResultList) return;
        srchResultList.innerHTML = '';
        const products = data.products || [];
        if (!products.length) {
          if (srchNoResults) srchNoResults.hidden = false;
          return;
        }
        if (srchNoResults) srchNoResults.hidden = true;
        const _ri = location.pathname.indexOf('/src/');
        const _sr = _ri !== -1 ? location.pathname.substring(0, _ri + 1) : '/';
        products.forEach(p => {
          const li = document.createElement('li');
          li.setAttribute('role', 'option');
          const a  = document.createElement('a');
          a.className = 'zz-srch-result-item';
          a.href = `${_sr}src/pages/produto.html?slug=${encodeURIComponent(p.slug || p._id)}`;
          const price = p.preco != null
            ? 'R$ ' + Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '';
          a.innerHTML =
            `<span class="zz-srch-result-name">${_escHtml(p.titulo)}</span>` +
            (price ? `<span class="zz-srch-result-price">${_escHtml(price)}</span>` : '');
          a.addEventListener('click', () => { historyAdd(q); searchClose(); });
          li.appendChild(a);
          srchResultList.appendChild(li);
        });
      })
      .catch(() => {
        if (srchResultList) srchResultList.innerHTML = '';
        if (srchNoResults) srchNoResults.hidden = false;
      });
  }

  /* Fecha a pesquisa */
  function searchClose() {
    if (!srchWrap || !srchWrap.classList.contains('is-open')) return;

    srchWrap.classList.remove('is-open');
    srchTrigger?.setAttribute('aria-expanded', 'false');
    srchInput?.setAttribute('aria-expanded', 'false');

    srchPanel?.classList.remove('is-active');
    srchPanel?.setAttribute('aria-hidden', 'true');

    /* Só remove overlay se mega menu também estiver fechado */
    if (!activeMegaId) overlay?.classList.remove('is-visible');
    header.classList.remove('zz-header--search');

    /* Restaura o painel padrão ao fechar */
    clearTimeout(searchTimer);
    if (srchResultsWrap) srchResultsWrap.hidden = true;
    if (srchPanelInner) srchPanelInner.hidden = false;
  }

  /* Submissão: salva no histórico e navega para a página de resultados */
  srchForm?.addEventListener('submit', e => {
    e.preventDefault();
    const term = srchInput?.value.trim();
    if (!term) return;
    historyAdd(term);
    searchClose();
    const idx  = location.pathname.indexOf('/src/');
    const root = idx !== -1 ? location.pathname.substring(0, idx + 1) : '/';
    location.href = `${root}src/pages/catalogo.html?q=${encodeURIComponent(term)}`;
  });

  /* Eventos de controle */
  srchTrigger?.addEventListener('click', e => {
    e.stopPropagation();
    srchWrap.classList.contains('is-open') ? searchClose() : searchOpen();
  });

  srchInput?.addEventListener('input', () => {
    _onInputChange();
    const q = srchInput.value.trim();
    clearTimeout(searchTimer);
    if (!q) { searchResults(''); return; }
    searchTimer = setTimeout(() => searchResults(q), 380);
  });

  srchClear?.addEventListener('click', () => {
    if (srchInput) { srchInput.value = ''; srchInput.focus(); }
    _onInputChange();
    searchResults(''); /* programmatic .value = '' não dispara o evento input */
  });

  srchCancel?.addEventListener('click', () => searchClose());

  clearHistory?.addEventListener('click', () => historyClear());

  /* Preenche ao clicar numa sugestão estática (tendências) */
  trendingLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      fillSearch(a.dataset.term || a.textContent.trim());
    });
  });

  /* Mantém painel aberto ao hover nele */
  srchPanel?.addEventListener('mouseenter', () => {/* nada — não fecha ao entrar */ });

  /* ══════════════════════════════════════════════════════════
     3. CARRINHO
  ══════════════════════════════════════════════════════════ */
  const cartBtn      = document.getElementById('zz-cart-btn');
  const cartBadge    = document.getElementById('zz-cart-badge');
  const cartDrawer   = document.getElementById('zz-cart-drawer');
  const cartOverlay  = document.getElementById('zz-cart-overlay');
  const cartCloseBtn = document.getElementById('zz-cart-drawer-close');
  const cartList     = document.getElementById('zz-cart-drawer-list');
  const cartEmpty    = document.getElementById('zz-cart-drawer-empty');
  const cartTotal    = document.getElementById('zz-cart-drawer-total');
  const cartDrCount  = document.getElementById('zz-cart-drawer-count');

  const CART_KEY  = 'zz_cart';
  let cartItems   = [];
  let cartCount   = 0;

  /* Persiste itens no localStorage */
  function cartSave() {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }

  /* Atualiza badge visual */
  function cartUpdate(n) {
    cartCount = Math.max(0, n);
    if (!cartBadge) return;

    cartBadge.textContent = cartCount > 99 ? '99+' : String(cartCount);

    if (cartCount > 0) {
      cartBadge.classList.add('is-visible');
    } else {
      cartBadge.classList.remove('is-visible');
    }

    cartBtn?.setAttribute('aria-label',
      `Carrinho de compras, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`);
  }

  /* Carrega estado salvo do localStorage na inicialização */
  function cartLoad() {
    try { cartItems = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { cartItems = []; }
    cartUpdate(cartItems.reduce((s, i) => s + (i.qty || 1), 0));
  }

  /* Pulso: remove e re-adiciona a classe para re-disparar a animation */
  function cartPulse() {
    if (!cartBadge) return;
    cartBadge.classList.remove('pulse');
    void cartBadge.offsetWidth; /* reflow forçado */
    cartBadge.classList.add('pulse');
    cartBadge.addEventListener('animationend', () => {
      cartBadge.classList.remove('pulse');
    }, { once: true });
  }

  /* API pública do carrinho — exposta globalmente */
  window.ZZCart = {
    /*
     * add(n)       → incrementa o badge em n unidades (compatibilidade retroativa)
     * add(product) → { id, name, price, size, color, qty, img }
     *                Acumula itens por chave id+size+color e persiste em localStorage
     */
    add(payload = 1) {
      if (typeof payload === 'number') {
        cartUpdate(cartCount + payload);
        cartPulse();
        return;
      }
      const qty = Math.max(1, parseInt(payload.qty) || 1);
      const key = `${payload.id}__${payload.size || ''}__${payload.color || ''}`;
      const existing = cartItems.find(
        i => `${i.id}__${i.size || ''}__${i.color || ''}` === key
      );
      if (existing) {
        existing.qty += qty;
      } else {
        cartItems.push({ ...payload, qty });
      }
      cartSave();
      cartUpdate(cartItems.reduce((s, i) => s + i.qty, 0));
      cartPulse();
      /* Re-renderiza o drawer se estiver aberto para evitar índices stale */
      if (cartDrawer?.classList.contains('is-open')) drawerRender();
    },
    remove(n = 1) { cartUpdate(cartCount - n); },
    set(n)        { cartUpdate(n); if (n > 0) cartPulse(); },
    clear()       { cartItems = []; cartSave(); cartUpdate(0); },
    get count()   { return cartCount; },
    get items()   { return [...cartItems]; },
    updateQty(idx, delta) {
      const item = cartItems[idx];
      if (!item) return;
      item.qty = Math.max(0, item.qty + delta);
      if (item.qty === 0) cartItems.splice(idx, 1);
      cartSave();
      cartUpdate(cartItems.reduce((s, i) => s + i.qty, 0));
    },
    removeAt(idx) {
      cartItems.splice(idx, 1);
      cartSave();
      cartUpdate(cartItems.reduce((s, i) => s + i.qty, 0));
    },
  };

  /* Carrega carrinho salvo ao inicializar o script */
  cartLoad();

  /* ── CUPÃO ──────────────────────────────────────────────── */
  const COUPON_KEY = 'zz_coupon';
  let _coupon = null; // { code, discount, discountType, discountValue, promoType }

  try { _coupon = JSON.parse(sessionStorage.getItem(COUPON_KEY)); } catch { _coupon = null; }

  function _couponSave() {
    if (_coupon) sessionStorage.setItem(COUPON_KEY, JSON.stringify(_coupon));
    else sessionStorage.removeItem(COUPON_KEY);
  }

  /* Injeta o HTML do cupom no footer do drawer (uma vez) */
  function _couponInject() {
    if (!cartDrawer || cartDrawer.querySelector('#zz-coupon-wrap')) return;
    const footer = cartDrawer.querySelector('.zz-cart-drawer-footer');
    if (!footer) return;
    footer.insertAdjacentHTML('afterbegin', `
<div id="zz-coupon-wrap" style="padding:.75rem 1rem .5rem;border-bottom:1px solid rgba(245,240,230,.06)">
  <div id="zz-coupon-input-row" style="display:flex;gap:.5rem">
    <input id="zz-coupon-input" type="text" placeholder="Código do cupom"
      style="flex:1;background:rgba(245,240,230,.06);border:1px solid rgba(245,240,230,.12);border-radius:4px;padding:.5rem .75rem;color:#f5f0e6;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;outline:none"
      autocomplete="off" spellcheck="false">
    <button id="zz-coupon-apply-btn" type="button"
      style="padding:.5rem .9rem;background:#DC143C;color:#fff;border:none;border-radius:4px;font-size:.75rem;font-weight:700;letter-spacing:.06em;cursor:pointer;white-space:nowrap">
      Aplicar
    </button>
  </div>
  <p id="zz-coupon-msg" style="margin:.35rem 0 0;font-size:.72rem;display:none"></p>
  <div id="zz-coupon-applied-row" style="display:none;align-items:center;gap:.5rem;margin-top:.4rem">
    <span style="font-size:.72rem;font-weight:700;letter-spacing:.08em;color:#5dc78c">
      ✔ <span id="zz-coupon-applied-code"></span>
    </span>
    <span id="zz-coupon-discount-label" style="flex:1;font-size:.72rem;color:#5dc78c"></span>
    <button id="zz-coupon-remove-btn" type="button"
      style="background:none;border:none;color:#4a4a5a;cursor:pointer;font-size:1rem;line-height:1;padding:0 .2rem"
      title="Remover cupom">×</button>
  </div>
</div>`);
  }

  function _couponUpdateUI() {
    const inputRow   = document.getElementById('zz-coupon-input-row');
    const appliedRow = document.getElementById('zz-coupon-applied-row');
    const msg        = document.getElementById('zz-coupon-msg');
    const codeEl     = document.getElementById('zz-coupon-applied-code');
    const discEl     = document.getElementById('zz-coupon-discount-label');
    if (!inputRow) return;

    if (_coupon) {
      inputRow.style.display   = 'none';
      appliedRow.style.display = 'flex';
      if (codeEl) codeEl.textContent = _coupon.code;
      if (discEl) {
        discEl.textContent = _coupon.promoType === 'bxgy'
          ? `Compre ${_coupon.buyQty} Leve ${(_coupon.buyQty || 0) + (_coupon.getQty || 0)}`
          : _coupon.discountType === 'percentage'
            ? `-${_coupon.discountValue}%`
            : `-R$ ${(_coupon.discountValue || 0).toFixed(2)}`;
      }
      if (msg) msg.style.display = 'none';
    } else {
      inputRow.style.display   = 'flex';
      appliedRow.style.display = 'none';
      const inp = document.getElementById('zz-coupon-input');
      if (inp) inp.value = '';
    }

    /* Re-renderiza o drawer para actualizar a linha de desconto */
    drawerRender();
  }

  /* Botão Aplicar */
  document.addEventListener('click', async e => {
    if (!e.target.closest('#zz-coupon-apply-btn')) return;
    const input = document.getElementById('zz-coupon-input');
    const msg   = document.getElementById('zz-coupon-msg');
    const code  = input?.value?.trim().toUpperCase();
    if (!code) return;

    const btn = document.getElementById('zz-coupon-apply-btn');
    btn.disabled    = true;
    btn.textContent = '…';
    if (msg) msg.style.display = 'none';

    try {
      const items     = window.ZZCart.items;
      const cartTotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
      const API       = window.ZZ_API_BASE || 'http://localhost:3001/api';
      const token     = window.ZZAuth?.getToken?.();
      const res = await fetch(`${API}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code, cartItems: items, cartTotal }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (msg) {
          msg.textContent  = data.error || 'Cupom inválido.';
          msg.style.cssText = 'margin:.35rem 0 0;font-size:.72rem;color:#f07080;display:block';
        }
      } else {
        _coupon = {
          code:          data.code,
          discount:      data.discount,
          discountType:  data.discountType,
          discountValue: data.discountValue,
          promoType:     data.promoType,
          buyQty:        data.buyQty,
          getQty:        data.getQty,
        };
        _couponSave();
        _couponUpdateUI();
      }
    } catch {
      if (msg) {
        msg.textContent  = 'Erro ao validar cupom.';
        msg.style.cssText = 'margin:.35rem 0 0;font-size:.72rem;color:#f07080;display:block';
      }
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Aplicar';
    }
  });

  /* Botão Remover */
  document.addEventListener('click', e => {
    if (!e.target.closest('#zz-coupon-remove-btn')) return;
    _coupon = null;
    _couponSave();
    _couponUpdateUI();
  });

  /* API pública do cupom */
  window.ZZCoupon = {
    get state()    { return _coupon; },
    get discount() { return _coupon?.discount || 0; },
    get code()     { return _coupon?.code || null; },
    clear() { _coupon = null; _couponSave(); },
  };

  function _fmtPrice(n) {
    return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* Renderiza os itens do carrinho no drawer */
  function drawerRender() {
    if (!cartList) return;
    _couponInject();
    const items = window.ZZCart.items;
    cartList.innerHTML = '';

    if (!items.length) {
      if (cartEmpty)   cartEmpty.hidden   = false;
      if (cartList)    cartList.hidden    = true;
      if (cartTotal)   cartTotal.textContent = _fmtPrice(0);
      if (cartDrCount) cartDrCount.textContent = '';
      return;
    }
    if (cartEmpty) cartEmpty.hidden = true;
    if (cartList)  cartList.hidden  = false;

    let total = 0;
    items.forEach((item, idx) => {
      total += (item.price || 0) * (item.qty || 1);
      const li = document.createElement('li');
      li.className = 'zz-cart-item';
      const meta = [item.size, item.color].filter(Boolean).join(' · ');
      li.innerHTML =
        ((item.img || item.image)
          ? `<img class="zz-cart-item-img" src="${item.img || item.image}" alt="${_escHtml(item.name || '')}" loading="lazy">`
          : '<div class="zz-cart-item-img"></div>') +
        `<div class="zz-cart-item-info">
          <p class="zz-cart-item-name">${_escHtml(item.name || 'Produto')}</p>
          ${meta ? `<p class="zz-cart-item-meta">${_escHtml(meta)}</p>` : ''}
          <div class="zz-cart-item-controls">
            <button type="button" class="zz-cart-qty-btn" data-action="dec" data-idx="${idx}" aria-label="Diminuir">−</button>
            <span class="zz-cart-qty-val">${item.qty}</span>
            <button type="button" class="zz-cart-qty-btn" data-action="inc" data-idx="${idx}" aria-label="Aumentar">+</button>
            <button type="button" class="zz-cart-item-remove" data-idx="${idx}" aria-label="Remover item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
              </svg>
            </button>
          </div>
        </div>
        <span class="zz-cart-item-price">${_escHtml(_fmtPrice((item.price || 0) * (item.qty || 1)))}</span>`;

      li.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.ZZCart.updateQty(Number(btn.dataset.idx), btn.dataset.action === 'inc' ? 1 : -1);
          drawerRender();
        });
      });
      li.querySelector('.zz-cart-item-remove')?.addEventListener('click', () => {
        window.ZZCart.removeAt(Number(li.querySelector('[data-idx]').dataset.idx));
        drawerRender();
      });

      cartList.appendChild(li);
    });

    const discount   = _coupon?.discount || 0;
    const finalTotal = Math.max(0, total - discount);

    /* Linha de desconto (injeta/remove dinamicamente) */
    const footer = cartDrawer?.querySelector('.zz-cart-drawer-footer');
    let discRow  = footer?.querySelector('#zz-discount-row');
    if (discount > 0) {
      if (!discRow && footer) {
        const totalRow = footer.querySelector('.zz-cart-drawer-total-row');
        discRow = document.createElement('div');
        discRow.id = 'zz-discount-row';
        discRow.style.cssText = 'display:flex;justify-content:space-between;padding:.35rem 1rem 0;font-size:.75rem;color:#5dc78c';
        discRow.innerHTML = `<span>Desconto (<span id="zz-discount-code"></span>)</span><span id="zz-discount-val"></span>`;
        totalRow?.before(discRow);
      }
      if (discRow) {
        const codeSpan = discRow.querySelector('#zz-discount-code');
        const valSpan  = discRow.querySelector('#zz-discount-val');
        if (codeSpan) codeSpan.textContent = _coupon.code;
        if (valSpan)  valSpan.textContent  = `-${_fmtPrice(discount)}`;
      }
    } else if (discRow) {
      discRow.remove();
    }

    if (cartTotal)   cartTotal.textContent   = _fmtPrice(finalTotal);
    if (cartDrCount) cartDrCount.textContent = `(${items.reduce((s, i) => s + i.qty, 0)})`;
  }

  function drawerOpen() {
    if (!cartDrawer) return;
    _couponInject();
    _couponUpdateUI();
    drawerRender();
    cartDrawer.classList.add('is-open');
    cartOverlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function drawerClose() {
    cartDrawer?.classList.remove('is-open');
    cartOverlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  cartCloseBtn?.addEventListener('click', drawerClose);
  cartOverlay?.addEventListener('click', drawerClose);

  /* Finalizar Compra — redireciona para checkout.html */
  cartDrawer?.addEventListener('click', e => {
    if (!e.target.closest('.zz-cart-drawer-checkout')) return;
    if (!window.ZZCart.items.length) return;

    drawerClose();
    location.href = location.pathname.includes('/src/pages/')
      ? 'checkout.html'
      : 'src/pages/checkout.html';
  });

  cartBtn?.addEventListener('click', e => {
    e.stopPropagation();
    cartDrawer?.classList.contains('is-open') ? drawerClose() : drawerOpen();
  });

  /* ══════════════════════════════════════════════════════════
     4. FECHAMENTO GLOBAL
  ══════════════════════════════════════════════════════════ */

  /* Click no overlay */
  overlay?.addEventListener('click', () => {
    megaClose(true);
    searchClose();
  });

  /* Click fora do header */
  document.addEventListener('click', e => {
    if (!header.contains(e.target)) {
      megaClose(true);
      searchClose();
    }
  });

  /* Escape fecha tudo */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      megaClose(true);
      searchClose();
      drawerClose();
    }
  });

  /* Auth modal: fecha tudo */
  new MutationObserver(() => {
    if (document.body.classList.contains('auth-modal-open')) {
      megaClose(true);
      searchClose();
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

})();

/* ── Drop Mega Menu — carrega drop activo e drops anteriores ── */
(async function () {
  const colAtual = document.getElementById('mega-drop-atual');
  const colPrev  = document.getElementById('mega-prev-drops');
  if (!colAtual && !colPrev) return;

  const API = window.ZZ_API_BASE || 'https://zenith-zone-api.onrender.com/api';
  const isSrcPages = location.pathname.includes('/src/pages/');
  const catBase    = isSrcPages ? 'catalogo.html' : 'src/pages/catalogo.html';
  const dropLink   = isSrcPages ? '../../index.html#drop' : '#drop';
  const newsLink   = isSrcPages ? '../../index.html#newsletter' : '#newsletter';

  try {
    /* Carrega em paralelo: settings + produtos drop */
    const [settings, prodData] = await Promise.all([
      fetch(`${API}/site-settings`).then(r => r.json()),
      fetch(`${API}/products?dropExclusivo=true&limit=100`).then(r => r.json()).catch(() => ({ products: [] })),
    ]);

    /* ── Col 1: Drop Atual ── */
    if (colAtual) {
      if (settings.dropActive && settings.dropTitle) {
        const dateStr = settings.dropDate
          ? new Date(settings.dropDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
          : '';
        colAtual.innerHTML = `
          <p class="zz-mega-col-title">Drop Atual</p>
          <a href="${catBase}?zona=lancamentos" class="zz-mega-highlight" style="margin-bottom:.4rem;display:flex;flex-direction:column;gap:.25rem">
            <span style="font-size:var(--text-xs);color:rgba(245,240,230,.5)">Em lançamento</span>
            <span style="color:var(--color-pink);font-family:var(--font-head);font-weight:900;font-size:var(--text-lg)">${settings.dropTitle}</span>
          </a>
          ${dateStr ? `<p style="font-size:var(--text-xs);color:rgba(245,240,230,.42);margin-bottom:.6rem">${dateStr}</p>` : ''}
          <span class="zz-mega-badge red">Disponível Agora</span>
          <a href="${dropLink}" class="zz-col-cta" style="margin-top:.9rem">Ver Countdown
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2 6 10 6"/><polyline points="6 2 10 6 6 10"/></svg>
          </a>`;
      } else {
        colAtual.innerHTML = `
          <p class="zz-mega-col-title">Próximo Drop</p>
          <p style="font-size:var(--text-xs);color:rgba(245,240,230,.4);margin-bottom:.75rem">Nenhum drop activo de momento.</p>
          <a href="${newsLink}" class="zz-col-cta">Entrar na Lista VIP
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2 6 10 6"/><polyline points="6 2 10 6 6 10"/></svg>
          </a>`;
      }
    }

    /* ── Col 2: Drops Anteriores (agrupados por coleção) ── */
    if (colPrev) {
      const prods   = prodData.products || [];
      /* Agrupa por coleção → extrai drops distintos */
      const cols    = [...new Set(prods.map(p => p.colecao).filter(Boolean))];
      /* Exclui a coleção do drop activo actual */
      const current = settings.dropActive ? settings.dropTitle : null;

      /* Tenta também identificar pelo título do drop nas coleções */
      const previous = cols.filter(c => !current || c.toLowerCase() !== current.toLowerCase());

      if (previous.length) {
        colPrev.innerHTML = `
          <p class="zz-mega-col-title">Drops Anteriores</p>
          <ul>
            ${previous.slice(0, 5).map(c =>
              `<li><a href="${catBase}?colecao=${encodeURIComponent(c)}" class="zz-mega-link">${c}</a></li>`
            ).join('')}
            <li style="margin-top:.5rem"><a href="${catBase}?zona=lancamentos" class="zz-mega-link" style="color:var(--color-red)">Ver todos →</a></li>
          </ul>`;
      } else {
        colPrev.innerHTML = `
          <p class="zz-mega-col-title">Drops Anteriores</p>
          <p style="font-size:var(--text-xs);color:rgba(245,240,230,.4);margin-bottom:.75rem">Sem drops anteriores registados.</p>
          <a href="${newsLink}" class="zz-col-cta">Entrar na Lista VIP
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2 6 10 6"/><polyline points="6 2 10 6 6 10"/></svg>
          </a>`;
      }
    }
  } catch { /* falha silenciosa */ }
})();
