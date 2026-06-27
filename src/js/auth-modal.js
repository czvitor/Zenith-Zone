/* =============================================================
   ZENITH ZONE — Auth Modal Engine  v3
   Modal integrado ao index.html.
   Depende de: auth.js (ZZAuth), auth-v2.css
   ============================================================= */

;(function () {

  /* ── CONFIG ─────────────────────────────────────────────── */
  const TRANS_MS = 420;

  /*
   Mapa de direções de transição (conforme especificação):
   Login→Signup  : Esquerda→Direita  (login sai DIR, signup entra ESQ)
   Signup→Login  : Direita→Esquerda  (signup sai ESQ, login entra DIR)
   *→Forgot      : Baixo→Cima        (atual sai CIMA, forgot entra BAIXO)
   Forgot→*      : Cima→Baixo        (forgot sai BAIXO, destino entra CIMA)
  */
  const DIR = {
    'login→signup':  { fromExit: [100, 0],  toEntry: [-100, 0]  },
    'signup→login':  { fromExit: [-100, 0], toEntry: [100, 0]   },
    'login→forgot':  { fromExit: [0, -100], toEntry: [0, 100]   },
    'signup→forgot': { fromExit: [0, -100], toEntry: [0, 100]   },
    'forgot→login':  { fromExit: [0, 100],  toEntry: [0, -100]  },
    'forgot→signup': { fromExit: [0, 100],  toEntry: [0, -100]  },
  };

  /* ── ESTADO ──────────────────────────────────────────────── */
  let currentPanel   = null;
  let isAnimating    = false;
  let closeTimeoutId = null;

  /* Pétalas — declaradas aqui (escopo do módulo) para que
     openAuthModal e closeAuthModal possam resetá-las mesmo
     se o canvas não existir (evita ReferenceError) */
  let burstFrames = 0;
  let burstPetals = [];

  /* ── DOM ─────────────────────────────────────────────────── */
  const modalWrap  = document.getElementById('auth-modal-wrap');
  const slashLayer = document.getElementById('auth-slash-layer');
  const panelsWrap = document.getElementById('auth-panels-wrap');

  /* Guard: página sem HTML do modal (produto.html, busca.html, pedidos.html…)
     openAuthModal e closeAuthModal ficam indefinidos → navbar.js usa redirect fallback */
  if (!modalWrap) return;

  function $p(id)  { return document.getElementById(`auth-panel-${id}`); }
  function $el(id) { return document.getElementById(id); }

  /* ── HELPER: limpa todos os painéis para estado neutro ───── */
  function resetPanels() {
    ['login', 'signup', 'forgot'].forEach(id => {
      const p = $p(id);
      p.className     = 'panel';
      p.style.cssText = '';
    });
    isAnimating = false;
  }

  /* ── ABRIR MODAL ──────────────────────────────────────────── */
  window.openAuthModal = function (startPanel) {
    startPanel = startPanel || 'login';

    /*
      Bug de fechar+abrir rápido:
      Se closeAuthModal() disparou um setTimeout de limpeza que ainda
      não executou, cancelamos agora — senão ele limparia o painel
      que acabamos de ativar, deixando o modal sem conteúdo.
    */
    if (closeTimeoutId !== null) {
      clearTimeout(closeTimeoutId);
      closeTimeoutId = null;
    }

    /* Garante estado limpo (caso venha de uma transição interrompida) */
    resetPanels();

    /* Ativa o painel inicial */
    $p(startPanel).classList.add('is-active');
    currentPanel = startPanel;

    /* Reset de pétalas: evita acúmulo entre aberturas */
    burstPetals = [];
    burstFrames = 0;

    /* Reset do estado interno do painel Forgot (campo + alertas + botão) */
    const fEmail  = $el('am-f-email');
    const fSubmit = $el('am-forgot-submit');
    if (fEmail)  { fEmail.value = ''; fEmail.disabled = false; }
    if (fSubmit) { fSubmit.textContent = 'Enviar Link'; fSubmit.disabled = false; }
    $el('am-forgot-alert-err').hidden = true;
    $el('am-forgot-alert-ok').hidden  = true;
    $el('am-f-email-err').textContent = '';

    /* Exibe modal + bloqueia scroll + desfoca o nav */
    modalWrap.classList.add('visible');
    document.body.classList.add('auth-modal-open');
    document.body.style.overflow = 'hidden';
  };

  /* ── FECHAR MODAL ────────────────────────────────────────── */
  window.closeAuthModal = function () {
    modalWrap.classList.remove('visible');
    document.body.classList.remove('auth-modal-open');
    document.body.style.overflow = '';

    /*
      Limpeza com delay (para não cortar a animação de saída do modal).
      Guardamos o ID para poder cancelar se o modal for reaberto antes
      dos 430ms — isso previne o bug de "modal aberto sem conteúdo".
    */
    closeTimeoutId = setTimeout(() => {
      resetPanels();
      currentPanel   = null;
      closeTimeoutId = null;
      /* Limpa pétalas de burst que sobraram */
      burstPetals = [];
      burstFrames = 0;
    }, 430);
  };

  /* ── NAVEGAÇÃO ENTRE PAINÉIS ─────────────────────────────── */
  function navigate(to) {
    if (!to || to === currentPanel || isAnimating) return;
    const key = `${currentPanel}→${to}`;
    const dir = DIR[key];
    if (!dir) return;

    isAnimating = true;
    const fromPanel = $p(currentPanel);
    const toPanel   = $p(to);
    const [fex, fey] = dir.fromExit;
    const [tex, tey] = dir.toEntry;

    /*
     Sequência de transição (por que funciona sem quebrar cliques):

     1. toPanel recebe is-active → display:block + position:relative
        → panels-wrap passa a ter a altura do toPanel (natural, sem JS)
     2. fromPanel recebe is-exiting → position:absolute + pointer-events:none
        → fica sobreposto visualmente, mas NÃO intercepta cliques
     3. Animations simultâneas via transform
     4. Após animação: fromPanel volta a display:none, toPanel fica limpo
    */

    /* Posiciona toPanel fora da tela (sem transição) */
    toPanel.style.transform  = `translate(${tex}%, ${tey}%)`;
    toPanel.style.transition = 'none';

    /* Ativa toPanel (entra no fluxo → define altura do wrap) */
    toPanel.classList.add('is-active');

    /* Inicia saída do fromPanel (sai do fluxo → sobreposição absoluta) */
    fromPanel.classList.add('is-exiting');
    fromPanel.style.transform  = 'translate(0%, 0%)';
    fromPanel.style.transition = 'none';

    /* Efeito katana */
    triggerKatana();

    /* Força reflow para aplicar estado inicial antes de animar */
    void fromPanel.offsetHeight;

    /* Dispara animações simultâneas */
    const ease = `transform ${TRANS_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    fromPanel.style.transition = ease;
    toPanel.style.transition   = ease;
    fromPanel.style.transform  = `translate(${fex}%, ${fey}%)`;
    toPanel.style.transform    = 'translate(0%, 0%)';

    /* Limpeza */
    setTimeout(() => {
      fromPanel.className  = 'panel';
      fromPanel.style.cssText = '';
      toPanel.style.cssText   = '';
      currentPanel = to;
      isAnimating  = false;
    }, TRANS_MS + 50);
  }

  /* ── EFEITO KATANA SLASH ─────────────────────────────────── */
  function triggerKatana() {
    slashLayer.innerHTML = '';

    /* Flash radial de impacto */
    const glow = document.createElement('div');
    glow.className = 'slash-glow';
    slashLayer.appendChild(glow);
    glow.addEventListener('animationend', () => glow.remove(), { once: true });

    /* 3 linhas de corte escalonadas */
    [28, 52, 74].forEach((sx, i) => {
      const el = document.createElement('div');
      el.className = i === 1 ? 'slash-el eco' : 'slash-el';
      el.style.setProperty('--sx', sx + '%');
      el.style.setProperty('--delay', (i * 0.065) + 's');
      slashLayer.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    });

    if (typeof sakuraBurst === 'function') sakuraBurst();
  }

  /* ── BINDINGS: ABRIR / FECHAR ────────────────────────────── */
  $el('auth-modal-close').addEventListener('click', closeAuthModal);

  modalWrap.addEventListener('click', e => {
    if (e.target === modalWrap) closeAuthModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalWrap.classList.contains('visible')) closeAuthModal();
  });

  document.querySelectorAll('[data-open-auth]').forEach(el =>
    el.addEventListener('click', e => {
      e.preventDefault();
      openAuthModal(el.dataset.openAuth || 'login');
    })
  );

  /* ── BINDINGS: NAVEGAR ───────────────────────────────────── */
  document.querySelectorAll('[data-auth-goto]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.authGoto))
  );

  /* ── HASH AUTO-ROUTE ─────────────────────────────────────── */
  const hash = location.hash.slice(1);
  if (['login', 'signup', 'forgot'].includes(hash)) {
    history.replaceState(null, '', location.pathname);
    requestAnimationFrame(() => openAuthModal(hash));
  }

  /* ── TOGGLE SENHA ────────────────────────────────────────── */
  document.querySelectorAll('.auth-toggle-pass').forEach(btn =>
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type  = inp.type === 'password' ? 'text' : 'password';
    })
  );

  /* ── FORÇA DA SENHA ──────────────────────────────────────── */
  $el('am-s-password').addEventListener('input', function () {
    const v          = this.value;
    const hasLen     = v.length >= 6;
    const hasUpper   = /[A-Z]/.test(v);
    const hasSpecial = /[@#$%!&*]/.test(v);
    $el('am-s-rule-len').classList.toggle('ok', hasLen);
    $el('am-s-rule-upper').classList.toggle('ok', hasUpper);
    $el('am-s-rule-special').classList.toggle('ok', hasSpecial);
    const score = [hasLen, hasUpper, hasSpecial].filter(Boolean).length;
    const cls   = score === 1 ? 'weak' : score === 2 ? 'medium' : score === 3 ? 'strong' : '';
    ['am-s-bar1','am-s-bar2','am-s-bar3'].forEach((id, i) => {
      const bar = $el(id);
      bar.className = 'pass-bar' + (score > i ? ` ${cls}` : '');
    });
  });

  /* ── FORM: LOGIN ─────────────────────────────────────────── */
  const loginAlert  = $el('am-login-alert');
  const loginSubmit = $el('am-login-submit');

  $el('am-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    loginAlert.hidden = true;
    $el('am-login-email-err').textContent = '';
    $el('am-login-pass-err').textContent  = '';

    const emailVal = $el('am-login-email').value.trim();
    const passVal  = $el('am-login-pass').value;
    let ok = true;
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      $el('am-login-email-err').textContent = 'Informe um e-mail válido.'; ok = false;
    }
    if (!passVal) { $el('am-login-pass-err').textContent = 'Campo obrigatório.'; ok = false; }
    if (!ok) return;

    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Entrando…';
    try {
      await ZZAuth.login(emailVal, passVal);
      closeAuthModal();
      ZZAuth.updateNavUI();
      window.dispatchEvent(new Event('zz:auth:login'));
    } catch (err) {
      loginAlert.textContent = err.error || 'Usuário ou senha incorretos.';
      loginAlert.hidden = false;
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Entrar';
    }
  });

  /* ── FORM: SIGNUP ────────────────────────────────────────── */
  const signupAlert  = $el('am-signup-alert');
  const signupSubmit = $el('am-signup-submit');

  function sErr(f, msg) {
    const e = $el(`am-s-${f}-err`); const i = $el(`am-s-${f}`);
    if (e) e.textContent = msg;
    if (i) i.classList.add('invalid');
  }
  function sClear() {
    signupAlert.hidden = true;
    ['firstName','lastName','email','password','confirm'].forEach(f => {
      const e = $el(`am-s-${f}-err`); const i = $el(`am-s-${f}`);
      if (e) e.textContent = ''; if (i) i.classList.remove('invalid');
    });
  }

  $el('am-signup-form').addEventListener('submit', async e => {
    e.preventDefault(); sClear();
    const firstName = $el('am-s-firstName').value.trim();
    const lastName  = $el('am-s-lastName').value.trim();
    const email     = $el('am-s-email').value.trim();
    const password  = $el('am-s-password').value;
    const confirm   = $el('am-s-confirm').value;

    let valid = true;
    if (!firstName)  { sErr('firstName', 'Nome é obrigatório.'); valid = false; }
    if (!lastName)   { sErr('lastName',  'Sobrenome é obrigatório.'); valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { sErr('email', 'E-mail inválido.'); valid = false; }
    const pe = ZZAuth.validatePassword(password);
    if (pe.length) { sErr('password', pe[0]); valid = false; }
    if (password !== confirm) { sErr('confirm', 'As senhas não coincidem.'); valid = false; }
    if (!valid) return;

    signupSubmit.disabled = true; signupSubmit.textContent = 'Criando conta…';
    try {
      await ZZAuth.register({ firstName, lastName, email, password });
      signupAlert.textContent = 'Conta criada! Bem-vindo(a) à Zenith Zone.';
      signupAlert.className   = 'auth-alert success';
      signupAlert.hidden = false;
      setTimeout(() => { closeAuthModal(); ZZAuth.updateNavUI(); window.dispatchEvent(new Event('zz:auth:register')); }, 1400);
    } catch (err) {
      if (err.errors) { err.errors.forEach(e => { const f = e.path||e.param; if(f) sErr(f,e.msg); }); }
      else { signupAlert.textContent = err.error||'Erro ao criar conta.'; signupAlert.className='auth-alert error'; signupAlert.hidden=false; }
      signupSubmit.disabled = false; signupSubmit.textContent = 'Criar Conta';
    }
  });

  /* ── FORM: FORGOT ────────────────────────────────────────── */
  const forgotErrAlert = $el('am-forgot-alert-err');
  const forgotOkAlert  = $el('am-forgot-alert-ok');
  const forgotSubmit   = $el('am-forgot-submit');

  $el('am-forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    forgotErrAlert.hidden = forgotOkAlert.hidden = true;
    $el('am-f-email-err').textContent = '';
    const email = $el('am-f-email').value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $el('am-f-email-err').textContent = 'Informe um e-mail válido.'; return;
    }
    forgotSubmit.disabled = true; forgotSubmit.textContent = 'Enviando…';
    try {
      const data = await ZZAuth.forgotPassword(email);
      forgotOkAlert.textContent = data.message;
      forgotOkAlert.hidden = false;
      /* Desativa o campo e muda o botão (que agora fica no footer fixo) */
      $el('am-f-email').disabled = true;
      forgotSubmit.textContent   = 'Link Enviado ✓';
    } catch (err) {
      forgotErrAlert.textContent = err.error||'Erro ao processar solicitação.';
      forgotErrAlert.hidden = false;
      forgotSubmit.disabled = false; forgotSubmit.textContent = 'Enviar Link';
    }
  });

  /* ══════════════════════════════════════════════════════════
     CANVAS: PÉTALAS DE SAKURA
     Movimento diagonal DIREITA → ESQUERDA (vento soprando)
     Canvas está dentro do modal-wrap (z-index:0, atrás do card)
     ══════════════════════════════════════════════════════════ */
  const canvas = document.getElementById('auth-petals-canvas');
  if (!canvas) return;
  const ctx   = canvas.getContext('2d');
  const PINKS = ['#FF1B6B','#FF4D8D','#FF69A0','#E8206E','#C91560'];

  /* burstFrames e burstPetals já foram declaradas no escopo do módulo acima */

  function resizeCanvas() {
    /* modal-wrap é position:fixed inset:0 → canvas = tamanho do viewport */
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  class Petal {
    constructor(init) { this.reset(init); }

    reset(init) {
      if (init) {
        /* Inicialização: espalha aleatório pela tela */
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      } else {
        /* Novo loop: nasce fora da borda direita */
        this.x = canvas.width + 15 + Math.random() * 120;
        this.y = Math.random() * canvas.height * 1.1;
      }

      this.w = 5 + Math.random() * 9;

      /*
        Movimento diagonal direita→esquerda como vento:
        speedX negativo (forte, movimento principal)
        speedY positivo suave (queda leve)
      */
      this.speedX  = -(1.6 + Math.random() * 1.8); /* vento horizontal */
      this.speedY  = 0.35 + Math.random() * 0.75;  /* queda suave */

      /* Sway vertical (oscilação) */
      this.sway    = Math.random() * Math.PI * 2;
      this.swaySpd = 0.025 + Math.random() * 0.04;
      this.swayAmt = 0.4 + Math.random() * 0.7;    /* oscilação vertical */

      this.rot     = Math.random() * Math.PI * 2;
      this.rotV    = (Math.random() - 0.5) * 0.04;
      this.alpha   = 0.35 + Math.random() * 0.45;
      this.color   = PINKS[Math.floor(Math.random() * PINKS.length)];
    }

    update(boost) {
      this.sway += this.swaySpd * boost;

      /* Movimento principal: esquerda + queda + oscilação vertical */
      this.x   += this.speedX * boost;
      this.y   += (this.speedY + Math.sin(this.sway) * this.swayAmt) * boost;
      this.rot += this.rotV * boost;

      /* Reinicia ao sair pela borda esquerda ou inferior */
      if (this.x < -30 || this.y > canvas.height + 30) this.reset(false);
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      /* Orientação ligeiramente na diagonal (inclinada no sentido do vento) */
      ctx.rotate(this.rot + 0.4); /* +0.4 rad ≈ 23° inclinação */
      ctx.globalAlpha = this.alpha;

      const s = this.w, h = s * 2.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo( s*0.6, -h*0.14,  s*0.55, h*0.86, 0, h);
      ctx.bezierCurveTo(-s*0.55, h*0.86, -s*0.6, -h*0.14, 0, 0);
      ctx.fillStyle = this.color;
      ctx.fill();

      /* Shimmer */
      ctx.globalAlpha = this.alpha * 0.28;
      ctx.beginPath();
      ctx.ellipse(-s*0.1, h*0.28, s*0.16, h*0.4, -0.25, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.restore();
    }
  }

  const COUNT  = Math.min(55, Math.floor(window.innerWidth / 22));
  const petals = Array.from({ length: COUNT }, () => new Petal(true));

  /* Loop — só renderiza enquanto o modal estiver visível */
  ;(function loop() {
    const active = modalWrap && modalWrap.classList.contains('visible');

    if (active) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const boost = burstFrames > 0 ? 2.5 : 1;
      if (burstFrames > 0) burstFrames--;

      petals.forEach(p => { p.update(boost); p.draw(); });
      burstPetals = burstPetals.filter(p => {
        p.update(1); p.draw();
        return p.x > -50 && p.y < canvas.height + 40;
      });
    } else if (canvas.width > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(loop);
  })();

  /* Rajada disparada pelo katana — pétalas extras voam mais rápido */
  window.sakuraBurst = function () {
    burstFrames = 20;
    for (let i = 0; i < 18; i++) {
      const p     = new Petal(false);
      p.speedX    = -(3.5 + Math.random() * 3.0); /* mais veloz no vento */
      p.speedY    = (Math.random() - 0.3) * 1.2;  /* pode ir levemente para cima */
      p.x         = canvas.width * (0.3 + Math.random() * 0.7); /* nasce no meio/direita */
      p.y         = Math.random() * canvas.height;
      p.alpha     = 0.6 + Math.random() * 0.35;
      burstPetals.push(p);
    }
  };

})();
