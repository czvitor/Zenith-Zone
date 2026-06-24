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
let _sakuraCanvas = null;
let _sakuraCtx    = null;
const _PETALS     = [];
const PETAL_COUNT = 48;

const SAKURA_COLORS = [
  'rgba(220,20,60,VAL)',
  'rgba(255,27,107,VAL)',
  'rgba(245,200,210,VAL)',
  'rgba(200,20,60,VAL)',
];

function _petalColor(alpha) {
  const c = SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)];
  return c.replace('VAL', alpha.toFixed(2));
}

function _createPetal(w, h, fromTop = false) {
  return {
    x:       Math.random() * w * 1.3,
    y:       fromTop ? -10 - Math.random() * 80 : Math.random() * h,
    size:    2.5 + Math.random() * 5.5,
    speedY:  0.6 + Math.random() * 1.2,    /* queda vertical */
    speedX: -(0.8 + Math.random() * 1.8),  /* vento forte para a esquerda */
    rot:     Math.random() * Math.PI * 2,
    rotSpd:  (Math.random() - 0.5) * 0.06,
    sway:    Math.random() * Math.PI * 2,
    swaySpd: 0.01 + Math.random() * 0.025,
    swayAmp: 0.3 + Math.random() * 0.5,
    scaleX:  1,                             /* giro 3D (scaleX varia) */
    scaleSpd:(Math.random() > 0.5 ? 1 : -1) * (0.008 + Math.random() * 0.012),
    alpha:   0.3 + Math.random() * 0.65,
    color:   _petalColor(1),
    layer:   0.4 + Math.random() * 0.6,    /* parallax: 0.4=fundo, 1=frente */
  };
}

function _initSakura() {
  _sakuraCanvas = document.getElementById('sakura-canvas');
  if (!_sakuraCanvas) return;

  _sakuraCtx = _sakuraCanvas.getContext('2d');
  const { offsetWidth: w, offsetHeight: h } = _sakuraCanvas.parentElement;
  _sakuraCanvas.width  = w;
  _sakuraCanvas.height = h;

  _PETALS.length = 0;
  for (let i = 0; i < PETAL_COUNT; i++) {
    _PETALS.push(_createPetal(w, h, false));
  }

  requestAnimationFrame(() => _sakuraCanvas.classList.add('visible'));
}

function _drawPetal(ctx, p) {
  ctx.save();
  ctx.globalAlpha = p.alpha * p.layer;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.scaleX, 1);

  /* Forma pétala: elipse com extremidade pontiaguda */
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();

  /* Brilho central */
  ctx.globalAlpha = p.alpha * p.layer * 0.4;
  ctx.beginPath();
  ctx.ellipse(0, -p.size * 0.2, p.size * 0.18, p.size * 0.45, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,200,220,0.7)';
  ctx.fill();

  ctx.restore();
}

function _sakuraLoop() {
  if (!_sakuraCtx || !_sakuraCanvas) return;

  const w = _sakuraCanvas.width;
  const h = _sakuraCanvas.height;

  _sakuraCtx.clearRect(0, 0, w, h);

  for (const p of _PETALS) {
    /* Física */
    p.sway  += p.swaySpd;
    p.x     += p.speedX * p.layer + Math.sin(p.sway) * p.swayAmp;
    p.y     += p.speedY * p.layer;
    p.rot   += p.rotSpd;
    p.scaleX = Math.sin(Date.now() * p.scaleSpd * 0.5 + p.sway);

    /* Reciclagem: sai pela esquerda ou pelo fundo */
    if (p.x < -20 || p.y > h + 20) {
      Object.assign(p, _createPetal(w, h, true));
      p.x = p.x > w * 0.5 ? w + Math.random() * 60 : Math.random() * w * 1.2;
    }

    _drawPetal(_sakuraCtx, p);
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
  _PETALS.length = 0;
}

/* Redimensiona canvas se a janela mudar */
window.addEventListener('resize', () => {
  if (!_sakuraCanvas || !_sakuraCanvas.classList.contains('visible')) return;
  const p = _sakuraCanvas.parentElement;
  _sakuraCanvas.width  = p.offsetWidth;
  _sakuraCanvas.height = p.offsetHeight;
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
    const API = window.ZZ_API_BASE || 'http://localhost:3001/api';
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

    /* HTML do leque */
    const fanHTML = allPhotos.map(f => `
      <div class="dpb-fan-card" role="button" tabindex="0" aria-label="Ver foto: ${f.label}">
        <img src="${f.src}" alt="${f.label}" loading="lazy" draggable="false">
        <span class="dpb-fan-label">${f.label}</span>
      </div>`).join('');

    /* Render principal */
    bannerWrap.innerHTML = `
      <div class="dpb-arena">
        <!-- Pétalas sakura -->
        <canvas id="sakura-canvas"></canvas>

        <!-- Visual: anel + leque + card principal -->
        <div class="dpb-visual">
          <div class="dpb-ring"></div>
          <div class="dpb-ring-mask"></div>
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

    /* Leque: clique troca imagem principal com fade */
    bannerWrap.querySelectorAll('.dpb-fan-card').forEach(card => {
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
    const API = window.ZZ_API_BASE || 'http://localhost:3001/api';
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
