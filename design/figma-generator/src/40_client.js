// ═══ 03 — CHAIR Client — Mobile ═════════════════════════════════════════
// Écrans relevés dans frontend/app (routes /, /connexion, /inscription,
// /app/*). Données de démonstration fictives.

const C = {
  splash: 'C-01 Ouverture', welcome: 'C-02 Bienvenue', login: 'C-03 Connexion', loginErr: 'C-04 Connexion — erreur',
  signName: 'C-05 Inscription — identité', signMail: 'C-06 Inscription — e-mail (clavier)', signPhone: 'C-07 Inscription — téléphone',
  signPwd: 'C-08 Inscription — mot de passe', signCity: 'C-09 Inscription — ville', forgot: 'C-10 Mot de passe oublié',
  forgotSent: 'C-11 Lien envoyé', reset: 'C-12 Nouveau mot de passe',
  obUniverse: 'C-13 Onboarding — univers', obStyles: 'C-14 Onboarding — envies', obLoc: 'C-15 Onboarding — localisation', obDone: 'C-16 Onboarding — prêt',
  home: 'C-20 Accueil', homeGuest: 'C-21 Accueil — visiteur', homeLoad: 'C-22 Accueil — chargement', offline: 'C-23 Hors connexion',
  geoModal: 'M-01 Localisation (modale)', signupModal: 'M-02 Compte requis (modale)',
  search: 'C-30 Recherche', results: 'C-31 Résultats — liste', map: 'C-32 Résultats — carte', filters: 'F-01 Filtres (feuille)',
  noResult: 'C-34 Aucun résultat', geoDenied: 'C-35 Localisation refusée',
  profile: 'C-40 Profil coiffeur — réalisations', profileServices: 'C-41 Profil — prestations', profileReviews: 'C-42 Profil — avis',
  profileAbout: 'C-43 Profil — à propos', salon: 'C-44 Fiche salon', post: 'C-45 Réalisation',
  share: 'F-02 Partager (feuille)', report: 'F-03 Signaler (feuille)', block: 'F-04 Bloquer (feuille)',
  bkService: 'C-50 Réserver — prestation', bkSlot: 'C-51 Réserver — date et créneau', bkRecap: 'C-52 Réserver — récapitulatif',
  bkDone: 'C-53 Réserver — confirmé', bkTaken: 'C-54 Réserver — créneau pris',
  feed: 'C-60 Fil', favs: 'C-61 Favoris — coiffeurs', favPosts: 'C-62 Favoris — réalisations', favEmpty: 'C-63 Favoris — vide',
  ranking: 'C-64 Classements', goals: 'C-65 Mes objectifs', jobs: 'C-66 Recrutement',
  scan: 'C-70 Visite vérifiée', salonScan: 'C-71 QR salon — qui t\'a coiffé', review: 'C-72 Laisser un avis', reviewDone: 'C-73 Avis publié', reviewModal: 'M-03 Demande d\'avis (modale)',
  account: 'C-80 Compte', edit: 'C-81 Modifier mes infos', appts: 'C-82 Mes rendez-vous', appt: 'C-83 Détail du rendez-vous', cancel: 'F-05 Annuler le rendez-vous (feuille)',
  notifs: 'C-84 Notifications', notifPrefs: 'C-85 Préférences de notifications', help: 'C-86 Aide', rules: 'C-87 Règles et comptes bloqués',
  del: 'C-88 Supprimer mon compte', legal: 'C-89 Confidentialité (feuille Safari)',
  rental: 'C-95 Annonce fauteuil (page publique)', referral: 'C-96 Parrainage (page publique)', invite: 'C-97 Invitation salon', download: 'C-98 Télécharger l\'app',
};
const CLIENT_TABS = () => ({ Accueil: C.home, Rechercher: C.search, Fil: C.feed, Favoris: C.favs, Compte: C.account });
function clientTab(actif) { return ['Onglets/CHAIR', actif]; }

// Lien actif seulement sur la page client (la fiche est réutilisée ailleurs en aperçu).
function clientLink(node, to, kind) { return CUR && CUR.product === 'CHAIR Client' ? link(node, to, kind) : node; }

// Briques propres au client
function bigTitle(t, sub, o) {
  o = o || {};
  return fr('Titre', { dir: 'V', gap: 8, fillW: true, pad: o.pad || [8, 0, 4, 0], kids: [o.eyebrow ? micro(o.eyebrow, o.dark) : null, tx(t, o.size || 'Titre/XL', { c: o.dark ? 'sombre/texte' : 'texte/principal', fillW: true }), sub ? tx(sub, 'Corps/M', { c: o.dark ? 'neutre/400' : 'texte/secondaire', fillW: true }) : null] });
}
function searchBar(to, txt) {
  const s = inst('Barre de recherche', { Texte: txt || 'Coiffeur, spécialité, ville…' });
  SIZING.set(s, { fillW: true });
  if (to) link(s, to);
  return s;
}
function locationBar() {
  return fr('Ville active', { dir: 'H', gap: 6, align: 'center', kids: [ic('MapPin', 14, 'texte/principal'), tx('Strasbourg', 'Corps/S fort'), ic('ChevronDown', 14, 'texte/secondaire')] });
}
function mapBlock(name, h, o) {
  o = o || {};
  const m = fr(name, { w: o.w || 358, h, r: o.r == null ? 'rayon/carte' : o.r, bg: 'neutre/100', clip: true });
  const roads = [[0, h * 0.35, o.w || 358, 10], [(o.w || 358) * 0.42, 0, 12, h], [0, h * 0.72, o.w || 358, 7], [(o.w || 358) * 0.78, 0, 8, h]];
  for (const [x, y, w, hh] of roads) { const r = rect('Route', { w, h: hh, bg: 'neutre/0' }); m.appendChild(r); r.x = x; r.y = y; }
  const pins = o.pins || [[0.2, 0.25], [0.55, 0.2], [0.7, 0.55], [0.32, 0.6], [0.85, 0.3], [0.5, 0.82]];
  pins.forEach(([px, py], i) => {
    const p = fr('Repère ' + (i + 1), { dir: 'H', gap: 4, pad: [5, 9], r: 'rayon/pilule', bg: i === 0 ? 'cta/fond' : 'fond/surface', fx: 'Carte appui', align: 'center', kids: [ic('Star', 11, i === 0 ? 'cta/texte' : 'texte/principal'), tx(['4,9', '4,8', '4,9', '4,7', '4,8', '4,6'][i % 6], 'Légende/S', { c: i === 0 ? 'cta/texte' : 'texte/principal' })] });
    m.appendChild(p); p.x = (o.w || 358) * px; p.y = h * py;
  });
  const me = ellipse('Ma position', { w: 16, bg: 'statut/info' }); strokeVar(me, 'neutre/0', 3); m.appendChild(me); me.x = (o.w || 358) * 0.45; me.y = h * 0.45;
  if (o.fillW) SIZING.set(m, { fillW: true });
  return m;
}
function specialtyTile(label, img, to) {
  const t = fr(label, { dir: 'V', gap: 8, w: 104, align: 'center' });
  const p = photo('Illustration', 104, 104, img, 22);
  strokeVar(p, 'bordure/legere');
  add(t, p);
  add(t, tx(label, 'Légende', { align: 'center', w: 104 }));
  if (to) link(t, to);
  return t;
}
function serviceRow(name, dur, price, selected, to) {
  const r = fr(name, { dir: 'H', gap: 12, pad: [16, 18], fillW: true, align: 'center', r: 20, bg: 'fond/surface', stroke: selected ? 'neutre/900' : 'bordure/moyenne', strokeW: selected ? 1.5 : 1 });
  add(r, fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx(name, 'Corps/S fort'), tx(dur, 'Légende', { c: 'texte/secondaire' })] }));
  add(r, tx(price, 'Titre/S'));
  add(r, inst('Case à cocher', { Forme: 'Radio', 'État': selected ? 'Coché' : 'Vide' }));
  if (to) link(r, to);
  return r;
}
function reviewItem(name, ini, note, txt, when) {
  return fr('Avis — ' + name, { dir: 'V', gap: 8, fillW: true, pad: [16, 0], kids: [
    fr('Auteur', { dir: 'H', gap: 10, align: 'center', fillW: true, kids: [avatar(ini, 'S'), fr('Nom', { dir: 'V', gap: 1, grow: true, kids: [tx(name, 'Corps/S fort'), tx(when, 'Légende/S', { c: 'texte/tertiaire' })] }), badge('Avis vérifié', 'Succès')] }),
    noteRow(note),
    tx(txt, 'Corps/S', { c: 'texte/secondaire', fillW: true }),
  ] });
}
function profileHeader(c, active) {
  return [
    fr('Couverture', { w: 390, h: 196, bg: 'fond/creux', clip: true, kids: [] }),
    fr('Identité', { dir: 'V', gap: 10, fillW: true, pad: [0, 16], kids: [
      fr('Avatar et actions', { dir: 'H', fillW: true, justify: 'between', align: 'end', kids: [avatar(c.ini, 'L', true), fr('Actions', { dir: 'H', gap: 8, kids: [
        chip('Suivre', true), chip('Favori', false, { icon: 'Heart' }), clientLink(fr('Partager', { dir: 'H', w: 40, h: 40, r: 20, bg: 'fond/surface', stroke: 'bordure/moyenne', justify: 'center', align: 'center', kids: [ic('Share2', 17)] }), C.share, 'overlay'),
      ] })] }),
      fr('Nom', { dir: 'H', gap: 8, align: 'center', kids: [tx(c.nom, 'Titre/L'), c.plus ? badge('CHAIR+', 'Sombre') : null] }),
      tx(c.spe + ' · ' + c.statut + ' · ' + c.ville, 'Corps/S', { c: 'texte/secondaire' }),
      fr('Chiffres', { dir: 'H', gap: 24, pad: [6, 0], kids: [
        fr('Note', { dir: 'V', gap: 0, kids: [tx(c.note, 'Titre/M'), tx(c.avis + ' avis vérifiés', 'Légende', { c: 'texte/secondaire' })] }),
        fr('Abonnés', { dir: 'V', gap: 0, kids: [tx('312', 'Titre/M'), tx('abonnés', 'Légende', { c: 'texte/secondaire' })] }),
        fr('Niveau', { dir: 'V', gap: 0, kids: [tx('Expert', 'Titre/M'), tx(c.spe, 'Légende', { c: 'texte/secondaire' })] }),
      ] }),
    ] }),
    fr('Onglets', { dir: 'H', fillW: true, pad: [0, 16], kids: [(() => {
      const s = inst('Segments', { Actif: String(active), 'Segment 1': 'Réalisations', 'Segment 2': 'Prestations', 'Segment 3': 'Avis' });
      SIZING.set(s, { fillW: true });
      const segs = [C.profile, C.profileServices, C.profileReviews];
      segs.forEach((to, i) => { const n = s.findOne((x) => x.name === 'Segment ' + (i + 1) && x.type === 'FRAME'); if (n) clientLink(n, to, 'swap'); });
      return s;
    })()] }),
  ];
}
function stickyCta(label, to, sub) {
  return fr('Action fixe', { dir: 'H', gap: 12, w: 390, pad: [12, 16, 12, 16], bg: 'fond/surface', fx: 'Barre basse', align: 'center', kids: [
    sub ? fr('Prix', { dir: 'V', gap: 0, kids: [tx(sub[0], 'Légende', { c: 'texte/secondaire' }), tx(sub[1], 'Titre/S')] }) : null,
    (() => { const b = btn(label, { to }); return b; })(),
  ] });
}

async function buildClient(page) {
  startProduct(page, 'CHAIR Client');
  const L = DEMO.coiffeurs;

  // ── Démarrage et authentification ─────────────────────────────────────
  row('Démarrage et compte', 'Ouverture, accueil, connexion, inscription pas à pas (une question par écran), récupération du mot de passe.');
  mobile(C.splash, { route: 'Lancement de l\'app', status: 'E', bg: 'sombre/fond', statusBar: 'Sombre', statusBg: 'sombre/fond', flow: '① Client — premier lancement', pad: [300, 16, 0, 16] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, tx('CHAIR', 'Logo/L', { c: 'sombre/texte' }));
    add(b, rect('Filet', { w: 40, h: 2, r: 1, bg: 'accent/or' }));
  });
  const sp = SCREENS[page.name][C.splash]; link(sp, C.welcome, 'swap');

  mobile(C.welcome, { route: '/ (premier lancement)', status: 'E', pad: [24, 24, 24, 24] }, (b) => {
    add(b, fr('Passer', { dir: 'H', fillW: true, justify: 'end', kids: [link(tx('Passer', 'Corps/S fort', { c: 'texte/secondaire' }), C.obUniverse, 'push')] }));
    add(b, spacer(60));
    const ill = photo('Illustration', 342, 300, 'coiffure-femme', 32); add(b, ill);
    add(b, bigTitle('Trouve le coiffeur qui te correspond.', 'Découvre des professionnels selon ton style, ta ville et tes besoins.'));
    add(b, fr('Pagination', { dir: 'H', gap: 6, kids: [rect('1', { w: 18, h: 6, r: 3, bg: 'neutre/900' }), rect('2', { w: 6, h: 6, r: 3, bg: 'neutre/300' }), rect('3', { w: 6, h: 6, r: 3, bg: 'neutre/300' }), rect('4', { w: 6, h: 6, r: 3, bg: 'neutre/300' })] }));
    add(b, spacer(12));
    add(b, btn('Suivant', { to: C.obUniverse }));
    add(b, btn('J\'ai déjà un compte', { type: 'Fantôme', to: C.login }));
  });

  mobile(C.login, { route: '/connexion', status: 'E', top: topBar('Connexion'), pad: [24, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Content de te revoir.', 'Connecte-toi pour retrouver tes coiffeurs.'));
    add(b, field('Adresse e-mail', 'camille@exemple.fr', { filled: true, icon: 'Mail' }));
    add(b, field('Mot de passe', '••••••••', { filled: true, icon: 'Lock' }));
    add(b, fr('Oubli', { dir: 'H', fillW: true, justify: 'end', kids: [link(tx('Mot de passe oublié ?', 'Corps/S fort', { c: 'texte/secondaire' }), C.forgot)] }));
    add(b, btn('Se connecter', { to: C.home, kind: 'swap' }));
    add(b, fr('Inscription', { dir: 'H', gap: 4, fillW: true, justify: 'center', kids: [tx('Pas encore de compte ?', 'Corps/S', { c: 'texte/secondaire' }), link(tx('Créer un compte', 'Corps/S fort'), C.signName)] }));
  });
  mobile(C.loginErr, { route: '/connexion', status: 'E', note: 'État erreur', top: topBar('Connexion'), pad: [24, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Content de te revoir.', null));
    add(b, fr('Alerte', { dir: 'H', gap: 8, fillW: true, pad: [12, 14], r: 16, bg: 'statut/erreur-fond', align: 'center', kids: [ic('CircleAlert', 16, 'statut/erreur'), tx('E-mail ou mot de passe incorrect.', 'Corps/S fort', { c: 'statut/erreur', grow: true })] }));
    add(b, field('Adresse e-mail', 'camille@exemple.fr', { state: 'Erreur', icon: 'Mail' }));
    add(b, field('Mot de passe', '••••••', { state: 'Erreur', icon: 'Lock' }));
    add(b, btn('Se connecter'));
  });
  const signStep = (name, route, n, title, hint, fld, next, extra, kb) => mobile(name, { route, status: 'E', pad: [12, 16, 24, 16], top: fr('En-tête', { dir: 'V', gap: 12, w: 390, pad: [6, 16, 10, 16], bg: 'fond/app', kids: [fr('Ligne', { dir: 'H', fillW: true, align: 'center', kids: [link(ic('ArrowLeft', 20), null, 'back')] }), inst('Progression', { 'Étape': n + '/5' })] }), bottom: kb ? inst('iOS/Clavier') : null, noHome: !!kb }, (b) => {
    add(b, bigTitle(title, hint, { size: 'Titre/L' }));
    add(b, fld);
    if (extra) add(b, extra);
    add(b, btn('Continuer', { to: next }));
  });
  signStep(C.signName, '/inscription', 1, 'Comment tu t\'appelles ?', null, field(null, 'Camille Petit', { filled: true, icon: 'User' }), C.signMail);
  signStep(C.signMail, '/inscription', 2, 'Ton adresse e-mail ?', 'Elle servira à te connecter.', field(null, 'camille@exemple', { state: 'Focus', icon: 'Mail' }), C.signPhone, null, true);
  signStep(C.signPhone, '/inscription', 3, 'Ton numéro ?', 'Pour que ton coiffeur puisse te joindre.', field(null, '06 12 34 56 78', { filled: true, icon: 'Phone' }), C.signPwd);
  signStep(C.signPwd, '/inscription', 4, 'Choisis un mot de passe.', '8 caractères minimum.', field(null, '••••••••••', { filled: true, icon: 'Lock' }), C.signCity, tx('En continuant, tu acceptes nos CGU et notre Politique de confidentialité.', 'Légende', { c: 'texte/tertiaire', fillW: true }));
  signStep(C.signCity, '/inscription', 5, 'Ta ville ?', 'Pour te montrer les coiffeurs près de chez toi.', field(null, 'Strasbourg', { filled: true, icon: 'MapPin' }), C.obUniverse);
  mobile(C.forgot, { route: '/mot-de-passe-oublie', status: 'E', top: topBar('Mot de passe oublié'), pad: [24, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Pas de panique.', 'Entre ton e-mail, on t\'envoie un lien pour le réinitialiser.', { size: 'Titre/L' }));
    add(b, field('Adresse e-mail', 'camille@exemple.fr', { filled: true, icon: 'Mail' }));
    add(b, btn('Envoyer le lien', { to: C.forgotSent }));
  });
  mobile(C.forgotSent, { route: '/mot-de-passe-oublie', status: 'E', note: 'Succès', top: topBar('Mot de passe oublié'), pad: [120, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 72, h: 72, r: 36, bg: 'statut/succes-fond', justify: 'center', align: 'center', kids: [ic('Mail', 30, 'statut/succes')] }));
    add(b, tx('Lien envoyé.', 'Titre/L', { align: 'center' }));
    add(b, tx('Ouvre l\'e-mail reçu sur camille@exemple.fr pour choisir un nouveau mot de passe.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
    add(b, btn('Retour à la connexion', { type: 'Doux', to: C.login }));
  });
  mobile(C.reset, { route: '/reinitialiser-mot-de-passe', status: 'E', top: topBar('Nouveau mot de passe', { back: false }), pad: [24, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Nouveau mot de passe.', null, { size: 'Titre/L' }));
    add(b, field('Nouveau mot de passe', '••••••••••', { filled: true, icon: 'Lock' }));
    add(b, field('Confirmer', '••••••••••', { filled: true, icon: 'Lock' }));
    add(b, btn('Enregistrer', { to: C.login }));
  });

  // ── Onboarding ────────────────────────────────────────────────────────
  row('Onboarding', 'Questionnaire de premier lancement (/app/onboarding) : univers, envies, localisation. Les illustrations sont les visuels officiels des spécialités.');
  const obTop = (n) => fr('En-tête', { dir: 'V', gap: 12, w: 390, pad: [6, 16, 10, 16], bg: 'fond/app', kids: [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [link(ic('ArrowLeft', 20), null, 'back'), link(tx('Passer', 'Corps/S fort', { c: 'texte/secondaire' }), C.home, 'swap')] }), inst('Progression', { 'Étape': n + '/5' })] });
  mobile(C.obUniverse, { route: '/app/onboarding', status: 'E', top: obTop(1), pad: [12, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Ton univers ?', 'On adapte CHAIR à ce que tu cherches.', { size: 'Titre/L' }));
    for (const [t, img, on] of [['Coiffure femme', 'coiffure-femme', true], ['Coiffure homme', 'coiffure-homme', false], ['Les deux', 'cheveux-longs', false]]) {
      const c = fr(t, { dir: 'H', gap: 16, fillW: true, pad: 12, align: 'center', r: 24, bg: 'fond/surface', stroke: on ? 'neutre/900' : 'bordure/moyenne', strokeW: on ? 1.5 : 1 });
      kids(c, [photo('Illustration', 72, 72, img, 18), tx(t, 'Titre/S', { grow: true }), inst('Case à cocher', { Forme: 'Radio', 'État': on ? 'Coché' : 'Vide' })]);
      add(b, c);
    }
    add(b, btn('Continuer', { to: C.obStyles }));
  });
  mobile(C.obStyles, { route: '/app/onboarding', status: 'E', top: obTop(2), pad: [12, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Tes envies ?', 'Choisis autant de styles que tu veux.', { size: 'Titre/L' }));
    const g = fr('Styles', { dir: 'H', gap: 12, wrap: true, fillW: true });
    DEMO.specialites.slice(0, 6).forEach(([t, img], i) => {
      const tile = specialtyTile(t, img);
      if (i === 0 || i === 2) { const p = tile.findOne((n) => n.name === 'Illustration'); strokeVar(p, 'neutre/900', 2); }
      add(g, tile);
    });
    add(b, g);
    add(b, btn('Continuer · 2 choisis', { to: C.obLoc }));
  });
  mobile(C.obLoc, { route: '/app/onboarding', status: 'E', top: obTop(4), pad: [12, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Où es-tu ?', 'Pour trier les coiffeurs du plus proche au plus loin.', { size: 'Titre/L' }));
    add(b, mapBlock('Carte', 260, { fillW: true }));
    add(b, btn('Utiliser ma position', { icon: 'Navigation', to: C.geoModal, kind: 'modal' }));
    add(b, field(null, 'Ou tape ta ville', { icon: 'MapPin' }));
  });
  mobile(C.obDone, { route: '/app/onboarding', status: 'E', pad: [200, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 40, bg: 'cta/fond', justify: 'center', align: 'center', kids: [ic('Check', 34, 'cta/texte')] }));
    add(b, tx('C\'est prêt.', 'Titre/XL', { align: 'center' }));
    add(b, tx('Ta sélection t\'attend.', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, spacer(20));
    add(b, btn('Découvrir', { to: C.home, kind: 'swap' }));
  });
  overlayFrame(C.geoModal, 'modal', { route: 'GeoPermissionModal', status: 'E' }, (f) => {
    add(f, fr('Pictogramme', { dir: 'H', w: 56, h: 56, r: 28, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('MapPin', 24)] }));
    add(f, tx('Activer la localisation ?', 'Titre/M', { align: 'center', fillW: true }));
    add(f, tx('Pour te montrer les coiffeurs les plus proches. Utilisée seulement quand l\'app est ouverte.', 'Corps/S', { c: 'texte/secondaire', align: 'center', fillW: true }));
    add(f, btn('Autoriser', { to: C.obDone }));
    add(f, btn('Plus tard', { type: 'Fantôme', to: null, kind: 'close' }));
  });

  // ── Accueil ───────────────────────────────────────────────────────────
  row('Accueil', 'Fil d\'accueil réel (app/app/page.tsx) : recherche, ville active, Pour toi, raccourcis spécialités, Coup de cœur CHAIR (sélection éditoriale), classement, carte, réalisations, nouveaux talents. Sections pilotées par l\'admin.');
  const homeTop = () => fr('Recherche fixe', { dir: 'V', gap: 10, w: 390, pad: [8, 16, 10, 16], bg: 'fond/app', kids: [searchBar(C.search), locationBar()] });
  mobile(C.home, { route: '/app', status: 'E', flow: '② Client — accueil connecté', top: homeTop(), tab: clientTab('Accueil'), gap: 28, pad: [16, 0, 24, 0] }, (b) => {
    const pad = (n) => { const w = fr('Marge', { dir: 'V', gap: 16, fillW: true, pad: [0, 16] }); add(w, n); return w; };
    add(b, pad(sectionHead('Pour toi', 'Faits pour ton style', false)));
    const reco = fr('Recommandations', { dir: 'V', gap: 12, fillW: true, pad: [0, 16] });
    L.slice(0, 3).forEach((c) => add(reco, resultCard(c, C.profile)));
    add(b, reco);
    add(b, hstrip('Spécialités', DEMO.specialites.map(([t, img]) => specialtyTile(t, img, C.results))));
    add(b, pad(sectionHead('Sélection CHAIR', 'Coup de cœur CHAIR')));
    add(b, hstrip('Coups de cœur', L.slice(0, 5).map((c) => fr(c.nom, { dir: 'V', gap: 6, w: 76, align: 'center', kids: [link(avatar(c.ini, 'M', true), C.profile), tx(c.nom.split(' ')[0], 'Légende', { align: 'center', w: 76 })] }))));
    const rank = card('Classement', { gap: 4 }, [micro('Classement'), tx('Les meilleurs coiffeurs CHAIR', 'Titre/M')]);
    L.slice(0, 3).forEach((c, i) => add(rank, fr(c.nom, { dir: 'H', gap: 12, fillW: true, pad: [10, 0], align: 'center', kids: [tx(String(i + 1), 'Titre/M', { c: 'texte/tertiaire' }), avatar(c.ini, 'S'), fr('Nom', { dir: 'V', gap: 0, grow: true, kids: [tx(c.nom, 'Corps/S fort'), tx(c.ville + ' · ' + c.spe, 'Légende', { c: 'texte/secondaire' })] }), noteRow(c.note)] })));
    link(rank, C.ranking);
    add(b, pad(rank));
    add(b, pad(sectionHead('Autour de toi', 'Sur la carte')));
    add(b, pad(link(mapBlock('Carte', 220, { fillW: true }), C.map)));
    add(b, pad(sectionHead('Communauté', 'Réalisations du moment')));
    const grid = fr('Grille', { dir: 'H', gap: 3, wrap: true, w: 390 });
    ['balayage', 'boucles', 'barber', 'couleur-femme', 'chignon', 'dreads'].forEach((img, i) => add(grid, realTile(img, [128, 96, 210, 54, 77, 140][i], C.post, 128, 160)));
    add(b, grid);
    add(b, pad(sectionHead('Nouveau sur CHAIR', 'Nouveaux talents')));
    add(b, hstrip('Nouveaux talents', L.slice(2, 6).map((c) => hdCard(c, C.profile))));
  });
  tabLinks(SCREENS[page.name][C.home], CLIENT_TABS());

  mobile(C.homeGuest, { route: '/app (visiteur)', status: 'E', note: 'Non connecté', top: homeTop(), tab: clientTab('Accueil'), gap: 24, pad: [16, 16, 24, 16] }, (b) => {
    add(b, card('Pour toi', { gap: 10, pad: 24 }, [micro('Pour toi'), tx('Le bon coiffeur, selon ton style.', 'Titre/L', { fillW: true }), para('Crée un compte gratuit, CHAIR sélectionne les profils faits pour toi.'), btn('Créer un compte', { to: C.signName }), btn('Se connecter', { type: 'Fantôme', to: C.login })]));
    add(b, sectionHead('Classement', 'Les meilleurs coiffeurs CHAIR'));
    L.slice(0, 3).forEach((c) => add(b, resultCard(c, C.signupModal)));
  });
  overlayFrame(C.signupModal, 'modal', { route: 'SignupPromptModal', status: 'E' }, (f) => {
    add(f, fr('Pictogramme', { dir: 'H', w: 56, h: 56, r: 28, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Heart', 24)] }));
    add(f, tx('Garde tes coiffeurs.', 'Titre/M', { align: 'center', fillW: true }));
    add(f, tx('Crée un compte gratuit pour réserver, suivre et enregistrer.', 'Corps/S', { c: 'texte/secondaire', align: 'center', fillW: true }));
    add(f, btn('Créer un compte', { to: C.signName }));
    add(f, btn('Plus tard', { type: 'Fantôme', kind: 'close' }));
  });
  mobile(C.homeLoad, { route: '/app', status: 'E', note: 'Chargement', top: homeTop(), tab: clientTab('Accueil'), gap: 20, pad: [16, 16, 24, 16] }, (b) => {
    add(b, rect('Titre', { w: 160, h: 18, r: 9, bg: 'fond/creux' }));
    for (let i = 0; i < 3; i++) add(b, inst('Squelette', { Type: 'Résultat' }));
    add(b, fr('Bande', { dir: 'H', gap: 12, kids: [inst('Squelette', { Type: 'Carte coiffeur' }), inst('Squelette', { Type: 'Carte coiffeur' })] }));
  });
  mobile(C.offline, { route: 'OfflineScreen (global)', status: 'E', note: 'Absence de réseau', pad: [220, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 72, h: 72, r: 36, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('WifiOff', 30, 'texte/secondaire')] }));
    add(b, tx('Pas de connexion', 'Titre/L', { align: 'center' }));
    add(b, tx('Vérifie ton réseau, CHAIR revient tout seul.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
  });

  // ── Recherche ─────────────────────────────────────────────────────────
  row('Recherche et carte', 'Moteur /explore : spécialités, ville, rayon, note ; liste ou carte ; repli géographique honnête.');
  const searchTop = (txt, active) => fr('Recherche fixe', { dir: 'V', gap: 10, w: 390, pad: [8, 16, 10, 16], bg: 'fond/app', kids: [
    fr('Ligne', { dir: 'H', gap: 10, fillW: true, align: 'center', kids: [searchBar(null, txt), link(fr('Filtres', { dir: 'H', w: 48, h: 48, r: 16, bg: 'fond/surface', stroke: 'bordure/moyenne', justify: 'center', align: 'center', kids: [ic('SlidersHorizontal', 18)] }), C.filters, 'overlay')] }),
    fr('Pilules', { dir: 'H', gap: 8, kids: [chip('Tous', active === 'all'), chip('Coiffeurs', active === 'hd'), chip('Salons', active === 'salon'), chip('Balayage', false, { icon: 'X' })] }),
  ] });
  mobile(C.search, { route: '/app/recherche', status: 'E', flow: '③ Client — recherche', top: fr('Recherche fixe', { dir: 'V', w: 390, pad: [8, 16, 10, 16], bg: 'fond/app', kids: [searchBar(C.results, 'Balay')] }), tab: clientTab('Rechercher'), gap: 24, pad: [16, 16, 24, 16] }, (b) => {
    add(b, micro('Suggestions'));
    for (const [t, s, i] of [['Balayage', 'Spécialité', 'Sparkles'], ['Balayage cuivré', 'Prestation', 'Scissors'], ['Léa Martin', 'Coiffeuse · Strasbourg', 'User']]) add(b, listRow(t, s, i, { to: C.results }));
    add(b, micro('Recherches récentes'));
    add(b, fr('Récents', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('Boucles', false, { icon: 'Clock' }), chip('Barber Strasbourg', false, { icon: 'Clock' }), chip('Atelier Dumont', false, { icon: 'Clock' })] }));
    add(b, micro('Spécialités'));
    const g = fr('Spécialités', { dir: 'H', gap: 12, wrap: true, fillW: true });
    DEMO.specialites.slice(0, 6).forEach(([t, img]) => add(g, specialtyTile(t, img, C.results)));
    add(b, g);
  });
  tabLinks(SCREENS[page.name][C.search], CLIENT_TABS());
  mobile(C.results, { route: '/app/recherche', status: 'E', note: 'Liste', top: searchTop('Balayage · Strasbourg', 'all'), tab: clientTab('Rechercher'), gap: 12, pad: [12, 16, 24, 16] }, (b) => {
    add(b, fr('Résumé', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('24 résultats', 'Corps/S fort'), link(fr('Basculer', { dir: 'H', gap: 6, align: 'center', kids: [ic('Map', 16), tx('Carte', 'Corps/S fort')] }), C.map, 'swap')] }));
    L.forEach((c) => add(b, resultCard(c, C.profile)));
  });
  tabLinks(SCREENS[page.name][C.results], CLIENT_TABS());
  mobile(C.map, { route: '/app/recherche', status: 'E', note: 'Carte', top: searchTop('Balayage · Strasbourg', 'all'), tab: clientTab('Rechercher'), gap: 0, pad: [0, 0, 0, 0] }, (b) => {
    add(b, mapBlock('Carte plein écran', 560, { w: 390, r: 0, pins: [[0.15, 0.2], [0.55, 0.15], [0.7, 0.5], [0.3, 0.55], [0.82, 0.32], [0.48, 0.78], [0.2, 0.8]] }));
    const peek = fr('Aperçu', { dir: 'V', gap: 8, w: 390, pad: [12, 16, 16, 16], bg: 'fond/app' });
    add(peek, fr('Basculer', { dir: 'H', fillW: true, justify: 'center', kids: [link(chip('Liste', false, { icon: 'List' }), C.results, 'swap')] }));
    add(peek, resultCard(L[0], C.profile));
    add(b, peek);
  });
  tabLinks(SCREENS[page.name][C.map], CLIENT_TABS());
  overlayFrame(C.filters, 'sheet', { route: 'Filtres (feuille)', status: 'E' }, (f) => {
    add(f, fr('En-tête', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Filtres', 'Titre/M'), tx('Réinitialiser', 'Corps/S fort', { c: 'texte/secondaire' })] }));
    const grp = (t, list) => fr(t, { dir: 'V', gap: 10, fillW: true, kids: [micro(t), fr('Choix', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: list })] });
    add(f, grp('Spécialité', [chip('Balayage', true), chip('Couleur', false), chip('Boucles', false), chip('Barber', false), chip('Locks', false)]));
    add(f, grp('Distance', [chip('3 km', false), chip('10 km', true), chip('25 km', false), chip('50 km', false)]));
    add(f, grp('Note minimum', [chip('Toutes', false), chip('4+', false), chip('4,5+', true)]));
    add(f, grp('Type', [chip('Tous', true), chip('Indépendants', false), chip('En salon', false)]));
    add(f, btn('Voir 24 résultats', { kind: 'close' }));
  });
  mobile(C.noResult, { route: '/app/recherche', status: 'E', note: 'Aucun résultat', top: searchTop('Tissage · Colmar', 'all'), tab: clientTab('Rechercher'), pad: [40, 16, 24, 16] }, (b) => {
    const e = inst('État vide', { Titre: 'Aucun coiffeur ici', Texte: 'Élargis la zone ou essaie une autre spécialité.', Action: true });
    SIZING.set(e, { fillW: true });
    const ei = e.findOne((n) => n.name === 'Icône'); if (ei) ei.swapComponent(ICON.Search);
    add(b, e);
    add(b, micro('Les mieux notés autour de toi'));
    add(b, resultCard(L[1], C.profile));
  });
  mobile(C.geoDenied, { route: '/app/recherche', status: 'E', note: 'Localisation refusée', top: searchTop('Balayage', 'all'), tab: clientTab('Rechercher'), pad: [16, 16, 24, 16] }, (b) => {
    add(b, fr('Bandeau', { dir: 'H', gap: 10, fillW: true, pad: 14, r: 18, bg: 'statut/alerte-fond', align: 'center', kids: [ic('MapPin', 18, 'statut/alerte'), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Localisation désactivée', 'Corps/S fort', { c: 'statut/alerte' }), tx('Résultats à Strasbourg, ta ville enregistrée.', 'Légende', { c: 'statut/alerte' })] })] }));
    L.slice(0, 4).forEach((c) => add(b, resultCard(c, C.profile)));
  });

  // ── Profil coiffeur ───────────────────────────────────────────────────
  row('Profil coiffeur, salon, réalisation', 'Fiche publique /app/coiffeur/[slug] : identité, niveau, chiffres, onglets, réservation fixe. Partage par lien natif, signalement et blocage (App Store 1.2).');
  const c0 = L[0];
  const profileScreen = (name, active, build, note) => mobile(name, { route: '/app/coiffeur/[slug]', status: 'E', note, flow: active === 1 ? '④ Client — profil et réservation' : null, statusBg: null, bottom: stickyCta('Réserver', C.bkService, ['À partir de', '42 €']), gap: 16, pad: [0, 0, 24, 0] }, (b) => {
    for (const n of profileHeader(c0, active)) add(b, n);
    const body = fr('Onglet', { dir: 'V', gap: 12, fillW: true, pad: [0, 16] });
    build(body);
    add(b, body);
  });
  profileScreen(C.profile, 1, (b) => {
    const g = fr('Portfolio', { dir: 'H', gap: 3, wrap: true, fillW: true });
    ['balayage', 'couleur-femme', 'cheveux-longs', 'boucles', 'chignon', 'coupe'].forEach((img, i) => add(g, realTile(img, [128, 96, 84, 61, 45, 30][i], C.post, 117, 146)));
    add(b, g);
  });
  profileScreen(C.profileServices, 2, (b) => {
    for (const [n, d, p] of DEMO.prestations) add(b, serviceRow(n, d, p, false, C.bkService));
  }, 'Onglet prestations');
  profileScreen(C.profileReviews, 3, (b) => {
    add(b, fr('Synthèse', { dir: 'H', gap: 16, fillW: true, align: 'center', kids: [tx('4,9', 'Chiffre géant'), fr('Barres', { dir: 'V', gap: 4, grow: true, kids: [5, 4, 3, 2, 1].map((n, i) => fr(n + '★', { dir: 'H', gap: 8, fillW: true, align: 'center', kids: [tx(String(n), 'Légende/S', { c: 'texte/secondaire' }), fr('Rail', { h: 6, r: 3, bg: 'fond/creux', grow: true, clip: true, kids: [rect('Plein', { w: [180, 26, 6, 0, 0][i] || 1, h: 6, r: 3, bg: 'neutre/900' })] })] })) })] }));
    add(b, reviewItem('Camille P.', 'CP', '5,0', 'Balayage parfait, exactement ce que je voulais. Très à l\'écoute.', 'il y a 3 jours'));
    add(b, reviewItem('Sarah K.', 'SK', '4,8', 'Super expérience, je reviendrai.', 'il y a 2 semaines'));
  }, 'Onglet avis');
  profileScreen(C.profileAbout, 1, (b) => {
    add(b, card('À propos', {}, [micro('À propos'), para('Coloriste passionnée, je travaille les balayages naturels et les blonds lumineux depuis 9 ans.', { c: 'texte/principal' })]));
    add(b, listCard('Infos', [listRow('Atelier Dumont', '12 rue des Orfèvres, Strasbourg', 'Building2', { to: C.salon }), listRow('Horaires', 'Mar – Sam · 9 h – 19 h', 'Clock', { chevron: false }), link(listRow('Signaler ce profil', null, 'Flag', { chevron: false }), C.report, 'overlay'), link(listRow('Bloquer', null, 'Ban', { chevron: false, danger: true }), C.block, 'overlay')]));
  }, 'Section à propos');
  mobile(C.salon, { route: '/app/salon/[slug]', status: 'E', top: topBar('Atelier Dumont', { action: true }), gap: 16, pad: [0, 0, 24, 0] }, (b) => {
    add(b, photo('Photo du salon', 390, 220, 'coiffure-femme', 0));
    const body = fr('Infos', { dir: 'V', gap: 14, fillW: true, pad: [0, 16] });
    add(body, bigTitle('Atelier Dumont', '12 rue des Orfèvres, Strasbourg', { size: 'Titre/L' }));
    add(body, fr('Badges', { dir: 'H', gap: 6, kids: [badge('SIRET vérifié', 'Succès'), noteRow('4,8', '112')] }));
    add(body, sectionHead('L\'équipe', '4 coiffeurs', false));
    for (const c of L.filter((x) => x.statut === 'Atelier Dumont').concat([L[0]])) add(body, resultCard(c, C.profile));
    add(body, mapBlock('Plan', 160, { fillW: true, pins: [[0.45, 0.4]] }));
    add(b, body);
  });
  mobile(C.post, { route: '/app/realisation/[id]', status: 'E', top: topBar('Réalisation', { action: true }), gap: 14, pad: [0, 0, 24, 0] }, (b) => {
    add(b, photo('Photo', 390, 488, 'balayage', 0));
    const body = fr('Infos', { dir: 'V', gap: 12, fillW: true, pad: [0, 16] });
    add(body, fr('Actions', { dir: 'H', gap: 18, align: 'center', kids: [fr('J\'aime', { dir: 'H', gap: 6, align: 'center', kids: [ic('Heart', 22), tx('128', 'Corps/S fort')] }), ic('Bookmark', 22), link(ic('Share2', 22), C.share, 'overlay')] }));
    add(body, tx('Balayage miel sur base châtain', 'Titre/M'));
    add(body, fr('Tags', { dir: 'H', gap: 6, kids: [badge('Balayage'), badge('Cheveux longs')] }));
    add(body, link(fr('Auteur', { dir: 'H', gap: 10, fillW: true, pad: 12, r: 20, bg: 'fond/surface', align: 'center', kids: [avatar('LM', 'S', true), tx('Léa Martin', 'Corps/S fort', { grow: true }), btn('Réserver', { size: 'S', to: C.bkService })] }), C.profile));
    add(b, body);
  });
  overlayFrame(C.share, 'sheet', { route: 'Partage natif (lien)', status: 'E' }, (f) => {
    add(f, tx('Partager le profil de Léa', 'Titre/M', { fillW: true }));
    add(f, fr('Lien', { dir: 'H', gap: 10, fillW: true, pad: 14, r: 16, bg: 'fond/creux', align: 'center', kids: [ic('Link', 16, 'texte/secondaire'), tx('getchair.app/coiffeur/lea-martin', 'Corps/S', { c: 'texte/secondaire', grow: true })] }));
    add(f, fr('Apps', { dir: 'H', gap: 18, fillW: true, justify: 'center', kids: ['Messages', 'Instagram', 'WhatsApp', 'Copier'].map((a) => fr(a, { dir: 'V', gap: 6, align: 'center', kids: [fr('Icône', { w: 56, h: 56, r: 16, bg: 'fond/creux' }), tx(a, 'Légende/S', { c: 'texte/secondaire' })] })) }));
    add(f, tx('Feuille de partage du système : CHAIR partage un lien, jamais de visuel généré.', 'Légende', { c: 'texte/tertiaire', fillW: true, align: 'center' }));
  });
  overlayFrame(C.report, 'sheet', { route: 'ReportSheet', status: 'E' }, (f) => {
    add(f, tx('Signaler ce profil', 'Titre/M', { fillW: true }));
    for (const [t, on] of [['Contenu inapproprié', true], ['Faux profil ou usurpation', false], ['Harcèlement', false], ['Autre', false]]) add(f, fr(t, { dir: 'H', gap: 12, fillW: true, pad: [12, 4], align: 'center', kids: [inst('Case à cocher', { Forme: 'Radio', 'État': on ? 'Coché' : 'Vide' }), tx(t, 'Corps/M', { grow: true })] }));
    add(f, btn('Envoyer le signalement', { kind: 'close' }));
  });
  overlayFrame(C.block, 'sheet', { route: 'BlockConfirmSheet', status: 'E', note: 'Confirmation' }, (f) => {
    add(f, tx('Bloquer Léa Martin ?', 'Titre/M', { fillW: true }));
    add(f, para('Ses publications n\'apparaîtront plus dans ton fil, ta recherche ni tes recommandations. Tu peux la débloquer à tout moment.'));
    add(f, btn('Bloquer', { type: 'Destructif', kind: 'close' }));
    add(f, btn('Annuler', { type: 'Fantôme', kind: 'close' }));
  });

  // ── Réservation ───────────────────────────────────────────────────────
  row('Réservation', 'Parcours /app/coiffeur/[slug]/reserver : prestation → date et créneau → récapitulatif → confirmation. État « créneau pris » si un autre client a réservé entre-temps.');
  const bkTop = (t, n) => fr('En-tête', { dir: 'V', gap: 10, w: 390, pad: [6, 16, 10, 16], bg: 'fond/app', kids: [fr('Ligne', { dir: 'H', fillW: true, align: 'center', gap: 12, kids: [link(ic('ArrowLeft', 20), null, 'back'), tx(t, 'Titre/S', { grow: true })] }), inst('Progression', { 'Étape': n + '/5' })] });
  const recapMini = () => fr('Coiffeur', { dir: 'H', gap: 10, fillW: true, pad: 12, r: 20, bg: 'fond/surface', fx: 'Carte', align: 'center', kids: [avatar('LM', 'S', true), fr('Nom', { dir: 'V', gap: 0, grow: true, kids: [tx('Léa Martin', 'Corps/S fort'), tx('Atelier Dumont · Strasbourg', 'Légende', { c: 'texte/secondaire' })] })] });
  mobile(C.bkService, { route: '/app/coiffeur/[slug]/reserver', status: 'E', top: bkTop('Choisis ta prestation', 2), bottom: stickyCta('Continuer', C.bkSlot, ['Balayage', '120 €']), gap: 12, pad: [12, 16, 24, 16] }, (b) => {
    add(b, recapMini());
    DEMO.prestations.forEach(([n, d, p], i) => add(b, serviceRow(n, d, p, i === 1)));
  });
  mobile(C.bkSlot, { route: '/app/coiffeur/[slug]/reserver', status: 'E', top: bkTop('Quand ?', 3), bottom: stickyCta('Continuer', C.bkRecap, ['Mardi 14', '10:30']), gap: 16, pad: [12, 16, 24, 16] }, (b) => {
    add(b, tx('Octobre 2026', 'Titre/M'));
    add(b, fr('Jours', { dir: 'H', gap: 8, kids: [['lun.', '13', 'Indisponible'], ['mar.', '14', 'Sélectionné'], ['mer.', '15', 'Défaut'], ['jeu.', '16', 'Défaut'], ['ven.', '17', 'Défaut'], ['sam.', '18', 'Défaut']].map(([j, d, e]) => inst('Jour', { Jour: j, Date: d, 'État': e })) }));
    add(b, micro('Matin'));
    add(b, fr('Créneaux matin', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [['9:00', 'Indisponible'], ['9:30', 'Disponible'], ['10:00', 'Indisponible'], ['10:30', 'Sélectionné'], ['11:00', 'Disponible']].map(([h, e]) => inst('Créneau', { Heure: h, 'État': e })) }));
    add(b, micro('Après-midi'));
    add(b, fr('Créneaux après-midi', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [['14:00', 'Disponible'], ['14:30', 'Disponible'], ['15:30', 'Indisponible'], ['16:00', 'Disponible'], ['17:30', 'Disponible']].map(([h, e]) => inst('Créneau', { Heure: h, 'État': e })) }));
  });
  mobile(C.bkRecap, { route: '/app/coiffeur/[slug]/reserver', status: 'E', top: bkTop('Récapitulatif', 4), gap: 14, pad: [12, 16, 24, 16] }, (b) => {
    add(b, recapMini());
    add(b, listCard('Détails', [listRow('Balayage', '2 h · 120 €', 'Scissors', { chevron: false }), listRow('Mardi 14 octobre', '10:30 – 12:30', 'CalendarDays', { chevron: false }), listRow('Atelier Dumont', '12 rue des Orfèvres', 'MapPin', { chevron: false })]));
    add(b, field('Un mot pour Léa ?', 'Envie de blond miel, cheveux longs.', { filled: true, icon: 'MessageCircle' }));
    add(b, card('Photo', { gap: 8 }, [micro('Ton inspiration'), para('Ajoute une photo : décrire une coupe en mots est difficile.'), inst('Zone de dépôt')]));
    add(b, tx('Paiement sur place, au salon. Annulation gratuite jusqu\'à 24 h avant.', 'Légende', { c: 'texte/tertiaire', fillW: true }));
    add(b, btn('Confirmer le rendez-vous', { to: C.bkDone }));
    add(b, btn('Tester : créneau pris', { type: 'Fantôme', to: C.bkTaken }));
  });
  mobile(C.bkDone, { route: '/app/coiffeur/[slug]/reserver', status: 'E', note: 'Succès', pad: [150, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 40, bg: 'cta/fond', justify: 'center', align: 'center', kids: [ic('Check', 34, 'cta/texte')] }));
    add(b, tx('C\'est réservé.', 'Titre/XL', { align: 'center' }));
    add(b, tx('Mardi 14 octobre à 10:30 avec Léa.\nTu recevras un rappel la veille.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
    add(b, spacer(12));
    add(b, btn('Voir mes rendez-vous', { to: C.appts }));
    add(b, btn('Retour à l\'accueil', { type: 'Fantôme', to: C.home, kind: 'swap' }));
  });
  mobile(C.bkTaken, { route: '/app/coiffeur/[slug]/reserver', status: 'E', note: 'Erreur de disponibilité', top: bkTop('Quand ?', 3), gap: 16, pad: [12, 16, 24, 16] }, (b) => {
    add(b, inst('Toast', { Type: 'Erreur', Message: 'Ce créneau vient d\'être pris. Choisis-en un autre.' }));
    add(b, fr('Créneaux', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [['10:30', 'Indisponible'], ['11:00', 'Disponible'], ['14:00', 'Disponible'], ['16:00', 'Disponible']].map(([h, e]) => link(inst('Créneau', { Heure: h, 'État': e }), C.bkRecap)) }));
  });

  // ── Fil, favoris, social ──────────────────────────────────────────────
  row('Fil, favoris, classements, objectifs', 'Fil plein écran (/app/feed), favoris (coiffeurs et réalisations), classement local par spécialité, objectifs client.');
  mobile(C.feed, { route: '/app/feed', status: 'E', bg: 'sombre/fond', statusBar: 'Sombre', statusBg: null, tab: clientTab('Fil'), gap: 0, pad: [0, 0, 0, 0] }, (b) => {
    const p = photo('Réalisation plein écran', 390, 750, 'boucles', 0);
    add(b, p);
    const over = fr('Infos', { dir: 'V', gap: 8, w: 300, abs: [16, 560] });
    kids(over, [fr('Auteur', { dir: 'H', gap: 8, align: 'center', kids: [avatar('SR', 'S', true), tx('Sofia Rossi', 'Corps/S fort', { c: 'sombre/texte' }), badge('Suivre', 'Sombre')] }), tx('Boucles définies, méthode curly', 'Corps/M', { c: 'sombre/texte' })]);
    add(b, over);
    const side = fr('Actions', { dir: 'V', gap: 22, align: 'center', abs: [338, 520] });
    kids(side, [fr('J\'aime', { dir: 'V', gap: 4, align: 'center', kids: [ic('Heart', 28, 'sombre/texte'), tx('342', 'Légende/S', { c: 'sombre/texte' })] }), ic('Bookmark', 26, 'sombre/texte'), link(ic('Share2', 26, 'sombre/texte'), C.share, 'overlay'), link(ic('CalendarDays', 26, 'sombre/texte'), C.bkService)]);
    add(b, side);
  });
  tabLinks(SCREENS[page.name][C.feed], CLIENT_TABS());
  mobile(C.favs, { route: '/app/favoris', status: 'E', top: fr('Titre', { dir: 'V', gap: 12, w: 390, pad: [8, 16, 12, 16], bg: 'fond/app', kids: [tx('Favoris', 'Titre/XL'), (() => { const s = inst('Segments', { Actif: '1', 'Segment 1': 'Coiffeurs', 'Segment 2': 'Réalisations', 'Segment 3': 'Abonnements' }); SIZING.set(s, { fillW: true }); const n = s.findOne((x) => x.name === 'Segment 2' && x.type === 'FRAME'); if (n) link(n, C.favPosts, 'swap'); return s; })()] }), tab: clientTab('Favoris'), gap: 12, pad: [16, 16, 24, 16] }, (b) => {
    L.slice(0, 4).forEach((c) => add(b, resultCard(c, C.profile)));
  });
  tabLinks(SCREENS[page.name][C.favs], CLIENT_TABS());
  mobile(C.favPosts, { route: '/app/favoris', status: 'E', note: 'Réalisations', top: fr('Titre', { dir: 'V', gap: 12, w: 390, pad: [8, 16, 12, 16], bg: 'fond/app', kids: [tx('Favoris', 'Titre/XL'), (() => { const s = inst('Segments', { Actif: '2', 'Segment 1': 'Coiffeurs', 'Segment 2': 'Réalisations', 'Segment 3': 'Abonnements' }); SIZING.set(s, { fillW: true }); const n = s.findOne((x) => x.name === 'Segment 1' && x.type === 'FRAME'); if (n) link(n, C.favs, 'swap'); return s; })()] }), tab: clientTab('Favoris'), gap: 0, pad: [16, 0, 24, 0] }, (b) => {
    const g = fr('Grille', { dir: 'H', gap: 3, wrap: true, w: 390 });
    ['balayage', 'chignon', 'boucles', 'couleur', 'lissage', 'barbe'].forEach((img, i) => add(g, realTile(img, [128, 64, 342, 51, 33, 90][i], C.post, 128, 160)));
    add(b, g);
  });
  mobile(C.favEmpty, { route: '/app/favoris', status: 'E', note: 'État vide', top: fr('Titre', { dir: 'V', w: 390, pad: [8, 16, 12, 16], bg: 'fond/app', kids: [tx('Favoris', 'Titre/XL')] }), tab: clientTab('Favoris'), pad: [80, 16, 24, 16] }, (b) => {
    const e = inst('État vide', { Titre: 'Aucun favori', Texte: 'Garde ici les coiffeurs que tu aimes.', Action: true }); SIZING.set(e, { fillW: true }); link(e, C.search); add(b, e);
  });
  mobile(C.ranking, { route: '/app/classements', status: 'E', top: topBar('Classements'), gap: 12, pad: [16, 16, 24, 16] }, (b) => {
    add(b, fr('Filtres', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('Strasbourg', true, { icon: 'MapPin' }), chip('Balayage', true), chip('Ce mois', false)] }));
    L.forEach((c, i) => add(b, link(fr(c.nom, { dir: 'H', gap: 12, fillW: true, pad: [12, 14], r: 20, bg: 'fond/surface', fx: i === 0 ? 'Carte' : null, align: 'center', kids: [tx(String(i + 1), 'Titre/L', { c: i === 0 ? 'accent/or' : 'texte/tertiaire' }), avatar(c.ini, 'S', i < 3), fr('Nom', { dir: 'V', gap: 0, grow: true, kids: [tx(c.nom, 'Corps/S fort'), tx(c.spe + ' · ' + c.ville, 'Légende', { c: 'texte/secondaire' })] }), noteRow(c.note)] }), C.profile)));
    add(b, tx('Comment fonctionne le classement ? Note × avis vérifiés, visites et régularité, par spécialité et par ville.', 'Légende', { c: 'texte/tertiaire', fillW: true }));
  });
  mobile(C.goals, { route: '/app/objectifs', status: 'E', top: topBar('Mes objectifs'), gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    add(b, card('Niveau', { dark: true, gap: 6 }, [micro('Ton niveau', true), tx('Habitué', 'Titre/XL', { c: 'sombre/texte' }), tx('2 objectifs avant le niveau suivant', 'Corps/S', { c: 'neutre/400' })]));
    add(b, micro('Comment progresser ?'));
    for (const [t, done] of [['Ajoute une photo de profil', true], ['Ajoute ta ville', true], ['Explore des coiffeurs et abonne-toi', false], ['Prends un rendez-vous et laisse un avis', false]]) add(b, fr(t, { dir: 'H', gap: 12, fillW: true, pad: [14, 16], r: 18, bg: 'fond/surface', align: 'center', kids: [inst('Case à cocher', { Forme: 'Case', 'État': done ? 'Coché' : 'Vide' }), tx(t, 'Corps/M', { grow: true, c: done ? 'texte/tertiaire' : 'texte/principal' })] }));
  });
  mobile(C.jobs, { route: '/app/recrutement', status: 'I', note: 'Vitrine publique des offres', top: topBar('Recrutement'), gap: 12, pad: [16, 16, 24, 16] }, (b) => {
    add(b, inst('Segments', { Actif: '1', 'Segment 1': 'Offres', 'Segment 2': 'Coiffeurs dispo', 'Segment 3': 'Fauteuils' }));
    add(b, card('Offre', { gap: 6 }, [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', kids: [tx('Coiffeur·se confirmé·e', 'Titre/S'), badge('CDI', 'Sombre')] }), tx('Atelier Dumont · Strasbourg', 'Corps/S', { c: 'texte/secondaire' }), tx('Temps plein · dès novembre', 'Légende', { c: 'texte/tertiaire' })]));
    const e = inst('État vide', { Titre: 'Aucune autre offre pour le moment', Texte: 'Les offres arriveront ici.', Action: false }); SIZING.set(e, { fillW: true }); add(b, e);
  });

  // ── Avis vérifiés ─────────────────────────────────────────────────────
  row('Avis vérifiés (QR)', 'Le cœur de la confiance CHAIR : le client scanne le QR du coiffeur (ou le QR unique du salon et choisit qui l\'a coiffé), la visite est validée, puis il laisse un avis certifié.');
  mobile(C.salonScan, { route: '/app/salon-scan/[token]', status: 'E', flow: '⑤ Client — avis vérifié', top: topBar('Atelier Dumont', { back: false }), gap: 12, pad: [16, 16, 24, 16] }, (b) => {
    add(b, bigTitle('Qui t\'a coiffé ?', 'Choisis ton coiffeur pour valider ta visite.', { size: 'Titre/L' }));
    L.filter((c) => c.statut === 'Atelier Dumont').concat([L[0]]).forEach((c) => add(b, link(fr(c.nom, { dir: 'H', gap: 12, fillW: true, pad: 14, r: 20, bg: 'fond/surface', fx: 'Carte', align: 'center', kids: [avatar(c.ini, 'M'), fr('Nom', { dir: 'V', gap: 0, grow: true, kids: [tx(c.nom, 'Titre/S'), tx(c.spe, 'Légende', { c: 'texte/secondaire' })] }), ic('ChevronRight', 16, 'texte/tertiaire')] }), C.scan)));
  });
  mobile(C.scan, { route: '/app/scan/[token]', status: 'E', note: 'Visite validée + carte de fidélité', pad: [80, 16, 24, 16], gap: 16 }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 40, bg: 'statut/succes-fond', justify: 'center', align: 'center', kids: [ic('BadgeCheck', 36, 'statut/succes')] }));
    add(b, tx('Visite vérifiée ✓', 'Titre/XL', { align: 'center' }));
    add(b, tx('Chez Léa Martin · aujourd\'hui', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, card('Fidélité', { gap: 10 }, [micro('Carte de fidélité'), fr('Tampons', { dir: 'H', gap: 8, kids: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ellipse('Tampon ' + n, { w: 30, bg: n <= 6 ? 'cta/fond' : 'fond/creux' })) }), tx('6 / 8 — encore 2 visites pour ta récompense', 'Légende', { c: 'texte/secondaire' })]));
    add(b, btn('Laisser un avis', { to: C.review }));
  });
  mobile(C.review, { route: '/app/avis/[token]', status: 'E', top: topBar('Ton expérience'), bottom: inst('iOS/Clavier'), noHome: true, gap: 16, pad: [16, 16, 24, 16] }, (b) => {
    add(b, fr('Coiffeur', { dir: 'H', gap: 10, align: 'center', kids: [avatar('LM', 'S', true), tx('Léa Martin', 'Corps/S fort'), badge('Avis vérifié', 'Succès')] }));
    add(b, fr('Étoiles', { dir: 'H', gap: 10, kids: [1, 2, 3, 4, 5].map((n) => { const s = ic('Star', 34, 'texte/principal'); s.findAll((x) => 'fills' in x).forEach((x) => { x.fills = [paintVar(n <= 5 ? 'texte/principal' : 'fond/creux')]; }); return s; }) }));
    add(b, field('Prestation', 'Balayage', { filled: true, icon: 'Scissors' }));
    add(b, field('Ton avis', 'Balayage parfait, très à l\'écoute|', { state: 'Focus', icon: 'MessageCircle' }));
    add(b, btn('Publier mon avis', { to: C.reviewDone }));
  });
  mobile(C.reviewDone, { route: '/app/avis/[token]', status: 'E', note: 'Succès', pad: [140, 24, 24, 24], gap: 14 }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 40, bg: 'cta/fond', justify: 'center', align: 'center', kids: [ic('Check', 34, 'cta/texte')] }));
    add(b, tx('Avis publié', 'Titre/XL', { align: 'center' }));
    add(b, tx('Merci, il aide toute la communauté.', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, card('Google', { gap: 8 }, [tx('Publiez-le aussi sur Google ?', 'Titre/S'), para('Ton avis est copié, il ne reste qu\'à le coller.'), btn('Ouvrir Google', { type: 'Doux', size: 'S' })]));
    add(b, btn('Terminer', { type: 'Fantôme', to: C.home, kind: 'swap' }));
  });
  overlayFrame(C.reviewModal, 'modal', { route: 'ReviewPromptModal', status: 'E' }, (f) => {
    add(f, avatar('LM', 'M', true));
    add(f, tx('Comment s\'est passé ton rendez-vous avec Léa ?', 'Titre/M', { align: 'center', fillW: true }));
    add(f, fr('Étoiles', { dir: 'H', gap: 8, kids: [1, 2, 3, 4, 5].map(() => ic('Star', 28, 'texte/tertiaire')) }));
    add(f, btn('Laisser un avis', { to: C.review }));
    add(f, btn('Plus tard', { type: 'Fantôme', kind: 'close' }));
  });

  // ── Compte ────────────────────────────────────────────────────────────
  row('Compte et réglages', 'Compte client (/app/compte) : profil, rendez-vous, notifications, apparence (clair par défaut), aide, pages légales (ouvertes depuis le site, feuille Safari), règles et comptes bloqués, suppression du compte (App Store 5.1.1).');
  mobile(C.account, { route: '/app/compte', status: 'E', flow: '⑥ Client — compte et suppression', top: fr('Titre', { dir: 'V', w: 390, pad: [8, 16, 12, 16], bg: 'fond/app', kids: [tx('Compte', 'Titre/XL')] }), tab: clientTab('Compte'), gap: 16, pad: [12, 16, 24, 16] }, (b) => {
    add(b, link(fr('Profil', { dir: 'H', gap: 14, fillW: true, pad: 16, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte', align: 'center', kids: [avatar('CP', 'M'), fr('Nom', { dir: 'V', gap: 2, grow: true, kids: [tx('Camille Petit', 'Titre/S'), tx('Strasbourg · Habituée', 'Légende', { c: 'texte/secondaire' })] }), ic('ChevronRight', 16, 'texte/tertiaire')] }), C.edit));
    add(b, listCard('Activité', [listRow('Mes rendez-vous', '1 à venir', 'CalendarDays', { to: C.appts }), listRow('Mes objectifs', 'Niveau Habitué', 'Trophy', { to: C.goals }), listRow('Notifications', '2 non lues', 'Bell', { to: C.notifs })]));
    add(b, listCard('Réglages', [listRow('Préférences de notifications', null, 'SlidersHorizontal', { to: C.notifPrefs }), listRow('Apparence', 'Clair', 'Moon', { chevron: false }), listRow('Aide', null, 'LifeBuoy', { to: C.help })]));
    add(b, listCard('Informations', [listRow('Confidentialité', null, 'Shield', { to: C.legal, kind: 'overlay' }), listRow('Conditions d\'utilisation', null, 'FileText', { to: C.legal, kind: 'overlay' }), listRow('Mentions légales', null, 'Scale', { to: C.legal, kind: 'overlay' }), listRow('Règles de communauté', 'Comptes bloqués', 'Users', { to: C.rules })]));
    add(b, btn('Se déconnecter', { type: 'Fantôme', to: C.login, kind: 'swap' }));
    add(b, link(tx('Supprimer mon compte', 'Légende', { c: 'texte/tertiaire', align: 'center', fillW: true }), C.del));
  });
  tabLinks(SCREENS[page.name][C.account], CLIENT_TABS());
  mobile(C.edit, { route: '/app/compte/modifier', status: 'E', top: topBar('Mes informations'), gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    add(b, fr('Photo', { dir: 'V', gap: 8, fillW: true, align: 'center', kids: [avatar('CP', 'L'), tx('Changer la photo', 'Corps/S fort', { c: 'texte/secondaire' })] }));
    add(b, field('Nom', 'Camille Petit', { filled: true }));
    add(b, field('E-mail', 'camille@exemple.fr', { filled: true }));
    add(b, field('Téléphone', '06 12 34 56 78', { filled: true }));
    add(b, field('Ville', 'Strasbourg', { filled: true }));
    add(b, btn('Enregistrer', { kind: 'back' }));
  });
  mobile(C.appts, { route: '/app/compte (rendez-vous)', status: 'E', top: topBar('Mes rendez-vous'), gap: 12, pad: [16, 16, 24, 16] }, (b) => {
    add(b, micro('À venir'));
    add(b, link(card('Prochain', { gap: 8 }, [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Mar. 14 oct. · 10:30', 'Titre/S'), badge('Confirmé', 'Succès')] }), tx('Balayage avec Léa Martin', 'Corps/S', { c: 'texte/secondaire' }), tx('Atelier Dumont', 'Légende', { c: 'texte/tertiaire' })]), C.appt));
    add(b, micro('Passés'));
    add(b, card('Passé', { gap: 6, flat: true }, [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Sam. 20 sept.', 'Corps/S fort'), btn('Laisser un avis', { size: 'S', type: 'Doux', to: C.reviewModal, kind: 'modal' })] }), tx('Coupe + brushing · Léa Martin', 'Légende', { c: 'texte/secondaire' })]));
  });
  mobile(C.appt, { route: '/app/compte (détail RDV)', status: 'E', top: topBar('Rendez-vous'), gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    add(b, card('Statut', { dark: true, gap: 6 }, [micro('Confirmé', true), tx('Mardi 14 octobre', 'Titre/L', { c: 'sombre/texte' }), tx('10:30 – 12:30 · Balayage', 'Corps/S', { c: 'neutre/400' })]));
    add(b, listCard('Infos', [listRow('Léa Martin', 'Coiffeuse', 'User', { to: C.profile }), listRow('Atelier Dumont', '12 rue des Orfèvres', 'MapPin'), listRow('Ajouter au calendrier', null, 'CalendarDays', { chevron: false })]));
    add(b, btn('Annuler le rendez-vous', { type: 'Destructif', to: C.cancel, kind: 'overlay' }));
  });
  overlayFrame(C.cancel, 'sheet', { route: 'Annulation (feuille)', status: 'E', note: 'Confirmation de suppression' }, (f) => {
    add(f, tx('Annuler ce rendez-vous ?', 'Titre/M', { fillW: true }));
    add(f, para('Léa sera prévenue et le créneau sera libéré.'));
    add(f, btn('Oui, annuler', { type: 'Destructif', kind: 'close' }));
    add(f, btn('Garder mon rendez-vous', { type: 'Fantôme', kind: 'close' }));
  });
  mobile(C.notifs, { route: '/app/notifications', status: 'E', top: topBar('Notifications'), gap: 0, pad: [8, 16, 24, 16] }, (b) => {
    for (const [t, s, i, unread] of [['Rappel : demain 10:30', 'Balayage avec Léa Martin', 'CalendarDays', true], ['Léa a répondu à ton avis', '« Merci Camille ! »', 'MessageCircle', true], ['Nouvelle réalisation', 'Sofia Rossi a publié', 'Images', false], ['Rendez-vous confirmé', 'Mardi 14 octobre', 'Check', false]]) {
      const r = listRow(t, s, i, { to: C.appt });
      add(b, fr('Notification', { dir: 'H', gap: 6, fillW: true, align: 'center', kids: [ellipse('Non lue', { w: 8, bg: unread ? 'statut/info' : 'fond/app' }), r] }));
    }
  });
  mobile(C.notifPrefs, { route: '/app/notifications/preferences', status: 'E', top: topBar('Préférences'), gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    const tog = (t, s, on) => fr(t, { dir: 'H', gap: 12, fillW: true, pad: [14, 16], align: 'center', bg: 'fond/surface', kids: [fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx(t, 'Corps/M'), tx(s, 'Légende', { c: 'texte/secondaire' })] }), inst('Interrupteur', { Actif: on ? 'Oui' : 'Non' })] });
    add(b, listCard('Rendez-vous', [tog('Rappels', 'La veille et 1 h avant', true), tog('Confirmations', 'Quand ton coiffeur confirme', true)]));
    add(b, listCard('Communauté', [tog('Demandes d\'avis', 'Après un rendez-vous', true), tog('Réponses à tes avis', null, false), tog('Nouvelles réalisations', 'Des coiffeurs suivis', true)]));
  });
  mobile(C.help, { route: '/app/aide', status: 'E', top: topBar('Aide'), gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    add(b, listCard('Questions', [listRow('Comment réserver ?', null, 'CalendarDays'), listRow('Qu\'est-ce qu\'un avis vérifié ?', null, 'BadgeCheck'), listRow('Annuler un rendez-vous', null, 'X')]));
    add(b, listCard('Légal', [listRow('Confidentialité', null, 'Shield', { to: C.legal, kind: 'overlay' }), listRow('Conditions générales', null, 'FileText', { to: C.legal, kind: 'overlay' }), listRow('Règles de communauté', null, 'Users', { to: C.rules }), listRow('Comptes bloqués', 'Voir et débloquer', 'ShieldOff', { to: C.rules }), listRow('Mentions légales', null, 'Scale', { to: C.legal, kind: 'overlay' })]));
    add(b, btn('Contacter le support', { type: 'Doux', icon: 'LifeBuoy', to: C.legal, kind: 'overlay' }));
  });
  mobile(C.rules, { route: '/app/regles-communaute', status: 'E', top: topBar('Règles de communauté'), gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    add(b, card('Règles', { gap: 8 }, [micro('Nos règles'), para('Respect, contenus authentiques, avis sincères. Tout contenu peut être signalé, l\'équipe le traite sous 24 h.', { c: 'texte/principal' })]));
    add(b, micro('Comptes bloqués'));
    add(b, listCard('Bloqués', [fr('Bloqué', { dir: 'H', gap: 12, fillW: true, pad: [12, 16], align: 'center', kids: [avatar('JD', 'S'), tx('Jordan D.', 'Corps/M', { grow: true }), btn('Débloquer', { size: 'S', type: 'Secondaire' })] })]));
  });
  mobile(C.del, { route: '/app/compte/supprimer', status: 'E', note: 'Confirmation de suppression', top: topBar('Supprimer mon compte'), gap: 16, pad: [24, 16, 24, 16] }, (b) => {
    add(b, fr('Pictogramme', { dir: 'H', w: 64, h: 64, r: 32, bg: 'statut/erreur-fond', justify: 'center', align: 'center', kids: [ic('Trash2', 26, 'statut/erreur')] }));
    add(b, bigTitle('Supprimer ton compte ?', 'Tes favoris, rendez-vous et préférences seront effacés. Tes avis publiés deviennent anonymes. C\'est définitif.', { size: 'Titre/L' }));
    add(b, field('Mot de passe', '••••••••', { filled: true, icon: 'Lock' }));
    add(b, btn('Supprimer définitivement', { type: 'Destructif', to: C.login, kind: 'swap' }));
    add(b, btn('Annuler', { type: 'Fantôme', kind: 'back' }));
  });
  mobile(C.legal, { route: '/confidentialite · /cgu · /mentions-legales', status: 'E', note: 'Ouvertes depuis le site (feuille Safari)', pad: [24, 0, 24, 0], gap: 0 }, (b) => {
    add(b, fr('Barre Safari', { dir: 'H', w: 390, pad: [10, 16], justify: 'between', align: 'center', bg: 'fond/surface', kids: [link(tx('OK', 'Titre/S', { c: 'statut/info' }), null, 'back'), tx('getchair.app', 'Corps/S fort', { c: 'texte/secondaire' }), ic('Share', 18, 'statut/info')] }));
    add(b, fr('Page', { dir: 'V', gap: 12, w: 390, pad: 20, kids: [micro('CHAIR'), tx('Politique de confidentialité', 'Titre/L', { fillW: true }), para('Quelles données CHAIR collecte, pourquoi, combien de temps, et comment exercer tes droits (RGPD).'), rect('Ligne', { w: 350, h: 12, r: 6, bg: 'fond/creux' }), rect('Ligne', { w: 300, h: 12, r: 6, bg: 'fond/creux' }), rect('Ligne', { w: 330, h: 12, r: 6, bg: 'fond/creux' })] }));
  });

  // ── Pages publiques partagées ─────────────────────────────────────────
  row('Pages publiques partagées', 'Ouvertes depuis un lien (SMS, réseaux) : annonce de fauteuil, parrainage, invitation d\'un salon, téléchargement des apps.');
  mobile(C.rental, { route: '/fauteuil/[slug]', status: 'E', top: topBar('Fauteuil à louer', { action: true }), bottom: stickyCta('Envoyer une demande', null, ['À partir de', '35 € / jour']), gap: 14, pad: [0, 0, 24, 0] }, (b) => {
    add(b, photo('Photo du poste', 390, 240, 'coupe', 0));
    const body = fr('Infos', { dir: 'V', gap: 12, fillW: true, pad: [0, 16] });
    add(body, bigTitle('Fauteuil lumineux en centre-ville', 'Atelier Dumont · Strasbourg', { size: 'Titre/L' }));
    add(body, fr('Tarifs', { dir: 'H', gap: 10, fillW: true, kids: [['Jour', '35 €'], ['Semaine', '150 €'], ['Mois', '490 €']].map(([k, v]) => card(k, { gap: 2, pad: 14, align: 'center' }, [tx(v, 'Titre/M'), tx(k, 'Légende', { c: 'texte/secondaire' })])) }));
    add(body, fr('Équipements', { dir: 'H', gap: 6, wrap: true, fillW: true, kids: ['Bac à shampoing', 'Séchoir', 'Rangement', 'Wi-Fi'].map((e) => badge(e)) }));
    add(b, body);
  });
  mobile(C.referral, { route: '/parrainage/[code]', status: 'E', pad: [100, 24, 24, 24], gap: 14 }, (b) => {
    add(b, tx('CHAIR PRO', 'Logo'));
    add(b, bigTitle('Léa t\'invite sur CHAIR PRO.', '1 mois de CHAIR+ offert pour toi, et pour elle.', { size: 'Titre/L' }));
    add(b, btn('Rejoindre CHAIR PRO'));
  });
  mobile(C.invite, { route: '/invitation/[token]', status: 'E', pad: [100, 24, 24, 24], gap: 14 }, (b) => {
    add(b, photo('Salon', 342, 160, 'coiffure-homme', 24));
    add(b, bigTitle('Atelier Dumont t\'invite à rejoindre son équipe.', 'Accepte depuis CHAIR PRO, avec ton compte coiffeur.', { size: 'Titre/L' }));
    add(b, btn('Accepter l\'invitation'));
    add(b, btn('Décliner', { type: 'Fantôme' }));
  });
  mobile(C.download, { route: '/download', status: 'E', pad: [100, 24, 24, 24], gap: 16 }, (b) => {
    add(b, bigTitle('Télécharge CHAIR.', 'Le coiffeur fait pour toi.', { size: 'Titre/L' }));
    add(b, btn('App Store', { icon: 'Download' }));
    add(b, card('Pro', { gap: 6 }, [tx('Vous êtes professionnel ?', 'Titre/S'), para('CHAIR PRO pour les coiffeurs, CHAIR BUSINESS pour les gérants.')]));
  });
  endRow();
}
