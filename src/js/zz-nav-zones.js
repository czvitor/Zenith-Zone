/* ==========================================================
   ZENITH ZONE — zz-nav-zones.js
   Injeção de Zonas Dinâmicas na Navbar (módulo compartilhado)

   DEVE ser carregado ANTES de navbar.js em todas as páginas,
   pois navbar.js faz querySelectorAll dos triggers no load.
   ========================================================== */

;(function zzNavZones() {
  'use strict';

  const CATALOG_KEY = 'ZZ_CATALOG';
  const DYN_ATTR    = 'data-zz-zone';   /* marca elementos injetados dinamicamente */

  /* ── Seed canônico — idêntico ao _CATALOG_SEED do admin-panel ── */
  const SEED = {
    zones: [
      { id:'ofertas',     nome:'Ofertas',     slug:'ofertas',     fixo:true,  fixPos:0, navbar:true  },
      { id:'lancamentos', nome:'Lançamentos',  slug:'lancamentos', fixo:true,  fixPos:1, navbar:true  },
      { id:'masculino',   nome:'Masculino',    slug:'masculino',   fixo:false, navbar:true  },
      { id:'feminino',    nome:'Feminino',     slug:'feminino',    fixo:false, navbar:true  },
      { id:'infantil',    nome:'Infantil',     slug:'infantil',    fixo:false, navbar:false },
    ],
    cats: [
      { id:'c-dest-of',  nome:'Destaques',   slug:'destaques',   zonaId:'ofertas'     },
      { id:'c-sale',     nome:'Sale',         slug:'sale',        zonaId:'ofertas'     },
      { id:'c-new-lan',  nome:'Novidades',    slug:'novidades',   zonaId:'lancamentos' },
      { id:'c-drop',     nome:'Drops',        slug:'drops',       zonaId:'lancamentos' },
      { id:'c-roup-m',   nome:'Roupas',       slug:'roupas',      zonaId:'masculino'   },
      { id:'c-aces-m',   nome:'Acessórios',   slug:'acessorios',  zonaId:'masculino'   },
      { id:'c-foot-m',   nome:'Footwear',     slug:'footwear',    zonaId:'masculino'   },
      { id:'c-roup-f',   nome:'Roupas',       slug:'roupas',      zonaId:'feminino'    },
      { id:'c-aces-f',   nome:'Acessórios',   slug:'acessorios',  zonaId:'feminino'    },
      { id:'c-roup-i',   nome:'Roupas',       slug:'roupas',      zonaId:'infantil'    },
    ],
    subs: [
      { id:'s-cam-m',  nome:'Camisetas',  slug:'camisetas', catId:'c-roup-m' },
      { id:'s-mol-m',  nome:'Moletons',   slug:'moletons',  catId:'c-roup-m' },
      { id:'s-cal-m',  nome:'Calças',     slug:'calcas',    catId:'c-roup-m' },
      { id:'s-jak-m',  nome:'Jaquetas',   slug:'jaquetas',  catId:'c-roup-m' },
      { id:'s-bon-m',  nome:'Bonés',      slug:'bones',     catId:'c-aces-m' },
      { id:'s-bag-m',  nome:'Bags',       slug:'bags',      catId:'c-aces-m' },
      { id:'s-mei-m',  nome:'Meias',      slug:'meias',     catId:'c-aces-m' },
      { id:'s-cam-f',  nome:'Camisetas',  slug:'camisetas', catId:'c-roup-f' },
      { id:'s-vest-f', nome:'Vestidos',   slug:'vestidos',  catId:'c-roup-f' },
      { id:'s-sho-f',  nome:'Shorts',     slug:'shorts',    catId:'c-roup-f' },
      { id:'s-mei-f',  nome:'Meias',      slug:'meias',     catId:'c-aces-f' },
      { id:'s-bol-f',  nome:'Bolsas',     slug:'bolsas',    catId:'c-aces-f' },
      { id:'s-cam-i',  nome:'Camisetas',  slug:'camisetas', catId:'c-roup-i' },
    ],
  };

  /* ── Leitura do localStorage com fallback para o seed ── */
  function loadCatalog() {
    try {
      const raw = localStorage.getItem(CATALOG_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.zones) && Array.isArray(p.cats) && Array.isArray(p.subs)) return p;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(SEED));
  }

  /* ── Resolve href do catálogo relativo à página atual ── */
  function catalogHref(params) {
    const p    = location.pathname;
    const base = p.includes('/src/pages/') ? 'catalogo.html' : 'src/pages/catalogo.html';
    return base + (params ? '?' + params : '');
  }

  function _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const CHEVRON =
    '<svg class="zz-trigger-chevron" viewBox="0 0 12 12" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<polyline points="2 4 6 8 10 4"/></svg>';

  /* ── Função principal de injeção ── */
  function inject() {
    const header  = document.getElementById('zz-header');
    const navList = header?.querySelector('.zz-nav-list');
    if (!header || !navList) return;

    /* Remove elementos já injetados por rodadas anteriores (cross-tab re-sync) */
    header.querySelectorAll('[' + DYN_ATTR + ']').forEach(function(el) { el.remove(); });

    var _ref = loadCatalog();
    var zones = _ref.zones, cats = _ref.cats, subs = _ref.subs;

    /* Zonas dinâmicas: não-fixas com navbar habilitado */
    var dynamicZones = zones.filter(function(z) { return !z.fixo && z.navbar; });
    if (!dynamicZones.length) return;

    var sep            = navList.querySelector('.zz-nav-sep') &&
                         navList.querySelector('.zz-nav-sep').closest('li');
    var lastFixedPanel = document.getElementById('mega-lancamentos');
    var insertAfter    = lastFixedPanel;

    dynamicZones.forEach(function(zone) {
      /* ── Trigger na nav list ── */
      var li = document.createElement('li');
      li.className = 'zz-nav-item zz-has-mega';
      li.setAttribute('role', 'none');
      li.setAttribute(DYN_ATTR, zone.slug);
      li.innerHTML =
        '<button class="zz-nav-trigger" data-mega="' + _esc(zone.slug) + '"' +
        ' role="menuitem" aria-haspopup="true" aria-expanded="false"' +
        ' aria-controls="mega-' + _esc(zone.slug) + '">' +
        _esc(zone.nome) + CHEVRON + '</button>';

      if (sep) navList.insertBefore(li, sep);
      else     navList.appendChild(li);

      /* ── Mega panel com uma coluna por categoria ── */
      var zoneCats = cats.filter(function(c) { return c.zonaId === zone.id; });

      var colsHtml = zoneCats.map(function(cat) {
        var catSubs = subs.filter(function(s) { return s.catId === cat.id; });
        var catHref = catalogHref('zona=' + encodeURIComponent(zone.slug) + '&categoria=' + encodeURIComponent(cat.id));
        var links = catSubs.length
          ? catSubs.map(function(s) {
              var href = catalogHref('zona=' + encodeURIComponent(zone.slug) + '&categoria=' + encodeURIComponent(cat.id) + '&subcategoria=' + encodeURIComponent(s.id));
              return '<li><a href="' + href + '" class="zz-mega-link">' + _esc(s.nome) + '</a></li>';
            }).join('')
          : '<li><a href="' + catHref + '" class="zz-mega-link">Ver tudo</a></li>';
        return '<div class="zz-mega-col"><a class="zz-mega-col-title" href="' + catHref + '">' + _esc(cat.nome) + '</a><ul>' + links + '</ul></div>';
      }).join('') ||
        '<div class="zz-mega-col"><a class="zz-mega-col-title" href="' + catalogHref('zona=' + encodeURIComponent(zone.slug)) + '">' + _esc(zone.nome) + '</a>' +
        '<ul><li><a href="' + catalogHref('zona=' + encodeURIComponent(zone.slug)) + '" class="zz-mega-link">Ver tudo</a></li></ul></div>';

      var panel = document.createElement('div');
      panel.className       = 'zz-mega-panel';
      panel.id              = 'mega-' + zone.slug;
      panel.dataset.panel   = zone.slug;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', 'Mega menu ' + _esc(zone.nome));
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute(DYN_ATTR, zone.slug);
      panel.innerHTML = '<div class="zz-mega-inner">' + colsHtml + '</div><div class="zz-mega-glow-bar"></div>';

      if (insertAfter) { insertAfter.after(panel); insertAfter = panel; }
      else             { header.appendChild(panel); insertAfter = panel; }
    });
  }

  /* Executa sempre imediatamente — script no fim do body, DOM já parseado */
  inject();
  document.dispatchEvent(new CustomEvent('zz:nav-zones-injected'));

  /* ── Sincronização cross-tab em tempo real ── */
  window.addEventListener('storage', function(e) {
    if (e.key === CATALOG_KEY) {
      inject();
      document.dispatchEvent(new CustomEvent('zz:nav-zones-injected'));
    }
  });

})();
