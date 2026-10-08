// ═══ 01 — Foundations ═══════════════════════════════════════════════════

const PAGES = {};          // nom logique → conteneur (page ou section)
const PHYS_OF = new Map(); // id de section logique → page physique
const GROUP_PAGES = {};    // groupe → page physique (mode compact)
let PAGE_MODE = 'full';    // 'full' : 12 pages ; 'compact' : sections sur 3 pages
let FIRST_PAGE = null;

const GROUP = { '00': 'Système', '01': 'Système', '02': 'Système', '03': 'Écrans', '04': 'Écrans', '05': 'Écrans', '06': 'Écrans', '07': 'Écrans', '08': 'Parcours et livraison', '09': 'Parcours et livraison', '10': 'Parcours et livraison', '11': 'Parcours et livraison' };

/** Combien de pages peut-on encore créer ? (offre gratuite : limité) */
function probePageCapacity(max) {
  const made = [];
  try { for (let i = 0; i < max; i++) made.push(figma.createPage()); } catch (e) { /* limite atteinte */ }
  for (const p of made) p.remove();
  return made.length;
}

/** Page logique : vraie page en mode complet, grande section sinon. */
async function newPage(name) {
  if (name === '00 — Project Overview' && FIRST_PAGE) {
    if (PAGE_MODE === 'full') { PAGES[name] = FIRST_PAGE; return FIRST_PAGE; }
  }
  if (PAGE_MODE === 'full') {
    const p = figma.createPage();
    p.name = name;
    p.setPluginData(MARK, '1');
    PAGES[name] = p;
    return p;
  }
  const g = GROUP[name.slice(0, 2)];
  let phys = GROUP_PAGES[g];
  if (!phys) {
    let reused = false;
    if (g === 'Système') phys = FIRST_PAGE;
    else {
      try { phys = figma.createPage(); } catch (e) { phys = GROUP_PAGES['Écrans'] || FIRST_PAGE; reused = true; }
    }
    if (!reused) {
      phys.name = 'CHAIR — ' + (phys === FIRST_PAGE ? 'Système' : g);
      phys.setPluginData('y', '0');
    } else {
      phys.name = phys === FIRST_PAGE ? 'CHAIR — Système, écrans et livraison' : 'CHAIR — Écrans, parcours et livraison';
    }
    phys.setPluginData(MARK, '1');
    GROUP_PAGES[g] = phys;
  }
  const sec = figma.createSection();
  sec.name = name;
  phys.appendChild(sec);
  sec.x = 0;
  sec.y = Number(phys.getPluginData('y') || '0');
  mark(sec);
  PHYS_OF.set(sec.id, phys);
  PAGES[name] = sec;
  return sec;
}
function physPage(container) { return container.type === 'PAGE' ? container : PHYS_OF.get(container.id); }
async function go(container) { await figma.setCurrentPageAsync(physPage(container)); }
/** Ajuste une section logique à son contenu et réserve la place suivante. */
function closeContainer(container) {
  if (container.type === 'PAGE') return;
  // Boîtes absolues : indépendant du repère (relatif ou non) des enfants.
  const base = container.absoluteBoundingBox;
  let w = 0, h = 0;
  for (const c of container.children) {
    const b = c.absoluteBoundingBox;
    if (!b) continue;
    w = Math.max(w, b.x + b.width - base.x);
    h = Math.max(h, b.y + b.height - base.y);
  }
  container.resizeWithoutConstraints(Math.max(w + 200, 800), Math.max(h + 200, 400));
  const phys = PHYS_OF.get(container.id);
  phys.setPluginData('y', String(container.y + container.height + 600));
}

/** Planche de documentation : grand cadre blanc, titre, sous-titre. */
function board(title, subtitle, w) {
  const b = fr(title, { dir: 'V', gap: 48, pad: [72, 80, 96, 80], w: w || 1600, bg: 'fond/surface', r: 40 });
  b.layoutSizingVertical = 'HUG';
  add(b, fr('En-tête', {
    dir: 'V', gap: 12, fillW: true, kids: [
      tx('CHAIR', 'Micro-titre', { c: 'texte/tertiaire' }),
      tx(title, 'Titre/XL'),
      subtitle ? tx(subtitle, 'Corps/M', { c: 'texte/secondaire', w: 900 }) : null,
    ],
  }));
  return b;
}
function block(title, note) {
  return fr(title, {
    dir: 'V', gap: 20, fillW: true, kids: [
      fr('Titre de bloc', {
        dir: 'V', gap: 6, fillW: true, kids: [
          tx(title, 'Titre/L'),
          note ? tx(note, 'Corps/S', { c: 'texte/secondaire', w: 1000 }) : null,
        ],
      }),
    ],
  });
}

async function buildIcons(page) {
  const wrap = fr('Icônes — composants (Lucide, utilisées dans l\'app)', { dir: 'H', gap: 16, pad: 32, w: 1440, wrap: true, bg: 'fond/surface', r: 28 });
  wrap.layoutSizingVertical = 'HUG';
  page.appendChild(wrap);
  for (const name of Object.keys(ICONS).sort()) {
    const node = figma.createNodeFromSvg(ICONS[name]);
    const comp = figma.createComponentFromNode(node);
    comp.name = 'Icône/' + name;
    comp.resize(24, 24);
    recolorIcon(comp, 'texte/principal');
    mark(comp);
    ICON[name] = comp;
    const cell = fr(name, { dir: 'V', gap: 8, w: 104, pad: [14, 6, 10, 6], align: 'center', bg: 'fond/app', r: 16 });
    add(cell, comp);
    add(cell, tx(name, 'Légende/S', { c: 'texte/secondaire', align: 'center', w: 92 }));
    add(wrap, cell);
  }
  return wrap;
}

async function buildFoundations() {
  const page = await newPage('01 — Foundations');
  await go(page);

  const icons = await buildIcons(page);

  const b = board('Foundations', 'La source de vérité visuelle de CHAIR, relevée dans le code (globals.css, lib/proStyle.ts, police Geist). Couleurs et dimensions sont des variables Figma : changer une valeur ici met à jour toute la famille, mode clair et sombre compris.');
  page.appendChild(b);

  // Identité / logos
  const logos = block('Identité — wordmarks', 'Le logo CHAIR est un wordmark typographique (ChairLogo.tsx) : Geist Bold, interlettrage serré. L\'or #f5b942 est réservé au premium (le « + » de CHAIR+), jamais en aplat ni en bouton.');
  const row = fr('Logos', { dir: 'H', gap: 24, fillW: true, wrap: true });
  const logoCard = (label, word, dark, extra) => {
    const c = fr(label, { dir: 'V', gap: 18, pad: 36, w: 330, h: 190, bg: dark ? 'sombre/fond' : 'fond/app', r: 'rayon/carte', justify: 'center', align: 'center' });
    const line = fr('Wordmark', { dir: 'H', gap: 0, align: 'base' });
    add(line, tx(word, 'Logo/L', { c: dark ? 'sombre/texte' : 'texte/principal' }));
    if (extra) add(line, tx(extra, 'Logo/L', { c: 'accent/or' }));
    add(c, line);
    add(c, tx(label, 'Légende', { c: dark ? 'neutre/400' : 'texte/secondaire' }));
    return c;
  };
  kids(row, [
    logoCard('CHAIR — client', 'CHAIR', false),
    logoCard('CHAIR PRO — coiffeurs', 'CHAIR PRO', true),
    logoCard('CHAIR BUSINESS — gérants', 'CHAIR BUSINESS', false),
    logoCard('CHAIR+ — abonnement', 'CHAIR', false, '+'),
  ]);
  add(logos, row);
  add(b, logos);

  // Couleurs
  const colors = block('Couleurs', 'Variables « CHAIR — Couleurs », deux modes (Clair par défaut, Sombre sur choix explicite). Les écrans utilisent les rôles sémantiques (fond, texte, bordure), eux-mêmes des alias de la palette.');
  const swatchRow = (title, names) => {
    const r = fr(title, { dir: 'V', gap: 12, fillW: true });
    add(r, tx(title, 'Micro-titre', { c: 'texte/tertiaire' }));
    const g = fr('Nuancier', { dir: 'H', gap: 12, fillW: true, wrap: true });
    for (const n of names) {
      const sw = fr(n, { dir: 'V', gap: 8, w: 132 });
      add(sw, fr('Pastille', { w: 132, h: 84, bg: n, r: 18, stroke: 'bordure/legere' }));
      add(sw, tx(n, 'Légende', { w: 132 }));
      const val = PALETTE[n] ? PALETTE[n][0] + ' / ' + PALETTE[n][1] : '→ ' + ALIASES[n];
      add(sw, tx(val, 'Légende/S', { c: 'texte/secondaire', w: 132 }));
      add(g, sw);
    }
    add(r, g);
    return r;
  };
  kids(colors, [
    swatchRow('Rôles sémantiques', Object.keys(ALIASES)),
    swatchRow('Neutres', Object.keys(PALETTE).filter((n) => n.startsWith('neutre/'))),
    swatchRow('Accent, statuts, surfaces', Object.keys(PALETTE).filter((n) => !n.startsWith('neutre/'))),
  ]);
  add(b, colors);

  // Typographie
  const type = block('Typographie — Geist', 'Styles de texte « CHAIR/… ». Régime de copie Apple : une ligne maximum par message, chiffres géants, micro-titres en capitales espacées.');
  for (const [name, w, size, lh] of TYPE) {
    const line = fr(name, { dir: 'H', gap: 32, fillW: true, align: 'center', pad: [10, 0], stroke: null });
    add(line, tx(name + '\n' + size + ' / ' + lh + ' · ' + FONT[w], 'Légende', { c: 'texte/secondaire', w: 220 }));
    add(line, tx(name === 'Chiffre géant' ? '4,8' : name.startsWith('Micro') ? 'Ma vitrine' : 'Le coiffeur fait pour toi.', name, { grow: true }));
    add(type, line);
  }
  add(b, type);

  // Espacements & rayons
  const sp = block('Espacements, rayons, élévations', 'Variables « CHAIR — Dimensions ». Cartes à 28, boutons et champs à 16, pilules entièrement arrondies. Deux ombres superposées, jamais une seule (contact + ambiance).');
  const spRow = fr('Espacements', { dir: 'H', gap: 20, fillW: true, align: 'end' });
  for (const [n, v] of Object.entries(SPACE)) {
    add(spRow, fr(n, { dir: 'V', gap: 8, align: 'center', kids: [fr('Barre', { w: v, h: v, bg: 'neutre/900', r: 4 }), tx(n.replace('espace/', '') + ' · ' + v + 'px', 'Légende', { c: 'texte/secondaire' })] }));
  }
  add(sp, spRow);
  const rRow = fr('Rayons', { dir: 'H', gap: 20, fillW: true });
  for (const [n, v] of Object.entries(RADIUS)) {
    add(rRow, fr(n, { dir: 'V', gap: 8, align: 'center', kids: [fr('Forme', { w: 96, h: 96, bg: 'fond/creux', r: n }), tx(n.replace('rayon/', '') + ' · ' + (v > 100 ? '∞' : v), 'Légende', { c: 'texte/secondaire' })] }));
  }
  add(sp, rRow);
  const eRow = fr('Élévations', { dir: 'H', gap: 28, fillW: true, pad: [24, 24], bg: 'fond/app', r: 28 });
  for (const n of Object.keys(ES)) {
    const dark = n === 'Sombre';
    add(eRow, fr(n, { dir: 'V', gap: 10, align: 'center', kids: [fr('Surface', { w: 150, h: 96, bg: dark ? 'sombre/fond' : 'fond/surface', r: 'rayon/carte', fx: n }), tx(n, 'Légende', { c: 'texte/secondaire' })] }));
  }
  add(sp, eRow);
  add(b, sp);

  // Grilles
  const grid = block('Grilles et formats', 'Mobile : 390 × 844 (iPhone 14/15/16), marges latérales 16, zone sûre haute 47, barre de navigation 60–66 + indicateur d\'accueil 34. Desktop PRO / BUSINESS : 1440 × 810 (16:9), barre latérale 248, contenu centré 1040 maximum.');
  add(b, grid);

  await flush();
  b.x = 100; b.y = 100;
  icons.x = 100;
  icons.y = b.y + b.height + 120;
  closeContainer(page);
  return page;
}
