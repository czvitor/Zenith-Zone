/* ==========================================================
   ZENITH ZONE — AVATAR SYSTEM
   28 avatares em PNG. Detecta o caminho base automaticamente
   para funcionar em index.html, pages/*.html, etc.
   Expõe ZZAvatar globalmente para todas as páginas.
   ========================================================== */

/* Calcula o caminho para /images/avatars/ relativo ao avatar.js */
const _AVATAR_PATH = (() => {
  try {
    return new URL('../images/avatars/', document.currentScript.src).href;
  } catch {
    return '../images/avatars/';
  }
})();

/* Email com avatar exclusivo (mascote) */
const _EXCLUSIVE_EMAIL = 'vitord_sousa@hotmail.com';
const _EXCLUSIVE_ID    = 'av-cz';

/* Definições de cada avatar (id + label) */
const _AVATAR_DEFS = [
  /* ── EXCLUSIVO ────────────────────────────────────────── */
  { id: 'av-cz', label: 'Mascote', exclusive: true },
  /* ── SÉRIE JAPÃO ──────────────────────────────────── */
  { id: 'av-01', label: 'Basketball'      },
  { id: 'av-02', label: 'Hannya'          },
  { id: 'av-03', label: 'Torii Hoop'      },
  { id: 'av-04', label: 'Katanas'         },
  { id: 'av-05', label: 'Koi'             },
  { id: 'av-06', label: 'Fuji'            },
  { id: 'av-07', label: 'Shuriken'        },
  { id: 'av-08', label: 'Lanterna'        },
  { id: 'av-09', label: 'Shibuya'         },
  { id: 'av-10', label: 'Skyline'         },
  { id: 'av-11', label: 'Kitsune'         },
  { id: 'av-12', label: 'Bonsai'          },
  { id: 'av-13', label: 'Tomoe'           },
  /* ── MASCOTE ──────────────────────────────────────── */
  { id: 'av-14', label: 'Ronin Rabbit'    },
  /* ── SÉRIE MISTA ──────────────────────────────────── */
  { id: 'av-15', label: 'Sakura Ball'     },
  { id: 'av-16', label: 'Kabuto'          },
  { id: 'av-17', label: 'Sakura Rabbit'   },
  { id: 'av-18', label: 'Sakura Bloom'    },
  { id: 'av-19', label: 'Pagoda'          },
  { id: 'av-20', label: 'Daruma'          },
  /* ── SÉRIE BASQUETE ───────────────────────────────── */
  { id: 'av-21', label: 'Street Hoop'     },
  { id: 'av-22', label: 'Fire Ball'       },
  { id: 'av-23', label: 'Scoreboard'      },
  { id: 'av-24', label: 'Court'           },
  { id: 'av-25', label: 'ZZ Jersey'       },
  { id: 'av-26', label: 'Ball Spin'       },
  { id: 'av-27', label: 'Whistle'         },
  { id: 'av-28', label: 'Crown Ball'      },
];

/* Monta o array completo com a tag <img> gerada dinamicamente */
const ZZ_AVATARS = _AVATAR_DEFS.map(({ id, label, exclusive }) => ({
  id,
  label,
  exclusive: !!exclusive,
  svg: `<img src="${_AVATAR_PATH}${id}.png" alt="${label}" style="display:block;width:100%;height:100%;object-fit:cover">`,
}));

/* ==========================================================
   ZZAvatar — módulo global de gerenciamento de avatares
   ========================================================== */
const ZZAvatar = (() => {

  const DEFAULT_ID = 'av-14'; // Ronin Rabbit — mascote padrão

  function _key() {
    const user = typeof ZZAuth !== 'undefined' ? ZZAuth.getUser() : null;
    return user?._id ? `zz_avatar_${user._id}` : null;
  }

  /* Retorna o ID do avatar ativo (do localStorage ou padrão) */
  function get() {
    const user = typeof ZZAuth !== 'undefined' ? ZZAuth.getUser() : null;
    if (user?.email === _EXCLUSIVE_EMAIL) return _EXCLUSIVE_ID;
    const k = _key();
    if (!k) return DEFAULT_ID;
    return localStorage.getItem(k) || DEFAULT_ID;
  }

  /* Persiste um ID de avatar no localStorage */
  function set(id) {
    const k = _key();
    if (!k) return;
    localStorage.setItem(k, id);
  }

  /* Retorna o HTML (img tag) para um ID */
  function getSVG(id) {
    return (ZZ_AVATARS.find(a => a.id === id) || ZZ_AVATARS.find(a => a.id === DEFAULT_ID)).svg;
  }

  /* Renderiza um avatar dentro de um elemento DOM */
  function render(element, id) {
    if (!element) return;
    element.innerHTML = getSVG(id || get());
  }

  /* Sincroniza todos os elementos [data-avatar] da página */
  function syncAll() {
    const id = get();
    document.querySelectorAll('[data-avatar]').forEach(el => render(el, id));
  }

  /* ALL filtra exclusivos para quem não tem direito */
  function getAll() {
    const user = typeof ZZAuth !== 'undefined' ? ZZAuth.getUser() : null;
    if (user?.email === _EXCLUSIVE_EMAIL) return ZZ_AVATARS;
    return ZZ_AVATARS.filter(a => !a.exclusive);
  }

  return { get, set, getSVG, render, syncAll, DEFAULT_ID, get ALL() { return getAll(); } };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ZZAvatar.syncAll());
} else {
  ZZAvatar.syncAll();
}
