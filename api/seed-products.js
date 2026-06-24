#!/usr/bin/env node
'use strict';
/**
 * seed-products.js
 * Apaga todos os produtos existentes e cria 200 produtos de exemplo
 * com fotos reais do Unsplash (sem copyright) e estoque correto.
 *
 * Uso:
 *   node api/seed-products.js
 */

const mongoose = require('mongoose');
const Product  = require('./models/Product');

const MONGO_URI = 'mongodb+srv://vitordsousa_db_user:5ziSa9ccBOnblSAF@cluster0.6idfq0y.mongodb.net/zenith-zone?retryWrites=true&w=majority&appName=Cluster0';

/* ── Helpers ───────────────────────────────────────────────── */
function colorSlug(nome) {
  return (nome || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sem-nome';
}

function pick(arr, n = 1) {
  const a = [...arr].sort(() => Math.random() - 0.5);
  return n === 1 ? a[0] : a.slice(0, n);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genPrice(min, max) {
  const steps = Math.floor((max - min) / 10);
  return parseFloat((min + Math.floor(Math.random() * (steps + 1)) * 10).toFixed(2));
}

/* ── URLs de foto (Unsplash — licença gratuita) ─────────────
   Formato: /photo-{id}?w=600&h=800&fit=crop&q=80&auto=format
   Pools separados por tipo de peça para realismo visual.
────────────────────────────────────────────────────────── */
const UNS = 'https://images.unsplash.com/photo-';
const Q   = '?w=600&h=800&fit=crop&q=80&auto=format';
const img  = id => `${UNS}${id}${Q}`;

const FOTOS_POOL = {
  camiseta: [
    img('1521572163474-6864f9cf17ab'), // white tee on rack
    img('1576566588028-4147f3842f27'), // person wearing tee
    img('1503341504253-dff4815485f1'), // casual street tee
    img('1618354691373-d851c5c3a990'), // oversized tee model
    img('1562157873-818bc0726f68'),    // white tee flatlay
    img('1515886657613-9f3515b0c78f'), // fashion model full body
    img('1544441893-675973e31985'),    // outdoor fashion
    img('1539109136881-3be0616acf4b'), // fashion portrait
    img('1602810318383-e386cc2a3ccf'), // black tee model
    img('1523381210434-271e8329d49e'), // tshirt worn
  ],
  moletom: [
    img('1556821840-3a63f15732ce'),    // black hoodie model
    img('1509942774463-acf339cf87d5'), // grey hoodie person
    img('1604644401890-0bd678c83788'), // white hoodie close
    img('1620799140408-edc6dcb6d633'), // folded hoodie flatlay
    img('1614093302611-8efc20f73b8c'), // colored hoodie street
    img('1586363104862-3a5e2ab60d99'), // knit texture close up
    img('1611312449408-fcece27cdbb7'), // dark hoodie urban
    img('1508214751196-bcfd4ca60f91'), // hoodie side
  ],
  calca: [
    img('1542272604-787c3835535d'),    // dark cargo pants
    img('1624378439575-d8705ad7ae80'), // cargo pants worn
    img('1598522325074-042db73aa4e6'), // pants detail side
    img('1473966968600-fa4cbed523f4'), // legs in dark jeans
    img('1542291026-7eec264c27ff'),    // sneakers + pants street
    img('1499914485622-a88fac536970'), // jeans close
    img('1591369822096-ffc1d2041994'), // cargo pants model
  ],
  jaqueta: [
    img('1551028719-00167b16eac5'),    // jacket on model
    img('1591047139829-d91aecb6caea'), // bomber jacket street
    img('1548126032-079a0fb0099d'),    // leather jacket
    img('1611312449408-fcece27cdbb7'), // urban jacket
    img('1520975661595-6c4cf23d9638'), // jacket back
    img('1503342217505-b0a15ec3261c'), // jacket outdoor
    img('1535914254981-b5012eebbd07'), // dark jacket flatlay
  ],
  bone: [
    img('1588850561407-ed78c282e89b'), // cap on surface
    img('1521369909029-2afed882baee'), // person wearing cap
    img('1575428652377-a2d80e2277fc'), // black snapback
    img('1552346154-21d32810aba3'),    // cap close side
    img('1620799140408-edc6dcb6d633'), // headwear flatlay
  ],
  bag: [
    img('1553062407-98eeb64c6a62'),    // backpack on shoulder
    img('1622560480654-d96214fdc887'), // backpack urban worn
    img('1548036328-c9fa89d128fa'),    // tote bag white
    img('1584917865442-de89df76afd3'), // shoulder bag held
    img('1491553895911-0055eca6402d'), // bag flatlay
  ],
  meias: [
    img('1586350977771-b3b0abd50c82'), // colorful socks flatlay
    img('1522661067559-16145f5bf76b'), // fashion socks worn
    img('1543163521-1bf539c55dd2'),    // socks on floor
    img('1584302179602-e4c3d3f5c27b'), // socks close up
  ],
  vestido: [
    img('1572804013309-59a88b7e92f1'), // midi dress worn
    img('1496747611176-843222e1e57c'), // fashion dress outdoor
    img('1515372039744-b8f02a3ae446'), // mini dress model
    img('1539109136881-3be0616acf4b'), // fashion portrait
    img('1519415943484-9fa1873496d4'), // dress urban
    img('1583744446771-3e9562b3bed4'), // streetwear fem
  ],
  short: [
    img('1562572159-4efd90baebfe'),    // shorts worn urban
    img('1623113562225-0b4c0b2d83ab'), // denim shorts detail
    img('1503342217505-b0a15ec3261c'), // outdoor casual shorts
    img('1544441893-675973e31985'),    // fashion shorts model
    img('1601924994987-17c0ce91c0cf'), // athletic shorts
  ],
  bolsa: [
    img('1548036328-c9fa89d128fa'),    // handbag white
    img('1584917865442-de89df76afd3'), // handbag black held
    img('1491553895911-0055eca6402d'), // crossbody close
    img('1622560480654-d96214fdc887'), // urban bag worn
    img('1553062407-98eeb64c6a62'),    // shoulder bag street
  ],
};

/* ── Catálogo (IDs do seed padrão do admin-panel) ─────────── */
const CAT = {
  masc_cam:  { zonaId: 'masculino', categoriaId: 'c-roup-m', subcategoriaId: 's-cam-m'  },
  masc_mol:  { zonaId: 'masculino', categoriaId: 'c-roup-m', subcategoriaId: 's-mol-m'  },
  masc_cal:  { zonaId: 'masculino', categoriaId: 'c-roup-m', subcategoriaId: 's-cal-m'  },
  masc_jak:  { zonaId: 'masculino', categoriaId: 'c-roup-m', subcategoriaId: 's-jak-m'  },
  masc_bon:  { zonaId: 'masculino', categoriaId: 'c-aces-m', subcategoriaId: 's-bon-m'  },
  masc_bag:  { zonaId: 'masculino', categoriaId: 'c-aces-m', subcategoriaId: 's-bag-m'  },
  masc_mei:  { zonaId: 'masculino', categoriaId: 'c-aces-m', subcategoriaId: 's-mei-m'  },
  fem_cam:   { zonaId: 'feminino',  categoriaId: 'c-roup-f', subcategoriaId: 's-cam-f'  },
  fem_vest:  { zonaId: 'feminino',  categoriaId: 'c-roup-f', subcategoriaId: 's-vest-f' },
  fem_sho:   { zonaId: 'feminino',  categoriaId: 'c-roup-f', subcategoriaId: 's-sho-f'  },
  fem_mei:   { zonaId: 'feminino',  categoriaId: 'c-aces-f', subcategoriaId: 's-mei-f'  },
  fem_bol:   { zonaId: 'feminino',  categoriaId: 'c-aces-f', subcategoriaId: 's-bol-f'  },
};

/* ── Paleta de cores ───────────────────────────────────────── */
const CORES_POOL = [
  { hex: '#0d0d0d', nome: 'Preto Onix'    },
  { hex: '#f0eeea', nome: 'Branco Gelo'   },
  { hex: '#6b6b6b', nome: 'Cinza Fumaça'  },
  { hex: '#dc143c', nome: 'Crimson Red'   },
  { hex: '#07091a', nome: 'Azul Navy'     },
  { hex: '#8b00ff', nome: 'Roxo Neon'     },
  { hex: '#556b2f', nome: 'Verde Oliva'   },
  { hex: '#d4601a', nome: 'Laranja Fade'  },
  { hex: '#ff1b6b', nome: 'Rosa Zenith'   },
  { hex: '#ffd700', nome: 'Amarelo Tokyo' },
  { hex: '#c8702a', nome: 'Caramelo'      },
  { hex: '#4a90d9', nome: 'Azul Ice'      },
  { hex: '#2d2d2d', nome: 'Grafite'       },
  { hex: '#1a1a2e', nome: 'Midnight Blue' },
  { hex: '#e8e0d5', nome: 'Off-White'     },
];

/* ── Nomes temáticos ───────────────────────────────────────── */
const COLLECTIONS = [
  'Kage', 'Ryu', 'Hoshi', 'Mugen', 'Yami',
  'Hikari', 'Shiro', 'Kuroi', 'Tsuki', 'Kumo',
  'Kawa', 'Sora', 'Umi', 'Yuki', 'Kami',
  'Oni', 'Kaze', 'Hi', 'Mizu', 'Tsuchi',
];

const STYLES = [
  'Oversized', 'Slim', 'Boxy', 'Drop Shoulder', 'Vintage',
  'Washed', 'Raw Edge', 'Distressed', 'Acid', 'Pigment',
  'Logo', 'Graphic', 'Minimal', 'Heavy', 'Tech',
  'Urban', 'Street', 'Core', 'Elite', 'Premium',
];

/* ── Especificações por tipo de produto ────────────────────── */
const SPECS = {
  camiseta: [
    { label: 'Tecido',     valor: '100% algodão 280g/m²'   },
    { label: 'Caimento',   valor: 'Oversized / unissex'    },
    { label: 'Lavagem',    valor: 'Máquina até 30°C'       },
  ],
  moletom: [
    { label: 'Tecido',     valor: 'Fleece 320g/m²'         },
    { label: 'Interior',   valor: 'Pelúcia soft'           },
    { label: 'Lavagem',    valor: 'Máquina até 30°C'       },
  ],
  calca: [
    { label: 'Tecido',     valor: 'Sarja 98% algodão'      },
    { label: 'Cintura',    valor: 'Elástico com cadarço'   },
    { label: 'Lavagem',    valor: 'Máquina até 30°C'       },
  ],
  jaqueta: [
    { label: 'Exterior',   valor: 'Nylon ripstop'          },
    { label: 'Forro',      valor: '100% poliéster'         },
    { label: 'Lavagem',    valor: 'Lavar à mão'            },
  ],
  bone: [
    { label: 'Estrutura',  valor: '6 painéis'              },
    { label: 'Aba',        valor: 'Curva pré-moldada'      },
    { label: 'Ajuste',     valor: 'Snapback'               },
  ],
  bag: [
    { label: 'Material',   valor: 'Lona 600D'              },
    { label: 'Volume',     valor: '20L'                    },
    { label: 'Alças',      valor: 'Duplas com reforço'     },
  ],
  meias: [
    { label: 'Composição', valor: '80% algodão penteado'   },
    { label: 'Altura',     valor: 'Cano médio'             },
    { label: 'Unidades',   valor: 'Kit com 3 pares'        },
  ],
  vestido: [
    { label: 'Tecido',     valor: 'Crepe de malha'         },
    { label: 'Comprimento',valor: 'Mini / midi'            },
    { label: 'Lavagem',    valor: 'Máquina até 30°C'       },
  ],
  short: [
    { label: 'Tecido',     valor: '100% algodão'           },
    { label: 'Cintura',    valor: 'Elástico com cordão'    },
    { label: 'Comprimento',valor: 'Médio'                  },
  ],
  bolsa: [
    { label: 'Material',   valor: 'PU couro vegano'        },
    { label: 'Tamanho',    valor: '30cm × 20cm × 10cm'    },
    { label: 'Alça',       valor: 'Ajustável e removível'  },
  ],
};

/* ── Descrições ────────────────────────────────────────────── */
const DESCS = {
  camiseta: (col, sty) => `Camiseta streetwear premium da coleção ${col}. Corte ${sty} com acabamento silk screen de alta resolução. Ideal para compor looks urbanos autênticos.`,
  moletom:  (col, sty) => `Moletom da coleção ${col} com interior em fleece macio. Estilo ${sty} desenvolvido para o streetwear moderno. Costura reforçada e acabamento premium.`,
  calca:    (col, sty) => `Calça cargo da coleção ${col}. Corte ${sty} com bolsos laterais e cintura ajustável. Peça versátil para o cotidiano urbano.`,
  jaqueta:  (col, sty) => `Jaqueta da coleção ${col} com acabamento ${sty}. Tecido impermeável ripstop com costuras seladas. Peça icônica da ZZ.`,
  bone:     (col)      => `Boné six-panel da coleção ${col}. Bordado frontal em relevo com logo ZZ. Aba curva pré-moldada. Ajuste snapback.`,
  bag:      (col)      => `Bag urban da coleção ${col}. Lona resistente com zíper YKK e alças reforçadas. Compartimento principal + bolso frontal.`,
  meias:    (col)      => `Pack com 3 pares de meias da coleção ${col}. Algodão penteado com logo ZZ bordado no cano. Conforto diário com estilo.`,
  vestido:  (col, sty) => `Vestido streetwear da coleção ${col}. Silhueta ${sty} com tecido fluido e caimento perfeito. Para quem não abre mão do estilo.`,
  short:    (col, sty) => `Short da coleção ${col}. Corte ${sty} com cintura elástica e bolsos funcionais. Para os dias quentes com atitude.`,
  bolsa:    (col)      => `Bolsa crossbody da coleção ${col} em couro vegano. Design minimalista com hardware metálico dourado. Alça ajustável inclusa.`,
};

/* ── Gerador de estoque por grade (P M G GG XGG) ───────────
   estoque[colorSlug][tamanho] = { qtd, largura, comprimento, manga }
────────────────────────────────────────────────────────── */
const GRADE_SIZES = ['P', 'M', 'G', 'GG', 'XGG'];

function buildEstoqueGrade(cores) {
  const estoque = {};
  cores.forEach(cor => {
    const slug = colorSlug(cor.nome);
    estoque[slug] = {};
    GRADE_SIZES.forEach(size => {
      estoque[slug][size] = {
        qtd:         randInt(3, 40),
        largura:     0,
        comprimento: 0,
        manga:       0,
      };
    });
  });
  return estoque;
}

/* ── Gerador de estoque UN (acessórios sem grade) ───────────
   estoque[colorSlug][UN] = { qtd, largura, comprimento, manga }
────────────────────────────────────────────────────────── */
function buildEstoqueUN(cores) {
  const estoque = {};
  cores.forEach(cor => {
    const slug = colorSlug(cor.nome);
    estoque[slug] = {
      UN: {
        qtd:         randInt(10, 60),
        largura:     0,
        comprimento: 0,
        manga:       0,
      },
    };
  });
  return estoque;
}

/* ── Reconstrói variacoes[] a partir de estoque + cores ────
   Espelha a lógica de Product.rebuildVariacoesFromEstoque.
   isPausado = true quando qtd === 0.
────────────────────────────────────────────────────────── */
function buildVariacoes(cores, estoque) {
  const variacoes = [];
  cores.forEach(cor => {
    const slug      = colorSlug(cor.nome);
    const colorData = estoque[slug] || {};
    Object.entries(colorData).forEach(([tamanho, sizeData]) => {
      const qty = Number(sizeData?.qtd) || 0;
      variacoes.push({
        cor:       cor.nome,
        tamanho,
        estoque:   qty,
        isPausado: qty === 0,
      });
    });
  });
  return variacoes;
}

/* ── Fotos por categoria ─────────────────────────────────────
   Escolhe 1 foto para frente, 1 para costas, 1 para detalhe
   a partir do pool da categoria, sem repetir na mesma peça.
────────────────────────────────────────────────────────── */
function buildFotos(especKey) {
  const pool    = FOTOS_POOL[especKey] || FOTOS_POOL.camiseta;
  const chosen  = pick(pool, Math.min(3, pool.length));
  return {
    frente:  chosen[0] ? [chosen[0]] : [],
    costas:  chosen[1] ? [chosen[1]] : [],
    detalhe: chosen[2] ? [chosen[2]] : [],
    patch:   [],
  };
}

/* ── Grupos de produtos ────────────────────────────────────── */
const GROUPS = [
  { key: 'masc_cam',  count: 35, prefixo: 'Camiseta',    especKey: 'camiseta', descFn: DESCS.camiseta, priceMin: 149, priceMax: 299, parcelas: 3, tipo: 'grade' },
  { key: 'masc_mol',  count: 20, prefixo: 'Moletom',     especKey: 'moletom',  descFn: DESCS.moletom,  priceMin: 249, priceMax: 449, parcelas: 4, tipo: 'grade' },
  { key: 'masc_cal',  count: 15, prefixo: 'Calça Cargo', especKey: 'calca',    descFn: DESCS.calca,    priceMin: 229, priceMax: 399, parcelas: 4, tipo: 'grade' },
  { key: 'masc_jak',  count: 15, prefixo: 'Jaqueta',     especKey: 'jaqueta',  descFn: DESCS.jaqueta,  priceMin: 349, priceMax: 599, parcelas: 6, tipo: 'grade' },
  { key: 'masc_bon',  count: 10, prefixo: 'Boné',        especKey: 'bone',     descFn: DESCS.bone,     priceMin:  89, priceMax: 159, parcelas: 2, tipo: 'un'    },
  { key: 'masc_bag',  count: 10, prefixo: 'Bag',         especKey: 'bag',      descFn: DESCS.bag,      priceMin: 149, priceMax: 299, parcelas: 3, tipo: 'un'    },
  { key: 'masc_mei',  count: 10, prefixo: 'Pack Meias',  especKey: 'meias',    descFn: DESCS.meias,    priceMin:  39, priceMax:  79, parcelas: 1, tipo: 'un'    },
  { key: 'fem_cam',   count: 20, prefixo: 'Top',         especKey: 'camiseta', descFn: DESCS.camiseta, priceMin: 149, priceMax: 269, parcelas: 3, tipo: 'grade' },
  { key: 'fem_vest',  count: 20, prefixo: 'Vestido',     especKey: 'vestido',  descFn: DESCS.vestido,  priceMin: 199, priceMax: 399, parcelas: 4, tipo: 'grade' },
  { key: 'fem_sho',   count: 15, prefixo: 'Short',       especKey: 'short',    descFn: DESCS.short,    priceMin: 129, priceMax: 229, parcelas: 2, tipo: 'grade' },
  { key: 'fem_mei',   count: 10, prefixo: 'Meias Fem.',  especKey: 'meias',    descFn: DESCS.meias,    priceMin:  39, priceMax:  79, parcelas: 1, tipo: 'un'    },
  { key: 'fem_bol',   count: 20, prefixo: 'Bolsa',       especKey: 'bolsa',    descFn: DESCS.bolsa,    priceMin: 199, priceMax: 449, parcelas: 4, tipo: 'un'    },
];

/* ── Geração dos documentos ────────────────────────────────── */
function buildProducts() {
  const products = [];

  /* 400 combinações col×style — todas únicas */
  const combos = [];
  for (const col of COLLECTIONS) {
    for (const sty of STYLES) {
      combos.push({ col, sty });
    }
  }

  let skuSeq = 1;

  /* Cada grupo pega os primeiros N combos. O prefixo difere entre grupos,
     portanto "Camiseta Kage Oversized" ≠ "Moletom Kage Oversized". */
  for (const group of GROUPS) {
    const cat  = CAT[group.key];
    const slcs = combos.slice(0, group.count);

    slcs.forEach(({ col, sty }) => {
      const titulo = `${group.prefixo} ${col} ${sty}`.slice(0, 60).trim();
      const cores  = pick(CORES_POOL, randInt(2, 4));

      const estoque  = group.tipo === 'grade'
        ? buildEstoqueGrade(cores)
        : buildEstoqueUN(cores);

      const variacoes = buildVariacoes(cores, estoque);

      const sku = `ZZ-${group.key.toUpperCase().replace('_', '-')}-${String(skuSeq).padStart(3, '0')}`;
      skuSeq++;

      /* Descritivos que aceitam 1 ou 2 arg (acessórios não têm estilo) */
      const SIMPLE = ['bone', 'bag', 'meias', 'bolsa'];
      const descArgs = SIMPLE.includes(group.especKey) ? [col] : [col, sty];

      products.push({
        titulo,
        tituloJP:  `${col} ${['camiseta','moletom','calca','jaqueta'].includes(group.especKey) ? 'ウェア' : 'アイテム'}`,
        preco:     genPrice(group.priceMin, group.priceMax),
        parcelas:  group.parcelas,
        descricao: group.descFn(...descArgs),
        especificacoes: SPECS[group.especKey],
        cores,
        fotos:     buildFotos(group.especKey),
        estoque,
        variacoes,
        logistica: {
          sku,
          ean:       '',
          peso:      parseFloat((randInt(2, 15) / 10).toFixed(1)),
          dimensoes: { altura: 3, largura: randInt(25, 40), comprimento: randInt(30, 50) },
        },
        status:         'publicado',
        zonaId:         cat.zonaId,
        categoriaId:    cat.categoriaId,
        subcategoriaId: cat.subcategoriaId,
        modelo:         sty,
        colecao:        col,
      });
    });
  }

  return products;
}

/* ── Main ──────────────────────────────────────────────────── */
async function main() {
  console.log('Conectando ao MongoDB Atlas…');
  await mongoose.connect(MONGO_URI);
  console.log('Conectado.\n');

  /* 1. Apaga tudo */
  const { deletedCount } = await Product.deleteMany({});
  console.log(`Apagados ${deletedCount} produto(s) existentes.\n`);

  /* 2. Gera os 200 documentos */
  const docs = buildProducts();
  console.log(`Gerando ${docs.length} produtos com fotos + estoque…\n`);

  /* 3. Insere um a um para ativar pre-validate (geração automática de slug) */
  let ok = 0, fail = 0;
  for (const doc of docs) {
    try {
      await Product.create(doc);
      ok++;
      process.stdout.write(`\r  ✓ ${ok}/${docs.length} — ${doc.titulo.slice(0, 40)}`);
    } catch (err) {
      fail++;
      const msg = err.code === 11000
        ? `Duplicado: "${doc.titulo}"`
        : err.message;
      console.error(`\n  [ERRO] ${msg}`);
    }
  }

  /* Resumo */
  console.log(`\n\n─────────────────────────────────────`);
  console.log(`  Criados : ${ok}`);
  console.log(`  Falhas  : ${fail}`);
  console.log(`  Total   : ${docs.length}`);
  console.log(`─────────────────────────────────────`);
  console.log('Estoque por variação: P M G GG XGG (grade) ou UN (acessórios)');
  console.log('Fotos   : Unsplash (licença gratuita)');
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('Desconectado. Seed concluído.');
}

main().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
