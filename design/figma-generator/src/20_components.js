// ═══ 02 — Components ════════════════════════════════════════════════════
// Icônes de repli et de structure : '@Circle' '@Signal' '@Wifi' '@BatteryFull'

/** Combine des variantes en ensemble, mis en page en grille. */
function makeSet(name, comps, parent, cols) {
  for (const c of comps) parent.appendChild(c);
  const set = figma.combineAsVariants(comps, parent);
  set.name = name;
  set.layoutMode = 'HORIZONTAL';
  set.layoutWrap = 'WRAP';
  set.itemSpacing = 20;
  set.counterAxisSpacing = 20;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 28;
  set.primaryAxisSizingMode = 'FIXED';
  set.counterAxisSizingMode = 'AUTO';
  let w = 0;
  const per = cols || comps.length;
  for (let i = 0; i < Math.min(per, comps.length); i++) w += comps[i].width + 20;
  set.resize(Math.max(w + 36, 200), set.height);
  set.fills = [paintVar('fond/app')];
  set.strokes = [paintVar('bordure/moyenne')];
  set.dashPattern = [6, 6];
  set.cornerRadius = 24;
  mark(set);
  K[name] = set;
  return set;
}
function variantName(o) { return Object.entries(o).map(([k, v]) => k + '=' + v).join(', '); }
/** Relie un calque texte (par nom) de chaque variante à une propriété texte de l'ensemble. */
function bindText(set, prop, layer, def) {
  const key = set.addComponentProperty(prop, 'TEXT', def);
  for (const v of set.children) {
    const t = v.findOne((n) => n.type === 'TEXT' && n.name === layer);
    if (t) t.componentPropertyReferences = { characters: key };
  }
  return key;
}
function bindBool(set, prop, layer, def) {
  const key = set.addComponentProperty(prop, 'BOOLEAN', def);
  for (const v of set.children) {
    const n = v.findOne((x) => x.name === layer);
    if (n) n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences || {}, { visible: key });
  }
  return key;
}
function bindSwap(set, prop, layer, defIcon) {
  const key = set.addComponentProperty(prop, 'INSTANCE_SWAP', ICON[defIcon].id);
  for (const v of set.children) {
    const n = v.findOne((x) => x.type === 'INSTANCE' && x.name === layer);
    if (n) n.componentPropertyReferences = Object.assign({}, n.componentPropertyReferences || {}, { mainComponent: key });
  }
  return key;
}
function comp(name, o) { const c = fr(name, Object.assign({}, o, { comp: true })); return c; }
function named(node, name) { node.name = name; return node; }

// ── Système iOS ─────────────────────────────────────────────────────────
function buildSystem(parent) {
  const mk = (fond) => {
    const dark = fond === 'Sombre';
    const c = comp(variantName({ Fond: fond }), { dir: 'H', w: 390, h: 47, pad: [14, 26, 0, 32], justify: 'between', align: 'center' });
    add(c, named(tx('9:41', 'Statut iOS', { c: dark ? 'sombre/texte' : 'texte/principal' }), 'Heure'));
    const r = fr('Indicateurs', { dir: 'H', gap: 6, align: 'center' });
    kids(r, [ic('Signal', 17, dark ? 'sombre/texte' : 'texte/principal'), ic('Wifi', 17, dark ? 'sombre/texte' : 'texte/principal'), ic('BatteryFull', 22, dark ? 'sombre/texte' : 'texte/principal')]);
    add(c, r);
    return c;
  };
  makeSet('iOS/Barre d\'état', [mk('Clair'), mk('Sombre')], parent, 1);

  const mkH = (fond) => {
    const c = comp(variantName({ Fond: fond }), { dir: 'H', w: 390, h: 34, justify: 'center', align: 'end', pad: [0, 0, 8, 0] });
    add(c, rect('Indicateur', { w: 134, h: 5, r: 3, bg: fond === 'Sombre' ? 'sombre/texte' : 'neutre/950' }));
    return c;
  };
  makeSet('iOS/Indicateur d\'accueil', [mkH('Clair'), mkH('Sombre')], parent, 1);

  // Clavier iOS (état « clavier affiché »)
  const kb = comp('iOS/Clavier', { dir: 'V', w: 390, gap: 10, pad: [8, 4, 30, 4], bg: 'neutre/200' });
  for (const rowKeys of ['azertyuiop', 'qsdfghjklm', 'wxcvbn']) {
    const row = fr('Rangée', { dir: 'H', gap: 6, fillW: true, justify: 'center' });
    for (const k of rowKeys) add(row, fr(k, { dir: 'H', w: 33, h: 42, r: 6, bg: 'neutre/0', justify: 'center', align: 'center', kids: [tx(k, 'Titre/M')] }));
    add(kb, row);
  }
  add(kb, fr('Barre espace', { dir: 'H', gap: 6, fillW: true, pad: [0, 4], kids: [
    fr('123', { dir: 'H', w: 88, h: 42, r: 6, bg: 'neutre/300', justify: 'center', align: 'center', kids: [tx('123', 'Corps/M')] }),
    fr('espace', { dir: 'H', h: 42, r: 6, bg: 'neutre/0', justify: 'center', align: 'center', grow: true, kids: [tx('espace', 'Corps/M', { c: 'texte/secondaire' })] }),
    fr('ok', { dir: 'H', w: 88, h: 42, r: 6, bg: 'statut/info', justify: 'center', align: 'center', kids: [tx('OK', 'Corps/M', { c: 'cta/texte' })] }),
  ] }));
  parent.appendChild(kb);
  K['iOS/Clavier'] = kb;
}

// ── Boutons ─────────────────────────────────────────────────────────────
const BTN = {
  Principal:  { bg: 'cta/fond', c: 'cta/texte' },
  Secondaire: { bg: 'fond/surface', c: 'texte/principal', stroke: 'bordure/moyenne' },
  Doux:       { bg: 'fond/creux', c: 'texte/principal' },
  Fantôme:    { bg: null, c: 'texte/secondaire' },
  Destructif: { bg: 'statut/erreur-fond', c: 'statut/erreur' },
};
function buildButtons(parent) {
  const list = [];
  for (const taille of ['L', 'S']) for (const [type, s] of Object.entries(BTN)) for (const etat of ['Défaut', 'Désactivé', 'Chargement']) {
    const L = taille === 'L';
    const c = comp(variantName({ Type: type, Taille: taille, 'État': etat }), {
      dir: 'H', gap: 8, pad: L ? [16, 24] : [10, 16], align: 'center', justify: 'center',
      r: L ? 'rayon/bouton' : 'rayon/petit', bg: s.bg, stroke: s.stroke,
    });
    const icon = ic(etat === 'Chargement' ? 'LoaderCircle' : 'ArrowRight', L ? 18 : 15, s.c);
    icon.name = 'Icône';
    add(c, icon);
    add(c, named(tx(etat === 'Chargement' ? 'Chargement…' : 'Continuer', L ? 'Bouton' : 'Bouton/S', { c: s.c }), 'Libellé'));
    if (etat === 'Désactivé') c.opacity = 0.4;
    list.push(c);
  }
  const set = makeSet('Bouton', list, parent, 3);
  bindText(set, 'Libellé', 'Libellé', 'Continuer');
  bindBool(set, 'Icône', 'Icône', false);
  bindSwap(set, 'Choix icône', 'Icône', 'ArrowRight');
  return set;
}

// ── Champs ──────────────────────────────────────────────────────────────
function buildInputs(parent) {
  const list = [];
  for (const etat of ['Défaut', 'Focus', 'Rempli', 'Erreur', 'Désactivé']) {
    const c = comp(variantName({ 'État': etat }), { dir: 'V', gap: 8, w: 358 });
    add(c, named(tx('Adresse e-mail', 'Légende', { c: 'texte/secondaire' }), 'Libellé'));
    const field = fr('Champ', { dir: 'H', gap: 10, h: 54, pad: [0, 16], align: 'center', r: 'rayon/champ', bg: 'fond/creux', fillW: true });
    if (etat === 'Focus') strokeVar(field, 'neutre/900', 1.5);
    if (etat === 'Erreur') strokeVar(field, 'statut/erreur', 1.5);
    const icon = ic('Mail', 17, 'texte/tertiaire'); icon.name = 'Icône';
    add(field, icon);
    const filled = etat === 'Rempli' || etat === 'Focus' || etat === 'Erreur';
    add(field, named(tx(filled ? 'camille@exemple.fr' : 'ton@email.fr', 'Corps/M', { c: filled ? 'texte/principal' : 'texte/tertiaire', grow: true }), 'Valeur'));
    add(c, field);
    add(c, named(tx(etat === 'Erreur' ? 'Adresse e-mail invalide.' : 'Il servira à te connecter.', 'Légende', { c: etat === 'Erreur' ? 'statut/erreur' : 'texte/tertiaire' }), 'Message'));
    if (etat === 'Désactivé') c.opacity = 0.45;
    list.push(c);
  }
  const set = makeSet('Champ', list, parent, 5);
  bindText(set, 'Libellé', 'Libellé', 'Adresse e-mail');
  bindText(set, 'Valeur', 'Valeur', 'ton@email.fr');
  bindText(set, 'Message', 'Message', 'Il servira à te connecter.');
  bindBool(set, 'Afficher libellé', 'Libellé', true);
  bindBool(set, 'Afficher message', 'Message', false);
  bindBool(set, 'Icône', 'Icône', true);
  bindSwap(set, 'Choix icône', 'Icône', 'Mail');

  // Recherche
  const s = comp('Barre de recherche', { dir: 'H', gap: 10, w: 358, h: 48, pad: [0, 16], align: 'center', r: 'rayon/bouton', bg: 'fond/creux' });
  add(s, ic('Search', 18, 'texte/tertiaire'));
  add(s, named(tx('Coiffeur, spécialité, ville…', 'Corps/M', { c: 'texte/tertiaire', grow: true }), 'Texte'));
  parent.appendChild(s);
  propText(s, 'Texte', s.findOne((n) => n.name === 'Texte'));
  K['Barre de recherche'] = s;
}

// ── Pilules, badges, segments ───────────────────────────────────────────
function buildChips(parent) {
  const list = [];
  for (const etat of ['Inactif', 'Actif']) {
    const on = etat === 'Actif';
    const c = comp(variantName({ 'État': etat }), { dir: 'H', gap: 6, pad: [9, 15], align: 'center', r: 'rayon/pilule', bg: on ? 'cta/fond' : 'fond/surface', stroke: on ? null : 'bordure/moyenne' });
    const icon = ic('SlidersHorizontal', 14, on ? 'cta/texte' : 'texte/principal'); icon.name = 'Icône';
    add(c, icon);
    add(c, named(tx('Balayage', 'Corps/S fort', { c: on ? 'cta/texte' : 'texte/principal' }), 'Libellé'));
    list.push(c);
  }
  const set = makeSet('Pilule', list, parent, 2);
  bindText(set, 'Libellé', 'Libellé', 'Balayage');
  bindBool(set, 'Icône', 'Icône', false);
  bindSwap(set, 'Choix icône', 'Icône', 'SlidersHorizontal');

  const BADGE = {
    Neutre: ['fond/creux', 'texte/principal'], Sombre: ['cta/fond', 'cta/texte'], Or: ['accent/or', 'neutre/950'],
    'Succès': ['statut/succes-fond', 'statut/succes'], Erreur: ['statut/erreur-fond', 'statut/erreur'], Alerte: ['statut/alerte-fond', 'statut/alerte'],
  };
  const bl = [];
  for (const [type, [bg, c]] of Object.entries(BADGE)) {
    const b = comp(variantName({ Type: type }), { dir: 'H', gap: 4, pad: [3, 8], align: 'center', r: 'rayon/pilule', bg });
    add(b, named(tx('Nouveau', 'Légende/S', { c }), 'Libellé'));
    bl.push(b);
  }
  const bs = makeSet('Badge', bl, parent, 6);
  bindText(bs, 'Libellé', 'Libellé', 'Nouveau');

  const sl = [];
  for (const actif of ['1', '2', '3']) {
    const c = comp(variantName({ Actif: actif }), { dir: 'H', gap: 0, w: 358, pad: 4, r: 14, bg: 'fond/creux' });
    ['Réalisations', 'Prestations', 'Avis'].forEach((label, i) => {
      const on = String(i + 1) === actif;
      const seg = fr('Segment ' + (i + 1), { dir: 'H', h: 36, justify: 'center', align: 'center', r: 11, bg: on ? 'fond/surface' : null, fx: on ? 'Carte appui' : null, grow: true });
      add(seg, named(tx(label, 'Corps/S fort', { c: on ? 'texte/principal' : 'texte/secondaire' }), 'Segment ' + (i + 1)));
      add(c, seg);
    });
    sl.push(c);
  }
  const ss = makeSet('Segments', sl, parent, 1);
  bindText(ss, 'Segment 1', 'Segment 1', 'Réalisations');
  bindText(ss, 'Segment 2', 'Segment 2', 'Prestations');
  bindText(ss, 'Segment 3', 'Segment 3', 'Avis');
}

// ── Navigations ─────────────────────────────────────────────────────────
const NAV_CLIENT = [['Compass', 'Accueil'], ['Search', 'Rechercher'], ['Images', ''], ['Heart', 'Favoris'], ['User', 'Compte']];
const NAV_PRO = [['House', 'Accueil'], ['CalendarDays', 'Agenda'], ['Images', 'Portfolio'], ['TrendingUp', 'Performance'], ['User', 'Profil'], ['Ellipsis', 'Plus']];
const NAV_PRO_SALARIE = [['House', 'Accueil'], ['Images', 'Portfolio'], ['QrCode', 'Mon QR'], ['User', 'Profil'], ['Ellipsis', 'Plus']];
const NAV_BUSINESS = [['House', 'Accueil'], ['Building2', 'Salon'], ['Users', 'Équipe'], ['Briefcase', 'Recrutement'], ['Armchair', 'Fauteuils']];

function buildTabBar(parent, name, items, style) {
  const list = [];
  for (const [, actif] of items.map((x, i) => [x, x[1] || 'Fil'])) {
    const c = comp(variantName({ Actif: actif }), { dir: 'V', w: 390, bg: 'fond/surface', fx: style === 'client' ? null : 'Barre basse' });
    if (style === 'client') {
      strokeVar(c, 'bordure/legere', 1);
      c.strokeTopWeight = 1; c.strokeBottomWeight = 0; c.strokeLeftWeight = 0; c.strokeRightWeight = 0;
    }
    const row = fr('Onglets', { dir: 'H', h: style === 'client' ? 60 : 66, fillW: true });
    items.forEach(([icon, label]) => {
      const key = label || 'Fil';
      const on = key === actif;
      const it = fr(key, { dir: 'V', gap: 4, justify: 'center', align: 'center', grow: true, fillH: true });
      if (style !== 'client' && on) add(it, rect('Repère', { w: 20, h: 2, r: 2, bg: 'neutre/900', abs: [0, 0] }));
      add(it, ic(icon, style === 'client' ? 24 : 21, on ? 'texte/principal' : 'icone/inactive'));
      if (label) add(it, tx(label, 'Nav', { c: on ? 'texte/principal' : 'texte/tertiaire' }));
      add(row, it);
      if (style !== 'client' && on) { const rp = it.findOne((n) => n.name === 'Repère'); if (rp) rp.x = (it.width - 20) / 2; }
    });
    add(c, row);
    add(c, fr('Zone sûre', { dir: 'H', w: 390, h: 34, justify: 'center', align: 'end', pad: [0, 0, 8, 0], kids: [rect('Indicateur', { w: 134, h: 5, r: 3, bg: 'neutre/950' })] }));
    list.push(c);
  }
  return makeSet(name, list, parent, 2);
}

function buildTopBars(parent) {
  const list = [];
  for (const type of ['Logo', 'Titre', 'Titre + action']) {
    const c = comp(variantName({ Type: type }), { dir: 'H', w: 390, h: 56, pad: [0, 12], align: 'center', justify: 'between', bg: 'fond/surface', fx: 'Barre haute' });
    if (type === 'Logo') {
      add(c, fr('Gauche', { w: 44, h: 44 }));
      add(c, named(tx('CHAIR PRO', 'Logo'), 'Titre'));
      const bell = fr('Notifications', { dir: 'H', w: 44, h: 44, justify: 'center', align: 'center' });
      add(bell, ic('Bell', 20, 'texte/secondaire'));
      add(bell, ellipse('Pastille', { w: 9, h: 9, bg: 'statut/erreur' }));
      bell.children[1].layoutPositioning = 'ABSOLUTE'; bell.children[1].x = 26; bell.children[1].y = 11;
      add(c, bell);
    } else {
      add(c, fr('Retour', { dir: 'H', w: 44, h: 44, justify: 'center', align: 'center', kids: [ic('ArrowLeft', 20, 'texte/principal')] }));
      add(c, named(tx('Titre de l\'écran', 'Titre/S'), 'Titre'));
      add(c, fr('Action', { dir: 'H', w: 44, h: 44, justify: 'center', align: 'center', kids: type === 'Titre + action' ? [ic('Share2', 19, 'texte/principal')] : [] }));
    }
    list.push(c);
  }
  const set = makeSet('Barre haute', list, parent, 1);
  bindText(set, 'Titre', 'Titre', 'Titre de l\'écran');
}

// ── Listes, cartes, avatars ─────────────────────────────────────────────
function buildLists(parent) {
  const row = comp('Ligne de liste', { dir: 'H', gap: 14, w: 358, pad: [14, 16], align: 'center', bg: 'fond/surface' });
  const tile = fr('Tuile icône', { dir: 'H', w: 36, h: 36, r: 12, bg: 'fond/creux', justify: 'center', align: 'center' });
  const i = ic('Bell', 17, 'texte/principal'); i.name = 'Icône';
  add(tile, i);
  add(row, tile);
  add(row, fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [named(tx('Notifications', 'Corps/M'), 'Titre'), named(tx('Rappels, avis, réservations', 'Légende', { c: 'texte/secondaire' }), 'Sous-titre')] }));
  add(row, named(ic('ChevronRight', 16, 'texte/tertiaire'), 'Chevron'));
  parent.appendChild(row);
  propText(row, 'Titre', row.findOne((n) => n.name === 'Titre'));
  propText(row, 'Sous-titre', row.findOne((n) => n.name === 'Sous-titre'));
  propBool(row, 'Afficher sous-titre', row.findOne((n) => n.name === 'Sous-titre'), true);
  propBool(row, 'Afficher icône', tile, true);
  propBool(row, 'Chevron', row.findOne((n) => n.name === 'Chevron'), true);
  propSwap(row, 'Choix icône', i);
  K['Ligne de liste'] = row;

  // Avatar
  const al = [];
  for (const taille of ['S', 'M', 'L']) for (const anneau of ['Non', 'Oui']) {
    const d = { S: 32, M: 48, L: 88 }[taille];
    const c = comp(variantName({ Taille: taille, Anneau: anneau }), { dir: 'H', w: d, h: d, justify: 'center', align: 'center', r: d / 2, bg: 'neutre/200' });
    if (anneau === 'Oui') strokeVar(c, 'neutre/900', taille === 'L' ? 3 : 2);
    add(c, named(tx('LM', taille === 'L' ? 'Titre/L' : taille === 'M' ? 'Titre/S' : 'Légende/S', { c: 'texte/secondaire' }), 'Initiales'));
    al.push(c);
  }
  const as = makeSet('Avatar', al, parent, 6);
  bindText(as, 'Initiales', 'Initiales', 'LM');

  // Note
  const n = comp('Note', { dir: 'H', gap: 4, align: 'center' });
  const star = ic('Star', 13, 'texte/principal');
  star.findAll((x) => 'fills' in x).forEach((x) => { x.fills = [paintVar('texte/principal')]; });
  add(n, star);
  add(n, named(tx('4,8', 'Corps/S fort'), 'Valeur'));
  add(n, named(tx('· 32 avis', 'Légende', { c: 'texte/secondaire' }), 'Avis'));
  parent.appendChild(n);
  propText(n, 'Valeur', n.findOne((x) => x.name === 'Valeur'));
  propText(n, 'Avis', n.findOne((x) => x.name === 'Avis'));
  propBool(n, 'Afficher avis', n.findOne((x) => x.name === 'Avis'), true);
  K['Note'] = n;

  // Carte coiffeur (vignette horizontale de la home)
  const hd = comp('Carte coiffeur', { dir: 'V', gap: 10, w: 168 });
  const ph = fr('Photo', { dir: 'V', w: 168, h: 210, r: 'rayon/vignette', bg: 'fond/creux', justify: 'end', pad: 10, clip: true });
  add(ph, named(inst('Badge', { Type: 'Sombre', 'Libellé': 'CHAIR+' }), 'Badge'));
  add(hd, ph);
  add(hd, fr('Infos', { dir: 'V', gap: 2, fillW: true, kids: [named(tx('Léa Martin', 'Titre/S'), 'Nom'), named(tx('Balayage · Strasbourg', 'Légende', { c: 'texte/secondaire' }), 'Détail'), named(inst('Note'), 'Note')] }));
  parent.appendChild(hd);
  propText(hd, 'Nom', hd.findOne((x) => x.name === 'Nom'));
  propText(hd, 'Détail', hd.findOne((x) => x.name === 'Détail'));
  propBool(hd, 'Badge CHAIR+', hd.findOne((x) => x.name === 'Badge'), false);
  K['Carte coiffeur'] = hd;

  // Résultat de recherche
  const rs = comp('Résultat de recherche', { dir: 'H', gap: 14, w: 358, pad: 12, align: 'center', r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte' });
  add(rs, fr('Photo', { w: 76, h: 76, r: 18, bg: 'fond/creux' }));
  add(rs, fr('Infos', { dir: 'V', gap: 3, grow: true, kids: [
    named(tx('Léa Martin', 'Titre/S'), 'Nom'),
    named(tx('Balayage · Indépendante', 'Légende', { c: 'texte/secondaire' }), 'Détail'),
    fr('Ligne', { dir: 'H', gap: 8, align: 'center', kids: [named(inst('Note'), 'Note'), named(tx('1,2 km', 'Légende', { c: 'texte/secondaire' }), 'Distance')] }),
  ] }));
  add(rs, ic('ChevronRight', 16, 'texte/tertiaire'));
  parent.appendChild(rs);
  propText(rs, 'Nom', rs.findOne((x) => x.name === 'Nom'));
  propText(rs, 'Détail', rs.findOne((x) => x.name === 'Détail'));
  propText(rs, 'Distance', rs.findOne((x) => x.name === 'Distance'));
  K['Résultat de recherche'] = rs;

  // Vignette réalisation
  const vr = comp('Vignette réalisation', { dir: 'V', w: 116, h: 146, r: 6, bg: 'fond/creux', justify: 'end', pad: 8, clip: true });
  add(vr, fr('Likes', { dir: 'H', gap: 3, align: 'center', kids: [ic('Heart', 12, 'sombre/texte'), named(tx('128', 'Légende/S', { c: 'sombre/texte' }), 'Likes')] }));
  parent.appendChild(vr);
  propText(vr, 'Likes', vr.findOne((x) => x.name === 'Likes' && x.type === 'TEXT'));
  K['Vignette réalisation'] = vr;

  // En-tête de section
  const sh = comp('En-tête de section', { dir: 'H', w: 358, justify: 'between', align: 'end' });
  add(sh, fr('Titres', { dir: 'V', gap: 4, kids: [named(tx('Sélection CHAIR', 'Micro-titre', { c: 'texte/tertiaire' }), 'Surtitre'), named(tx('Coup de cœur CHAIR', 'Titre/M'), 'Titre')] }));
  add(sh, named(tx('Voir tout', 'Corps/S fort', { c: 'texte/secondaire' }), 'Lien'));
  parent.appendChild(sh);
  propText(sh, 'Surtitre', sh.findOne((x) => x.name === 'Surtitre'));
  propText(sh, 'Titre', sh.findOne((x) => x.name === 'Titre'));
  propBool(sh, 'Voir tout', sh.findOne((x) => x.name === 'Lien'), true);
  K['En-tête de section'] = sh;
}

// ── Surfaces : carte, feuille, modale, toast, vide, squelette ───────────
function buildSurfaces(parent) {
  const card = comp('Carte', { dir: 'V', gap: 10, w: 358, pad: 20, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte' });
  add(card, named(tx('Ma vitrine', 'Micro-titre', { c: 'texte/tertiaire' }), 'Surtitre'));
  add(card, named(tx('Contenu de la carte', 'Corps/M'), 'Contenu'));
  parent.appendChild(card);
  propText(card, 'Surtitre', card.findOne((x) => x.name === 'Surtitre'));
  propText(card, 'Contenu', card.findOne((x) => x.name === 'Contenu'));
  K['Carte'] = card;

  const dark = comp('Carte sombre', { dir: 'V', gap: 8, w: 358, pad: 22, r: 'rayon/carte', bg: 'sombre/fond', fx: 'Sombre' });
  add(dark, named(tx('Votre semaine', 'Micro-titre', { c: 'neutre/400' }), 'Surtitre'));
  add(dark, named(tx('12', 'Chiffre géant', { c: 'sombre/texte' }), 'Valeur'));
  add(dark, named(tx('rendez-vous honorés', 'Corps/S', { c: 'neutre/400' }), 'Libellé'));
  parent.appendChild(dark);
  propText(dark, 'Surtitre', dark.findOne((x) => x.name === 'Surtitre'));
  propText(dark, 'Valeur', dark.findOne((x) => x.name === 'Valeur'));
  propText(dark, 'Libellé', dark.findOne((x) => x.name === 'Libellé'));
  K['Carte sombre'] = dark;

  const sheet = comp('Feuille (bottom sheet)', { dir: 'V', gap: 16, w: 390, pad: [10, 20, 40, 20], r: [28, 28, 0, 0], bg: 'fond/surface', fx: 'Flottant', align: 'center' });
  add(sheet, rect('Poignée', { w: 36, h: 5, r: 3, bg: 'neutre/200' }));
  add(sheet, named(tx('Titre de la feuille', 'Titre/M', { fillW: true }), 'Titre'));
  add(sheet, named(tx('Le contenu de la feuille se place ici.', 'Corps/S', { c: 'texte/secondaire', fillW: true }), 'Texte'));
  const b = inst('Bouton', { 'Libellé': 'Valider' }); b.name = 'Action';
  add(sheet, b); b.layoutSizingHorizontal = 'FILL';
  parent.appendChild(sheet);
  propText(sheet, 'Titre', sheet.findOne((x) => x.name === 'Titre'));
  propText(sheet, 'Texte', sheet.findOne((x) => x.name === 'Texte'));
  K['Feuille'] = sheet;

  const modal = comp('Modale', { dir: 'V', gap: 14, w: 320, pad: 24, r: 'rayon/carte', bg: 'fond/surface', fx: 'Flottant', align: 'center' });
  add(modal, fr('Pictogramme', { dir: 'H', w: 56, h: 56, r: 28, bg: 'fond/creux', justify: 'center', align: 'center', kids: [named(ic('MapPin', 24, 'texte/principal'), 'Icône')] }));
  add(modal, named(tx('Activer la localisation ?', 'Titre/M', { align: 'center', fillW: true }), 'Titre'));
  add(modal, named(tx('Pour te montrer les coiffeurs les plus proches.', 'Corps/S', { c: 'texte/secondaire', align: 'center', fillW: true }), 'Texte'));
  const m1 = inst('Bouton', { 'Libellé': 'Autoriser' }); m1.name = 'Action principale';
  const m2 = inst('Bouton', { 'Libellé': 'Plus tard', Type: 'Fantôme' }); m2.name = 'Action secondaire';
  add(modal, m1); m1.layoutSizingHorizontal = 'FILL';
  add(modal, m2); m2.layoutSizingHorizontal = 'FILL';
  parent.appendChild(modal);
  propText(modal, 'Titre', modal.findOne((x) => x.name === 'Titre'));
  propText(modal, 'Texte', modal.findOne((x) => x.name === 'Texte'));
  K['Modale'] = modal;

  const tl = [];
  for (const [type, icon] of [['Succès', 'CircleCheck'], ['Erreur', 'CircleAlert'], ['Info', 'Info']]) {
    const t = comp(variantName({ Type: type }), { dir: 'H', gap: 10, pad: [12, 16], align: 'center', r: 16, bg: 'sombre/fond', fx: 'Flottant' });
    add(t, ic(icon, 17, type === 'Erreur' ? 'statut/erreur' : type === 'Succès' ? 'statut/succes' : 'sombre/texte'));
    add(t, named(tx(type === 'Erreur' ? 'Impossible d\'enregistrer. Réessaie.' : type === 'Succès' ? 'Rendez-vous confirmé.' : 'Lien copié.', 'Corps/S fort', { c: 'sombre/texte' }), 'Message'));
    tl.push(t);
  }
  const ts = makeSet('Toast', tl, parent, 3);
  bindText(ts, 'Message', 'Message', 'Rendez-vous confirmé.');

  const em = comp('État vide', { dir: 'V', gap: 12, w: 358, pad: [40, 24], align: 'center' });
  add(em, fr('Pictogramme', { dir: 'H', w: 64, h: 64, r: 32, bg: 'fond/creux', justify: 'center', align: 'center', kids: [named(ic('Heart', 26, 'texte/tertiaire'), 'Icône')] }));
  add(em, named(tx('Aucun favori', 'Titre/M', { align: 'center', fillW: true }), 'Titre'));
  add(em, named(tx('Garde ici les coiffeurs que tu aimes.', 'Corps/S', { c: 'texte/secondaire', align: 'center', fillW: true }), 'Texte'));
  const eb = inst('Bouton', { 'Libellé': 'Explorer', Taille: 'S', Type: 'Doux' }); eb.name = 'Action';
  add(em, eb);
  parent.appendChild(em);
  propText(em, 'Titre', em.findOne((x) => x.name === 'Titre'));
  propText(em, 'Texte', em.findOne((x) => x.name === 'Texte'));
  propBool(em, 'Action', eb, true);
  propSwap(em, 'Choix icône', em.findOne((x) => x.name === 'Icône'));
  K['État vide'] = em;

  const sk = [];
  for (const type of ['Ligne', 'Carte coiffeur', 'Résultat']) {
    const c = comp(variantName({ Type: type }), { dir: type === 'Résultat' ? 'H' : 'V', gap: 10, w: type === 'Carte coiffeur' ? 168 : 358, align: type === 'Résultat' ? 'center' : null });
    if (type === 'Ligne') kids(c, [rect('L1', { w: 220, h: 14, r: 7, bg: 'fond/creux' }), rect('L2', { w: 300, h: 12, r: 6, bg: 'fond/creux' }), rect('L3', { w: 180, h: 12, r: 6, bg: 'fond/creux' })]);
    if (type === 'Carte coiffeur') kids(c, [rect('Photo', { w: 168, h: 210, r: 20, bg: 'fond/creux' }), rect('Nom', { w: 110, h: 13, r: 6, bg: 'fond/creux' }), rect('Détail', { w: 80, h: 11, r: 6, bg: 'fond/creux' })]);
    if (type === 'Résultat') kids(c, [rect('Photo', { w: 76, h: 76, r: 18, bg: 'fond/creux' }), fr('Lignes', { dir: 'V', gap: 8, kids: [rect('a', { w: 150, h: 13, r: 6, bg: 'fond/creux' }), rect('b', { w: 110, h: 11, r: 6, bg: 'fond/creux' }), rect('c', { w: 70, h: 11, r: 6, bg: 'fond/creux' })] })]);
    sk.push(c);
  }
  makeSet('Squelette', sk, parent, 3);

  const demo = comp('Bandeau démo', { dir: 'H', gap: 6, pad: [5, 10], align: 'center', r: 'rayon/pilule', bg: 'statut/alerte-fond' });
  add(demo, ic('Info', 12, 'statut/alerte'));
  add(demo, named(tx('Données de démonstration', 'Légende/S', { c: 'statut/alerte' }), 'Texte'));
  parent.appendChild(demo);
  K['Bandeau démo'] = demo;
}

// ── Réservation, agenda, saisie ─────────────────────────────────────────
function buildBooking(parent) {
  const cl = [];
  for (const etat of ['Disponible', 'Sélectionné', 'Indisponible']) {
    const c = comp(variantName({ 'État': etat }), { dir: 'H', w: 78, h: 44, r: 14, justify: 'center', align: 'center', bg: etat === 'Sélectionné' ? 'cta/fond' : etat === 'Indisponible' ? 'fond/creux' : 'fond/surface', stroke: etat === 'Disponible' ? 'bordure/moyenne' : null });
    const t = named(tx('10:30', 'Corps/S fort', { c: etat === 'Sélectionné' ? 'cta/texte' : etat === 'Indisponible' ? 'texte/tertiaire' : 'texte/principal' }), 'Heure');
    if (etat === 'Indisponible') t.textDecoration = 'STRIKETHROUGH';
    add(c, t);
    cl.push(c);
  }
  const cs = makeSet('Créneau', cl, parent, 3);
  bindText(cs, 'Heure', 'Heure', '10:30');

  const dl = [];
  for (const etat of ['Défaut', 'Sélectionné', 'Aujourd\'hui', 'Indisponible']) {
    const sel = etat === 'Sélectionné';
    const c = comp(variantName({ 'État': etat }), { dir: 'V', gap: 4, w: 52, h: 66, r: 16, justify: 'center', align: 'center', bg: sel ? 'cta/fond' : 'fond/surface', stroke: etat === 'Aujourd\'hui' ? 'neutre/900' : null });
    add(c, named(tx('mar.', 'Légende/S', { c: sel ? 'cta/texte' : 'texte/secondaire' }), 'Jour'));
    add(c, named(tx('14', 'Titre/S', { c: sel ? 'cta/texte' : 'texte/principal' }), 'Date'));
    if (etat === 'Indisponible') c.opacity = 0.35;
    dl.push(c);
  }
  const ds = makeSet('Jour', dl, parent, 4);
  bindText(ds, 'Jour', 'Jour', 'mar.');
  bindText(ds, 'Date', 'Date', '14');

  const rl = [];
  const RDV = { 'Confirmé': ['cta/fond', 'cta/texte'], 'En attente': ['fond/surface', 'texte/principal'], 'Terminé': ['fond/creux', 'texte/secondaire'], 'Annulé': ['statut/erreur-fond', 'statut/erreur'], 'Indisponibilité': ['neutre/200', 'texte/secondaire'] };
  for (const [st, [bg, c]] of Object.entries(RDV)) {
    const b = comp(variantName({ Statut: st }), { dir: 'V', gap: 2, w: 280, pad: [8, 12], r: 12, bg, stroke: st === 'En attente' ? 'neutre/400' : null });
    if (st === 'En attente') b.dashPattern = [4, 3];
    add(b, named(tx(st === 'Indisponibilité' ? 'Pause déjeuner' : 'Camille R. · Balayage', 'Corps/S fort', { c }), 'Titre'));
    add(b, named(tx('10:30 – 12:00', 'Légende', { c, opacity: 0.75 }), 'Horaire'));
    rl.push(b);
  }
  const rs = makeSet('Bloc agenda', rl, parent, 5);
  bindText(rs, 'Titre', 'Titre', 'Camille R. · Balayage');
  bindText(rs, 'Horaire', 'Horaire', '10:30 – 12:00');

  const sw = [];
  for (const on of ['Oui', 'Non']) {
    const c = comp(variantName({ Actif: on }), { dir: 'H', w: 51, h: 31, r: 16, pad: 2, align: 'center', justify: on === 'Oui' ? 'end' : 'start', bg: on === 'Oui' ? 'cta/fond' : 'neutre/200' });
    add(c, ellipse('Bouton', { w: 27, bg: 'neutre/0' }));
    sw.push(c);
  }
  makeSet('Interrupteur', sw, parent, 2);

  const cb = [];
  for (const forme of ['Case', 'Radio']) for (const etat of ['Coché', 'Vide']) {
    const on = etat === 'Coché';
    const c = comp(variantName({ Forme: forme, 'État': etat }), { dir: 'H', w: 22, h: 22, r: forme === 'Radio' ? 11 : 7, justify: 'center', align: 'center', bg: on ? 'cta/fond' : 'fond/surface', stroke: on ? null : 'bordure/moyenne', strokeW: 1.5 });
    if (on) add(c, forme === 'Radio' ? ellipse('Point', { w: 8, bg: 'cta/texte' }) : ic('Check', 14, 'cta/texte'));
    cb.push(c);
  }
  makeSet('Case à cocher', cb, parent, 4);

  const up = comp('Zone de dépôt', { dir: 'V', gap: 8, w: 358, h: 150, r: 'rayon/vignette', justify: 'center', align: 'center', bg: 'fond/app', stroke: 'neutre/300', strokeW: 1.5 });
  up.dashPattern = [6, 6];
  add(up, ic('ImagePlus', 26, 'texte/secondaire'));
  add(up, named(tx('Ajouter une photo', 'Corps/S fort', { c: 'texte/principal' }), 'Texte'));
  add(up, named(tx('JPG ou PNG', 'Légende', { c: 'texte/tertiaire' }), 'Aide'));
  parent.appendChild(up);
  propText(up, 'Texte', up.findOne((x) => x.name === 'Texte'));
  K['Zone de dépôt'] = up;

  const stat = comp('Chiffre clé', { dir: 'V', gap: 2, w: 160 });
  add(stat, named(tx('4,8', 'Chiffre géant'), 'Valeur'));
  add(stat, named(tx('note moyenne', 'Légende', { c: 'texte/secondaire' }), 'Libellé'));
  parent.appendChild(stat);
  propText(stat, 'Valeur', stat.findOne((x) => x.name === 'Valeur'));
  propText(stat, 'Libellé', stat.findOne((x) => x.name === 'Libellé'));
  K['Chiffre clé'] = stat;

  const pl = [];
  for (const step of ['1', '2', '3', '4', '5']) {
    const c = comp(variantName({ 'Étape': step + '/5' }), { dir: 'H', w: 300, h: 3, r: 2, bg: 'neutre/200', clip: true });
    add(c, rect('Progression', { w: 300 * Number(step) / 5, h: 3, r: 2, bg: 'neutre/900' }));
    pl.push(c);
  }
  makeSet('Progression', pl, parent, 1);

  // Barre latérale desktop
  const sl = [];
  for (const actif of ['Oui', 'Non']) {
    const on = actif === 'Oui';
    const c = comp(variantName({ Actif: actif }), { dir: 'H', gap: 12, w: 216, h: 40, pad: [0, 12], align: 'center', r: 12, bg: on ? 'fond/creux' : null });
    const i = ic('House', 18, on ? 'texte/principal' : 'texte/secondaire'); i.name = 'Icône';
    add(c, i);
    add(c, named(tx('Accueil', on ? 'Corps/S fort' : 'Corps/S', { c: on ? 'texte/principal' : 'texte/secondaire' }), 'Libellé'));
    sl.push(c);
  }
  const ss = makeSet('Élément barre latérale', sl, parent, 2);
  bindText(ss, 'Libellé', 'Libellé', 'Accueil');
  bindSwap(ss, 'Choix icône', 'Icône', 'House');
}

async function buildComponents() {
  const page = await newPage('02 — Components');
  await go(page);
  const sections = [
    ['Système iOS', 'Barre d\'état, indicateur d\'accueil, clavier — pour les états réalistes.', buildSystem],
    ['Boutons', 'Cinq types, deux tailles, trois états. Propriétés : libellé, icône (affichage + choix).', buildButtons],
    ['Champs et recherche', 'États défaut, focus, rempli, erreur, désactivé.', buildInputs],
    ['Pilules, badges, segments', 'Filtres, statuts, onglets segmentés des fiches.', buildChips],
    ['Navigation', 'Barres d\'onglets réelles : CHAIR (5, onglet Fil central sans libellé), CHAIR PRO (indépendant 6 avec Plus, salarié 5), CHAIR BUSINESS (5). Barres hautes.', (p) => {
      buildTabBar(p, 'Onglets/CHAIR', NAV_CLIENT, 'client');
      buildTabBar(p, 'Onglets/CHAIR PRO — indépendant', NAV_PRO, 'pro');
      buildTabBar(p, 'Onglets/CHAIR PRO — salarié', NAV_PRO_SALARIE, 'pro');
      buildTabBar(p, 'Onglets/CHAIR BUSINESS', NAV_BUSINESS, 'pro');
      buildTopBars(p);
    }],
    ['Listes, cartes, avatars', 'Ligne de liste, carte coiffeur, résultat de recherche, vignette de réalisation, avatar, note.', buildLists],
    ['Surfaces et retours', 'Carte claire, carte sombre, feuille, modale, toast, état vide, squelettes, bandeau démo.', buildSurfaces],
    ['Réservation, agenda, saisie', 'Créneaux, jours, blocs d\'agenda, interrupteur, cases, dépôt de photo, chiffres clés, progression, barre latérale desktop.', buildBooking],
  ];
  let y = 100;
  for (const [title, note, fn] of sections) {
    const sec = figma.createSection();
    sec.name = title;
    page.appendChild(sec);
    const holder = fr(title, { dir: 'V', gap: 28, pad: 48 });
    add(holder, fr('Titre', { dir: 'V', gap: 6, kids: [tx(title, 'Titre/XL'), tx(note, 'Corps/M', { c: 'texte/secondaire', w: 900 })] }));
    const area = fr('Composants', { dir: 'V', gap: 32 });
    add(holder, area);
    sec.appendChild(holder);
    fn(area);
    await flush();
    sec.resizeWithoutConstraints(Math.max(holder.width + 96, 1200), holder.height + 96);
    holder.x = 48; holder.y = 48;
    sec.x = 100; sec.y = y;
    y += sec.height + 160;
    prog('Composants : ' + title);
  }
  closeContainer(page);
  return page;
}
