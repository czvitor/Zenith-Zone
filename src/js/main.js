/* ==========================================================
   ZENITH ZONE — MAIN JAVASCRIPT
   ========================================================== */

/* ── HELPERS CONFIG ──────────────────────────────────────── */
function getCfg(key, def) {
  const v = localStorage.getItem(key);
  return v === null ? def : JSON.parse(v);
}

/* ── CONTROLE DE SEÇÕES PELA CONFIGURAÇÃO DO ADMIN ────────── */
function applyAdminConfig() {
  const dropActive = getCfg('zz_drop_active', true);
  const dropEl     = document.getElementById('drop');
  if (dropEl) dropEl.style.display = dropActive ? '' : 'none';

  const dropTitle = getCfg('zz_drop_title', '');
  if (dropTitle) {
    const titleEl = dropEl?.querySelector('.drop-title');
    if (titleEl) titleEl.textContent = dropTitle;
  }

  const nlActive = getCfg('zz_newsletter_active', true);
  const nlEl     = document.getElementById('newsletter');
  if (nlEl) nlEl.style.display = nlActive ? '' : 'none';

  const conActive = getCfg('zz_conceito_active', true);
  const conEl     = document.getElementById('conceito');
  if (conEl) conEl.style.display = conActive ? '' : 'none';
}
applyAdminConfig();


/* ══════════════════════════════════════════════════════════
   SAKURA CANVAS — pétalas em queda diagonal (vento lateral)
══════════════════════════════════════════════════════════ */
let _sakuraRAF    = null;
let _sakuraCanvas = null;   /* canvas interno (arena) */
let _sakuraCtx    = null;
let _sakuraBgCvs  = null;   /* canvas fixo no body (resto da página) */
let _sakuraBgCtx  = null;
const _PETALS = [];
const _PINKS  = ['#FF1B6B','#FF4D8D','#FF69A0','#E8206E','#C91560'];

function _createPetal(w, h, scatter = true) {
  return {
    x:       scatter ? Math.random() * w              : (w + 15 + Math.random() * 120),
    y:       scatter ? Math.random() * h              : Math.random() * h * 1.1,
    size:    5 + Math.random() * 9,
    speedX:  -(1.6 + Math.random() * 1.8),
    speedY:  0.35 + Math.random() * 0.75,
    sway:    Math.random() * Math.PI * 2,
    swaySpd: 0.025 + Math.random() * 0.04,
    swayAmt: 0.4 + Math.random() * 0.7,
    rot:     Math.random() * Math.PI * 2,
    rotV:    (Math.random() - 0.5) * 0.04,
    alpha:   0.35 + Math.random() * 0.45,
    color:   _PINKS[Math.floor(Math.random() * _PINKS.length)],
  };
}

function _initSakura() {
  const w = window.innerWidth, h = window.innerHeight;

  /* Canvas 1 — dentro do .dpb-arena: aparece sobre o fundo do mostruário */
  _sakuraCanvas = document.getElementById('sakura-canvas');
  if (_sakuraCanvas) {
    _sakuraCtx = _sakuraCanvas.getContext('2d');
    const rect = _sakuraCanvas.parentElement.getBoundingClientRect();
    _sakuraCanvas.style.top    = `${-rect.top}px`;
    _sakuraCanvas.style.left   = `${-rect.left}px`;
    _sakuraCanvas.style.width  = `${w}px`;
    _sakuraCanvas.style.height = `${h}px`;
    _sakuraCanvas.width  = w;
    _sakuraCanvas.height = h;
    requestAnimationFrame(() => _sakuraCanvas.classList.add('visible'));
  }

  /* Canvas 2 — fixo no body: cobre o resto da página */
  if (!document.getElementById('sakura-bg')) {
    _sakuraBgCvs = document.createElement('canvas');
    _sakuraBgCvs.id = 'sakura-bg';
    document.body.insertBefore(_sakuraBgCvs, document.body.firstChild);
  } else {
    _sakuraBgCvs = document.getElementById('sakura-bg');
  }
  _sakuraBgCtx = _sakuraBgCvs.getContext('2d');
  _sakuraBgCvs.width  = w;
  _sakuraBgCvs.height = h;
  requestAnimationFrame(() => _sakuraBgCvs.classList.add('visible'));

  _PETALS.length = 0;
  const count = Math.min(55, Math.floor(w / 22));
  for (let i = 0; i < count; i++) {
    _PETALS.push(_createPetal(w, h, true));
  }
}

function _drawPetal(ctx, p) {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot + 0.4);

  const s = p.size, h = s * 2.9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo( s*0.6, -h*0.14,  s*0.55, h*0.86, 0, h);
  ctx.bezierCurveTo(-s*0.55, h*0.86, -s*0.6, -h*0.14, 0, 0);
  ctx.fillStyle = p.color;
  ctx.fill();

  /* Shimmer */
  ctx.globalAlpha = p.alpha * 0.28;
  ctx.beginPath();
  ctx.ellipse(-s*0.1, h*0.28, s*0.16, h*0.4, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  ctx.restore();
}

function _sakuraLoop() {
  if (!_sakuraCtx && !_sakuraBgCtx) return;

  const w = window.innerWidth, h = window.innerHeight;

  if (_sakuraCtx)   _sakuraCtx.clearRect(0, 0, w, h);
  if (_sakuraBgCtx) _sakuraBgCtx.clearRect(0, 0, w, h);

  for (const p of _PETALS) {
    p.sway += p.swaySpd;
    p.x    += p.speedX;
    p.y    += p.speedY + Math.sin(p.sway) * p.swayAmt;
    p.rot  += p.rotV;

    if (p.x < -30 || p.y > h + 30) {
      Object.assign(p, _createPetal(w, h, false));
    }

    if (_sakuraCtx)   _drawPetal(_sakuraCtx,   p);
    if (_sakuraBgCtx) _drawPetal(_sakuraBgCtx, p);
  }

  _sakuraRAF = requestAnimationFrame(_sakuraLoop);
}

function _startSakura() {
  if (_sakuraRAF) return;
  _initSakura();
  _sakuraRAF = requestAnimationFrame(_sakuraLoop);
}

function _stopSakura() {
  if (_sakuraRAF) { cancelAnimationFrame(_sakuraRAF); _sakuraRAF = null; }
  if (_sakuraCanvas) { _sakuraCanvas.classList.remove('visible'); }
  if (_sakuraBgCvs) {
    _sakuraBgCvs.classList.remove('visible');
    const c = _sakuraBgCvs;
    setTimeout(() => { if (c.parentNode) c.parentNode.removeChild(c); }, 1100);
  }
  _sakuraCanvas = null; _sakuraCtx    = null;
  _sakuraBgCvs  = null; _sakuraBgCtx  = null;
  _PETALS.length = 0;
}

/* Redimensiona e reposiciona canvases se a janela mudar */
window.addEventListener('resize', () => {
  if (!_sakuraCanvas && !_sakuraBgCvs) return;
  const w = window.innerWidth, h = window.innerHeight;
  if (_sakuraCanvas) {
    const rect = _sakuraCanvas.parentElement?.getBoundingClientRect();
    if (rect) {
      _sakuraCanvas.style.top    = `${-rect.top}px`;
      _sakuraCanvas.style.left   = `${-rect.left}px`;
      _sakuraCanvas.style.width  = `${w}px`;
      _sakuraCanvas.style.height = `${h}px`;
    }
    _sakuraCanvas.width  = w;
    _sakuraCanvas.height = h;
  }
  if (_sakuraBgCvs) { _sakuraBgCvs.width = w; _sakuraBgCvs.height = h; }
});


/* ══════════════════════════════════════════════════════════
   EXPLOSION EVENT — disparo no exato 00:00:00
══════════════════════════════════════════════════════════ */
let _explosionFired = false;

function _triggerExplosion() {
  if (_explosionFired) return;
  _explosionFired = true;

  /* 0. Scroll suave ao topo */
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* 1. Tremor de tela */
  document.body.classList.add('vibration-shock');
  setTimeout(() => document.body.classList.remove('vibration-shock'), 600);

  /* 2. Flash radial vermelho/neon */
  const flash = document.createElement('div');
  flash.id = 'drop-flash';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });

  /* 3. Dissolve do logo → banner com pop-in */
  const logoWrap = document.getElementById('hero-logo-wrap');
  if (logoWrap) {
    logoWrap.classList.add('hero-logo-dissolve');
    logoWrap.addEventListener('animationend', () => {
      logoWrap.style.display = 'none';
      logoWrap.classList.remove('hero-logo-dissolve');
    }, { once: true });
  }
}

function _resetExplosion() {
  _explosionFired = false;
  const flash = document.getElementById('drop-flash');
  if (flash) flash.remove();
  document.body.classList.remove('vibration-shock');
}


/* ══════════════════════════════════════════════════════════
   COUNTDOWN TIMER + REVEAL
══════════════════════════════════════════════════════════ */
function pad(n) { return String(n).padStart(2, '0'); }

function getDropDate() {
  const saved = getCfg('zz_drop_date', '');
  if (saved) return new Date(saved);
  return new Date('2025-12-31T00:00:00');
}

let _dropRevealActive = false;
let _dropRevealId     = '';
let _wasEnded         = false;   /* detecta a transição running→ended */

function updateCountdown() {
  const diff  = getDropDate() - new Date();
  const ended = diff <= 0;

  const days    = ended ? 0 : Math.floor(diff / 86400000);
  const hours   = ended ? 0 : Math.floor((diff % 86400000) / 3600000);
  const minutes = ended ? 0 : Math.floor((diff % 3600000)  / 60000);
  const seconds = ended ? 0 : Math.floor((diff % 60000)    / 1000);

  const dEl = document.getElementById('cd-days');
  const hEl = document.getElementById('cd-hours');
  const mEl = document.getElementById('cd-minutes');
  const sEl = document.getElementById('cd-seconds');
  if (dEl) dEl.textContent = pad(days);
  if (hEl) hEl.textContent = pad(hours);
  if (mEl) mEl.textContent = pad(minutes);
  if (sEl) sEl.textContent = pad(seconds);

  /* Detecta a transição: passou de rodando → zerado AGORA */
  if (ended && !_wasEnded) {
    const productId = getCfg('zz_drop_product_id', '');
    const active    = getCfg('zz_drop_active', true);
    if (active && productId) _triggerExplosion();
  }
  _wasEnded = ended;

  syncDropReveal(ended);
}

function syncDropReveal(countdownEnded) {
  const dropActive = getCfg('zz_drop_active', true);
  const productId  = getCfg('zz_drop_product_id', '');
  const shouldShow = dropActive && !!productId && countdownEnded;

  if (shouldShow && (!_dropRevealActive || _dropRevealId !== productId)) {
    _dropRevealActive = true;
    _dropRevealId     = productId;
    showDropProduct(productId);
  } else if (!shouldShow && _dropRevealActive) {
    _dropRevealActive = false;
    _dropRevealId     = '';
    _resetExplosion();
    hideDropProduct();
  }
}

/* Reatividade cross-tab */
window.addEventListener('storage', e => {
  if (['zz_drop_active','zz_drop_date','zz_drop_product_id'].includes(e.key)) {
    const ended = (getDropDate() - new Date()) <= 0;
    syncDropReveal(ended);
  }
});

updateCountdown();
setInterval(updateCountdown, 1000);


/* ══════════════════════════════════════════════════════════
   SHOW DROP PRODUCT — hero de alto impacto
══════════════════════════════════════════════════════════ */
async function showDropProduct(productId) {
  const logoWrap   = document.getElementById('hero-logo-wrap');
  const bannerWrap = document.getElementById('drop-product-reveal');
  if (!logoWrap || !bannerWrap) return;

  /* Loading state */
  bannerWrap.innerHTML = `
    <div class="dpb-arena" style="min-height:280px;justify-content:center;align-items:center">
      <div style="display:flex;gap:.6rem;align-items:center">
        <div class="dpb-live-dot"></div>
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;
          font-size:.8rem;letter-spacing:.24em;text-transform:uppercase;color:#dc143c">
          Ativando Drop…
        </span>
      </div>
    </div>`;
  logoWrap.style.display   = 'none';
  bannerWrap.style.display = 'flex';

  try {
    const API = window.ZZ_API_BASE || (window.location.origin + '/api');
    const res  = await fetch(`${API}/products/${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const p    = data.product || data;

    /* Fotos por categoria */
    const mainImg   = p.fotos?.frente?.[0] || p.fotos?.costas?.[0]
                   || p.fotos?.detalhe?.[0] || '';
    const allPhotos = [
      { src: p.fotos?.frente?.[0]  || '', label: 'Frente'  },
      { src: p.fotos?.costas?.[0]  || '', label: 'Costas'  },
      { src: p.fotos?.detalhe?.[0] || '', label: 'Detalhe' },
      { src: p.fotos?.patch?.[0]   || '', label: 'Patch'   },
    ].filter(f => f.src && f.src !== mainImg).slice(0, 4);

    const price = Number(p.preco || 0).toLocaleString('pt-BR',
      { style: 'currency', currency: 'BRL' });
    const href  = `src/pages/produto.html?id=${encodeURIComponent(p.slug || p._id)}`;
    const title = (p.titulo || '').toUpperCase();

    /* HTML dos painéis holográficos */
    const _FILE_IDS = ['001','002','003','004'];
    const fanHTML = allPhotos.map((f, i) => `
      <div class="dpb-holo-panel" role="button" tabindex="0" aria-label="Ver foto: ${f.label}">
        <img src="${f.src}" alt="${f.label}" loading="lazy" draggable="false">
        <div class="dpb-holo-scan" aria-hidden="true"></div>
        <i class="dpb-corner dpb-corner-tr" aria-hidden="true"></i>
        <i class="dpb-corner dpb-corner-bl" aria-hidden="true"></i>
        <div class="dpb-holo-meta" aria-hidden="true">
          <span>F:${_FILE_IDS[i]}</span><span>${f.label.toUpperCase()}</span>
        </div>
      </div>`).join('');

    /* Render principal */
    bannerWrap.innerHTML = `
      <div class="dpb-arena">
        <!-- Pétalas sakura — posicionadas pelo JS para cobrir o viewport -->
        <canvas id="sakura-canvas"></canvas>

        <!-- Visual: anel + leque + card principal -->
        <div class="dpb-visual">
          <div class="dpb-ring"></div>
          <div class="dpb-fan-wrap">${fanHTML}</div>
          <div class="dpb-main-card" id="dpb-main-card">
            ${mainImg
              ? `<img class="dpb-main-img" id="dpb-main-img"
                      src="${mainImg}" alt="${title}" loading="eager">`
              : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#0c1030,#07091a)"></div>'}
          </div>
        </div>

        <!-- Info -->
        <div class="dpb-info">
          <div class="dpb-live-badge">
            <div class="dpb-live-dot"></div>
            <span class="dpb-live-text">Disponível Agora · 限定</span>
          </div>
          <h2 class="dpb-title glitch" data-text="${title}">${title}</h2>
          ${p.tituloJP ? `<p class="dpb-jp">${p.tituloJP}</p>` : ''}
          <p class="dpb-price">${price}</p>
          <a href="${href}" class="dpb-cta">
            Seja Exclusivo
            <svg width="15" height="15" viewBox="0 0 12 12" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="2 6 10 6"/>
              <polyline points="6 2 10 6 6 10"/>
            </svg>
          </a>
        </div>
      </div>`;

    /* Inicia pétalas após render */
    _startSakura();

    /* Hover stagger: revela painéis sequencialmente ao passar no card principal */
    (function _bindPanelHover() {
      const visual = bannerWrap.querySelector('.dpb-visual');
      const panels = [...bannerWrap.querySelectorAll('.dpb-holo-panel')];
      if (!visual || !panels.length) return;
      let hideTimer;

      function showPanels() {
        clearTimeout(hideTimer);
        if (panels[0].classList.contains('is-active')) return; // já visíveis
        panels.forEach((p, i) => {
          setTimeout(() => {
            p.classList.add('is-active', 'is-flickering');
            setTimeout(() => p.classList.remove('is-flickering'), 450);
          }, i * 130);
        });
      }
      function hidePanels() {
        hideTimer = setTimeout(() => {
          panels.forEach(p => p.classList.remove('is-active', 'is-flickering'));
        }, 280); // grace period p/ mover mouse até o painel sem sumir
      }

      visual.addEventListener('mouseenter', showPanels);
      visual.addEventListener('mouseleave', hidePanels);
      panels.forEach(p => {
        p.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        p.addEventListener('mouseleave', hidePanels);
      });
    })();

    /* Leque: clique troca imagem principal com fade */
    bannerWrap.querySelectorAll('.dpb-holo-panel').forEach(card => {
      const activate = () => {
        const fanImg = card.querySelector('img');
        const mainI  = document.getElementById('dpb-main-img');
        if (!fanImg || !mainI || fanImg.src === mainI.src) return;
        mainI.style.opacity = '0';
        setTimeout(() => {
          mainI.src = fanImg.src;
          mainI.style.opacity = '1';
        }, 200);
      };
      card.addEventListener('click',   activate);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
    });

  } catch (err) {
    console.error('[ZZ Drop Reveal]', err);
    hideDropProduct();
  }
}

function hideDropProduct() {
  _stopSakura();
  const logoWrap   = document.getElementById('hero-logo-wrap');
  const bannerWrap = document.getElementById('drop-product-reveal');
  if (logoWrap)   logoWrap.style.display   = '';
  if (bannerWrap) { bannerWrap.style.display = 'none'; bannerWrap.innerHTML = ''; }
}


/* ══════════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════════ */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ══════════════════════════════════════════════════════════
   NAV ACTIVE STATE
══════════════════════════════════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 80) current = s.id; });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current ? 'var(--color-red)' : '';
  });
}, { passive: true });


/* ══════════════════════════════════════════════════════════
   NEWSLETTER FORM
══════════════════════════════════════════════════════════ */
document.querySelector('.nl-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = e.target.querySelector('.nl-btn');
  const input = e.target.querySelector('.nl-input');
  const email = input?.value.trim();
  if (!email) return;

  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const API = window.ZZ_API_BASE || (window.location.origin + '/api');
    const res  = await fetch(`${API}/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'site' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar.');
    btn.textContent        = 'Na lista! ✓';
    btn.style.background   = 'var(--color-bg-mid)';
    input.value            = '';
    input.placeholder      = 'Você está dentro. Fique ligado.';
    input.disabled         = true;
  } catch (err) {
    btn.disabled     = false;
    btn.textContent  = prev;
    input.placeholder = err.message || 'Tente novamente.';
  }
});


/* ══════════════════════════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════════════════════════ */
const menuBtn   = document.getElementById('nav-menu-btn');
const mobileNav = document.getElementById('nav-mobile');

menuBtn?.addEventListener('click', () => {
  menuBtn.classList.toggle('open');
  mobileNav?.classList.toggle('open');
  menuBtn.setAttribute('aria-label',
    mobileNav?.classList.contains('open') ? 'Fechar menu' : 'Abrir menu');
});

mobileNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menuBtn?.classList.remove('open');
    mobileNav?.classList.remove('open');
    menuBtn?.setAttribute('aria-label', 'Abrir menu');
  });
});
