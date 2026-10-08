// ═══ 06/07 — CHAIR BUSINESS — Mobile et Desktop ═════════════════════════
// Réalité du code : une coquille gérant (BusinessShell) posée sur les écrans
// gérant de PRO (ré-exports /business/* → /pro/*), 5 onglets sans « Plus »,
// icône compte en haut à gauche. Ce qui n'existe pas encore est marqué N.

const B = {
  login: 'B-01 Connexion', loginForm: 'B-02 Connexion — formulaire', signSalon: 'B-03 Inscription — nom du salon', siret: 'B-04 Inscription — SIRET',
  obPhotos: 'B-05 Onboarding — photos du salon', ready: 'B-06 Salon prêt',
  home: 'B-10 Accueil', homeEmpty: 'B-11 Accueil — salon à créer', notifs: 'B-12 Notifications', account: 'B-13 Mon compte',
  salon: 'B-20 Salon', qr: 'F-20 QR avis du salon (feuille)', siretSheet: 'F-21 Vérification SIRET (feuille)',
  team: 'B-30 Équipe', invite: 'F-22 Inviter un coiffeur (feuille)', teamEmpty: 'B-32 Équipe — vide',
  recruit: 'B-40 Recrutement', newOffer: 'B-41 Nouvelle offre',
  chairs: 'B-50 Fauteuils', wizard1: 'B-51 Annonce — équipements', wizard2: 'B-52 Annonce — disponibilités', wizard3: 'B-53 Annonce — prix conseillés', request: 'F-23 Demande de location (feuille)', payouts: 'B-55 Encaissements (Stripe Connect)',
  sub: 'B-60 Abonnement — prochainement', denied: 'B-61 Mauvaise app', toPro: 'B-62 Double casquette → CHAIR PRO',
};
const BIZ_TAB = 'Onglets/CHAIR BUSINESS';
const BIZ_TABS = () => ({ Accueil: B.home, Salon: B.salon, 'Équipe': B.team, Recrutement: B.recruit, Fauteuils: B.chairs });
function bizTop() {
  // Barre haute BUSINESS (BusinessShell) : compte à gauche, wordmark, cloche.
  const t = fr('Barre haute BUSINESS', { dir: 'H', w: 390, h: 56, pad: [0, 6], align: 'center', justify: 'between', bg: 'fond/surface', fx: 'Barre haute' });
  const left = fr('Mon compte', { dir: 'H', w: 44, h: 44, justify: 'center', align: 'center', kids: [ic('CircleUser', 20, 'texte/secondaire')] });
  const bell = fr('Notifications', { dir: 'H', w: 44, h: 44, justify: 'center', align: 'center', kids: [ic('Bell', 19, 'texte/secondaire')] });
  const dot = ellipse('Pastille', { w: 9, bg: 'statut/erreur' });
  kids(t, [link(left, B.account), tx('CHAIR BUSINESS', 'Logo'), link(bell, B.notifs)]);
  add(bell, dot); dot.layoutPositioning = 'ABSOLUTE'; dot.x = 26; dot.y = 11;
  return t;
}
function bizScreen(name, o, build) {
  const s = mobile(name, Object.assign({ route: '/business', status: 'E', gap: 16, pad: [16, 16, 24, 16] }, o), build);
  if (o.tab) tabLinks(s, BIZ_TABS());
  return s;
}
function memberRow(c, extra, to) {
  const r = card(c.nom, { dir: 'H', gap: 12, pad: 14, align: 'center' }, [avatar(c.ini, 'M'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx(c.nom, 'Titre/S'), tx(c.spe + ' · ' + c.note + '★ · ' + c.avis + ' avis', 'Légende', { c: 'texte/secondaire' })] }), extra || ic('ChevronRight', 16, 'texte/tertiaire')]);
  if (to) link(r, to);
  return r;
}

async function buildBusinessMobile(page) {
  startProduct(page, 'CHAIR BUSINESS');
  const team = DEMO.coiffeurs.filter((c) => c.statut === 'Atelier Dumont').concat([DEMO.coiffeurs[0]]);

  row('Entrée et création du salon', 'Un seul compte pro pour PRO et BUSINESS : « Se connecter avec mon compte CHAIR PRO ». Un coiffeur est renvoyé vers CHAIR PRO. Création du salon en 3 questions puis onboarding.');
  bizScreen(B.login, { route: '/business/connexion', flow: '① BUSINESS — entrée', pad: [120, 24, 24, 24], gap: 14 }, (b) => {
    add(b, tx('CHAIR BUSINESS', 'Logo/L'));
    add(b, tx('L\'app des gérants de salon.', 'Corps/M', { c: 'texte/secondaire' }));
    add(b, spacer(40));
    add(b, btn('Se connecter avec mon compte CHAIR PRO', { icon: 'BadgeCheck', to: B.loginForm, kind: 'swap' }));
    add(b, btn('Créer mon compte gérant', { type: 'Secondaire', to: B.signSalon }));
    add(b, spacer(20));
    add(b, card('Pont', { dir: 'H', gap: 12, pad: 16, align: 'center' }, [fr('Icône', { dir: 'H', w: 40, h: 40, r: 12, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Scissors', 18)] }), fr('Textes', { dir: 'V', gap: 2, grow: true, kids: [tx('Vous coupez aussi les cheveux ?', 'Corps/S fort'), tx('Ouvrir CHAIR PRO', 'Légende', { c: 'texte/secondaire' })] }), ic('ExternalLink', 16, 'texte/tertiaire')]));
  });
  bizScreen(B.loginForm, { route: '/business/connexion', note: 'Formulaire révélé, même compte', pad: [100, 24, 24, 24], gap: 14 }, (b) => {
    add(b, tx('CHAIR BUSINESS', 'Logo/L'));
    add(b, tx('Même compte, mêmes identifiants.', 'Corps/M', { c: 'texte/secondaire' }));
    add(b, field('Adresse e-mail', 'claire@atelier-dumont.fr', { filled: true, icon: 'Mail' }));
    add(b, field('Mot de passe', '••••••••', { filled: true, icon: 'Lock' }));
    add(b, btn('Se connecter', { to: B.home, kind: 'swap' }));
  });
  darkStep(B.signSalon, { route: '/pro/inscription?role=gerant', top: darkTopBar(4, 6) }, (b) => {
    add(b, micro('Ton salon', true));
    add(b, darkTitle('Comment s\'appelle ton salon ?'));
    add(b, darkField('Atelier Dumont', 'Building2'));
    add(b, darkBtn('Continuer', B.siret));
  });
  darkStep(B.siret, { route: '/pro/inscription?role=gerant', top: darkTopBar(6, 6) }, (b) => {
    add(b, micro('Vérification', true));
    add(b, darkTitle('Un SIRET ?', 'Recommandé — ça vérifie et certifie ton salon auprès des clients.'));
    add(b, darkField('912 345 678 00012', 'BadgeCheck'));
    add(b, fr('Résultat', { dir: 'H', gap: 8, fillW: true, pad: [12, 14], r: 16, bg: 'statut/succes-fond', align: 'center', kids: [ic('CircleCheck', 14, 'statut/succes'), tx('Salon vérifié — ATELIER DUMONT', 'Légende', { c: 'statut/succes' })] }));
    add(b, darkBtn('Créer mon espace salon', B.obPhotos));
  });
  bizScreen(B.obPhotos, { route: '/onboarding/gerant', top: fr('En-tête', { dir: 'V', gap: 12, w: 390, pad: [6, 16, 10, 16], bg: 'fond/app', kids: [inst('Progression', { 'Étape': '2/5' })] }) }, (b) => {
    add(b, bigTitle('Les photos du salon.', 'Elles font la première impression sur la page publique.', { size: 'Titre/L' }));
    add(b, inst('Zone de dépôt', { Texte: 'Ajouter des photos' }));
    add(b, fr('Aperçus', { dir: 'H', gap: 8, kids: [photo('Photo', 108, 108, 'coiffure-femme', 16), photo('Photo', 108, 108, 'coiffure-homme', 16)] }));
    add(b, btn('Continuer', { to: B.ready }));
  });
  bizScreen(B.ready, { route: '/onboarding/gerant', pad: [180, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 80, h: 80, r: 40, bg: 'cta/fond', justify: 'center', align: 'center', kids: [ic('Check', 34, 'cta/texte')] }));
    add(b, tx('Atelier Dumont est prêt.', 'Titre/L', { align: 'center' }));
    add(b, tx('Votre salon se gère dans CHAIR BUSINESS — l\'espace des gérants.', 'Corps/M', { c: 'texte/secondaire', align: 'center', w: 300 }));
    add(b, btn('Ouvrir CHAIR BUSINESS', { to: B.home, kind: 'swap' }));
  });

  row('Accueil, notifications, compte', 'Accueil réel (app/business/page.tsx) : bandeau photo du salon, À traiter (demandes, alertes équipe), Votre semaine (Pulse du lundi), équipe, activité récente. Icône compte en haut à gauche, cloche à droite.');
  bizScreen(B.home, { route: '/business', flow: '② BUSINESS — piloter le salon', top: bizTop(), tab: [BIZ_TAB, 'Accueil'], gap: 16, pad: [0, 0, 24, 0] }, (b) => {
    const cover = fr('Bandeau salon', { dir: 'V', w: 390, h: 132, justify: 'end', pad: 16, clip: true });
    imageFill(cover, 'coiffure-femme');
    add(cover, fr('Nom', { dir: 'H', gap: 10, align: 'center', pad: [8, 12], r: 14, bg: 'fond/surface', kids: [photo('Logo', 28, 28, 'coiffure-homme', 8), tx('Atelier Dumont', 'Titre/S')] }));
    add(b, link(cover, B.salon, 'tab'));
    const body = fr('Contenu', { dir: 'V', gap: 16, fillW: true, pad: [0, 16] });
    add(body, card('À traiter', { gap: 4, pad: [16, 0] }, [fr('Titre', { pad: [0, 20], kids: [micro('À traiter')] }), listRow('2 demandes de fauteuil', 'Hugo L. · Inès M.', 'Armchair', { to: B.request, kind: 'overlay' }), listRow('Nathan P. : aucun avis en 30 j', 'Alerte équipe', 'TriangleAlert', { to: B.team }), listRow('Avis 2★ sur Yanis B.', 'Radar avis négatif', 'Star', { to: B.notifs })]));
    add(body, card('Votre semaine', { dark: true, gap: 10 }, [micro('Votre semaine', true), fr('Chiffres', { dir: 'H', gap: 28, kids: [fr('Avis', { dir: 'V', kids: [tx('9', 'Chiffre géant', { c: 'sombre/texte' }), tx('avis cette semaine', 'Légende', { c: 'neutre/400' })] }), fr('Note', { dir: 'V', kids: [tx('4,8', 'Chiffre géant', { c: 'sombre/texte' }), tx('note du salon', 'Légende', { c: 'neutre/400' })] })] }), tx('Léa Martin en tête · 2ᵉ salon de Strasbourg', 'Corps/S', { c: 'neutre/400' })]));
    add(body, cols('Chiffres', [kpi('4,8', 'note du salon'), kpi('112', 'passages vérifiés')], 10));
    add(body, sectionHead('Mon équipe', '4 coiffeurs'));
    team.slice(0, 3).forEach((c) => add(body, memberRow(c, null, B.team)));
    add(body, card('Double casquette', { dir: 'H', gap: 12, pad: 16, align: 'center', flat: true }, [ic('Scissors', 18, 'texte/secondaire'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('Vous coupez aussi les cheveux ?', 'Corps/S fort'), tx('Votre profil coiffeur vit dans CHAIR PRO', 'Légende', { c: 'texte/secondaire' })] }), link(btn('Ouvrir CHAIR PRO', { size: 'S', type: 'Doux' }), B.toPro)]));
    add(b, body);
  });
  bizScreen(B.homeEmpty, { route: '/business', note: 'Aucun salon encore créé', top: bizTop(), tab: [BIZ_TAB, 'Accueil'], pad: [40, 16, 24, 16] }, (b) => {
    add(b, card('Créer', { gap: 10, pad: 24 }, [ic('Building2', 26), tx('Créez la page de votre salon', 'Titre/L', { fillW: true }), para('Visible publiquement sur CHAIR — photos, équipe, avis.'), btn('Créer mon salon', { to: B.signSalon })]));
    add(b, card('Équipe', { gap: 6, flat: true }, [tx('Invitez votre premier coiffeur', 'Titre/S'), para('Votre équipe apparaîtra sur la page du salon.')]));
  });
  bizScreen(B.notifs, { route: '/business/notifications', top: topBar('Notifications'), gap: 0, pad: [8, 16, 24, 16] }, (b) => {
    for (const [t, s, i, to] of [['Votre semaine', '9 avis · note 4,8 · Léa en tête', 'TrendingUp', B.home], ['Avis 2★ sur Yanis B.', '« Attente trop longue »', 'Star', B.team], ['Invitation acceptée', 'Hugo Lambert a rejoint l\'équipe', 'UserPlus', B.team], ['Demande de fauteuil', 'Inès M. · à partir du 2 nov.', 'Armchair', B.chairs]]) add(b, listRow(t, s, i, { to }));
  });
  bizScreen(B.account, { route: '/business/compte', top: topBar('Mon compte') }, (b) => {
    add(b, field('Nom complet', 'Claire Dumont', { filled: true }));
    add(b, field('Email', 'claire@atelier-dumont.fr', { state: 'Désactivé' }));
    add(b, field('Téléphone', '06 12 34 56 78', { filled: true }));
    add(b, btn('Enregistrer'));
    add(b, micro('Aide & informations'));
    add(b, listCard('Légal', [listRow('Aide & contact', null, 'LifeBuoy'), listRow('Confidentialité', null, 'Shield'), listRow('Conditions d\'utilisation', null, 'FileText'), listRow('Mentions légales', null, 'Scale')]));
    add(b, btn('Se déconnecter', { type: 'Fantôme', to: B.login, kind: 'swap' }));
    add(b, tx('Supprimer mon compte', 'Légende', { c: 'texte/tertiaire', align: 'center', fillW: true }));
  });

  row('Salon', 'Fiche salon (/business/salon) : infos publiques, horaires, photos, QR avis unique du salon (à poser à la caisse), vérification SIRET.');
  bizScreen(B.salon, { route: '/business/salon', top: bizTop(), tab: [BIZ_TAB, 'Salon'] }, (b) => {
    add(b, photo('Couverture', 358, 170, 'coiffure-femme', 'rayon/carte'));
    add(b, bigTitle('Atelier Dumont', '12 rue des Orfèvres, Strasbourg', { size: 'Titre/L' }));
    add(b, listCard('Salon', [listRow('Informations publiques', 'Nom, adresse, description', 'Building2'), listRow('Horaires', 'Mar – Sam · 9 h – 19 h', 'Clock'), listRow('Photos', '6 photos', 'Images'), listRow('QR avis du salon', 'Un seul QR à la caisse', 'QrCode', { to: B.qr, kind: 'overlay' }), listRow('Vérification SIRET', 'Vérifié', 'BadgeCheck', { to: B.siretSheet, kind: 'overlay' })]));
    add(b, btn('Voir la page publique', { type: 'Doux', icon: 'Eye' }));
  });
  overlayFrame(B.qr, 'sheet', { route: 'SalonQrSheet', status: 'E' }, (f) => {
    add(f, tx('QR avis du salon', 'Titre/M', { fillW: true }));
    add(f, para('Le client scanne, choisit qui l\'a coiffé, laisse un avis vérifié.'));
    const q = fr('QR', { w: 200, h: 200, r: 24, bg: 'fond/creux' }); add(f, q);
    add(f, fr('Actions', { dir: 'H', gap: 8, fillW: true, kids: [btn('Télécharger', { type: 'Doux', size: 'S' }), btn('Copier le lien', { type: 'Doux', size: 'S' }), btn('Régénérer', { type: 'Fantôme', size: 'S' })] }));
  });
  overlayFrame(B.siretSheet, 'sheet', { route: 'SiretVerificationSheet', status: 'E' }, (f) => {
    add(f, tx('Vérification SIRET', 'Titre/M', { fillW: true }));
    add(f, field('SIRET', '912 345 678 00012', { filled: true, icon: 'BadgeCheck' }));
    add(f, fr('Résultat', { dir: 'H', gap: 8, fillW: true, pad: [12, 14], r: 16, bg: 'statut/succes-fond', align: 'center', kids: [ic('CircleCheck', 14, 'statut/succes'), tx('Salon vérifié — coiffure (96.02A)', 'Légende', { c: 'statut/succes' })] }));
    add(f, btn('Enregistrer', { kind: 'close' }));
  });

  row('Équipe', 'Membres, invitations envoyées, alertes (baisse d\'avis), demande d\'avis pour un membre. Rôles et permissions fins : proposition.');
  bizScreen(B.team, { route: '/business/equipe', top: bizTop(), tab: [BIZ_TAB, 'Équipe'], gap: 12 }, (b) => {
    add(b, fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Équipe', 'Titre/XL'), btn('Inviter', { size: 'S', icon: 'UserPlus', to: B.invite, kind: 'overlay' })] }));
    team.forEach((c, i) => add(b, memberRow(c, i === 1 ? badge('Alerte', 'Alerte') : null)));
    add(b, micro('Invitations envoyées'));
    add(b, card('Invitation', { dir: 'H', gap: 12, pad: 14, align: 'center', flat: true }, [avatar('NP', 'S'), tx('Nathan Petit', 'Corps/S fort', { grow: true }), badge('En attente')]));
  });
  overlayFrame(B.invite, 'sheet', { route: 'Invitation (feuille)', status: 'E' }, (f) => {
    add(f, tx('Inviter un coiffeur', 'Titre/M', { fillW: true }));
    add(f, field(null, 'Nom du coiffeur, ville...', { icon: 'Search' }));
    add(f, memberRow(DEMO.coiffeurs[5], chip('Inviter', true)));
    add(f, field('Message', 'Message accompagnant l\'invitation (optionnel)...', {}));
    add(f, btn('Envoyer l\'invitation', { kind: 'close' }));
  });
  bizScreen(B.teamEmpty, { route: '/business/equipe', note: 'État vide', top: bizTop(), tab: [BIZ_TAB, 'Équipe'], pad: [60, 16, 24, 16] }, (b) => {
    const e = inst('État vide', { Titre: 'Aucun coiffeur dans votre salon', Texte: 'Invitez des coiffeurs à rejoindre votre équipe.', Action: true });
    SIZING.set(e, { fillW: true }); const ei = e.findOne((n) => n.name === 'Icône'); if (ei) ei.swapComponent(ICON.Users); link(e, B.invite, 'overlay'); add(b, e);
  });

  row('Recrutement', 'Offres publiées et matching : coiffeurs de la ville qui cherchent un salon (« Ils cherchent un salon »).');
  bizScreen(B.recruit, { route: '/business/recrutement', top: bizTop(), tab: [BIZ_TAB, 'Recrutement'], gap: 12 }, (b) => {
    add(b, fr('Ligne', { dir: 'H', fillW: true, justify: 'between', align: 'center', kids: [tx('Recrutement', 'Titre/XL'), btn('Publier', { size: 'S', icon: 'Plus', to: B.newOffer })] }));
    add(b, card('Offre', { gap: 6 }, [fr('Ligne', { dir: 'H', fillW: true, justify: 'between', kids: [tx('Coiffeur·se confirmé·e', 'Titre/S'), badge('CDI', 'Sombre')] }), tx('3 candidatures', 'Corps/S', { c: 'texte/secondaire' })]));
    add(b, micro('Ils cherchent un salon'));
    add(b, tx('Près de chez vous', 'Légende', { c: 'texte/tertiaire' }));
    [DEMO.coiffeurs[4], DEMO.coiffeurs[5]].forEach((c) => add(b, memberRow(c, btn('Inviter', { size: 'S', type: 'Doux' }))));
  });
  bizScreen(B.newOffer, { route: '/business/recrutement (offre)', top: topBar('Nouvelle offre') }, (b) => {
    add(b, field('Intitulé', 'Coiffeur·se confirmé·e', { filled: true }));
    add(b, fr('Contrat', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('CDI', true), chip('CDD', false), chip('Alternance', false), chip('Temps partiel', false)] }));
    add(b, field('Description du poste', 'Équipe de 4, clientèle fidèle, formation couleur offerte.', { filled: true }));
    add(b, btn('Publier l\'offre', { kind: 'back' }));
  });

  row('Fauteuils', 'Annonces de fauteuils à louer (on ne loue que des fauteuils), assistant en étapes (équipements métier, calendrier, prix conseillés), demandes, contrat généré, encaissement via Stripe Connect (prêt, en attente d\'activation).');
  bizScreen(B.chairs, { route: '/business/fauteuils', top: bizTop(), tab: [BIZ_TAB, 'Fauteuils'], gap: 12 }, (b) => {
    add(b, bigTitle('Fauteuils', 'Louez vos espaces libres à des coiffeurs indépendants.', { size: 'Titre/L' }));
    add(b, card('Annonce', { gap: 10, pad: 0 }, [photo('Photo', 358, 150, 'coupe', [28, 28, 0, 0]), fr('Infos', { dir: 'V', gap: 6, fillW: true, pad: [0, 16, 16, 16], kids: [tx('Fauteuil lumineux en centre-ville', 'Titre/S'), tx('35 €/j · 150 €/sem. · 490 €/mois', 'Légende', { c: 'texte/secondaire' }), fr('Actions', { dir: 'H', gap: 8, kids: [btn('Partager le lien', { size: 'S', type: 'Doux', icon: 'Share2' }), btn('Modifier', { size: 'S', type: 'Secondaire', to: B.wizard1 })] })] })]));
    add(b, micro('Demandes'));
    add(b, link(memberRow(DEMO.coiffeurs[3], badge('Nouvelle', 'Sombre')), B.request, 'overlay'));
    add(b, listCard('Encaissement', [listRow('Encaisser les loyers', 'Stripe Connect · commission 10 %', 'CreditCard', { to: B.payouts })]));
  });
  const wizTop = (n) => fr('En-tête', { dir: 'V', gap: 12, w: 390, pad: [6, 16, 10, 16], bg: 'fond/app', kids: [fr('Ligne', { dir: 'H', fillW: true, align: 'center', gap: 12, kids: [link(ic('ArrowLeft', 20), null, 'back'), tx('Nouvelle annonce', 'Titre/S')] }), inst('Progression', { 'Étape': n + '/5' })] });
  bizScreen(B.wizard1, { route: '/business/fauteuils (assistant)', top: wizTop(3) }, (b) => {
    add(b, bigTitle('Équipements', 'Ce que le coiffeur trouvera sur place.', { size: 'Titre/L' }));
    for (const [g, items] of [['Le poste', [['Fauteuil hydraulique', true], ['Miroir éclairé', true], ['Séchoir', true]]], ['Lavage', [['Bac à shampoing', true], ['Serviettes fournies', false]]], ['Espace', [['Rangement', true], ['Espace coloration', false], ['Horaires flexibles', true]]]]) add(b, card(g, { gap: 8 }, [micro(g), ...items.map(([t, on]) => fr(t, { dir: 'H', gap: 12, fillW: true, pad: [6, 0], align: 'center', kids: [inst('Case à cocher', { Forme: 'Case', 'État': on ? 'Coché' : 'Vide' }), tx(t, 'Corps/M')] }))]));
    add(b, btn('Continuer', { to: B.wizard2 }));
  });
  bizScreen(B.wizard2, { route: '/business/fauteuils (assistant)', top: wizTop(4) }, (b) => {
    add(b, bigTitle('Disponibilités', 'Semaine type, puis les dates bloquées.', { size: 'Titre/L' }));
    add(b, fr('Jours', { dir: 'H', gap: 6, wrap: true, fillW: true, kids: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => chip(d, i > 0 && i < 6)) }));
    const cal = card('Calendrier', { gap: 10 }, [tx('Novembre 2026', 'Titre/S')]);
    const grid = fr('Grille', { dir: 'H', gap: 6, wrap: true, fillW: true });
    for (let d = 1; d <= 30; d++) { const blocked = [11, 12, 25].includes(d); const t = fr('Jour ' + d, { dir: 'H', w: 38, h: 38, r: 19, justify: 'center', align: 'center', bg: blocked ? 'cta/fond' : null, kids: [tx(String(d), 'Corps/S', { c: blocked ? 'cta/texte' : (d % 7 === 0 ? 'texte/tertiaire' : 'texte/principal') })] }); if (blocked) t.children[0].textDecoration = 'STRIKETHROUGH'; add(grid, t); }
    add(cal, grid);
    add(b, cal);
    add(b, fr('Bloquées', { dir: 'H', gap: 6, kids: [chip('11 nov.', false, { icon: 'X' }), chip('12 nov.', false, { icon: 'X' }), chip('25 nov.', false, { icon: 'X' })] }));
    add(b, btn('Continuer', { to: B.wizard3 }));
  });
  bizScreen(B.wizard3, { route: '/business/fauteuils (assistant)', top: wizTop(5) }, (b) => {
    add(b, bigTitle('Prix', 'Repères du marché : 25 – 55 € par jour.', { size: 'Titre/L' }));
    add(b, field('Par jour', '35 €', { filled: true }));
    add(b, field('Par semaine', '150 €', { filled: true, msg: 'Conseillé : 150 € (−15 % vs 5 jours)' }));
    add(b, field('Par mois', '490 €', { filled: true, msg: 'Conseillé : 490 € (−30 % vs 20 jours)' }));
    add(b, fr('Garde-fou', { dir: 'H', gap: 8, fillW: true, pad: [12, 14], r: 16, bg: 'statut/alerte-fond', align: 'center', kids: [ic('Info', 14, 'statut/alerte'), tx('Prix dans la moyenne de Strasbourg.', 'Légende', { c: 'statut/alerte' })] }));
    add(b, btn('Publier l\'annonce', { to: B.chairs }));
  });
  overlayFrame(B.request, 'sheet', { route: 'OwnerChairRequestSheet', status: 'E' }, (f) => {
    add(f, memberRow(DEMO.coiffeurs[3], badge('SIRET vérifié', 'Succès')));
    add(f, listCard('Demande', [listRow('À partir du 2 novembre', 'Au mois · 490 €', 'CalendarDays', { chevron: false }), listRow('Message', '« Je cherche un poste 3 jours par semaine. »', 'MessageCircle', { chevron: false })]));
    add(f, fr('Réponses', { dir: 'H', gap: 8, fillW: true, kids: [btn('Accepter', { size: 'S' }), btn('Refuser', { size: 'S', type: 'Secondaire' })] }));
    add(f, btn('Contrat de location', { type: 'Doux', icon: 'FileText' }));
  });
  bizScreen(B.payouts, { route: '/business/fauteuils (Stripe Connect)', status: 'I', note: 'Code prêt, activation en attente', top: topBar('Encaissements') }, (b) => {
    add(b, card('Stripe', { gap: 10, pad: 24 }, [ic('CreditCard', 26), tx('Encaissez vos loyers en ligne', 'Titre/L', { fillW: true }), para('Paiement sécurisé par Stripe. CHAIR ne détient jamais les fonds. Commission de 10 % sur chaque loyer.'), btn('Configurer l\'encaissement', { icon: 'ExternalLink' })]));
    add(b, fr('Statut', { dir: 'H', gap: 8, fillW: true, pad: [12, 14], r: 16, bg: 'fond/creux', align: 'center', kids: [ic('Clock', 14, 'texte/secondaire'), tx('Bientôt disponible', 'Légende', { c: 'texte/secondaire' })] }));
  });

  row('Abonnement et états', 'Abonnement CHAIR BUSINESS en « Prochainement » (prix non fixé), mauvaise app, double casquette.');
  bizScreen(B.sub, { route: '/business/abonnement', top: topBar('CHAIR Business'), gap: 18 }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, micro('Pour les gérants'));
    add(b, tx('Votre salon, en avant.', 'Titre/XL', { align: 'center', w: 320 }));
    add(b, card('Prochainement', { gap: 6, align: 'center' }, [micro('Prochainement'), tx('Le tarif sera annoncé au lancement. Vos outils actuels restent gratuits.', 'Corps/S', { c: 'texte/secondaire', align: 'center', w: 290 })]));
    add(b, micro('Feuille de route'));
    add(b, fr('Feuille de route', { dir: 'H', gap: 10, wrap: true, fillW: true, kids: [['Statistiques d\'équipe avancées', 'BarChart3'], ['Mise en avant du salon', 'TrendingUp'], ['Multi-salons', 'Building2'], ['Export comptable', 'FileSpreadsheet']].map(([t, i]) => fr(t, { dir: 'V', gap: 8, w: 168, pad: 14, r: 20, bg: 'fond/surface', stroke: 'bordure/moyenne', opacity: 0.75, kids: [ic(i, 18, 'texte/secondaire'), tx(t, 'Corps/S fort', { c: 'texte/secondaire', w: 140 })] })) }));
  });
  bizScreen(B.denied, { route: 'Verrou binaire ↔ rôle', note: 'Accès refusé', pad: [180, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, fr('Pictogramme', { dir: 'H', w: 72, h: 72, r: 36, bg: 'fond/creux', justify: 'center', align: 'center', kids: [ic('Lock', 28, 'texte/secondaire')] }));
    add(b, tx('CHAIR BUSINESS est l\'app des gérants.', 'Titre/L', { align: 'center', w: 320 }));
    add(b, tx('Votre profil coiffeur s\'utilise dans CHAIR PRO.', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, btn('Ouvrir CHAIR PRO', { icon: 'ExternalLink' }));
  });
  bizScreen(B.toPro, { route: 'Pont BUSINESS → PRO', note: 'Change vraiment d\'app', pad: [180, 24, 24, 24] }, (b) => {
    b.counterAxisAlignItems = 'CENTER';
    add(b, tx('CHAIR PRO', 'Logo/L'));
    add(b, tx('Votre profil coiffeur vous attend.', 'Titre/L', { align: 'center' }));
    add(b, tx('Même compte, mêmes identifiants.', 'Corps/M', { c: 'texte/secondaire', align: 'center' }));
    add(b, btn('Ouvrir CHAIR PRO', { icon: 'ExternalLink' }));
  });
  endRow();
}

// ── Desktop BUSINESS ────────────────────────────────────────────────────
const BD = {
  home: 'BD-01 Tableau de bord', team: 'BD-02 Équipe', planning: 'BD-03 Planning de l\'équipe', salon: 'BD-04 Salon', recruit: 'BD-05 Recrutement',
  chairs: 'BD-06 Fauteuils', stats: 'BD-07 Statistiques d\'équipe', multi: 'BD-08 Multi-salons', access: 'BD-09 Rôles et accès', sub: 'BD-10 Abonnement',
};
const BIZ_SIDE = [['House', 'Accueil'], ['Building2', 'Salon'], ['Users', 'Équipe'], ['CalendarDays', 'Planning'], ['BarChart3', 'Statistiques'], ['Briefcase', 'Recrutement'], ['Armchair', 'Fauteuils'], ['Store', 'Salons'], ['ShieldCheck', 'Accès'], ['Sparkles', 'Abonnement']];
const BIZ_SIDE_LINKS = () => ({ Accueil: BD.home, Salon: BD.salon, 'Équipe': BD.team, Planning: BD.planning, Statistiques: BD.stats, Recrutement: BD.recruit, Fauteuils: BD.chairs, Salons: BD.multi, 'Accès': BD.access, Abonnement: BD.sub });
function bizDesk(name, active, o, build) {
  return desktop(name, Object.assign({ route: '/business', status: 'E', sidebar: () => sidebar('CHAIR BUSINESS', BIZ_SIDE, active, BIZ_SIDE_LINKS(), ['Claire Dumont', 'CD', 'Atelier Dumont']) }, o), build);
}
function proposal() { return fr('Proposition', { dir: 'H', gap: 6, pad: [6, 12], r: 'rayon/pilule', bg: 'statut/alerte-fond', align: 'center', kids: [ic('Lightbulb', 13, 'statut/alerte'), tx('Proposition — à valider, non développée', 'Légende', { c: 'statut/alerte' })] }); }

async function buildBusinessDesktop(page) {
  startProduct(page, 'CHAIR BUSINESS');
  const team = DEMO.coiffeurs.filter((c) => c.statut === 'Atelier Dumont').concat([DEMO.coiffeurs[0], DEMO.coiffeurs[5]]);
  row('CHAIR BUSINESS — Desktop (1440 × 810)', 'Pilotage du salon sur ordinateur. Les écrans marqués « Proposition » n\'existent pas encore dans le code : ils montrent une piste, sans aucun chiffre financier inventé.');
  bizDesk(BD.home, 'Accueil', { flow: '① BUSINESS desktop — tableau de bord' }, (b) => {
    add(b, deskHeader('Atelier Dumont', 'Semaine du 13 octobre', [btn('Inviter un coiffeur', { size: 'S', icon: 'UserPlus' })]));
    add(b, cols('Chiffres', [kpi('4,8', 'note du salon'), kpi('112', 'passages vérifiés'), kpi('9', 'avis cette semaine'), kpi('2ᵉ', 'salon à Strasbourg')]));
    add(b, cols('Grille', [
      col('Équipe', [table('Équipe', ['Coiffeur', 'Spécialité', 'Avis 30 j', 'Note', 'Statut'], team.map((c, i) => [c.nom, c.spe, String([12, 4, 9, 0][i] || 0), c.note, i === 3 ? badge('Aucun avis 30 j', 'Alerte') : badge('Actif', 'Succès')]), [180, 140, 100, 70, 160], { to: BD.team })]),
      fixedCol('À traiter', 340, [card('À traiter', { gap: 4, pad: [16, 0] }, [fr('Titre', { pad: [0, 20], kids: [micro('À traiter')] }), listRow('2 demandes de fauteuil', null, 'Armchair', { to: BD.chairs }), listRow('Avis 2★ sur Yanis B.', null, 'Star'), listRow('Nathan P. sans avis', null, 'TriangleAlert', { to: BD.team })]), card('Semaine', { dark: true, gap: 6 }, [micro('Votre semaine', true), tx('Léa Martin en tête', 'Titre/M', { c: 'sombre/texte' }), tx('5 avis 5★ cette semaine', 'Corps/S', { c: 'neutre/400' })])]),
    ]));
  });
  bizDesk(BD.team, 'Équipe', {}, (b) => {
    add(b, deskHeader('Équipe', '4 coiffeurs · 1 invitation en attente', [btn('Inviter', { size: 'S', icon: 'UserPlus' })]));
    add(b, cols('Grille', [
      col('Liste', [table('Membres', ['Coiffeur', 'Spécialité', 'Note', 'Passages'], team.map((c, i) => [c.nom, c.spe, c.note, String([41, 28, 33, 6][i] || 0)]), [220, 180, 80, 100], { selected: 1 })]),
      panel('Membre', [fr('Identité', { dir: 'H', gap: 12, fillW: true, align: 'center', kids: [avatar('YB', 'M'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('Yanis Benali', 'Titre/M'), tx('Barber · depuis mars', 'Légende', { c: 'texte/secondaire' })] })] }), fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('4,8', 'note'), kpi('28', 'passages')] }), btn('Demander un avis pour ce membre', { size: 'S', type: 'Doux' }), btn('Retirer de l\'équipe', { size: 'S', type: 'Destructif' })]),
    ]));
  });
  bizDesk(BD.planning, 'Planning', { status: 'N', note: 'Planning par professionnel' }, (b) => {
    add(b, deskHeader('Planning de l\'équipe', 'Mardi 14 octobre', [proposal()]));
    add(b, weekCalendar('Par coiffeur', 600, [[0, 9.5, 10.5, 'Confirmé', 'Lucas M.', '9:30'], [0, 14, 15, 'Confirmé', 'Inès M.', '14:00'], [1, 10.5, 11.25, 'Confirmé', 'Camille R.', '10:30'], [1, 16, 16.5, 'En attente', 'Demande', '16:00'], [2, 9, 11, 'Confirmé', 'Sarah K.', '9:00'], [2, 12.5, 13.5, 'Indisponibilité', 'Pause', '12:30'], [3, 11, 12, 'Confirmé', 'Noah P.', '11:00']], { w: 1080, days: ['Léa Martin', 'Yanis Benali', 'Hugo Lambert', 'Nathan Petit'] }));
  });
  bizDesk(BD.salon, 'Salon', {}, (b) => {
    add(b, deskHeader('Salon', 'Ce que les clients voient sur CHAIR', [btn('Voir la page publique', { size: 'S', type: 'Doux', icon: 'Eye' })]));
    add(b, cols('Grille', [
      col('Infos', [card('Informations', { gap: 12 }, [micro('Informations publiques'), field('Nom', 'Atelier Dumont', { filled: true }), field('Adresse', '12 rue des Orfèvres, Strasbourg', { filled: true }), field('Description', 'Salon mixte, coloration végétale.', { filled: true })]), card('Horaires', { gap: 8 }, [micro('Horaires'), ...['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((d) => fr(d, { dir: 'H', fillW: true, justify: 'between', kids: [tx(d, 'Corps/S'), tx('9:00 – 19:00', 'Corps/S fort')] }))])]),
      fixedCol('Côté', 360, [card('QR', { gap: 10, align: 'center' }, [micro('QR avis du salon'), fr('QR', { w: 180, h: 180, r: 20, bg: 'fond/creux' }), btn('Télécharger', { size: 'S', type: 'Doux' })]), card('SIRET', { dir: 'H', gap: 10, pad: 16, align: 'center' }, [ic('BadgeCheck', 18, 'statut/succes'), tx('SIRET vérifié', 'Corps/S fort')])]),
    ]));
  });
  bizDesk(BD.recruit, 'Recrutement', {}, (b) => {
    add(b, deskHeader('Recrutement', '1 offre publiée · 3 candidatures', [btn('Publier une offre', { size: 'S', icon: 'Plus' })]));
    add(b, cols('Grille', [
      col('Offres', [table('Candidatures', ['Candidat', 'Spécialité', 'Ville', 'Statut'], [['Inès Morel', 'Couleur', 'Schiltigheim', badge('Nouvelle', 'Sombre')], ['Nathan Petit', 'Locks', 'Illkirch', badge('Vue')], ['Sofia Rossi', 'Boucles', 'Strasbourg', badge('Entretien', 'Succès')]], [200, 160, 160, 140])]),
      fixedCol('Matching', 360, [card('Ils cherchent', { gap: 10 }, [micro('Ils cherchent un salon'), memberRow(DEMO.coiffeurs[4], btn('Inviter', { size: 'S', type: 'Doux' })), memberRow(DEMO.coiffeurs[5], btn('Inviter', { size: 'S', type: 'Doux' }))])]),
    ]));
  });
  bizDesk(BD.chairs, 'Fauteuils', {}, (b) => {
    add(b, deskHeader('Fauteuils', 'Louez vos espaces libres à des coiffeurs indépendants', [btn('Nouvelle annonce', { size: 'S', icon: 'Plus' })]));
    add(b, cols('Grille', [
      col('Annonces', [card('Annonce', { dir: 'H', gap: 18, pad: 16, align: 'center' }, [photo('Photo', 160, 110, 'coupe', 18), fr('Infos', { dir: 'V', gap: 4, grow: true, kids: [tx('Fauteuil lumineux en centre-ville', 'Titre/S'), tx('35 €/j · 150 €/sem. · 490 €/mois', 'Corps/S', { c: 'texte/secondaire' }), fr('Équipements', { dir: 'H', gap: 6, kids: [badge('Bac'), badge('Séchoir'), badge('Rangement')] })] }), btn('Partager le lien', { size: 'S', type: 'Doux', icon: 'Share2' })]), table('Demandes', ['Coiffeur', 'Formule', 'Début', 'Action'], [['Hugo Lambert', 'Au mois', '2 nov.', fr('Boutons', { dir: 'H', gap: 8, kids: [btn('Accepter', { size: 'S' }), btn('Refuser', { size: 'S', type: 'Secondaire' })] })], ['Inès Morel', 'À la semaine', '16 nov.', fr('Boutons', { dir: 'H', gap: 8, kids: [btn('Accepter', { size: 'S' }), btn('Refuser', { size: 'S', type: 'Secondaire' })] })]], [200, 160, 120, 240])]),
      fixedCol('Encaissement', 340, [card('Stripe', { gap: 8 }, [micro('Encaissement'), tx('Stripe Connect', 'Titre/M'), para('Commission 10 %. CHAIR ne détient jamais les fonds.'), badge('Bientôt disponible')])]),
    ]));
  });
  bizDesk(BD.stats, 'Statistiques', { status: 'N', note: 'Statistiques d\'équipe avancées (promesse de l\'abonnement)' }, (b) => {
    add(b, deskHeader('Statistiques d\'équipe', 'Toute l\'équipe, une vue', [proposal()]));
    add(b, cols('Chiffres', [kpi('112', 'passages vérifiés · 30 j'), kpi('41', 'avis · 30 j'), kpi('4,8', 'note moyenne'), kpi('63 %', 'clients revenus')]));
    add(b, cols('Graphiques', [card('Passages', { gap: 14 }, [micro('Passages vérifiés par semaine'), barChart('Barres', [18, 22, 25, 21, 28, 31, 27, 33], { h: 200 })]), card('Répartition', { gap: 12 }, [micro('Répartition par coiffeur'), ...team.map((c, i) => fr(c.nom, { dir: 'H', gap: 10, fillW: true, align: 'center', kids: [tx(c.nom, 'Corps/S', { w: 120 }), fr('Rail', { h: 8, r: 4, bg: 'fond/creux', grow: true, clip: true, kids: [rect('Plein', { w: [200, 140, 170, 30][i] || 10, h: 8, r: 4, bg: 'neutre/900' })] })] }))])]));
    add(b, tx('Aucun chiffre d\'affaires : CHAIR ne voit que les passages vérifiés et les avis.', 'Légende', { c: 'texte/tertiaire' }));
  });
  bizDesk(BD.multi, 'Salons', { status: 'N', note: 'Vue multi-salons' }, (b) => {
    add(b, deskHeader('Mes salons', '2 établissements', [proposal()]));
    add(b, cols('Salons', [['Atelier Dumont', 'Strasbourg · 4 coiffeurs', '4,8', 'coiffure-femme'], ['Atelier Dumont Neudorf', 'Strasbourg · 2 coiffeurs', '4,6', 'coiffure-homme']].map(([n, s, note, img]) => card(n, { gap: 10, pad: 0 }, [photo('Photo', 300, 140, img, [28, 28, 0, 0]), fr('Infos', { dir: 'V', gap: 4, fillW: true, pad: [0, 18, 18, 18], kids: [tx(n, 'Titre/M'), tx(s, 'Corps/S', { c: 'texte/secondaire' }), noteRow(note)] })]))));
  });
  bizDesk(BD.access, 'Accès', { status: 'N', note: 'Rôles et permissions' }, (b) => {
    add(b, deskHeader('Rôles et accès', 'Qui peut faire quoi dans le salon', [proposal()]));
    add(b, table('Permissions', ['Membre', 'Rôle', 'Équipe', 'Fauteuils', 'Recrutement'], [['Claire Dumont', 'Gérante', '✓', '✓', '✓'], ['Léa Martin', 'Responsable', '✓', '—', '✓'], ['Yanis Benali', 'Coiffeur', '—', '—', '—']], [220, 160, 120, 120, 140]));
  });
  bizDesk(BD.sub, 'Abonnement', {}, (b) => {
    add(b, deskHeader('CHAIR Business', 'Votre salon, en avant.'));
    add(b, cols('Grille', [
      col('Offre', [card('Prochainement', { gap: 8, pad: 28 }, [micro('Prochainement'), tx('Le tarif sera annoncé au lancement.', 'Titre/L', { fillW: true }), para('Vos outils actuels restent gratuits : équipe, recrutement, fauteuils.')])]),
      col('Disponible', [listCard('Inclus', [listRow('Badge Certifié CHAIR Business', 'Sur votre fiche publique', 'BadgeCheck', { chevron: false }), listRow('Support prioritaire', 'En tête de file', 'Headphones', { chevron: false })])]),
    ]));
  });
  endRow();
}
