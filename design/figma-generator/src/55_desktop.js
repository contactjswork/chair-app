// ═══ 05 — CHAIR PRO — Desktop / gabarits desktop partagés ══════════════

function sidebar(word, items, active, links, user) {
  const s = fr('Barre latérale', { dir: 'V', gap: 4, w: 248, h: 810, pad: [28, 16, 20, 16], bg: 'fond/surface' });
  strokeVar(s, 'bordure/legere'); s.strokeLeftWeight = 0; s.strokeTopWeight = 0; s.strokeBottomWeight = 0; s.strokeRightWeight = 1;
  add(s, fr('Logo', { dir: 'H', pad: [0, 12, 24, 12], kids: [tx(word, 'Logo')] }));
  for (const [icon, label] of items) {
    const it = inst('Élément barre latérale', { 'Libellé': label, Actif: label === active ? 'Oui' : 'Non' });
    const i = it.findOne((n) => n.name === 'Icône'); if (i && ICON[icon]) i.swapComponent(ICON[icon]);
    SIZING.set(it, { fillW: true });
    add(s, it);
    if (links && links[label]) link(it, links[label], 'tab');
  }
  add(s, fr('Espace', { grow: true, w: 10 }));
  add(s, fr('Utilisateur', { dir: 'H', gap: 10, fillW: true, pad: 10, r: 14, bg: 'fond/app', align: 'center', kids: [avatar(user[1], 'S'), fr('Textes', { dir: 'V', gap: 0, grow: true, kids: [tx(user[0], 'Corps/S fort'), tx(user[2], 'Légende/S', { c: 'texte/secondaire' })] }), ic('Settings', 16, 'texte/tertiaire')] }));
  return s;
}
function deskHeader(title, sub, actions) {
  return fr('En-tête', { dir: 'H', gap: 16, fillW: true, align: 'end', kids: [fr('Titres', { dir: 'V', gap: 4, grow: true, kids: [tx(title, 'Titre/XL'), sub ? tx(sub, 'Corps/M', { c: 'texte/secondaire' }) : null] }), ...(actions || [])] });
}
function cols(name, list, gap) { return fr(name, { dir: 'H', gap: gap || 20, fillW: true, align: 'start', kids: list }); }
function col(name, list, o) { return fr(name, Object.assign({ dir: 'V', gap: 20, grow: true, kids: list }, o || {})); }
function fixedCol(name, w, list) { return fr(name, { dir: 'V', gap: 20, w, kids: list }); }
function weekCalendar(name, h, events, o) {
  o = o || {};
  const days = o.days || ['Lun. 13', 'Mar. 14', 'Mer. 15', 'Jeu. 16', 'Ven. 17', 'Sam. 18'];
  const w = o.w || 820;
  const cal = fr(name, { w, h, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte', clip: true });
  const left = 60, top = 52, colW = (w - left - 12) / days.length, rows = 10, rowH = (h - top - 12) / rows;
  days.forEach((d, i) => { const t = tx(d, 'Corps/S fort', { c: i === 1 ? 'texte/principal' : 'texte/secondaire' }); cal.appendChild(t); t.x = left + i * colW + 8; t.y = 18; });
  for (let r = 0; r <= rows; r++) {
    const y = top + r * rowH;
    const l = tx((9 + r) + ':00', 'Légende/S', { c: 'texte/tertiaire' }); cal.appendChild(l); l.x = 12; l.y = y - 7;
    const line = rect('Ligne', { w: w - left - 12, h: 1, bg: 'bordure/legere' }); cal.appendChild(line); line.x = left; line.y = y;
  }
  for (const [d, from, to, st, title, time] of events) {
    const b = inst('Bloc agenda', { Statut: st, Titre: title, Horaire: time });
    b.resize(colW - 8, Math.max(32, (to - from) * rowH - 4));
    cal.appendChild(b); b.x = left + d * colW + 4; b.y = top + (from - 9) * rowH + 2;
    if (o.to) link(b, o.to, 'swap');
  }
  return cal;
}
function table(name, headers, rows, widths, o) {
  o = o || {};
  const t = fr(name, { dir: 'V', gap: 0, fillW: true, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte', clip: true });
  const head = fr('En-tête', { dir: 'H', gap: 12, fillW: true, pad: [12, 20], bg: 'fond/app' });
  headers.forEach((h, i) => add(head, tx(h, 'Micro-titre', { c: 'texte/tertiaire', w: widths[i] })));
  add(t, head);
  rows.forEach((r, ri) => {
    const line = fr('Ligne ' + (ri + 1), { dir: 'H', gap: 12, fillW: true, pad: [14, 20], align: 'center', bg: ri === o.selected ? 'fond/creux' : null });
    r.forEach((cell, i) => {
      if (typeof cell === 'string') add(line, tx(cell, i === 0 ? 'Corps/S fort' : 'Corps/S', { c: i === 0 ? 'texte/principal' : 'texte/secondaire', w: widths[i] }));
      else { const box = fr('Cellule', { dir: 'H', w: widths[i], kids: [cell] }); add(line, box); }
    });
    add(t, line);
    if (o.to) link(line, o.to, 'swap');
    if (ri < rows.length - 1) add(t, fr('Séparateur', { h: 1, fillW: true, bg: 'bordure/legere' }));
  });
  return t;
}
function panel(name, list) { return fr(name, { dir: 'V', gap: 16, w: 340, pad: 24, r: 'rayon/carte', bg: 'fond/surface', fx: 'Carte', kids: list }); }

const PD = {
  login: 'PD-01 Connexion', home: 'PD-02 Accueil', week: 'PD-03 Agenda — semaine', day: 'PD-04 Agenda — jour + détail', requests: 'PD-05 Réservations',
  clients: 'PD-06 Clients', services: 'PD-07 Prestations', portfolio: 'PD-08 Portfolio', profile: 'PD-09 Profil + aperçu', perf: 'PD-10 Performance',
  progress: 'PD-11 Progression et classement', plus: 'PD-12 CHAIR+', salon: 'PD-13 Salon et opportunités', settings: 'PD-14 Réglages du compte', denied: 'PD-15 Accès refusé',
};
const PRO_SIDE = [['House', 'Accueil'], ['CalendarDays', 'Agenda'], ['Clock', 'Réservations'], ['Users', 'Clients'], ['Scissors', 'Prestations'], ['Images', 'Portfolio'], ['User', 'Profil'], ['TrendingUp', 'Performance'], ['Crown', 'Progression'], ['Sparkles', 'CHAIR+'], ['Building2', 'Salon'], ['Settings', 'Réglages']];
const PRO_SIDE_LINKS = () => ({ Accueil: PD.home, Agenda: PD.week, 'Réservations': PD.requests, Clients: PD.clients, Prestations: PD.services, Portfolio: PD.portfolio, Profil: PD.profile, Performance: PD.perf, Progression: PD.progress, 'CHAIR+': PD.plus, Salon: PD.salon, 'Réglages': PD.settings });
function proDesk(name, active, o, build) {
  return desktop(name, Object.assign({ route: '/pro', status: 'E', sidebar: () => sidebar('CHAIR PRO', PRO_SIDE, active, PRO_SIDE_LINKS(), ['Hugo Lambert', 'HL', 'Indépendant · Strasbourg']) }, o), build);
}

async function buildProDesktop(page) {
  startProduct(page, 'CHAIR PRO');
  row('CHAIR PRO — Desktop (1440 × 810)', 'Même produit qu\'en mobile, pensé pour l\'ordinateur : barre latérale discrète, calendrier exploitable, panneaux contextuels à droite. Pas de back-office : chaque écran garde une seule intention.');
  desktop(PD.login, { route: '/pro/connexion', status: 'E', flow: '① PRO desktop — connexion' }, (b) => {
    b.paddingLeft = 0; b.paddingRight = 0; b.paddingTop = 0;
  });
  // Connexion : écran plein, sans barre latérale
  const lg = SCREENS[page.name][PD.login];
  lg.children[0].remove();
  const split = fr('Connexion', { dir: 'H', w: 1440, h: 810 });
  add(split, fr('Visuel', { dir: 'V', gap: 16, w: 720, h: 810, pad: 72, bg: 'sombre/fond', justify: 'end', kids: [tx('CHAIR PRO', 'Logo/L', { c: 'sombre/texte' }), tx('Votre agenda, vos clients, votre vitrine.', 'Titre/XL', { c: 'sombre/texte', w: 480 })] }));
  const form = fr('Formulaire', { dir: 'V', gap: 16, w: 720, h: 810, pad: [0, 180], justify: 'center', bg: 'fond/app' });
  kids(form, [tx('Bon retour.', 'Titre/XL'), field('Adresse e-mail', 'hugo@exemple.fr', { filled: true, icon: 'Mail' }), field('Mot de passe', '••••••••', { filled: true, icon: 'Lock' }), btn('Se connecter', { to: PD.home, kind: 'swap' }), btn('Créer mon compte coiffeur', { type: 'Secondaire' }), tx('Vous gérez un salon ? Ouvrir CHAIR BUSINESS', 'Corps/S fort', { c: 'texte/secondaire' })]);
  add(split, form);
  lg.appendChild(split); split.x = 0; split.y = 0;

  proDesk(PD.home, 'Accueil', { flow: '② PRO desktop — journée' }, (b) => {
    add(b, deskHeader('Bonjour Hugo', 'Mardi 14 octobre · 5 rendez-vous', [btn('Nouveau rendez-vous', { size: 'S', icon: 'Plus', to: PD.day })]));
    add(b, cols('Grille', [
      col('Principal', [
        card('Aujourd\'hui', { gap: 14 }, [micro('Aujourd\'hui'), fr('Chiffres', { dir: 'H', gap: 40, kids: [fr('RDV', { dir: 'V', kids: [tx('5', 'Chiffre géant'), tx('rendez-vous', 'Légende', { c: 'texte/secondaire' })] }), fr('Prochain', { dir: 'V', gap: 2, pad: [12, 0, 0, 0], kids: [tx('Prochain · 10:30', 'Titre/S'), tx('Camille R. · Coupe + barbe', 'Corps/S', { c: 'texte/secondaire' })] })] }),
          table('Journée', ['Heure', 'Client', 'Prestation', 'Statut'], [['9:30', 'Lucas M.', 'Coupe homme', badge('Terminé')], ['10:30', 'Camille R.', 'Coupe + barbe', badge('Confirmé', 'Succès')], ['14:00', 'Yanis B.', 'Dégradé', badge('Confirmé', 'Succès')], ['16:00', 'Nouvelle demande', 'Barbe', badge('En attente', 'Alerte')]], [80, 200, 200, 120], { to: PD.day })]),
        card('Ma vitrine', { gap: 12 }, [micro('Ma vitrine'), fr('Vignettes', { dir: 'H', gap: 10, kids: ['barber', 'classique', 'barbe', 'coiffure-homme', 'coupe', 'dreads'].map((i) => photo('Réalisation', 112, 140, i, 14)) })]),
      ]),
      fixedCol('Côté', 340, [
        card('Demandes', { gap: 8 }, [micro('À traiter'), tx('2 demandes', 'Titre/L'), para('Répondez pour ne pas perdre ces clients.'), btn('Voir les demandes', { size: 'S', to: PD.requests })]),
        card('Classement', { gap: 6 }, [micro('Classement'), tx('3ᵉ sur 12', 'Titre/L'), para('Coupe homme · Strasbourg')]),
        card('Visibilité', { gap: 6 }, [micro('Ma visibilité'), tx('214', 'Chiffre géant'), para('vues du profil · 30 jours')]),
      ]),
    ]));
  });
  const weekEvents = [[0, 9.5, 10.5, 'Terminé', 'Lucas M.', '9:30'], [1, 10.5, 11.25, 'Confirmé', 'Camille R.', '10:30'], [1, 14, 14.75, 'Confirmé', 'Yanis B.', '14:00'], [1, 16, 16.5, 'En attente', 'Demande', '16:00'], [2, 9, 10, 'Confirmé', 'Théo L.', '9:00'], [2, 12.5, 13.5, 'Indisponibilité', 'Pause', '12:30'], [3, 11, 12, 'Confirmé', 'Inès M.', '11:00'], [4, 15, 17, 'Confirmé', 'Sarah K.', '15:00'], [5, 9.5, 10.25, 'Confirmé', 'Noah P.', '9:30'], [5, 13, 14, 'Confirmé', 'Adam R.', '13:00']];
  proDesk(PD.week, 'Agenda', {}, (b) => {
    add(b, deskHeader('Agenda', '13 – 18 octobre', [fr('Vues', { dir: 'H', gap: 6, kids: [link(chip('Jour', false), PD.day, 'swap'), chip('Semaine', true), chip('Mois', false)] }), btn('Nouveau', { size: 'S', icon: 'Plus' })]));
    add(b, weekCalendar('Semaine', 600, weekEvents, { w: 1080, to: PD.day }));
  });
  proDesk(PD.day, 'Agenda', { note: 'Panneau contextuel' }, (b) => {
    add(b, deskHeader('Mardi 14 octobre', '5 rendez-vous · libre à 15:30', [fr('Vues', { dir: 'H', gap: 6, kids: [chip('Jour', true), link(chip('Semaine', false), PD.week, 'swap')] })]));
    add(b, cols('Grille', [
      col('Calendrier', [weekCalendar('Jour', 600, [[0, 9.5, 10.25, 'Terminé', 'Lucas M. · Coupe homme', '9:30 – 10:15'], [0, 10.5, 11.25, 'Confirmé', 'Camille R. · Coupe + barbe', '10:30 – 11:15'], [0, 12.5, 13.5, 'Indisponibilité', 'Pause déjeuner', '12:30'], [0, 14, 14.75, 'Confirmé', 'Yanis B. · Dégradé', '14:00'], [0, 16, 16.5, 'En attente', 'Demande · Barbe', '16:00']], { w: 680, days: ['Mardi 14'] })]),
      panel('Détail', [fr('Identité', { dir: 'H', gap: 12, fillW: true, align: 'center', kids: [avatar('CR', 'M'), fr('Textes', { dir: 'V', gap: 1, grow: true, kids: [tx('Camille R.', 'Titre/M'), tx('6 visites · revient toutes les 5 sem.', 'Légende', { c: 'texte/secondaire' })] })] }), badge('Confirmé', 'Succès'), listCard('Infos', [listRow('Coupe + barbe', '45 min · 35 €', 'Scissors', { chevron: false }), listRow('10:30 – 11:15', null, 'Clock', { chevron: false }), listRow('Résultat souhaité', 'Dégradé bas', 'MessageCircle', { chevron: false })]), fr('Note', { dir: 'V', gap: 4, fillW: true, kids: [micro('Note privée'), para('Préfère les ciseaux.')] }), btn('Déplacer', { type: 'Secondaire' }), btn('Annuler', { type: 'Destructif' })]),
    ]));
  });
  proDesk(PD.requests, 'Réservations', {}, (b) => {
    add(b, deskHeader('Réservations', '2 à confirmer'));
    add(b, inst('Segments', { Actif: '1', 'Segment 1': 'À confirmer', 'Segment 2': 'À venir', 'Segment 3': 'Passés' }));
    add(b, table('Demandes', ['Client', 'Prestation', 'Date', 'Action'], [['Camille R.', 'Balayage · 2 h', 'Mar. 14 · 10:30', fr('Boutons', { dir: 'H', gap: 8, kids: [btn('Accepter', { size: 'S' }), btn('Refuser', { size: 'S', type: 'Secondaire' })] })], ['Sarah K.', 'Coupe + brushing', 'Mer. 15 · 16:00', fr('Boutons', { dir: 'H', gap: 8, kids: [btn('Accepter', { size: 'S' }), btn('Refuser', { size: 'S', type: 'Secondaire' })] })]], [240, 260, 220, 260]));
  });
  proDesk(PD.clients, 'Clients', {}, (b) => {
    const sb = inst('Barre de recherche', { Texte: 'Rechercher un client…' }); sb.resize(320, 48);
    add(b, deskHeader('Mes clients', '18 / 25 clients · illimité avec CHAIR+', [sb]));
    add(b, cols('Grille', [
      col('Liste', [table('Carnet', ['Client', 'Dernier passage', 'Rythme', 'Visites'], [['Camille R.', '9 sept.', '5 sem.', '6'], ['Lucas M.', '23 sept.', '3 sem.', '4'], ['Yanis B.', '6 août', 'À relancer', '3'], ['Théo L.', '30 sept.', '—', '2'], ['Inès M.', '2 oct.', '6 sem.', '5']], [200, 160, 140, 80], { selected: 0 })]),
      panel('Fiche', [fr('Identité', { dir: 'H', gap: 12, fillW: true, align: 'center', kids: [avatar('CR', 'M'), tx('Camille R.', 'Titre/M')] }), fr('Chiffres', { dir: 'H', gap: 10, fillW: true, kids: [kpi('5 sem.', 'rythme'), kpi('6 j', 'prochain retour')] }), micro('Note privée'), para('Sensible du cuir chevelu.'), btn('Proposer un rendez-vous', { size: 'S' })]),
    ]));
  });
  proDesk(PD.services, 'Prestations', {}, (b) => {
    add(b, deskHeader('Mes prestations', '5 services · 2 spécialités', [btn('Nouvelle prestation', { size: 'S', icon: 'Plus' })]));
    add(b, cols('Grille', [
      col('Liste', [table('Services', ['Service', 'Spécialité', 'Durée', 'Prix'], [['Coupe homme', 'Coupe homme', '30 min', '25 €'], ['Coupe + barbe', 'Coupe homme', '45 min', '35 €'], ['Coupe enfant', 'Coupe homme', '30 min', '18 €'], ['Taille de barbe', 'Barbe', '20 min', '15 €'], ['Rasage à l\'ancienne', 'Barbe', '30 min', '25 €']], [220, 200, 120, 100], { selected: 1 })]),
      panel('Édition', [micro('Modifier'), field('Nom', 'Coupe + barbe', { filled: true }), fr('Prix', { dir: 'H', gap: 8, fillW: true, kids: [field('Prix', '35 €', { filled: true }), field('Durée', '45 min', { filled: true })] }), btn('Enregistrer', { size: 'S' }), btn('Dupliquer', { size: 'S', type: 'Doux' }), btn('Supprimer', { size: 'S', type: 'Destructif' })]),
    ]));
  });
  proDesk(PD.portfolio, 'Portfolio', {}, (b) => {
    add(b, deskHeader('Portfolio', '12 réalisations · 3 épinglées', [btn('Publier', { size: 'S', icon: 'Plus' })]));
    add(b, fr('Grille', { dir: 'H', gap: 12, wrap: true, fillW: true, kids: ['barber', 'classique', 'barbe', 'coiffure-homme', 'coupe', 'dreads', 'barber', 'classique', 'barbe', 'coiffure-homme'].map((img, i) => realTile(img, [96, 84, 61, 140, 45, 30, 22, 18, 12, 9][i], null, 202, 252)) }));
  });
  proDesk(PD.profile, 'Profil', { note: 'Édition + prévisualisation côté client' }, (b) => {
    add(b, deskHeader('Mon profil', 'Ce que les clients voient sur CHAIR', [btn('Enregistrer', { size: 'S' })]));
    add(b, cols('Grille', [
      col('Formulaire', [card('Identité', { gap: 14 }, [fr('Photo', { dir: 'H', gap: 14, align: 'center', kids: [avatar('HL', 'L', true), btn('Changer la photo', { size: 'S', type: 'Doux' })] }), field('Nom', 'Hugo Lambert', { filled: true }), field('Bio', 'Barbier à Strasbourg, dégradés nets et barbes soignées.', { filled: true }), fr('Spécialités', { dir: 'H', gap: 8, wrap: true, fillW: true, kids: [chip('Coupe homme', true), chip('Barbe', true), chip('Barber', true), chip('Locks', false)] })])]),
      fr('Aperçu', { dir: 'V', gap: 8, w: 390, kids: [micro('Aperçu CHAIR client'), fr('Téléphone', { dir: 'V', w: 390, h: 640, r: 36, bg: 'fond/app', stroke: 'bordure/moyenne', strokeW: 6, clip: true, kids: profileHeader(DEMO.coiffeurs[3], 1) })] }),
    ]));
  });
  proDesk(PD.perf, 'Performance', {}, (b) => {
    add(b, deskHeader('Performance', 'Votre activité, votre audience, ce qui marche.', [fr('Période', { dir: 'H', gap: 6, kids: [chip('30 jours', true), chip('12 mois', false, { icon: 'Lock' })] })]));
    add(b, cols('Chiffres', [kpi('214', 'vues du profil'), kpi('31', 'rendez-vous'), kpi('4,8', 'note moyenne'), kpi('29', 'avis certifiés')]));
    add(b, card('Courbe', { gap: 16 }, [micro('Vues par semaine'), barChart('Barres', [18, 26, 22, 31, 40, 37, 52, 61, 58, 66, 72, 80], { h: 220 })]));
  });
  proDesk(PD.progress, 'Progression', {}, (b) => {
    add(b, deskHeader('Progression et classement', 'Par spécialité'));
    add(b, cols('Grille', [
      col('Niveaux', [card('Niveau', { dark: true, gap: 8 }, [micro('Coupe homme', true), tx('Expert', 'Chiffre géant', { c: 'sombre/texte' }), tx('Encore 3 avis pour devenir Référence', 'Corps/S', { c: 'neutre/400' })]), card('Barbe', { gap: 6 }, [micro('Barbe'), tx('Confirmé', 'Titre/L'), para('Encore 5 avis pour Expert')])]),
      col('Classement', [table('Classement', ['#', 'Coiffeur', 'Note'], DEMO.coiffeurs.slice(0, 5).map((c, i) => [String(i + 1), i === 2 ? 'Hugo Lambert (vous)' : c.nom, c.note]), [40, 300, 80], { selected: 2 })]),
    ]));
  });
  proDesk(PD.plus, 'CHAIR+', {}, (b) => {
    add(b, cols('Grille', [
      col('Offre', [micro('Pour les coiffeurs'), fr('Wordmark', { dir: 'H', kids: [tx('CHAIR', 'Logo/L'), tx('+', 'Logo/L', { c: 'accent/or' })] }), tx('Passez devant.', 'Chiffre géant'), para('La visibilité, le badge, le carnet illimité — tout ce qui sépare un bon coiffeur d\'un coiffeur qu\'on remarque.'), btn('Essayer 30 jours gratuits', { fillW: false }), tx('Puis 15,99 €/mois · renouvellement mensuel automatique · Conditions · Confidentialité', 'Légende', { c: 'texte/tertiaire' })]),
      fixedCol('Comparatif', 460, [listCard('Comparatif', [['Carnet client', '25', 'Illimité'], ['Analytics', '30 j', '12 mois'], ['Vidéos 15 s', '—', '✓'], ['Épinglées', '—', '✓'], ['Badge CHAIR+', '—', '✓'], ['Boost local', '—', '✓']].map(([k, a, z]) => fr(k, { dir: 'H', gap: 8, fillW: true, pad: [14, 20], align: 'center', bg: 'fond/surface', kids: [tx(k, 'Corps/S', { grow: true }), tx(a, 'Légende', { c: 'texte/tertiaire', w: 70, align: 'center' }), tx(z, 'Corps/S fort', { w: 80, align: 'center' })] })))]),
    ], 60));
  });
  proDesk(PD.salon, 'Salon', {}, (b) => {
    add(b, deskHeader('Salon et opportunités'));
    add(b, cols('Grille', [
      col('Salon', [card('Invitation', { gap: 10 }, [micro('Invitation reçue'), tx('Atelier Dumont vous invite', 'Titre/M'), para('« On serait ravis de vous compter dans l\'équipe. »'), fr('Boutons', { dir: 'H', gap: 8, kids: [btn('Accepter', { size: 'S' }), btn('Décliner', { size: 'S', type: 'Secondaire' })] })])]),
      col('Opportunités', [table('Offres', ['Offre', 'Salon', 'Contrat'], [['Coiffeur·se confirmé·e', 'Atelier Dumont', 'CDI'], ['Barbier', 'Maison Noire', 'CDD'], ['Fauteuil à louer', 'Atelier Dumont', '35 €/j']], [220, 180, 100])]),
    ]));
  });
  proDesk(PD.settings, 'Réglages', {}, (b) => {
    add(b, deskHeader('Réglages du compte'));
    add(b, cols('Grille', [
      col('Compte', [card('Informations', { gap: 12 }, [micro('Informations'), field('E-mail', 'hugo@exemple.fr', { filled: true }), field('Téléphone', '06 12 34 56 78', { filled: true }), btn('Enregistrer', { size: 'S' })]), card('Sécurité', { gap: 12 }, [micro('Sécurité'), field('Mot de passe actuel', '••••••••', { filled: true }), field('Nouveau mot de passe', '••••••••', { filled: true })])]),
      col('Autres', [listCard('Réglages', [listRow('Notifications', 'Demandes, rappels, avis', 'Bell'), listRow('Abonnement', 'CHAIR+ · essai 23 j', 'Sparkles'), listRow('Apparence', 'Clair', 'Moon', { chevron: false }), listRow('Aide & contact', null, 'LifeBuoy'), listRow('Confidentialité', null, 'Shield'), listRow('Se déconnecter', null, 'LogOut', { chevron: false }), listRow('Supprimer mon compte', null, 'Trash2', { danger: true })])]),
    ]));
  });
  proDesk(PD.denied, 'Accueil', { note: 'Accès refusé selon rôle' }, (b) => {
    add(b, spacer(140));
    const e = inst('État vide', { Titre: 'Cet espace est réservé aux coiffeurs.', Texte: 'Votre compte client s\'utilise dans CHAIR.', Action: true });
    const ei = e.findOne((n) => n.name === 'Icône'); if (ei) ei.swapComponent(ICON.Lock);
    add(b, fr('Centre', { dir: 'H', fillW: true, justify: 'center', kids: [e] }));
  });
  endRow();
}
