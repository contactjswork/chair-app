// ═══════════════════════════════════════════════════════════════════════
// CHAIR — Générateur du système de design (plugin Figma)
// Cœur : jetons, variables, styles, helpers de construction.
// Tout ce qui est créé est natif et modifiable : variables liées, styles
// de texte et d'effet, composants à propriétés, Auto Layout partout.
// ═══════════════════════════════════════════════════════════════════════

const MARK = 'chair-ds';           // pluginData : tout ce que le plugin crée
const PENDING = [];                // appels async à attendre (styles)
const SIZING = new Map();          // intentions de taille enfant (FILL, ABS)
const V = {};                      // variables par nom
const VD = {};                     // variables sombres (offre gratuite)
let DARK_CTX = false;              // construction d'un écran sombre en cours
const TS = {};                     // styles de texte par nom
const ES = {};                     // styles d'effet par nom
const K = {};                      // composants / ensembles par nom
const ICON = {};                   // composants icônes par nom
let FONT = null;
let COLOR_COL = null;         // collection de couleurs
let DARK_MODE = null;         // identifiant du mode Sombre

function log(m) { console.log('[CHAIR] ' + m); }
function prog(m) { figma.notify(m, { timeout: 1500 }); log(m); }

// ── Couleurs ─────────────────────────────────────────────────────────────
function hex(h) {
  const s = h.replace('#', '');
  return { r: parseInt(s.slice(0, 2), 16) / 255, g: parseInt(s.slice(2, 4), 16) / 255, b: parseInt(s.slice(4, 6), 16) / 255 };
}
function solid(h, opacity) { return { type: 'SOLID', color: hex(h), opacity: opacity == null ? 1 : opacity }; }

// Palette réelle (frontend/app/globals.css + Tailwind neutral), clair/sombre.
const PALETTE = {
  'neutre/0':   ['#ffffff', '#17171a'],
  'neutre/50':  ['#fafafa', '#101013'],
  'neutre/100': ['#f5f5f5', '#1e1e22'],
  'neutre/200': ['#e5e5e5', '#2b2b30'],
  'neutre/300': ['#d4d4d4', '#43434a'],
  'neutre/400': ['#a3a3a3', '#8e8e97'],
  'neutre/500': ['#737373', '#a6a6ae'],
  'neutre/600': ['#525252', '#c4c4cb'],
  'neutre/700': ['#404040', '#dadade'],
  'neutre/800': ['#262626', '#e9e9ec'],
  'neutre/900': ['#171717', '#f6f6f7'],
  'neutre/950': ['#0a0a0a', '#ffffff'],
  'accent/or':        ['#f5b942', '#f5b942'],
  'statut/erreur':    ['#dc2626', '#f87171'],
  'statut/erreur-fond': ['#fef2f2', '#2c1214'],
  'statut/succes':    ['#16a34a', '#4ade80'],
  'statut/succes-fond': ['#f0fdf4', '#0f2517'],
  'statut/alerte':    ['#d97706', '#fbbf24'],
  'statut/alerte-fond': ['#fffbeb', '#2a2008'],
  'statut/info':      ['#2563eb', '#60a5fa'],
  'cta/fond':         ['#171717', '#26262b'],
  'cta/texte':        ['#ffffff', '#ffffff'],
  'sombre/fond':      ['#0a0a0a', '#1c1c20'],
  'sombre/texte':     ['#ffffff', '#ffffff'],
};
// Rôles sémantiques → alias vers la palette (modifier ici = tout suit).
const ALIASES = {
  'fond/app':           'neutre/50',
  'fond/surface':       'neutre/0',
  'fond/creux':         'neutre/100',
  'texte/principal':    'neutre/900',
  'texte/secondaire':   'neutre/500',
  'texte/tertiaire':    'neutre/400',
  'bordure/legere':     'neutre/100',
  'bordure/moyenne':    'neutre/200',
  'icone/inactive':     'neutre/400',
};
const RADIUS = { 'rayon/carte': 28, 'rayon/bouton': 16, 'rayon/champ': 16, 'rayon/vignette': 20, 'rayon/pilule': 999, 'rayon/petit': 12 };
const SPACE = { 'espace/1': 4, 'espace/2': 8, 'espace/3': 12, 'espace/4': 16, 'espace/5': 20, 'espace/6': 24, 'espace/8': 32, 'espace/10': 40 };

async function setupVariables() {
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
    if (c.name.startsWith('CHAIR')) c.remove();
  }
  const col = figma.variables.createVariableCollection('CHAIR — Couleurs');
  const clair = col.modes[0].modeId;
  col.renameMode(clair, 'Clair');
  // Offre Figma gratuite : un seul mode par collection. Le mode Sombre
  // devient alors une collection de référence aux mêmes noms.
  let sombre = null;
  try { sombre = col.addMode('Sombre'); } catch (e) { sombre = null; }
  COLOR_COL = col;
  DARK_MODE = sombre;
  let darkCol = null, darkMode = null;
  if (!sombre) {
    darkCol = figma.variables.createVariableCollection('CHAIR — Couleurs (référence sombre)');
    darkMode = darkCol.modes[0].modeId;
    darkCol.renameMode(darkMode, 'Sombre');
  }
  for (const [name, [l, d]] of Object.entries(PALETTE)) {
    const v = figma.variables.createVariable(name, col, 'COLOR');
    v.setValueForMode(clair, Object.assign(hex(l), { a: 1 }));
    if (sombre) v.setValueForMode(sombre, Object.assign(hex(d), { a: 1 }));
    V[name] = v;
    if (darkCol) {
      const vd = figma.variables.createVariable(name, darkCol, 'COLOR');
      vd.setValueForMode(darkMode, Object.assign(hex(d), { a: 1 }));
      VD[name] = vd;
    }
  }
  for (const [name, target] of Object.entries(ALIASES)) {
    const v = figma.variables.createVariable(name, col, 'COLOR');
    const alias = figma.variables.createVariableAlias(V[target]);
    v.setValueForMode(clair, alias);
    if (sombre) v.setValueForMode(sombre, alias);
    V[name] = v;
    if (darkCol) {
      const vd = figma.variables.createVariable(name, darkCol, 'COLOR');
      vd.setValueForMode(darkMode, figma.variables.createVariableAlias(VD[target]));
      VD[name] = vd;
    }
  }
  const dim = figma.variables.createVariableCollection('CHAIR — Dimensions');
  const m = dim.modes[0].modeId;
  dim.renameMode(m, 'Valeur');
  for (const [name, val] of Object.entries(Object.assign({}, RADIUS, SPACE))) {
    const v = figma.variables.createVariable(name, dim, 'FLOAT');
    v.setValueForMode(m, val);
    V[name] = v;
  }
}

// ── Polices : Geist (police réelle de l'app), repli Inter ────────────────
async function setupFonts() {
  const list = await figma.listAvailableFontsAsync();
  const family = list.some((f) => f.fontName.family === 'Geist') ? 'Geist' : 'Inter';
  const styles = list.filter((f) => f.fontName.family === family).map((f) => f.fontName.style);
  const pick = (c) => c.find((s) => styles.includes(s)) || styles.find((s) => /regular/i.test(s)) || styles[0];
  FONT = {
    family,
    R: pick(['Regular']),
    M: pick(['Medium']),
    SB: pick(['SemiBold', 'Semi Bold', 'Semibold']),
    B: pick(['Bold']),
    K: pick(['Black', 'ExtraBold', 'Extra Bold', 'Bold']),
  };
  for (const w of ['R', 'M', 'SB', 'B', 'K']) await figma.loadFontAsync({ family, style: FONT[w] });
  // Pour les écrans « clavier affiché » : chiffres du clavier.
  return family;
}

// ── Styles de texte : l'échelle réelle de l'app ─────────────────────────
const TYPE = [
  // nom,               poids, taille, interligne, interlettrage %, casse
  ['Chiffre géant',      'K', 52, 52, -4, null],
  ['Titre/XL',           'K', 32, 34, -3, null],
  ['Titre/L',            'K', 24, 28, -2.5, null],
  ['Titre/M',            'B', 18, 24, -2, null],
  ['Titre/S',            'B', 15, 20, -1, null],
  ['Corps/M',            'M', 14, 21, 0, null],
  ['Corps/S',            'R', 13, 19, 0, null],
  ['Corps/S fort',       'SB', 13, 19, 0, null],
  ['Légende',            'M', 12, 16, 0, null],
  ['Légende/S',          'M', 11, 14, 0, null],
  ['Micro-titre',        'B', 10, 12, 18, 'UPPER'],
  ['Nav',                'M', 10, 12, 0, null],
  ['Bouton',             'B', 15, 20, -0.5, null],
  ['Bouton/S',           'SB', 13, 16, 0, null],
  ['Logo',               'B', 18, 18, -2.5, null],
  ['Logo/L',             'B', 30, 30, -3, null],
  ['Statut iOS',         'SB', 15, 20, -1, null],
];
async function setupTextStyles() {
  for (const s of await figma.getLocalTextStylesAsync()) if (s.name.startsWith('CHAIR/')) s.remove();
  for (const [name, w, size, lh, ls, cas] of TYPE) {
    const st = figma.createTextStyle();
    st.name = 'CHAIR/' + name;
    st.fontName = { family: FONT.family, style: FONT[w] };
    st.fontSize = size;
    st.lineHeight = { unit: 'PIXELS', value: lh };
    st.letterSpacing = { unit: 'PERCENT', value: ls };
    if (cas) st.textCase = cas;
    TS[name] = st;
  }
}

// ── Styles d'effet : la double ombre CHAIR (lib/proStyle.ts) ────────────
function shadow(y, blur, spread, a, x) {
  return { type: 'DROP_SHADOW', color: { r: 10 / 255, g: 10 / 255, b: 10 / 255, a }, offset: { x: x || 0, y }, radius: blur, spread: spread || 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false };
}
async function setupEffects() {
  for (const s of await figma.getLocalEffectStylesAsync()) if (s.name.startsWith('CHAIR/')) s.remove();
  const defs = {
    'Carte':       [shadow(1, 2, 0, 0.04), shadow(10, 26, -14, 0.14)],
    'Carte appui': [shadow(1, 2, 0, 0.04), shadow(4, 12, -8, 0.12)],
    'Barre haute': [shadow(4, 20, -8, 0.08)],
    'Barre basse': [shadow(-4, 20, -6, 0.10)],
    'Sombre':      [{ type: 'INNER_SHADOW', color: { r: 1, g: 1, b: 1, a: 0.07 }, offset: { x: 0, y: 1 }, radius: 0, spread: 0, visible: true, blendMode: 'NORMAL' }, shadow(2, 4, -2, 0.4), shadow(16, 40, -18, 0.55)],
    'Flottant':    [shadow(8, 24, -6, 0.18), shadow(2, 6, 0, 0.06)],
    'Creux':       [{ type: 'INNER_SHADOW', color: { r: 10 / 255, g: 10 / 255, b: 10 / 255, a: 0.08 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0, visible: true, blendMode: 'NORMAL' }],
  };
  for (const [name, effects] of Object.entries(defs)) {
    const st = figma.createEffectStyle();
    st.name = 'CHAIR/' + name;
    st.effects = effects;
    ES[name] = st;
  }
}

// ── Helpers de construction ─────────────────────────────────────────────
function mark(n) { n.setPluginData(MARK, '1'); return n; }

function paintVar(name, opacity) {
  if (name.startsWith('#')) return solid(name, opacity);
  const v = (DARK_CTX && VD[name]) || V[name];
  if (!v) throw new Error('Variable inconnue : ' + name);
  const p = figma.variables.setBoundVariableForPaint(solid('#000000', opacity), 'color', v);
  return p;
}
function fillVar(node, name, opacity) { node.fills = name ? [paintVar(name, opacity)] : []; }
function strokeVar(node, name, w) {
  node.strokes = [paintVar(name)];
  node.strokeWeight = w || 1;
  node.strokeAlign = 'INSIDE';
}
function radius(node, r) {
  if (typeof r === 'string') {
    for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(k, V[r]);
  } else if (Array.isArray(r)) {
    [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius] = r;
  } else node.cornerRadius = r;
}
function effect(node, name) { PENDING.push(node.setEffectStyleIdAsync(ES[name].id)); }

/**
 * Cadre Auto Layout.
 * o: dir 'H'|'V', gap, pad (n | [v,h] | [t,r,b,l]), align, justify,
 *    w, h, fillW, fillH, bg, r, stroke, fx, clip, comp, kids, abs:[x,y], wrap, opacity
 */
function fr(name, o) {
  o = o || {};
  const f = o.comp ? figma.createComponent() : figma.createFrame();
  f.name = name;
  f.fills = [];
  f.clipsContent = !!o.clip;
  if (o.dir) {
    f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    f.itemSpacing = o.gap || 0;
    let p = o.pad == null ? 0 : o.pad;
    if (typeof p === 'number') p = [p, p, p, p];
    else if (p.length === 2) p = [p[0], p[1], p[0], p[1]];
    [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = p;
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
    if (o.align) f.counterAxisAlignItems = { start: 'MIN', center: 'CENTER', end: 'MAX', base: 'BASELINE' }[o.align];
    if (o.justify) f.primaryAxisAlignItems = { start: 'MIN', center: 'CENTER', end: 'MAX', between: 'SPACE_BETWEEN' }[o.justify];
    if (o.wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = o.gap || 0; }
  }
  if (o.w != null || o.h != null) {
    f.resize(o.w != null ? o.w : Math.max(f.width, 1), o.h != null ? o.h : Math.max(f.height, 1));
    if (o.dir) {
      if (o.w != null) f.layoutSizingHorizontal = 'FIXED';
      if (o.h != null) f.layoutSizingVertical = 'FIXED';
    }
  }
  if (o.bg) fillVar(f, o.bg, o.bgOpacity);
  if (o.r != null) radius(f, o.r);
  if (o.stroke) strokeVar(f, o.stroke, o.strokeW);
  if (o.fx) effect(f, o.fx);
  if (o.opacity != null) f.opacity = o.opacity;
  const intent = {};
  if (o.fillW) intent.fillW = true;
  if (o.fillH) intent.fillH = true;
  if (o.grow) intent.grow = true;
  if (o.abs) intent.abs = o.abs;
  if (Object.keys(intent).length) SIZING.set(f, intent);
  for (const k of o.kids || []) if (k) add(f, k);
  mark(f);
  return f;
}
function add(parent, child) {
  parent.appendChild(child);
  const s = SIZING.get(child);
  if (s && parent.layoutMode && parent.layoutMode !== 'NONE') {
    if (s.abs) {
      child.layoutPositioning = 'ABSOLUTE';
      child.x = s.abs[0];
      child.y = s.abs[1];
    } else {
      if (s.fillW) child.layoutSizingHorizontal = 'FILL';
      if (s.fillH) child.layoutSizingVertical = 'FILL';
      if (s.grow) child.layoutGrow = 1;
    }
  } else if (s && s.abs) {
    child.x = s.abs[0];
    child.y = s.abs[1];
  }
  return child;
}
function kids(parent, list) { for (const k of list) if (k) add(parent, k); return parent; }

/** Texte lié à un style CHAIR et à une variable de couleur. */
function tx(str, style, o) {
  o = o || {};
  const st = TS[style || 'Corps/M'];
  if (!st) throw new Error('Style inconnu : ' + style);
  const t = figma.createText();
  t.fontName = st.fontName;
  t.characters = String(str);
  PENDING.push(t.setTextStyleIdAsync(st.id));
  fillVar(t, o.c || 'texte/principal', o.opacity);
  t.name = o.name || String(str).slice(0, 40);
  if (o.align) t.textAlignHorizontal = { left: 'LEFT', center: 'CENTER', right: 'RIGHT' }[o.align];
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = 'HEIGHT'; } else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (o.lines) { t.textTruncation = 'ENDING'; t.maxLines = o.lines; }
  if (o.fillW || o.grow || o.abs) {
    const s = {};
    if (o.fillW) s.fillW = true;
    if (o.grow) s.grow = true;
    if (o.abs) s.abs = o.abs;
    SIZING.set(t, s);
    if (o.fillW || o.grow) t.textAutoResize = 'HEIGHT';
  }
  mark(t);
  return t;
}

function rect(name, o) {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(o.w || 10, o.h || 10);
  if (o.bg) fillVar(r, o.bg, o.bgOpacity); else r.fills = [];
  if (o.r != null) radius(r, o.r);
  if (o.fillW || o.abs) SIZING.set(r, { fillW: !!o.fillW, abs: o.abs });
  mark(r);
  return r;
}
function ellipse(name, o) {
  const e = figma.createEllipse();
  e.name = name;
  e.resize(o.w, o.h || o.w);
  if (o.bg) fillVar(e, o.bg, o.bgOpacity); else e.fills = [];
  if (o.stroke) strokeVar(e, o.stroke, o.strokeW);
  mark(e);
  return e;
}

/** Instance d'icône Lucide, taille et couleur liées. */
function ic(name, size, color) {
  let comp = ICON[name];
  if (!comp) { log('Icône absente : ' + name); comp = ICON.Circle || ICON[Object.keys(ICON)[0]]; }
  const i = comp.createInstance();
  if (size && size !== 24) i.rescale(size / 24);
  recolorIcon(i, color || 'texte/principal');
  i.name = name;
  return i;
}
function recolorIcon(node, color) {
  const walk = (n) => {
    if ('strokes' in n && n.strokes && n.strokes.length) n.strokes = [paintVar(color)];
    if ('children' in n) for (const c of n.children) walk(c);
  };
  walk(node);
}

/** Instance d'un composant ou d'un ensemble de variantes + propriétés. */
function inst(name, props) {
  const node = K[name];
  if (!node) throw new Error('Composant absent : ' + name);
  const comp = node.type === 'COMPONENT_SET' ? node.defaultVariant : node;
  const i = comp.createInstance();
  if (props) setProps(i, props);
  return i;
}
function setProps(i, props) {
  const defs = i.componentProperties;
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    const key = Object.keys(defs).find((d) => d === k || d.split('#')[0] === k);
    if (key) out[key] = (v === '' && defs[key].type === 'TEXT') ? ' ' : v;
  }
  if (Object.keys(out).length) i.setProperties(out);
  return i;
}

/** Ajoute une propriété texte à un composant et relie un calque texte. */
function propText(comp, label, textNode) {
  const key = comp.addComponentProperty(label, 'TEXT', textNode.characters);
  textNode.componentPropertyReferences = { characters: key };
  return key;
}
function propBool(comp, label, node, def) {
  const key = comp.addComponentProperty(label, 'BOOLEAN', def !== false);
  node.componentPropertyReferences = Object.assign({}, node.componentPropertyReferences || {}, { visible: key });
  return key;
}
function propSwap(comp, label, instanceNode) {
  const key = comp.addComponentProperty(label, 'INSTANCE_SWAP', instanceNode.mainComponent.id);
  instanceNode.componentPropertyReferences = Object.assign({}, instanceNode.componentPropertyReferences || {}, { mainComponent: key });
  return key;
}

async function flush() {
  const batch = PENDING.splice(0, PENDING.length);
  await Promise.all(batch);
}

// ── Images officielles (getchair.app) ───────────────────────────────────
const IMG = {};
async function loadImages(names) {
  for (const n of names) {
    try {
      const img = await figma.createImageAsync('https://www.getchair.app/onboarding/' + n + '.png');
      IMG[n] = img.hash;
    } catch (e) { IMG[n] = null; }
  }
}
function imageFill(node, name, mode) {
  if (IMG[name]) node.fills = [{ type: 'IMAGE', imageHash: IMG[name], scaleMode: mode || 'FILL' }];
  else fillVar(node, 'fond/creux');
}
