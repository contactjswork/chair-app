// ═══ 04 — CHAIR PRO — Mobile ════════════════════════════════════════════
// Routes /pro/*, /pro/inscription, /onboarding. Rôles : indépendant (nav
// 6 onglets avec Plus), salarié (5 onglets), double casquette gérant.

const P = {
  login: 'P-01 Connexion', slides: 'P-02 Bienvenue', role: 'P-03 Inscription — rôle', kind: 'P-04 Inscription — activité',
  ident: 'P-05 Inscription — e-mail', loc: 'P-06 Inscription — où exerces-tu', salonSearch: 'P-07 Inscription — ton salon (salarié)',
  obSpec: 'P-08 Onboarding — spécialités', obServ: 'P-09 Onboarding — prestations', obHours: 'P-10 Onboarding — horaires', obPhoto: 'P-11 Onboarding — photo et bio', obDone: 'P-12 Onboarding — prêt',
  home: 'P-20 Accueil', homeNew: 'P-21 Accueil — premiers pas', notifs: 'P-22 Notifications', plus: 'P-23 Plus',
  day: 'P-30 Agenda — jour', week: 'P-31 Agenda — semaine', apt: 'F-10 Rendez-vous (feuille)', newApt: 'P-33 Nouveau rendez-vous', block: 'F-11 Bloquer un créneau (feuille)',
  hours: 'P-35 Planning et horaires', requests: 'P-36 Réservations', dayEmpty: 'P-37 Agenda — journée libre',
  clients: 'P-40 Mes clients', client: 'P-41 Fiche client', clientsFull: 'P-42 Carnet plein (25)', loyalty: 'P-43 Carte de fidélité',
  services: 'P-50 Mes prestations', newService: 'P-51 Nouvelle prestation', serviceSheet: 'F-12 Actions prestation (feuille)', servicesEmpty: 'P-53 Aucune prestation',
  portfolio: 'P-60 Portfolio', newPost: 'P-61 Nouvelle réalisation', postSheet: 'F-13 Actions réalisation (feuille)', profile: 'P-63 Mon profil', qr: 'P-64 Mon QR', preview: 'P-65 Aperçu profil public',
  perf: 'P-70 Performance', progress: 'P-71 Progression', rank: 'P-72 Classement', retro: 'P-73 Rétrospective', plusOffer: 'P-74 CHAIR+', storeKit: 'F-14 Achat Apple (feuille système)', referral: 'P-76 Parrainage',
  salon: 'P-80 Mon salon', opps: 'P-81 Opportunités', jobs: 'P-82 Offres d\'emploi', job: 'P-83 Offre — postuler', rentals: 'P-84 Fauteuils à louer', contract: 'P-85 Contrat de location', toBusiness: 'P-86 Espace gérant → CHAIR BUSINESS',
  denied: 'P-90 Mauvaise app (compte client)', locked: 'P-91 Fonction CHAIR+ verrouillée', hidden: 'P-92 Profil masqué (modération)', del: 'P-93 Supprimer mon compte', offline: 'P-94 Hors connexion',
};
const PRO_TAB = 'Onglets/CHAIR PRO — indépendant';
const PRO_TABS = () => ({ Accueil: P.home, Agenda: P.day, Portfolio: P.portfolio, Performance: P.perf, Profil: P.profile, Plus: P.plus });
const proTop = (t) => topBar(t || 'CHAIR PRO', { logo: true, bellTo: P.notifs });

function proScreen(name, o, build) {
  const s = mobile(name, Object.assign({ route: '/pro', status: 'E', gap: 16, pad: [16, 16, 24, 16] }, o), build);
  if (o.tab) tabLinks(s, PRO_TABS());
  return s;
}
function darkStep(name, o, build) {
  return mobile(name, Object.assign({ status: 'E', bg: 'sombre/fond', statusBar: 'Sombre', statusBg: 'sombre/fond', pad: [12, 20, 24, 20], gap: 18 }, o), build);
}
function darkTitle(t, s) { return fr('Titre', { dir: 'V', gap: 8, fillW: true, kids: [tx(t, 'Titre/L', { c: 'sombre/texte', fillW: true }), s ? tx(s, 'Corps/S', { c: 'neutre/400', fillW: true }) : null] }); }
function darkChoice(t, s, icon, on, to) {
  const c = fr(t, { dir: 'V', gap: 8, fillW: true, pad: [22, 16], align: 'center', r: 18, bg: on ? 'neutre/0' : 'neutre/800', stroke: on ? null : 'neutre/700', strokeW: 2 });
  kids(c, [ic(icon, 30, on ? 'neutre/950' : 'neutre/400'), tx(t, 'Titre/S', { c: on ? 'neutre/950' : 'sombre/texte' }), s ? tx(s, 'Légende/S', { c: on ? 'neutre/500' : 'neutre/400', align: 'center', w: 300 }) : null]);
  if (to) link(c, to);
  return c;
}
function darkField(v, icon) {
  return fr('Champ', { dir: 'H', gap: 10, fillW: true, h: 56, pad: [0, 16], align: 'center', r: 16, bg: 'neutre/900', stroke: 'neutre/700', kids: [ic(icon || 'Mail', 17, 'neutre/500'), tx(v, 'Corps/M', { c: 'sombre/texte', grow: true })] });
}
function darkBtn(label, to) {
  const b = fr('Bouton — ' + label, { dir: 'H', h: 54, fillW: true, r: 16, bg: 'neutre/0', justify: 'center', align: 'center', kids: [tx(label, 'Bouton', { c: 'neutre/950' })] });
  if (to) link(b, to);
  return b;
}
function darkTopBar(n, total) {
  return fr('En-tête', { dir: 'V', gap: 12, w: 390, pad: [6, 20, 10, 20], bg: 'sombre/fond', kids: [link(ic('ArrowLeft', 20, 'sombre/texte'), null, 'back'), fr('Progression', { w: 350, h: 3, r: 2, bg: 'neutre/800', clip: true, kids: [rect('Plein', { w: 350 * n / total, h: 3, r: 2, bg: 'neutre/0' })] })] });
}
function kpi(v, l, o) {
  o = o || {};
  return card('Chiffre — ' + l, { gap: 2, pad: 18, dark: o.dark }, [tx(v, o.big ? 'Chiffre géant' : 'Titre/XL', { c: o.dark ? 'sombre/texte' : 'texte/principal' }), tx(l, 'Légende', { c: o.dark ? 'neutre/400' : 'texte/secondaire' })]);
}
function barChart(name, vals, o) {
  o = o || {};
  const h = o.h || 120;
  const max = Math.max.apply(null, vals);
  const ch = fr(name, { dir: 'H', gap: o.gap || 6, fillW: true, h, align: 'end' });
  vals.forEach((v, i) => add(ch, fr('Barre ' + (i + 1), { w: o.bw || 18, h: Math.max(4, h * v / max), r: 6, bg: i === vals.length - 1 ? 'neutre/900' : 'neutre/200', grow: !o.bw })));
  return ch;
}
function agendaDay(name, h, appts) {
  const day = fr(name, { w: 358, h, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte', clip: true });
  const start = 9, end = 19, top = 16, rowH = (h - 32) / (end - start);
  for (let hr = start; hr <= end; hr++) {
    const y = top + (hr - start) * rowH;
    const l = tx(hr + ':00', 'Légende/S', { c: 'texte/tertiaire' }); day.appendChild(l); l.x = 14; l.y = y - 7;
    const line = rect('Heure ' + hr, { w: 290, h: 1, bg: 'bordure/legere' }); day.appendChild(line); line.x = 56; line.y = y;
  }
  for (const [from, to, st, title, time] of appts) {
    const b = inst('Bloc agenda', { Statut: st, Titre: title, Horaire: time });
    b.resize(282, Math.max(36, (to - from) * rowH - 4));
    day.appendChild(b); b.x = 62; b.y = top + (from - start) * rowH + 2;
    link(b, P.apt, 'overlay');
  }
  const now = rect('Maintenant', { w: 300, h: 2, bg: 'statut/erreur' }); day.appendChild(now); now.x = 50; now.y = top + (11.4 - start) * rowH;
  SIZING.set(day, { fillW: true });
  return day;
}

async function buildProMobile(page) {
  startProduct(page, 'CHAIR PRO');

  // ── Entrée ────────────────────────────────────────────────────────────
  row('Connexion et inscription', 'Écran d\'entrée PRO avec pont vers CHAIR BUSINESS (« vous êtes gérant ? » ouvre l\'autre app, même compte). Inscription sombre, une question par écran.');
  proScreen(P.login, { route: '/pro/connexion', flow: '① PRO — connexion', pad: [40, 16, 24, 16] }, (b) => {
    add(b, tx('CHAIR PRO', 'Logo/L'));
    add(b, bigTitle('Bon retour.', 'Votre agenda, vos clients, votre vitrine.', { size: 'Titre/L' }));
    add(b, field('Adresse e-mail', 'hugo@exemple.fr', { filled: true, icon: 'Mail' }));
    add(b, field('Mot de passe', '••••••••', { filled: true, icon: 'Lock' }));
    add(b, btn('Se connecter', { to: P.home, kind: 'swap' }));
    add(b, btn('Créer mon compte coiffeur', { type: 'Secondaire', to: P.slides }));
    add(b, card('Pont', { dir: 'H', gap: 12, pad: 16, align: 'center' }, [fr('Icône', { dir: 'H', w: 40, h: 40, r: 12, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Building2', 18)] }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Vous gérez un salon ?', 'Corps/S fort'), tx('Ouvrir CHAIR BUSINESS', 'Légende', { c: 'texte/secondaire' })] }), ic('ExternalLink', 16, 'texte/tertiaire')]));
  });
  darkStep(P.slides, { route: '/pro/inscription (accueil)', pad: [80, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 24, bg: 'neutre/800', justify: 'center', align: 'center', kids: [ic('TrendingUp', 32, 'sombre/texte')] }));
    add(b, tx('Fais connaître ton talent.', 'Titre/L', { c: 'sombre/texte', align: 'center' }));
    add(b, tx('CHAIR PRO aide les coiffeurs à gagner en visibilité et à développer leur clientèle.', 'Corps/M', { c: 'neutre/400', align: 'center', w: 320 }));
    add(b, spacer(120));
    add(b, darkBtn('Commencer', P.role));
  });
  darkStep(P.role, { route: '/pro/inscription', top: darkTopBar(1, 6) }, (b) => {
    add(b, micro('Bienvenue', true));
    add(b, darkTitle('Tu es...'));
    add(b, darkChoice('Coiffeur', 'Gère ton profil, tes réalisations et tes RDV', 'Scissors', true));
    add(b, darkChoice('Gérant de salon', 'Salon, équipe, fauteuils — ton espace CHAIR BUSINESS', 'Building2', false, P.toBusiness));
    add(b, darkBtn('Continuer', P.kind));
  });
  darkStep(P.kind, { route: '/pro/inscription', top: darkTopBar(2, 6) }, (b) => {
    add(b, micro('Ton activité', true));
    add(b, darkTitle('Indépendant(e) ou en salon ?'));
    add(b, fr('Choix', { dir: 'H', gap: 12, fillW: true, kids: [darkChoice('Indépendant(e)', null, 'MapPin', true, P.ident), darkChoice('En salon', null, 'Building2', false, P.salonSearch)] }));
    add(b, darkBtn('Continuer', P.ident));
  });
  darkStep(P.ident, { route: '/pro/inscription', top: darkTopBar(4, 6) }, (b) => {
    add(b, micro('Identité', true));
    add(b, darkTitle('Ton email professionnel ?', 'Il servira à te connecter et à recevoir tes notifications importantes.'));
    add(b, darkField('hugo@exemple.fr', 'Mail'));
    add(b, tx('En continuant, tu acceptes nos CGU et notre Politique de confidentialité.', 'Légende', { c: 'neutre/400', fillW: true }));
    add(b, darkBtn('Continuer', P.loc));
  });
  darkStep(P.loc, { route: '/pro/inscription', top: darkTopBar(6, 6) }, (b) => {
    add(b, micro('Localisation', true));
    add(b, darkTitle('Où exerces-tu ?', 'Pour être retrouvé sur la carte et dans les classements locaux.'));
    for (const [k, v] of [['Pays', 'France'], ['Région', 'Grand Est'], ['Département', 'Bas-Rhin'], ['Ville', 'Strasbourg']]) add(b, fr(k, { dir: 'H', fillW: true, pad: [14, 16], r: 16, bg: 'neutre/900', justify: 'between', align: 'center', kids: [tx(k, 'Corps/S', { c: 'neutre/400' }), fr('Valeur', { dir: 'H', gap: 6, align: 'center', kids: [tx(v, 'Corps/S fort', { c: 'sombre/texte' }), ic('Check', 14, 'statut/succes')] })] }));
    add(b, darkField('Rue (facultatif)', 'MapPin'));
    add(b, darkBtn('Créer mon profil', P.obSpec));
  });
  darkStep(P.salonSearch, { route: '/pro/inscription', top: darkTopBar(6, 6) }, (b) => {
    add(b, micro('Ton salon', true));
    add(b, darkTitle('Cherche ton salon.', 'Ton gérant confirmera le rattachement — ça n\'empêche pas de continuer sans.'));
    add(b, darkField('Atelier', 'Search'));
    add(b, fr('Résultat', { dir: 'V', gap: 2, fillW: true, pad: [12, 16], r: 14, bg: 'neutre/900', kids: [tx('Atelier Dumont', 'Corps/S fort', { c: 'sombre/texte' }), tx('Strasbourg', 'Légende', { c: 'neutre/400' })] }));
    add(b, darkBtn('Créer mon profil', P.obSpec));
  });
  const obTop = (n) => fr('En-tête', { dir: 'V', gap: 12, w: 390, pad: [6, 16, 10, 16], bg: 'fond/app', kids: [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [link(ic('ArrowLeft', 20), null, 'back'), link(tx('Passer', 'Corps/S fort', { c: 'texte/secondaire' }), P.home, 'swap')] }), inst('Progression', { 'Étape': n + '/5' })] });
  proScreen(P.obSpec, { route: '/onboarding', top: obTop(1) }, (b) => {
    add(b, bigTitle('Tes spécialités ?', 'Coche tout ce que tu maîtrises.', { size: 'Titre/L' }));
    const g = fr('Spécialités', { dir: 'H', gap: 12, wrap: true, fillW: true });
    DEMO.specialites.slice(0, 6).forEach(([t, img], i) => { const tile = specialtyTile(t, img); if (i === 1 || i === 6) strokeVar(tile.findOne((n) => n.name === 'Illustration'), 'neutre/900', 2); add(g, tile); });
    add(b, g);
    add(b, btn('Continuer', { to: P.obServ }));
  });
  proScreen(P.obServ, { route: '/onboarding', top: obTop(2) }, (b) => {
    add(b, bigTitle('Tes prestations.', 'On t\'en suggère selon tes spécialités. Ajuste prix et durée.', { size: 'Titre/L' }));
    for (const [n, d, p, on] of [['Coupe homme', '30 min', '25 €', true], ['Coupe + barbe', '45 min', '35 €', true], ['Coupe enfant (-12 ans)', '30 min', '18 €', false], ['Coupe étudiant', '30 min', '20 €', false]]) add(b, fr(n, { dir: 'H', gap: 12, fillW: true, pad: [14, 16], r: 18, bg: 'fond/surface', stroke: on ? 'neutre/900' : 'bordure/moyenne', align: 'center', kids: [inst('Case à cocher', { Forme: 'Case', 'État': on ? 'Coché' : 'Vide' }), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx(n, 'Corps/S fort'), tx(d, 'Légende', { c: 'texte/secondaire' })] }), tx(p, 'Titre/S')] }));
    add(b, btn('Continuer', { to: P.obHours }));
  });
  proScreen(P.obHours, { route: '/onboarding · /pro/planning', top: obTop(3) }, (b) => {
    add(b, bigTitle('Tes horaires.', 'Tes clients réservent seulement sur tes créneaux ouverts.', { size: 'Titre/L' }));
    for (const [d, on, h] of [['Lundi', false, 'Fermé'], ['Mardi', true, '9:00 – 19:00'], ['Mercredi', true, '9:00 – 19:00'], ['Jeudi', true, '9:00 – 19:00'], ['Vendredi', true, '9:00 – 20:00'], ['Samedi', true, '9:00 – 17:00'], ['Dimanche', false, 'Fermé']]) add(b, fr(d, { dir: 'H', gap: 12, fillW: true, pad: [12, 16], r: 16, bg: 'fond/surface', align: 'center', kids: [tx(d, 'Corps/S fort', { grow: true }), tx(h, 'Corps/S', { c: on ? 'texte/principal' : 'texte/tertiaire' }), inst('Interrupteur', { Actif: on ? 'Oui' : 'Non' })] }));
    add(b, btn('Continuer', { to: P.obPhoto }));
  });
  proScreen(P.obPhoto, { route: '/onboarding', top: obTop(4) }, (b) => {
    add(b, bigTitle('Ta vitrine.', 'Une photo, deux phrases : c\'est ce que les clients voient en premier.', { size: 'Titre/L' }));
    add(b, fr('Photo', { dir: 'V', gap: 8, fillW: true, align: 'center', kids: [avatar('HL', 'L'), tx('Ajouter une photo', 'Corps/S fort', { c: 'texte/secondaire' })] }));
    add(b, field('Ta bio', 'Barbier à Strasbourg, dégradés nets et barbes soignées.', { filled: true, icon: 'PenLine' }));
    add(b, btn('Terminer', { to: P.obDone }));
  });
  proScreen(P.obDone, { route: '/onboarding', pad: [180, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 40, bg: 'cta/fond', justify: 'center', align: 'center', kids: [ic('Check', 34, 'cta/texte')] }));
    add(b, tx('Ton profil est en ligne.', 'Titre/L', { align: 'center' }));
    add(b, tx('Partage-le pour recevoir tes premières réservations.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
    add(b, btn('Aller à mon accueil', { to: P.homeNew, kind: 'swap' }));
  });

  // ── Accueil ───────────────────────────────────────────────────────────
  row('Accueil et navigation', 'Accueil PRO (app/pro/page.tsx) : Bien démarrer en tête tant que la checklist n\'est pas finie, Aujourd\'hui, prochain palier, Ma vitrine, Ma visibilité, ligne CHAIR+ discrète. Onglet Plus = outils + aide & informations.');
  const today = () => card('Aujourd\'hui', { gap: 10 }, [
    fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [micro('Aujourd\'hui'), link(tx('Agenda', 'Corps/S fort', { c: 'texte/secondaire' }), P.day, 'tab')] }),
    fr('Chiffres', { dir: 'H', gap: 24, kids: [fr('RDV', { dir: 'V', kids: [tx('5', 'Chiffre géant'), tx('rendez-vous', 'Légende', { c: 'texte/secondaire' })] }), fr('Prochain', { dir: 'V', gap: 2, pad: [8, 0, 0, 0], kids: [tx('Prochain · 10:30', 'Corps/S fort'), tx('Camille R. · Balayage', 'Légende', { c: 'texte/secondaire' })] })] }),
    fr('Libre', { dir: 'H', gap: 6, pad: [6, 10], r: 'rayon/pilule', bg: 'fond/creux', align: 'center', kids: [ic('Clock', 13, 'texte/secondaire'), tx('Libre à 15:30', 'Légende', { c: 'texte/secondaire' }), ic('Share2', 12, 'texte/tertiaire')] }),
  ]);
  const vitrine = () => card('Ma vitrine', { gap: 12 }, [micro('Ma vitrine'), fr('Vignettes', { dir: 'H', gap: 6, kids: ['barber', 'classique', 'barbe', 'coiffure-homme'].map((i) => photo('Réalisation', 76, 92, i, 12)) }), tx('12 réalisations · 384 j\'aime', 'Légende', { c: 'texte/secondaire' })]);
  proScreen(P.home, { route: '/pro', flow: '② PRO — accueil et agenda', top: proTop(), tab: [PRO_TAB, 'Accueil'] }, (b) => {
    add(b, tx('Bonjour Hugo', 'Titre/XL'));
    add(b, card('Réponses', { dir: 'H', gap: 12, pad: 16, align: 'center' }, [fr('Pastille', { dir: 'H', w: 36, h: 36, r: 18, bg: 'statut/alerte-fond', justify: 'center', align: 'center', kids: [tx('2', 'Titre/S', { c: 'statut/alerte' })] }), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('2 demandes de rendez-vous', 'Corps/S fort'), tx('Répondez pour ne pas perdre ces clients', 'Légende', { c: 'texte/secondaire' })] }), ic('ChevronRight', 16, 'texte/tertiaire')]));
    link(b.children[b.children.length - 1], P.requests);
    add(b, today());
    add(b, link(card('Classement', { dir: 'H', gap: 12, pad: 18, align: 'center' }, [fr('Rang', { dir: 'V', gap: 0, kids: [tx('3ᵉ', 'Titre/XL'), tx('sur 12', 'Légende', { c: 'texte/secondaire' })] }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [micro('Classement'), tx('Coupe homme à Strasbourg', 'Corps/S fort'), tx('Prochain palier : 2 avis', 'Légende', { c: 'texte/secondaire' })] })]), P.rank));
    add(b, link(vitrine(), P.portfolio, 'tab'));
    add(b, card('Ma visibilité', { gap: 8 }, [micro('Ma visibilité'), fr('Ligne', { dir: 'H', gap: 24, kids: [fr('Vues', { dir: 'V', kids: [tx('214', 'Titre/XL'), tx('vues du profil · 30 j', 'Légende', { c: 'texte/secondaire' })] }), fr('Abonnés', { dir: 'V', kids: [tx('58', 'Titre/XL'), tx('abonnés', 'Légende', { c: 'texte/secondaire' })] })] }), btn('Voir mon profil public', { type: 'Doux', size: 'S', to: P.preview })]));
    add(b, link(listCard('CHAIR+', [listRow('CHAIR+', 'Boost, carnet illimité et statistiques détaillées', 'Sparkles')]), P.plusOffer));
  });
  proScreen(P.homeNew, { route: '/pro', note: 'Profil incomplet — checklist Bien démarrer', top: proTop(), tab: [PRO_TAB, 'Accueil'] }, (b) => {
    add(b, tx('Bienvenue Hugo', 'Titre/XL'));
    const steps = [['Ajouter une photo', true], ['Compléter mon profil', true], ['Publier 3 réalisations', false], ['Partager mon profil', false], ['Valider un 1er passage', false], ['Obtenir un 1er avis', false]];
    const c = card('Bien démarrer', { gap: 10 }, [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', kids: [micro('Bien démarrer'), tx('2 / 6', 'Corps/S fort', { c: 'texte/secondaire' })] }), fr('Rail', { h: 6, fillW: true, r: 3, bg: 'fond/creux', fx: 'Creux', clip: true, kids: [rect('Plein', { w: 108, h: 6, r: 3, bg: 'neutre/900' })] })]);
    steps.forEach(([t, done], i) => add(c, fr(t, { dir: 'H', gap: 12, fillW: true, pad: [i === 2 ? 14 : 8, i === 2 ? 14 : 0], r: 16, bg: i === 2 ? 'fond/creux' : null, align: 'center', kids: [inst('Case à cocher', { Forme: 'Case', 'État': done ? 'Coché' : 'Vide' }), tx(t, i === 2 ? 'Corps/S fort' : 'Corps/S', { grow: true, c: done ? 'texte/tertiaire' : 'texte/principal' }), i === 2 ? btn('Ajouter', { size: 'S', to: P.newPost }) : null] })));
    add(b, c);
    add(b, card('Aujourd\'hui', { gap: 6 }, [micro('Aujourd\'hui'), tx('Journée libre.', 'Titre/M'), para('Partagez votre profil pour lancer la machine.')]));
  });
  proScreen(P.notifs, { route: '/pro/notifications', top: topBar('Notifications'), gap: 0, pad: [8, 16, 24, 16] }, (b) => {
    for (const [t, s, i, to] of [['Nouvelle demande', 'Camille R. · Balayage · mar. 10:30', 'CalendarDays', P.requests], ['Invitation d\'équipe', 'Atelier Dumont vous invite', 'Building2', P.salon], ['Nouvel avis 5★', '« Dégradé parfait »', 'Star', P.preview], ['Palier atteint', 'Expert en Coupe homme', 'Crown', P.progress]]) add(b, listRow(t, s, i, { to }));
  });
  proScreen(P.plus, { route: '/pro/plus', top: topBar('Plus', { back: false }), tab: [PRO_TAB, 'Plus'] }, (b) => {
    add(b, listCard('Outils', [listRow('Réservations', null, 'Clock', { to: P.requests }), listRow('Mon salon', null, 'Building2', { to: P.salon }), listRow('Services', null, 'Scissors', { to: P.services }), listRow('Progression', null, 'Crown', { to: P.progress }), listRow('Classement', null, 'Trophy', { to: P.rank }), listRow('Mes clients', null, 'Users', { to: P.clients }), listRow('Carte de fidélité', null, 'Stamp', { to: P.loyalty }), listRow('Parrainage', null, 'Gift', { to: P.referral }), listRow('CHAIR+', null, 'Sparkles', { to: P.plusOffer }), listRow('Opportunités', null, 'Briefcase', { to: P.opps })]));
    add(b, card('Apparence', { gap: 10 }, [fr('Ligne', { dir: 'H', gap: 12, align: 'center', kids: [ic('Moon', 16, 'texte/secondaire'), tx('Apparence', 'Corps/M')] }), fr('Choix', { dir: 'H', gap: 8, fillW: true, kids: [btn('Clair', { size: 'S' }), btn('Sombre', { size: 'S', type: 'Secondaire' })] })]));
    add(b, micro('Aide & informations'));
    add(b, listCard('Légal', [listRow('Aide & contact', null, 'LifeBuoy'), listRow('Confidentialité', null, 'Shield'), listRow('Conditions d\'utilisation', null, 'FileText'), listRow('Mentions légales', null, 'Scale')]));
  });

  // ── Agenda ────────────────────────────────────────────────────────────
  row('Agenda et réservations', 'Vue jour avec ligne « maintenant », vue semaine, détail d\'un rendez-vous, création, créneaux bloqués, horaires d\'ouverture, demandes à confirmer.');
  const appts = [[9.5, 10.25, 'Terminé', 'Lucas M. · Coupe homme', '9:30 – 10:15'], [10.5, 11.25, 'Confirmé', 'Camille R. · Coupe + barbe', '10:30 – 11:15'], [12.5, 13.5, 'Indisponibilité', 'Pause déjeuner', '12:30 – 13:30'], [14, 14.75, 'Confirmé', 'Yanis B. · Dégradé', '14:00 – 14:45'], [16, 16.5, 'En attente', 'Nouvelle demande · Barbe', '16:00 – 16:30'], [17.5, 18.25, 'Confirmé', 'Théo L. · Coupe homme', '17:30 – 18:15']];
  const dayHead = (active) => fr('Jours', { dir: 'H', gap: 6, kids: [['lun.', '13', 'Défaut'], ['mar.', '14', active ? 'Sélectionné' : 'Aujourd\'hui'], ['mer.', '15', 'Défaut'], ['jeu.', '16', 'Défaut'], ['ven.', '17', 'Défaut'], ['sam.', '18', 'Défaut']].map(([j, d, e]) => inst('Jour', { Jour: j, Date: d, 'État': e })) });
  proScreen(P.day, { route: '/pro/agenda', top: proTop(), tab: [PRO_TAB, 'Agenda'], gap: 14 }, (b) => {
    add(b, fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Mardi 14 octobre', 'Titre/M'), fr('Vues', { dir: 'H', gap: 6, kids: [chip('Jour', true), link(chip('Semaine', false), P.week, 'swap')] })] }));
    add(b, dayHead(true));
    add(b, agendaDay('Journée', 640, appts));
    add(b, fr('Actions', { dir: 'H', gap: 8, fillW: true, kids: [btn('Nouveau rendez-vous', { icon: 'Plus', to: P.newApt }), link(fr('Bloquer', { dir: 'H', w: 54, h: 54, r: 16, bg: 'fond/surface', stroke: 'bordure/moyenne', justify: 'center', align: 'center', kids: [ic('Ban', 18)] }), P.block, 'overlay')] }));
  });
  proScreen(P.week, { route: '/pro/agenda', note: 'Vue semaine', top: proTop(), tab: [PRO_TAB, 'Agenda'], gap: 14 }, (b) => {
    add(b, fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('13 – 18 octobre', 'Titre/M'), fr('Vues', { dir: 'H', gap: 6, kids: [link(chip('Jour', false), P.day, 'swap'), chip('Semaine', true)] })] }));
    const grid = fr('Semaine', { dir: 'H', gap: 4, fillW: true, h: 560, pad: 8, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte' });
    ['L', 'M', 'M', 'J', 'V', 'S'].forEach((d, i) => {
      const col = fr('Jour ' + (i + 1), { dir: 'V', gap: 4, grow: true, fillH: true, kids: [tx(d + ' ' + (13 + i), 'Légende/S', { c: i === 1 ? 'texte/principal' : 'texte/tertiaire', align: 'center', fillW: true })] });
      const n = [2, 6, 4, 5, 7, 3][i];
      for (let k = 0; k < n; k++) add(col, fr('Rdv', { fillW: true, h: 34 + (k % 3) * 18, r: 8, bg: k % 4 === 3 ? 'fond/creux' : 'cta/fond', opacity: i === 0 ? 0.5 : 1 }));
      add(grid, col);
    });
    add(b, grid);
    add(b, tx('27 rendez-vous cette semaine · 4 créneaux libres samedi', 'Légende', { c: 'texte/secondaire' }));
  });
  overlayFrame(P.apt, 'sheet', { route: 'Détail rendez-vous (feuille)', status: 'E' }, (f) => {
    add(f, fr('En-tête', { dir: 'H', gap: 12, fillW: true, align: 'center', kids: [avatar('CR', 'M'), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Camille R.', 'Titre/M'), tx('Cliente fidèle · 6 visites', 'Légende', { c: 'texte/secondaire' })] }), badge('Confirmé', 'Succès')] }));
    add(f, listCard('Infos', [listRow('Coupe + barbe', '45 min · 35 €', 'Scissors', { chevron: false }), listRow('Mardi 14 oct.', '10:30 – 11:15', 'Clock', { chevron: false }), listRow('Résultat souhaité', 'Dégradé bas, barbe taillée', 'MessageCircle', { chevron: false })]));
    add(f, fr('Actions', { dir: 'H', gap: 8, fillW: true, kids: [btn('Appeler', { type: 'Doux', icon: 'Phone' }), btn('Déplacer', { type: 'Secondaire' })] }));
    add(f, btn('Absence du client', { type: 'Fantôme' }));
    add(f, btn('Annuler le rendez-vous', { type: 'Destructif', kind: 'close' }));
  });
  proScreen(P.newApt, { route: '/pro/reservations/nouveau', top: topBar('Nouveau rendez-vous'), bottom: inst('iOS/Clavier'), noHome: true }, (b) => {
    add(b, field('Client', 'Cam', { state: 'Focus', icon: 'User', msg: 'Camille R. · Camille P. — dans votre carnet' }));
    add(b, field('Prestation', 'Coupe + barbe · 45 min', { filled: true, icon: 'Scissors' }));
    add(b, fr('Date', { dir: 'H', gap: 8, fillW: true, kids: [field('Date', 'Mar. 14 oct.', { filled: true, icon: 'CalendarDays' }), field('Heure', '15:30', { filled: true, icon: 'Clock' })] }));
    add(b, btn('Enregistrer', { kind: 'back' }));
  });
  overlayFrame(P.block, 'sheet', { route: 'Indisponibilité (feuille)', status: 'E' }, (f) => {
    add(f, tx('Bloquer un créneau', 'Titre/M', { fillW: true }));
    add(f, fr('Motifs', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('Pause', true), chip('Formation', false), chip('Rendez-vous perso', false), chip('Congés', false)] }));
    add(f, fr('Heures', { dir: 'H', gap: 8, fillW: true, kids: [field('De', '12:30', { filled: true }), field('À', '13:30', { filled: true })] }));
    add(f, btn('Bloquer', { kind: 'close' }));
  });
  proScreen(P.hours, { route: '/pro/planning', top: topBar('Planning') }, (b) => {
    add(b, card('Statut', { dark: true, gap: 6 }, [micro('Planning', true), tx('Votre planning est ouvert', 'Titre/M', { c: 'sombre/texte' }), tx('Vos clients peuvent réserver jusqu\'à 60 jours à l\'avance.', 'Corps/S', { c: 'neutre/400' })]));
    for (const [d, on, h] of [['Mardi', true, '9:00 – 19:00'], ['Mercredi', true, '9:00 – 19:00'], ['Jeudi', true, '9:00 – 19:00'], ['Vendredi', true, '9:00 – 20:00'], ['Samedi', true, '9:00 – 17:00']]) add(b, card(d, { dir: 'H', gap: 12, pad: 16, align: 'center' }, [tx(d, 'Corps/S fort', { grow: true }), tx(h, 'Corps/S'), inst('Interrupteur', { Actif: on ? 'Oui' : 'Non' })]));
    add(b, card('Pause', { gap: 8 }, [micro('Pause déjeuner'), fr('Heures', { dir: 'H', gap: 8, fillW: true, kids: [field('Début de pause', '12:30', { filled: true }), field('Fin de pause', '13:30', { filled: true })] })]));
  });
  proScreen(P.requests, { route: '/pro/reservations', top: topBar('Rendez-vous') }, (b) => {
    add(b, inst('Segments', { Actif: '1', 'Segment 1': 'À confirmer', 'Segment 2': 'À venir', 'Segment 3': 'Passés' }));
    for (const [n, s, w] of [['Camille R.', 'Balayage · 2 h', 'Mar. 14 oct. · 10:30'], ['Sarah K.', 'Coupe + brushing · 45 min', 'Mer. 15 oct. · 16:00']]) add(b, card(n, { gap: 10 }, [fr('Ligne', { dir: 'H', gap: 10, fillW: true, align: 'center', kids: [avatar(n.split(' ').map((x) => x[0]).join(''), 'S'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx(n, 'Corps/S fort'), tx(s, 'Légende', { c: 'texte/secondaire' })] }), badge('En attente', 'Alerte')] }), tx(w, 'Corps/S fort'), fr('Réponses', { dir: 'H', gap: 8, fillW: true, kids: [btn('Accepter', { size: 'S' }), btn('Refuser', { size: 'S', type: 'Secondaire' })] })]));
    add(b, card('Salon', { dir: 'H', gap: 10, pad: 14, align: 'center', flat: true }, [ic('Building2', 16, 'texte/secondaire'), tx('Réservation via votre salon : gérée par Atelier Dumont', 'Légende', { c: 'texte/secondaire', grow: true })]));
  });
  proScreen(P.dayEmpty, { route: '/pro/agenda', note: 'Aucun rendez-vous', top: proTop(), tab: [PRO_TAB, 'Agenda'] }, (b) => {
    add(b, tx('Dimanche 19 octobre', 'Titre/M'));
    const e = inst('État vide', { Titre: 'Journée libre.', Texte: 'Aucun rendez-vous. Partagez un créneau libre en un geste.', Action: true });
    SIZING.set(e, { fillW: true });
    const ei = e.findOne((n) => n.name === 'Icône'); if (ei) ei.swapComponent(ICON.CalendarDays);
    add(b, e);
  });

  // ── Clients ───────────────────────────────────────────────────────────
  row('Clients et fidélité', 'Carnet client (25 clients en gratuit, illimité avec CHAIR+), fiche avec note privée et rythme de retour, carte de fidélité.');
  proScreen(P.clients, { route: '/pro/clients', top: topBar('Mes clients'), gap: 12 }, (b) => {
    add(b, searchBar(null, 'Rechercher un client…'));
    add(b, fr('Compteur', { dir: 'H', gap: 8, fillW: true, pad: [10, 14], r: 14, bg: 'fond/creux', align: 'center', kids: [tx('18 / 25 clients', 'Corps/S fort', { grow: true }), link(tx('Illimité avec CHAIR+', 'Légende', { c: 'texte/secondaire' }), P.plusOffer)] }));
    for (const [n, s] of [['Camille R.', 'Revient toutes les 5 semaines · dans 6 j'], ['Lucas M.', 'Dernier passage il y a 3 sem.'], ['Yanis B.', 'À relancer · 9 semaines'], ['Théo L.', '2 passages']]) add(b, link(card(n, { dir: 'H', gap: 12, pad: 14, align: 'center' }, [avatar(n.split(' ').map((x) => x[0]).join(''), 'S'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx(n, 'Corps/S fort'), tx(s, 'Légende', { c: s.startsWith('À relancer') ? 'statut/alerte' : 'texte/secondaire' })] }), ic('ChevronRight', 16, 'texte/tertiaire')]), P.client));
  });
  proScreen(P.client, { route: '/pro/clients (fiche)', top: topBar('Camille R.', { action: true }) }, (b) => {
    add(b, fr('Identité', { dir: 'H', gap: 14, fillW: true, align: 'center', kids: [avatar('CR', 'L'), fr('Textes', { dir: 'V', gap: 2, kids: [tx('Camille R.', 'Titre/L'), tx('Cliente depuis mars · 6 visites', 'Corps/S', { c: 'texte/secondaire' })] })] }));
    add(b, fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('5 sem.', 'rythme de retour'), kpi('6 j', 'prochain retour estimé')] }));
    add(b, card('Note', { gap: 8 }, [micro('Note privée'), para('Sensible du cuir chevelu, préfère les ciseaux à la tondeuse.', { c: 'texte/principal' })]));
    add(b, micro('Historique'));
    add(b, listCard('Historique', [listRow('Coupe + barbe', '9 sept. · 35 €', 'Scissors', { chevron: false }), listRow('Coupe + barbe', '5 août · 35 €', 'Scissors', { chevron: false }), listRow('Coupe homme', '1 juil. · 25 €', 'Scissors', { chevron: false })]));
    add(b, btn('Proposer un rendez-vous', { to: P.newApt }));
  });
  proScreen(P.clientsFull, { route: '/pro/clients', note: 'Limite gratuite atteinte', top: topBar('Mes clients'), gap: 12 }, (b) => {
    add(b, card('Limite', { dark: true, gap: 8 }, [micro('Carnet plein', true), tx('25 / 25 clients', 'Titre/L', { c: 'sombre/texte' }), tx('Passez à CHAIR+ pour un carnet illimité.', 'Corps/S', { c: 'neutre/400' }), link(fr('Bouton', { dir: 'H', h: 44, fillW: true, r: 14, bg: 'neutre/0', justify: 'center', align: 'center', kids: [tx('Essayer 30 jours gratuits', 'Bouton/S', { c: 'neutre/950' })] }), P.plusOffer)]));
    for (const n of ['Camille R.', 'Lucas M.', 'Yanis B.']) add(b, card(n, { dir: 'H', gap: 12, pad: 14, align: 'center' }, [avatar(n.split(' ').map((x) => x[0]).join(''), 'S'), tx(n, 'Corps/S fort', { grow: true })]));
  });
  proScreen(P.loyalty, { route: '/pro/fidelite', top: topBar('Carte de fidélité') }, (b) => {
    add(b, card('Carte', { dark: true, gap: 12 }, [micro('Votre programme', true), fr('Tampons', { dir: 'H', gap: 8, kids: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ellipse('Tampon', { w: 30, bg: n <= 8 ? 'neutre/700' : 'neutre/800' })) }), tx('8 passages → 1 coupe offerte', 'Titre/M', { c: 'sombre/texte' })]));
    add(b, card('Réglages', { gap: 12 }, [micro('Passages avant récompense'), fr('Choix', { dir: 'H', gap: 8, kids: [chip('5', false), chip('8', true), chip('10', false)] }), field('Récompense', 'Une coupe offerte', { filled: true, icon: 'Gift' })]));
    add(b, fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('14', 'cartes actives'), kpi('3', 'à honorer au comptoir')] }));
  });

  // ── Prestations ───────────────────────────────────────────────────────
  row('Prestations', 'Services par spécialité, suggestions, prix et durée, actions (modifier, dupliquer, supprimer), état vide.');
  proScreen(P.services, { route: '/pro/services', top: topBar('Mes prestations') }, (b) => {
    for (const [cat, items] of [['Coupe homme', [['Coupe homme', '30 min', '25 €'], ['Coupe + barbe', '45 min', '35 €'], ['Coupe enfant', '30 min', '18 €']]], ['Barbe', [['Taille de barbe', '20 min', '15 €'], ['Rasage à l\'ancienne', '30 min', '25 €']]]]) {
      add(b, micro(cat));
      add(b, listCard(cat, items.map(([n, d, p]) => { const r = fr(n, { dir: 'H', gap: 12, fillW: true, pad: [14, 16], align: 'center', bg: 'fond/surface', kids: [fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx(n, 'Corps/S fort'), tx(d, 'Légende', { c: 'texte/secondaire' })] }), tx(p, 'Titre/S'), ic('Ellipsis', 18, 'texte/tertiaire')] }); return link(r, P.serviceSheet, 'overlay'); })));
    }
    add(b, btn('Nouvelle prestation', { icon: 'Plus', to: P.newService }));
  });
  proScreen(P.newService, { route: '/pro/services (création)', top: topBar('Nouveau service') }, (b) => {
    add(b, micro('Suggestions'));
    add(b, fr('Suggestions', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('Coupe étudiant', false, { icon: 'Plus' }), chip('Dégradé américain', false, { icon: 'Plus' }), chip('Contours', false, { icon: 'Plus' })] }));
    add(b, field('Nom', 'Dégradé américain', { filled: true }));
    add(b, field('Spécialité', 'Coupe homme', { filled: true }));
    add(b, fr('Prix et durée', { dir: 'H', gap: 8, fillW: true, kids: [field('Prix', '30 €', { filled: true }), field('Durée', '40 min', { filled: true })] }));
    add(b, field('Description', 'Ce que le service comprend, pour qui…', {}));
    add(b, btn('Enregistrer', { kind: 'back' }));
  });
  overlayFrame(P.serviceSheet, 'sheet', { route: 'ServiceActionsSheet', status: 'E' }, (f) => {
    add(f, tx('Coupe + barbe', 'Titre/M', { fillW: true }));
    add(f, listCard('Actions', [listRow('Modifier', null, 'PenLine', { to: P.newService }), listRow('Dupliquer', null, 'Copy'), listRow('Supprimer', null, 'Trash2', { danger: true })]));
  });
  proScreen(P.servicesEmpty, { route: '/pro/services', note: 'Aucun service', top: topBar('Mes prestations'), pad: [60, 16, 24, 16] }, (b) => {
    const e = inst('État vide', { Titre: 'Aucune prestation', Texte: 'Ajoutez vos services pour être réservable.', Action: true });
    SIZING.set(e, { fillW: true }); const ei = e.findOne((n) => n.name === 'Icône'); if (ei) ei.swapComponent(ICON.Scissors); link(e, P.newService); add(b, e);
  });

  // ── Vitrine ───────────────────────────────────────────────────────────
  row('Vitrine : portfolio, profil, QR', 'Portfolio (épingler 3 réalisations et vidéos 15 s avec CHAIR+), publication, édition du profil public, QR des avis vérifiés, aperçu côté client.');
  proScreen(P.portfolio, { route: '/pro/portfolio', top: proTop(), tab: [PRO_TAB, 'Portfolio'], gap: 12 }, (b) => {
    add(b, fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Portfolio', 'Titre/XL'), btn('Publier', { size: 'S', icon: 'Plus', to: P.newPost })] }));
    add(b, fr('Filtres', { dir: 'H', gap: 8, kids: [chip('Tout', true), chip('Épinglées', false, { icon: 'Pin' }), chip('Archivées', false)] }));
    const g = fr('Grille', { dir: 'H', gap: 3, wrap: true, fillW: true });
    ['barber', 'classique', 'barbe', 'coiffure-homme', 'coupe', 'dreads', 'barber', 'classique', 'barbe'].forEach((img, i) => add(g, realTile(img, [96, 84, 61, 140, 45, 30, 22, 18, 12][i], P.postSheet, 117, 146)));
    add(b, g);
    for (const n of g.children) link(n, P.postSheet, 'overlay');
  });
  proScreen(P.newPost, { route: '/pro/portfolio (publication)', top: topBar('Nouvelle réalisation') }, (b) => {
    add(b, inst('Zone de dépôt', { Texte: 'Ajouter des photos' }));
    add(b, fr('Aperçus', { dir: 'H', gap: 8, kids: [photo('Photo 1', 80, 100, 'barber', 14), photo('Photo 2', 80, 100, 'barbe', 14)] }));
    add(b, field('Spécialité', 'Coupe homme', { filled: true, icon: 'Scissors' }));
    add(b, field('Description', 'Dégradé bas, contours nets', { filled: true }));
    add(b, card('Vidéo', { dir: 'H', gap: 10, pad: 14, align: 'center', flat: true }, [ic('Film', 18, 'texte/secondaire'), tx('Vidéo 15 s', 'Corps/S fort', { grow: true }), badge('CHAIR+', 'Sombre')]));
    add(b, btn('Publier', { kind: 'back' }));
  });
  overlayFrame(P.postSheet, 'sheet', { route: 'PostActionsSheet', status: 'E' }, (f) => {
    add(f, tx('Réalisation', 'Titre/M', { fillW: true }));
    add(f, listCard('Actions', [listRow('Épingler en tête', 'CHAIR+', 'Pin'), listRow('Partager', 'Lien natif', 'Share2'), listRow('Modifier', null, 'PenLine', { to: P.newPost }), listRow('Archiver', null, 'Archive'), listRow('Supprimer', null, 'Trash2', { danger: true })]));
  });
  proScreen(P.profile, { route: '/pro/profil', top: proTop(), tab: [PRO_TAB, 'Profil'] }, (b) => {
    add(b, fr('Identité', { dir: 'V', gap: 8, fillW: true, align: 'center', kids: [avatar('HL', 'L', true), tx('Hugo Lambert', 'Titre/L'), link(tx('Voir mon profil public', 'Corps/S fort', { c: 'texte/secondaire' }), P.preview)] }));
    add(b, field('Bio', 'Barbier à Strasbourg, dégradés nets et barbes soignées.', { filled: true }));
    add(b, card('Spécialités', { gap: 10 }, [micro('Spécialités'), fr('Choix', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('Coupe homme', true), chip('Barbe', true), chip('Barber', true), chip('Locks', false)] })]));
    add(b, card('Disponibilité', { dir: 'H', gap: 12, pad: 16, align: 'center' }, [fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('Je cherche un salon', 'Corps/S fort'), tx('Visible des gérants près de chez vous', 'Légende', { c: 'texte/secondaire' })] }), inst('Interrupteur', { Actif: 'Non' })]));
    add(b, listCard('Liens', [listRow('Mon QR', 'Avis vérifiés', 'QrCode', { to: P.qr }), listRow('Mes prestations', null, 'Scissors', { to: P.services }), listRow('Planning', null, 'CalendarDays', { to: P.hours })]));
    add(b, btn('Enregistrer'));
    add(b, btn('Se déconnecter', { type: 'Fantôme', to: P.login, kind: 'swap' }));
    add(b, link(tx('Supprimer mon compte', 'Légende', { c: 'texte/tertiaire', align: 'center', fillW: true }), P.del));
  });
  proScreen(P.qr, { route: '/pro/mon-qr', top: topBar('Mon QR Code CHAIR'), pad: [24, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    const q = fr('QR', { w: 260, h: 260, r: 28, bg: 'fond/surface', fx: 'Carte', clip: true });
    for (let i = 0; i < 81; i++) { const on = ((i * 7) % 5) < 2 || [0, 1, 9, 10, 7, 8, 16, 17, 63, 64, 72, 73].includes(i); if (!on) continue; const r = rect('m', { w: 22, h: 22, r: 4, bg: 'neutre/950' }); q.appendChild(r); r.x = 32 + (i % 9) * 22; r.y = 32 + Math.floor(i / 9) * 22; }
    add(b, q);
    add(b, tx('Faites scanner après chaque passage.', 'Titre/M', { align: 'center' }));
    add(b, tx('La visite est vérifiée, l\'avis devient certifié.', 'Corps/S', { c: 'texte/secondaire', align: 'center' }));
    add(b, fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('41', 'visites vérifiées'), kpi('29', 'avis certifiés')] }));
  });
  proScreen(P.preview, { route: '/app/coiffeur/[slug] (aperçu)', note: 'Prévisualisation du profil côté client', top: topBar('Aperçu client'), gap: 0, pad: [0, 0, 24, 0] }, (b) => {
    for (const n of profileHeader(DEMO.coiffeurs[3], 1)) add(b, n);
  });

  // ── Performance ───────────────────────────────────────────────────────
  row('Performance, progression, CHAIR+', 'Statistiques (30 jours, 12 mois avec CHAIR+), progression par spécialité et paliers, classement local, rétrospective, offre CHAIR+ avec achat intégré Apple, parrainage.');
  proScreen(P.perf, { route: '/pro/business', top: proTop(), tab: [PRO_TAB, 'Performance'] }, (b) => {
    add(b, bigTitle('Performance', 'Votre activité, votre audience, ce qui marche.', { size: 'Titre/L' }));
    add(b, fr('Période', { dir: 'H', gap: 8, kids: [chip('30 jours', true), link(chip('12 mois', false, { icon: 'Lock' }), P.locked)] }));
    add(b, fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('214', 'vues du profil'), kpi('31', 'rendez-vous')] }));
    add(b, card('Courbe', { gap: 12 }, [micro('Vues par semaine'), barChart('Barres', [18, 26, 22, 31, 40, 37, 52, 61])]));
    add(b, listCard('Liens', [listRow('Classement', 'Votre place par spécialité', 'Trophy', { to: P.rank }), listRow('Progression', 'Niveau, paliers et trophées', 'Crown', { to: P.progress }), listRow('Opportunités', 'Emploi, fauteuils', 'Briefcase', { to: P.opps })]));
  });
  proScreen(P.progress, { route: '/pro/badges', top: topBar('Progression') }, (b) => {
    add(b, card('Niveau', { dark: true, gap: 8 }, [micro('Coupe homme', true), tx('Expert', 'Titre/XL', { c: 'sombre/texte' }), tx('Encore 3 avis pour devenir Référence', 'Corps/S', { c: 'neutre/400' }), fr('Rail', { h: 6, fillW: true, r: 3, bg: 'neutre/800', clip: true, kids: [rect('Plein', { w: 230, h: 6, r: 3, bg: 'neutre/0' })] }), btn('Partager ma réussite', { type: 'Secondaire', size: 'S', icon: 'Share2' })]));
    add(b, micro('Trophées'));
    add(b, fr('Trophées', { dir: 'H', gap: 10, wrap: true, fillW: true, kids: [['Premier avis', 'Star', true], ['10 visites', 'BadgeCheck', true], ['Série de 4 sem.', 'Flame', true], ['50 avis', 'Trophy', false], ['Top 3 local', 'Crown', false], ['100 j\'aime', 'Heart', false]].map(([t, i, on]) => fr(t, { dir: 'V', gap: 6, w: 106, pad: 12, r: 20, bg: 'fond/surface', align: 'center', opacity: on ? 1 : 0.4, kids: [ic(i, 22, on ? 'texte/principal' : 'texte/tertiaire'), tx(t, 'Légende/S', { align: 'center', w: 90 })] })) }));
  });
  proScreen(P.rank, { route: '/pro/classements', top: topBar('Classement') }, (b) => {
    add(b, fr('Filtres', { dir: 'H', gap: 8, kids: [chip('Coupe homme', true), chip('Strasbourg', true, { icon: 'MapPin' })] }));
    DEMO.coiffeurs.slice(0, 5).forEach((c, i) => add(b, card(c.nom, { dir: 'H', gap: 12, pad: 14, align: 'center', flat: i !== 2 }, [tx(String(i + 1), 'Titre/L', { c: i === 2 ? 'texte/principal' : 'texte/tertiaire' }), avatar(i === 2 ? 'HL' : c.ini, 'S', i === 2), tx(i === 2 ? 'Hugo Lambert (vous)' : c.nom, 'Corps/S fort', { grow: true }), noteRow(c.note)])));
  });
  proScreen(P.retro, { route: '/pro/retrospective', status: 'I', note: 'Page présente, contenu en construction', top: topBar('Rétrospective'), pad: [60, 24, 24, 24] }, (b) => {
    add(b, card('Retro', { dark: true, gap: 8, pad: 28 }, [micro('2026', true), tx('Votre année s\'écrit encore', 'Titre/XL', { c: 'sombre/texte' }), tx('Rendez-vous en décembre pour votre rétrospective.', 'Corps/S', { c: 'neutre/400' })]));
  });
  proScreen(P.plusOffer, { route: '/pro/chair-plus', top: topBar('CHAIR+'), gap: 18 }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, micro('Pour les coiffeurs'));
    add(b, fr('Wordmark', { dir: 'H', kids: [tx('CHAIR', 'Logo/L'), tx('+', 'Logo/L', { c: 'accent/or' })] }));
    add(b, tx('Passez devant.', 'Titre/XL', { align: 'center' }));
    add(b, tx('La visibilité, le badge, le carnet illimité.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
    add(b, btn('Essayer 30 jours gratuits', { to: P.storeKit, kind: 'overlay' }));
    add(b, tx('Puis 15,99 €/mois. Sans engagement.', 'Légende', { c: 'texte/tertiaire' }));
    add(b, tx('Abonnement mensuel à renouvellement automatique · Conditions · Confidentialité', 'Légende/S', { c: 'texte/tertiaire', align: 'center', w: 320 }));
    add(b, tx('Déjà abonné via l\'App Store ? Restaurer mes achats', 'Légende', { c: 'texte/secondaire' }));
    add(b, card('Carnet', { dark: true, dir: 'H', gap: 14, align: 'center' }, [ic('BookUser', 22, 'accent/or'), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Carnet client illimité', 'Titre/S', { c: 'sombre/texte' }), tx('Tous vos clients, plus seulement 25.', 'Légende', { c: 'neutre/400' })] })]));
    const comp = listCard('Comparatif', [['Carnet client', '25', 'Illimité'], ['Analytics', '30 j', '12 mois'], ['Vidéos 15 s', '—', '✓'], ['Réalisations épinglées', '—', '✓'], ['Badge CHAIR+', '—', '✓'], ['Boost local', '—', '✓']].map(([k, a, z]) => fr(k, { dir: 'H', gap: 8, fillW: true, pad: [12, 16], align: 'center', bg: 'fond/surface', kids: [tx(k, 'Corps/S', { grow: true }), tx(a, 'Légende', { c: 'texte/tertiaire', w: 56, align: 'center' }), tx(z, 'Corps/S fort', { w: 64, align: 'center' })] })));
    add(b, comp);
  });
  overlayFrame(P.storeKit, 'sheet', { route: 'Feuille de paiement Apple (StoreKit)', status: 'E', note: 'Système iOS' }, (f) => {
    add(f, fr('En-tête', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('App Store', 'Titre/S'), link(tx('Annuler', 'Corps/S', { c: 'statut/info' }), null, 'close')] }));
    add(f, fr('Produit', { dir: 'H', gap: 12, fillW: true, align: 'center', kids: [fr('Icône', { w: 56, h: 56, r: 14, bg: 'sombre/fond' }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('CHAIR+', 'Titre/S'), tx('Carnet illimité, boost local et statistiques', 'Légende', { c: 'texte/secondaire' })] })] }));
    add(f, listCard('Conditions', [fr('Essai', { dir: 'H', fillW: true, pad: [12, 16], justify: 'between', kids: [tx('1 mois gratuit', 'Corps/S fort'), tx('puis 15,99 €/mois', 'Corps/S', { c: 'texte/secondaire' })] })]));
    add(f, btn('Confirmer avec Face ID', { icon: 'ScanFace', kind: 'close' }));
  });
  proScreen(P.referral, { route: '/pro/parrainage', top: topBar('Parrainage') }, (b) => {
    add(b, bigTitle('Gagnez CHAIR+ sans payer.', '1 coiffeur parrainé = 1 mois offert pour vous, et 1 pour lui.', { size: 'Titre/L' }));
    add(b, card('Code', { gap: 10 }, [micro('Votre lien'), fr('Lien', { dir: 'H', gap: 10, fillW: true, pad: 14, r: 16, bg: 'fond/creux', align: 'center', kids: [tx('getchair.app/parrainage/HUGO', 'Corps/S fort', { grow: true }), ic('Copy', 16, 'texte/secondaire')] }), btn('Partager le lien', { icon: 'Share2' })]));
    add(b, fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('2', 'filleuls'), kpi('2 mois', 'CHAIR+ gagnés')] }));
  });

  // ── Salon et opportunités ─────────────────────────────────────────────
  row('Salon et opportunités', 'Relation au salon (invitations à accepter, quitter), opportunités : offres d\'emploi, fauteuils à louer, contrat de mise à disposition. L\'espace gérant vit dans CHAIR BUSINESS.');
  proScreen(P.salon, { route: '/pro/salon', top: topBar('Mon salon') }, (b) => {
    add(b, inst('Segments', { Actif: '2', 'Segment 1': 'Mon salon', 'Segment 2': 'Invitations', 'Segment 3': 'Rejoindre' }));
    add(b, card('Invitation', { gap: 10 }, [fr('Ligne', { dir: 'H', gap: 12, fillW: true, align: 'center', kids: [photo('Salon', 48, 48, 'coiffure-homme', 14), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('Atelier Dumont', 'Titre/S'), tx('Strasbourg · vous invite', 'Légende', { c: 'texte/secondaire' })] }), badge('Nouveau', 'Sombre')] }), para('« Bonjour Hugo, on serait ravis de vous compter dans l\'équipe. »'), fr('Réponses', { dir: 'H', gap: 8, fillW: true, kids: [btn('Accepter', { size: 'S' }), btn('Décliner', { size: 'S', type: 'Secondaire' })] })]));
  });
  proScreen(P.opps, { route: '/pro/opportunites', top: topBar('Opportunités') }, (b) => {
    add(b, link(card('Emploi', { dir: 'H', gap: 14, pad: 18, align: 'center' }, [fr('Icône', { dir: 'H', w: 44, h: 44, r: 14, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Briefcase', 20)] }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Offres d\'emploi', 'Titre/S'), tx('3 offres près de chez vous', 'Légende', { c: 'texte/secondaire' })] }), ic('ChevronRight', 16, 'texte/tertiaire')]), P.jobs));
    add(b, link(card('Fauteuils', { dir: 'H', gap: 14, pad: 18, align: 'center' }, [fr('Icône', { dir: 'H', w: 44, h: 44, r: 14, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Armchair', 20)] }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Fauteuils à louer', 'Titre/S'), tx('Exercer en indépendant dans un salon', 'Légende', { c: 'texte/secondaire' })] }), ic('ChevronRight', 16, 'texte/tertiaire')]), P.rentals));
    add(b, link(card('Gérant', { dir: 'H', gap: 14, pad: 18, align: 'center', flat: true }, [fr('Icône', { dir: 'H', w: 44, h: 44, r: 14, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Building2', 20)] }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Vous gérez aussi un salon ?', 'Titre/S'), tx('Ouvrir CHAIR BUSINESS', 'Légende', { c: 'texte/secondaire' })] }), ic('ExternalLink', 16, 'texte/tertiaire')]), P.toBusiness));
  });
  proScreen(P.jobs, { route: '/pro/offres-emploi', top: topBar('Offres d\'emploi'), gap: 12 }, (b) => {
    add(b, searchBar(null, 'Titre, salon, ville...'));
    for (const [t, s, k] of [['Coiffeur·se confirmé·e', 'Atelier Dumont · Strasbourg', 'CDI'], ['Barbier', 'Maison Noire · Schiltigheim', 'CDD 6 mois'], ['Coloriste', 'Studio Ève · Strasbourg', 'Temps partiel']]) add(b, link(card(t, { gap: 6 }, [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx(t, 'Titre/S'), badge(k, 'Sombre')] }), tx(s, 'Corps/S', { c: 'texte/secondaire' })]), P.job));
  });
  proScreen(P.job, { route: '/pro/offres-emploi (détail)', top: topBar('Offre'), bottom: inst('iOS/Clavier'), noHome: true }, (b) => {
    add(b, bigTitle('Coiffeur·se confirmé·e', 'Atelier Dumont · Strasbourg · CDI', { size: 'Titre/L' }));
    add(b, card('Poste', { gap: 8 }, [micro('Description du poste'), para('Équipe de 4, clientèle fidèle, formation couleur offerte.', { c: 'texte/principal' })]));
    add(b, field('Un mot pour le gérant', 'Disponible dès novembre|', { state: 'Focus', icon: 'MessageCircle' }));
    add(b, btn('Postuler à cette offre', { kind: 'back' }));
  });
  proScreen(P.rentals, { route: '/pro/fauteuils-a-louer', top: topBar('Fauteuils à louer'), gap: 12 }, (b) => {
    add(b, fr('Recherche', { dir: 'H', gap: 8, fillW: true, kids: [searchBar(null, 'Rechercher par ville, salon...'), fr('Filtres', { dir: 'H', w: 48, h: 48, r: 16, bg: 'fond/surface', stroke: 'bordure/moyenne', justify: 'center', align: 'center', kids: [ic('SlidersHorizontal', 18)] })] }));
    add(b, card('Acceptée', { dir: 'H', gap: 12, pad: 14, align: 'center' }, [ic('BadgeCheck', 18, 'statut/succes'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('Mes locations acceptées', 'Corps/S fort'), tx('Atelier Dumont · dès le 2 nov.', 'Légende', { c: 'texte/secondaire' })] }), link(btn('Contrat', { size: 'S', type: 'Doux', icon: 'FileText' }), P.contract)]));
    for (const [t, s, p, img] of [['Fauteuil lumineux en centre-ville', 'Atelier Dumont · Strasbourg', '35 €/j', 'coupe'], ['Poste barbier équipé', 'Maison Noire · Schiltigheim', '150 €/sem.', 'barber']]) add(b, card(t, { gap: 10, pad: 0, align: null }, [photo('Photo', 358, 150, img, [28, 28, 0, 0]), fr('Infos', { dir: 'V', gap: 4, fillW: true, pad: [0, 16, 16, 16], kids: [tx(t, 'Titre/S'), tx(s + ' · ' + p, 'Légende', { c: 'texte/secondaire' })] })]));
  });
  proScreen(P.contract, { route: '/contrat-fauteuil/[id]', top: topBar('Contrat de location'), gap: 10 }, (b) => {
    add(b, card('Contrat', { gap: 10, pad: 22 }, [micro('CHAIR'), tx('Contrat de mise à disposition d\'un fauteuil', 'Titre/M', { fillW: true }), para('Entre Atelier Dumont (SIRET 912 345 678 00012) et Hugo Lambert (SIRET 845 123 456 00021).'), micro('Article 5 — Indépendance'), para('Le locataire exerce en toute indépendance, avec sa propre clientèle, ses tarifs et son matériel.'), rect('Ligne', { w: 300, h: 10, r: 5, bg: 'fond/creux' }), rect('Ligne', { w: 260, h: 10, r: 5, bg: 'fond/creux' }), tx('Modèle indicatif — à faire relire.', 'Légende', { c: 'texte/tertiaire' })]));
  });
  proScreen(P.toBusiness, { route: '/business (dans CHAIR PRO)', note: 'BusinessAppGate — change vraiment d\'app', pad: [140, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, tx('CHAIR BUSINESS', 'Logo/L'));
    add(b, tx('L\'espace gérant a sa propre app.', 'Titre/L', { align: 'center' }));
    add(b, tx('Même compte, mêmes identifiants.', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, btn('Ouvrir CHAIR BUSINESS', { icon: 'ExternalLink' }));
  });

  // ── États ─────────────────────────────────────────────────────────────
  row('États particuliers', 'Mauvaise app, fonction réservée CHAIR+, profil masqué par la modération (proposition), suppression du compte, hors connexion.');
  proScreen(P.denied, { route: 'Verrou binaire ↔ rôle', note: 'Accès refusé selon rôle', pad: [180, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 72, h: 72, r: 36, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Lock', 28, 'texte/secondaire')] }));
    add(b, tx('CHAIR PRO est l\'app des coiffeurs.', 'Titre/L', { align: 'center', w: 320 }));
    add(b, tx('Ton compte client s\'utilise dans l\'app CHAIR.', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, btn('Ouvrir CHAIR', { icon: 'ExternalLink' }));
  });
  proScreen(P.locked, { route: '/pro/business (12 mois)', note: 'Fonctionnalité indisponible sans CHAIR+', top: topBar('Performance'), pad: [40, 16, 24, 16] }, (b) => {
    add(b, card('Verrou', { gap: 10, align: 'center', pad: 28 }, [ic('Lock', 26, 'texte/secondaire'), tx('12 mois d\'historique', 'Titre/M', { align: 'center' }), para('Inclus dans CHAIR+.', { align: 'center' }), btn('Découvrir CHAIR+', { size: 'S', to: P.plusOffer })]));
  });
  proScreen(P.hidden, { route: 'Modération (is_hidden)', status: 'N', note: 'Message à afficher au coiffeur masqué', top: proTop(), pad: [24, 16, 24, 16] }, (b) => {
    add(b, fr('Bandeau', { dir: 'H', gap: 10, fillW: true, pad: 16, r: 20, bg: 'statut/alerte-fond', align: 'center', kids: [ic('EyeOff', 18, 'statut/alerte'), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Profil temporairement masqué', 'Corps/S fort', { c: 'statut/alerte' }), tx('Il n\'apparaît plus dans la recherche. Contactez le support.', 'Légende', { c: 'statut/alerte' })] })] }));
    add(b, btn('Contacter le support', { type: 'Doux', icon: 'LifeBuoy' }));
  });
  proScreen(P.del, { route: '/app/compte/supprimer', note: 'Confirmation de suppression', top: topBar('Supprimer mon compte'), pad: [24, 16, 24, 16] }, (b) => {
    add(b, fr('Pictogramme', { dir: 'H', w: 64, h: 64, r: 32, bg: 'statut/erreur-fond', justify: 'center', align: 'center', kids: [ic('Trash2', 26, 'statut/erreur')] }));
    add(b, bigTitle('Supprimer votre compte ?', 'Profil, portfolio, prestations et agenda seront effacés. C\'est définitif.', { size: 'Titre/L' }));
    add(b, field('Mot de passe', '••••••••', { filled: true, icon: 'Lock' }));
    add(b, btn('Supprimer définitivement', { type: 'Destructif' }));
    add(b, btn('Annuler', { type: 'Fantôme', kind: 'back' }));
  });
  proScreen(P.offline, { route: 'OfflineScreen', note: 'Absence de réseau', pad: [220, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 72, h: 72, r: 36, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('WifiOff', 30, 'texte/secondaire')] }));
    add(b, tx('Pas de connexion', 'Titre/L', { align: 'center' }));
    add(b, tx('Vos données reviennent dès que le réseau revient.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
  });
  endRow();
}
