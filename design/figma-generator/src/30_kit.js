// ═══ Kit d'écrans : gabarits mobile/desktop, prototype, inventaire ══════

const SCREENS = {};      // nom de page → { nom d'écran → frame }
const TAB_OF = new Map();  // id d'écran → instance de barre d'onglets
const LINKS = [];        // liens de prototype à câbler une fois tout créé
const INVENTORY = [];    // tableau de correspondance (page 00)
let CUR = null;          // produit en cours de construction

const STATUS = {
  E: 'Existant',
  I: 'Existant — incomplet',
  P: 'Prévu dans le produit',
  N: 'Proposition UX à valider',
};

function startProduct(page, product) {
  CUR = { page, product, y: 0, sec: null, x: 0, flows: [] };
  SCREENS[page.name] = SCREENS[page.name] || {};
}
function row(title, note) {
  endRow();
  const sec = figma.createSection();
  sec.name = title;
  CUR.page.appendChild(sec);
  const head = fr('Titre — ' + title, { dir: 'V', gap: 6, kids: [tx(title, 'Titre/XL'), note ? tx(note, 'Corps/M', { c: 'texte/secondaire', w: 1100 }) : null] });
  sec.appendChild(head);
  head.x = 64; head.y = 56;
  CUR.sec = sec;
  CUR.x = 64;
  CUR.maxH = 0;
}
function endRow() {
  if (!CUR || !CUR.sec) return;
  const sec = CUR.sec;
  sec.resizeWithoutConstraints(Math.max(CUR.x + 16, 1400), CUR.maxH + 260);
  sec.x = 0;
  sec.y = CUR.y;
  CUR.y += sec.height + 140;
  CUR.sec = null;
}
/** Place un écran dans la rangée courante + légende route/statut. */
function place(f, meta) {
  const sec = CUR.sec;
  sec.appendChild(f);
  f.x = CUR.x;
  f.y = 180;
  const cap = fr('Légende — ' + f.name, { dir: 'V', gap: 4, w: f.width });
  add(cap, tx(meta.route || '—', 'Corps/S fort', { c: 'texte/principal', w: f.width }));
  add(cap, tx(STATUS[meta.status || 'E'] + (meta.note ? ' · ' + meta.note : ''), 'Légende', { c: meta.status === 'N' ? 'statut/info' : meta.status === 'P' ? 'statut/alerte' : 'texte/secondaire', w: f.width }));
  sec.appendChild(cap);
  cap.x = f.x;
  cap.y = f.y + f.height + 16;
  CUR.x += f.width + 72;
  CUR.maxH = Math.max(CUR.maxH, f.height + 60);
  SCREENS[CUR.page.name][f.name] = f;
  INVENTORY.push({
    product: CUR.product, route: meta.route || '—', name: f.name,
    format: meta.format || 'Mobile', status: meta.status || 'E', proto: !!meta.flow || !!meta.proto,
  });
  if (meta.flow) CUR.flows.push({ nodeId: f.id, name: meta.flow });
  return f;
}

// ── Lien de prototype ───────────────────────────────────────────────────
function link(node, to, kind) {
  LINKS.push({ page: CUR.page.name, node, to, kind: kind || 'push' });
  return node;
}
async function wireLinks() {
  const TR = {
    push: { type: 'SLIDE_IN', direction: 'LEFT', matchLayers: false, easing: { type: 'EASE_IN_AND_OUT' }, duration: 0.32 },
    tab: null,
    swap: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.18 },
    overlay: { type: 'MOVE_IN', direction: 'TOP', matchLayers: false, easing: { type: 'EASE_OUT' }, duration: 0.3 },
    modal: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.2 },
  };
  let ok = 0, ko = 0;
  for (const l of LINKS) {
    try {
      let action;
      if (l.kind === 'back') action = { type: 'BACK' };
      else if (l.kind === 'close') action = { type: 'CLOSE' };
      else {
        const dest = SCREENS[l.page][l.to];
        if (!dest) { log('Lien sans destination : ' + l.to); ko++; continue; }
        const overlay = l.kind === 'overlay' || l.kind === 'modal';
        action = { type: 'NODE', destinationId: dest.id, navigation: overlay ? 'OVERLAY' : 'NAVIGATE', transition: TR[l.kind] || null, preserveScrollPosition: false };
      }
      await l.node.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [action] }]);
      ok++;
    } catch (e) { log('Lien en échec (' + l.to + ') : ' + e.message); ko++; }
  }
  return { ok, ko };
}

// ── Gabarit mobile iOS 390 × 844 ────────────────────────────────────────
/**
 * o : route, status, note, flow, bg, dark, statusBar ('Clair'|'Sombre'|false),
 *     top (nœud fixe sous la barre d'état), tab ([set, actif]), pad, gap,
 *     h, sheet / modal (cadre de superposition), bottom (nœud fixe bas)
 * build(body) remplit le contenu défilant.
 */
function mobile(name, o, build) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name;
  mark(f);
  f.resize(390, o.h || 844);
  f.clipsContent = true;
  if (o.dark && DARK_MODE) f.setExplicitVariableModeForCollection(COLOR_COL, DARK_MODE);
  if (o.dark && !DARK_MODE) DARK_CTX = true;
  fillVar(f, o.bg || 'fond/app');
  f.cornerRadius = 0;

  const statusH = o.statusBar === false ? 0 : 47;
  const top = o.top || null;
  const topH = top ? top.height : 0;
  const tab = o.tab ? inst(o.tab[0], { Actif: o.tab[1] }) : null;
  const bottom = o.bottom || null;
  const pad = o.pad || [0, 16, 0, 16];
  const body = fr('Contenu', { dir: 'V', gap: o.gap == null ? 20 : o.gap, w: 390, pad: [statusH + topH + pad[0], pad[1], (tab ? 94 : 34) + (bottom ? bottom.height : 0) + pad[2], pad[3]] });
  body.layoutSizingVertical = 'HUG';
  f.appendChild(body);
  body.x = 0; body.y = 0;
  if (build) build(body);

  let fixed = 0;
  if (o.statusBar !== false) {
    const sb = inst('iOS/Barre d\'état', { Fond: o.statusBar === 'Sombre' ? 'Sombre' : 'Clair' });
    const holder = fr('Zone sûre haute', { dir: 'V', w: 390, bg: o.statusBg === undefined ? (o.bg || 'fond/app') : o.statusBg });
    add(holder, sb);
    if (top) add(holder, top);
    f.appendChild(holder);
    holder.x = 0; holder.y = 0;
    fixed++;
  } else if (top) { f.appendChild(top); top.x = 0; top.y = 0; fixed++; }
  if (bottom) { f.appendChild(bottom); bottom.x = 0; bottom.y = f.height - bottom.height - (tab ? 94 : 0); fixed++; }
  if (tab) { f.appendChild(tab); tab.x = 0; tab.y = f.height - tab.height; fixed++; }
  else if (!o.noHome) {
    const hi = inst('iOS/Indicateur d\'accueil', { Fond: o.statusBar === 'Sombre' ? 'Sombre' : 'Clair' });
    f.appendChild(hi); hi.x = 0; hi.y = f.height - 34; fixed++;
  }
  f.numberOfFixedChildren = fixed;
  if (body.height > f.height) f.overflowDirection = 'VERTICAL';
  TAB_OF.set(f.id, tab);
  DARK_CTX = false;
  return place(f, o);
}

/** Cadre de superposition (feuille du bas ou modale), proto en OVERLAY. */
function overlayFrame(name, kind, o, build) {
  o = o || {};
  const f = fr(name, { dir: 'V', gap: o.gap || 16, w: kind === 'modal' ? 320 : 390, pad: kind === 'modal' ? 24 : [10, 20, 40, 20], align: 'center', bg: 'fond/surface', r: kind === 'modal' ? 'rayon/carte' : [28, 28, 0, 0], fx: 'Flottant' });
  if (kind !== 'modal') add(f, rect('Poignée', { w: 36, h: 5, r: 3, bg: 'neutre/200' }));
  build(f);
  f.overlayPositionType = kind === 'modal' ? 'CENTER' : 'BOTTOM_CENTER';
  f.overlayBackground = { type: 'SOLID_COLOR', color: { r: 0, g: 0, b: 0, a: 0.4 } };
  f.overlayBackgroundInteraction = 'CLOSE_ON_CLICK_OUTSIDE';
  return place(f, Object.assign({ status: 'E' }, o));
}

// ── Gabarit desktop 1440 × 810 (16:9) ───────────────────────────────────
function desktop(name, o, build) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name;
  mark(f);
  f.resize(1440, 810);
  f.clipsContent = true;
  fillVar(f, 'fond/app');
  const sideW = 248;
  const body = fr('Contenu', { dir: 'V', gap: o.gap == null ? 24 : o.gap, w: 1440 - sideW, pad: [36, 56, 56, 56] });
  body.layoutSizingVertical = 'HUG';
  f.appendChild(body);
  body.x = sideW; body.y = 0;
  if (build) build(body);
  const side = o.sidebar ? o.sidebar() : null;
  let fixed = 0;
  if (side) { f.appendChild(side); side.x = 0; side.y = 0; fixed++; }
  f.numberOfFixedChildren = fixed;
  if (body.height > f.height) f.overflowDirection = 'VERTICAL';
  return place(f, Object.assign({ format: 'Desktop' }, o));
}

// ── Briques d'écran ─────────────────────────────────────────────────────
function card(name, o, list) {
  o = o || {};
  return fr(name, { dir: o.dir || 'V', gap: o.gap == null ? 12 : o.gap, pad: o.pad == null ? 20 : o.pad, fillW: o.fillW !== false, w: o.w, r: 'rayon/carte', bg: o.dark ? 'sombre/fond' : 'fond/surface', fx: o.dark ? 'Sombre' : (o.flat ? null : 'Carte'), align: o.align, justify: o.justify, kids: list });
}
function micro(t, dark) { return tx(t, 'Micro-titre', { c: dark ? 'neutre/400' : 'texte/tertiaire' }); }
function sectionHead(sur, titre, voir) {
  const h = inst('En-tête de section', { Surtitre: sur || ' ', Titre: titre, 'Voir tout': voir !== false });
  SIZING.set(h, { fillW: true });
  return h;
}
function btn(label, o) {
  o = o || {};
  const b = inst('Bouton', { 'Libellé': label, Type: o.type || 'Principal', Taille: o.size || 'L', 'État': o.state || 'Défaut', 'Icône': !!o.icon });
  if (o.icon) { const i = b.findOne((n) => n.name === 'Icône'); if (i && ICON[o.icon]) i.swapComponent(ICON[o.icon]); }
  if (o.fillW !== false && o.size !== 'S') SIZING.set(b, { fillW: true });
  if (o.to) link(b, o.to, o.kind);
  return b;
}
function chip(label, on, o) {
  const c = inst('Pilule', { 'Libellé': label, 'État': on ? 'Actif' : 'Inactif', 'Icône': !!(o && o.icon) });
  if (o && o.icon) { const i = c.findOne((n) => n.name === 'Icône'); if (i && ICON[o.icon]) i.swapComponent(ICON[o.icon]); }
  return c;
}
function badge(label, type) { return inst('Badge', { 'Libellé': label, Type: type || 'Neutre' }); }
function listRow(titre, sous, icon, o) {
  o = o || {};
  const r = inst('Ligne de liste', { Titre: titre, 'Sous-titre': sous || ' ', 'Afficher sous-titre': !!sous, 'Afficher icône': !!icon, Chevron: o.chevron !== false });
  if (icon && ICON[icon]) { const i = r.findOne((n) => n.name === 'Icône'); if (i) i.swapComponent(ICON[icon]); }
  SIZING.set(r, { fillW: true });
  if (o.to) link(r, o.to, o.kind);
  if (o.danger) { const t = r.findOne((n) => n.name === 'Titre'); if (t) t.fills = [paintVar('statut/erreur')]; }
  return r;
}
function listCard(name, rows) {
  const c = fr(name, { dir: 'V', gap: 0, fillW: true, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte', clip: true });
  rows.forEach((r, i) => {
    add(c, r);
    if (i < rows.length - 1) add(c, fr('Séparateur', { h: 1, fillW: true, bg: 'bordure/legere', pad: 0 }));
  });
  return c;
}
function field(label, value, o) {
  o = o || {};
  const f = inst('Champ', {
    'Libellé': label || ' ', Valeur: value || ' ', 'État': o.state || (o.filled ? 'Rempli' : 'Défaut'),
    'Afficher libellé': !!label, 'Afficher message': !!o.msg, Message: o.msg || ' ', 'Icône': !!o.icon,
  });
  if (o.icon && ICON[o.icon]) { const i = f.findOne((n) => n.name === 'Icône'); if (i) i.swapComponent(ICON[o.icon]); }
  SIZING.set(f, { fillW: true });
  return f;
}
function topBar(title, o) {
  o = o || {};
  const t = inst('Barre haute', { Type: o.logo ? 'Logo' : o.action ? 'Titre + action' : 'Titre', Titre: title });
  if (!o.logo) { const back = t.findOne((n) => n.name === 'Retour'); if (back) { if (o.back !== false) link(back, null, 'back'); else back.visible = false; } }
  if (o.bellTo) { const b = t.findOne((n) => n.name === 'Notifications'); if (b) link(b, o.bellTo); }
  if (o.leftTo) { const l = t.findOne((n) => n.name === 'Gauche'); if (l) link(l, o.leftTo); }
  return t;
}
function tabLinks(f, map) {
  const tab = TAB_OF.get(f.id);
  if (!tab) return;
  for (const [label, to] of Object.entries(map)) {
    const n = tab.findOne((x) => x.name === label && x.type === 'FRAME');
    if (n && to) link(n, to, 'tab');
  }
}
function photo(name, w, h, img, r) {
  const p = fr(name, { w, h, r: r == null ? 'rayon/vignette' : r, bg: 'fond/creux', clip: true });
  if (img) imageFill(p, img);
  return p;
}
function hstrip(name, items, gap) {
  const s = fr(name, { dir: 'H', gap: gap || 12, w: 390, pad: [0, 16], clip: true });
  for (const i of items) add(s, i);
  s.overflowDirection = 'HORIZONTAL';
  return s;
}
function bleed(node) { SIZING.set(node, Object.assign({}, SIZING.get(node) || {}, {})); return node; }
function spacer(h) { return fr('Espace', { h: h || 8, w: 10 }); }
function para(t, o) { return tx(t, 'Corps/S', Object.assign({ c: 'texte/secondaire', fillW: true }, o || {})); }

// ── Données de démonstration (fictives) ─────────────────────────────────
const DEMO = {
  coiffeurs: [
    { nom: 'Léa Martin', ini: 'LM', spe: 'Balayage', ville: 'Strasbourg', note: '4,9', avis: '48', dist: '0,8 km', img: 'balayage', plus: true, statut: 'Indépendante' },
    { nom: 'Yanis Benali', ini: 'YB', spe: 'Barber', ville: 'Strasbourg', note: '4,8', avis: '61', dist: '1,2 km', img: 'barber', plus: false, statut: 'Atelier Dumont' },
    { nom: 'Sofia Rossi', ini: 'SR', spe: 'Boucles', ville: 'Strasbourg', note: '4,9', avis: '37', dist: '2,0 km', img: 'boucles', plus: true, statut: 'Indépendante' },
    { nom: 'Hugo Lambert', ini: 'HL', spe: 'Coupe homme', ville: 'Strasbourg', note: '4,7', avis: '29', dist: '2,4 km', img: 'classique', plus: false, statut: 'Atelier Dumont' },
    { nom: 'Inès Morel', ini: 'IM', spe: 'Couleur', ville: 'Schiltigheim', note: '4,8', avis: '22', dist: '3,1 km', img: 'couleur-femme', plus: false, statut: 'Indépendante' },
    { nom: 'Nathan Petit', ini: 'NP', spe: 'Locks', ville: 'Illkirch', note: '4,6', avis: '15', dist: '5,6 km', img: 'dreads', plus: false, statut: 'Indépendant' },
  ],
  specialites: [['Balayage', 'balayage'], ['Coupe classique', 'classique'], ['Boucles', 'boucles'], ['Locks', 'dreads'], ['Événementiel', 'chignon'], ['Lissage', 'lissage'], ['Barbe', 'barbe'], ['Couleur', 'couleur']],
  client: { nom: 'Camille Petit', ini: 'CP', ville: 'Strasbourg' },
  salon: { nom: 'Atelier Dumont', ville: 'Strasbourg', adresse: '12 rue des Orfèvres, Strasbourg' },
  prestations: [['Coupe + brushing', '45 min', '42 €'], ['Balayage', '2 h', '120 €'], ['Soin profond', '30 min', '28 €'], ['Couleur racines', '1 h 15', '65 €']],
};
const IMAGES = ['balayage', 'barber', 'boucles', 'classique', 'couleur-femme', 'dreads', 'chignon', 'lissage', 'barbe', 'couleur', 'coupe', 'cheveux-longs', 'coiffure-femme', 'coiffure-homme'];

function hdCard(c, to) {
  const i = inst('Carte coiffeur', { Nom: c.nom, 'Détail': c.spe + ' · ' + c.ville, 'Badge CHAIR+': !!c.plus });
  const p = i.findOne((n) => n.name === 'Photo');
  if (p) imageFill(p, c.img);
  const note = i.findOne((n) => n.name === 'Note' && n.type === 'INSTANCE');
  if (note) setProps(note, { Valeur: c.note, Avis: '· ' + c.avis + ' avis' });
  if (to) link(i, to);
  return i;
}
function resultCard(c, to) {
  const i = inst('Résultat de recherche', { Nom: c.nom, 'Détail': c.spe + ' · ' + c.statut, Distance: c.dist });
  const p = i.findOne((n) => n.name === 'Photo');
  if (p) imageFill(p, c.img);
  const note = i.findOne((n) => n.name === 'Note' && n.type === 'INSTANCE');
  if (note) setProps(note, { Valeur: c.note, Avis: '· ' + c.avis + ' avis' });
  SIZING.set(i, { fillW: true });
  if (to) link(i, to);
  return i;
}
function realTile(img, likes, to, w, h) {
  const t = inst('Vignette réalisation', { Likes: String(likes) });
  if (w) t.resize(w, h || Math.round(w * 1.26));
  imageFill(t, img);
  if (to) link(t, to);
  return t;
}
function avatar(ini, taille, ring) { return inst('Avatar', { Initiales: ini, Taille: taille || 'M', Anneau: ring ? 'Oui' : 'Non' }); }
function noteRow(v, avis) { return inst('Note', { Valeur: v, Avis: avis ? '· ' + avis + ' avis' : ' ', 'Afficher avis': !!avis }); }
