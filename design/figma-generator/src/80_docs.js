// ═══ Pages de documentation : 00, 08, 09, 10, 11 ════════════════════════

const FLOWS = [
  ['CHAIR Client', 'Premier lancement', ['C-01 Ouverture', 'C-02 Bienvenue', 'C-13 Onboarding — univers', 'C-14 Onboarding — envies', 'C-15 Onboarding — localisation', 'M-01 Localisation (modale)', 'C-16 Onboarding — prêt', 'C-20 Accueil']],
  ['CHAIR Client', 'Trouver et réserver', ['C-20 Accueil', 'C-40 Profil coiffeur — réalisations', 'C-50 Réserver — prestation', 'C-51 Réserver — date et créneau', 'C-52 Réserver — récapitulatif', 'C-53 Réserver — confirmé', 'C-82 Mes rendez-vous']],
  ['CHAIR Client', 'Rechercher', ['C-30 Recherche', 'C-31 Résultats — liste', 'F-01 Filtres (feuille)', 'C-32 Résultats — carte', 'C-40 Profil coiffeur — réalisations']],
  ['CHAIR Client', 'Avis vérifié', ['C-71 QR salon — qui t\'a coiffé', 'C-70 Visite vérifiée', 'C-72 Laisser un avis', 'C-73 Avis publié']],
  ['CHAIR Client', 'Compte et suppression', ['C-80 Compte', 'C-88 Supprimer mon compte', 'C-03 Connexion']],
  ['CHAIR PRO', 'Inscription coiffeur', ['P-02 Bienvenue', 'P-03 Inscription — rôle', 'P-04 Inscription — activité', 'P-05 Inscription — e-mail', 'P-06 Inscription — où exerces-tu', 'P-08 Onboarding — spécialités', 'P-09 Onboarding — prestations', 'P-10 Onboarding — horaires', 'P-11 Onboarding — photo et bio', 'P-12 Onboarding — prêt', 'P-21 Accueil — premiers pas']],
  ['CHAIR PRO', 'Journée de travail', ['P-01 Connexion', 'P-20 Accueil', 'P-30 Agenda — jour', 'F-10 Rendez-vous (feuille)', 'P-33 Nouveau rendez-vous']],
  ['CHAIR PRO', 'Passer à CHAIR+', ['P-20 Accueil', 'P-74 CHAIR+', 'F-14 Achat Apple (feuille système)']],
  ['CHAIR PRO', 'Gérant → autre app', ['P-03 Inscription — rôle', 'P-86 Espace gérant → CHAIR BUSINESS']],
  ['CHAIR BUSINESS', 'Créer son salon', ['B-01 Connexion', 'B-03 Inscription — nom du salon', 'B-04 Inscription — SIRET', 'B-05 Onboarding — photos du salon', 'B-06 Salon prêt', 'B-10 Accueil']],
  ['CHAIR BUSINESS', 'Piloter l\'équipe', ['B-01 Connexion', 'B-02 Connexion — formulaire', 'B-10 Accueil', 'B-30 Équipe', 'F-22 Inviter un coiffeur (feuille)']],
  ['CHAIR BUSINESS', 'Louer un fauteuil', ['B-50 Fauteuils', 'B-51 Annonce — équipements', 'B-52 Annonce — disponibilités', 'B-53 Annonce — prix conseillés', 'F-23 Demande de location (feuille)']],
];

const HANDOFF = [
  ['Bouton', 'components/ui/Button.tsx (PrimaryButton, SecondaryButton)'],
  ['Champ', 'Champs natifs stylés (bg-neutral-50, rounded-2xl) — pages de formulaire'],
  ['Barre de recherche', 'components/ui/HeroSearch.tsx'],
  ['Pilule / Badge', 'components/ui/Badge.tsx, pilules inline (rounded-full)'],
  ['Segments', 'components/ui/PublicProfileTabs.tsx'],
  ['Onglets/CHAIR', 'components/layout/BottomNav.tsx'],
  ['Onglets/CHAIR PRO, CHAIR BUSINESS', 'components/layout/ProNav.tsx (+ BusinessShell)'],
  ['Barre haute', 'components/layout/ProTopBar.tsx, PageHeader.tsx'],
  ['Carte, Carte sombre', 'lib/proStyle.ts (CARTE, CARTE_SOMBRE)'],
  ['Feuille (bottom sheet)', 'components/ui/BottomSheet.tsx, owner/OwnerBottomSheet.tsx'],
  ['Modale', 'GeoPermissionModal, SignupPromptModal, ReviewPromptModal'],
  ['État vide', 'components/ui/EmptyState.tsx, owner/OwnerEmptyState.tsx'],
  ['Squelette', 'components/ui/Skeleton.tsx, search/SearchResultSkeleton.tsx'],
  ['Carte coiffeur', 'components/ui/HairdresserCard.tsx, HomeGeoStrips.tsx'],
  ['Résultat de recherche', 'components/search/SearchResultCard.tsx, ui/RecommendationCard.tsx'],
  ['Vignette réalisation', 'components/ui/PortfolioGrid.tsx'],
  ['Note', 'components/ui/StarRating.tsx'],
  ['Créneau, Jour', 'components/ui/BookingSheet.tsx, app/app/coiffeur/[slug]/reserver'],
  ['Bloc agenda', 'app/pro/agenda/page.tsx (DayView)'],
  ['Zone de dépôt', 'components/ui/ImageUpload.tsx'],
  ['Chiffre clé', 'components/ui/StatCard.tsx, owner/OwnerStat.tsx'],
  ['Aide & informations', 'components/ui/ReglagesLegaux.tsx + LienSite.tsx (feuille Safari)'],
];

function docTable(name, headers, rows, widths) {
  const t = fr(name, { dir: 'V', gap: 0, fillW: true, r: 20, bg: 'fond/surface', stroke: 'bordure/legere', clip: true });
  const head = fr('En-tête', { dir: 'H', gap: 16, fillW: true, pad: [12, 20], bg: 'fond/creux' });
  headers.forEach((h, i) => add(head, tx(h, 'Micro-titre', { c: 'texte/secondaire', w: widths[i] })));
  add(t, head);
  rows.forEach((r, ri) => {
    const line = fr('Ligne', { dir: 'H', gap: 16, fillW: true, pad: [9, 20], align: 'center', bg: ri % 2 ? 'fond/app' : null });
    r.forEach((cell, i) => add(line, typeof cell === 'string' ? tx(cell, i === 2 ? 'Corps/S fort' : 'Corps/S', { c: 'texte/principal', w: widths[i] }) : fr('Cellule', { dir: 'H', w: widths[i], kids: [cell] })));
    add(t, line);
  });
  return t;
}
function statusPill(code) {
  const map = { E: ['Existant', 'Succès'], I: ['Incomplet', 'Alerte'], P: ['Prévu', 'Alerte'], N: ['Proposition', 'Sombre'] };
  return badge(map[code][0], map[code][1]);
}

function topFrameName(node) {
  let n = node;
  try { while (n.parent && n.parent.type !== 'PAGE' && n.parent.type !== 'SECTION') n = n.parent; } catch (e) { /* nœud retiré */ }
  return n.name;
}

async function buildDocs(links) {
  // Un écran est « prototypé » s'il émet ou reçoit au moins un lien.
  const proto = new Set();
  for (const l of LINKS) { if (l.to) proto.add(l.to); proto.add(topFrameName(l.node)); }
  for (const r of INVENTORY) if (proto.has(r.name)) r.proto = true;

  // ── 00 — Project Overview ─────────────────────────────────────────────
  const p0 = await newPage('00 — Project Overview');
  await go(p0);
  const ov = board('CHAIR — écosystème', 'Trois apps iOS, un seul site (Next.js) affiché en direct dans chaque app (Capacitor). CHAIR pour les clients, CHAIR PRO pour les coiffeurs, CHAIR BUSINESS pour les gérants. Un seul compte pro partagé entre PRO et BUSINESS ; chaque app est verrouillée sur son public.', 2000);
  p0.appendChild(ov);
  const archi = block('Architecture', 'Ce que l\'audit du code a établi (102 routes, dont 24 d\'administration interne non maquettées ici).');
  const box = (t, s, items, dark) => card(t, { gap: 8, pad: 24, dark, w: 520, fillW: false }, [tx(t, 'Titre/L', { c: dark ? 'sombre/texte' : 'texte/principal' }), tx(s, 'Corps/S', { c: dark ? 'neutre/400' : 'texte/secondaire', w: 470 }), ...items.map((i) => tx('· ' + i, 'Corps/S', { c: dark ? 'sombre/texte' : 'texte/principal', w: 470 }))]);
  add(archi, fr('Apps', { dir: 'H', gap: 24, fillW: true, kids: [
    box('CHAIR', 'app.getchair.client · /app/* · mobile', ['Découvrir, rechercher, carte', 'Fiche coiffeur et salon, réserver', 'Avis vérifiés par QR', 'Favoris, fil, classements, compte'], false),
    box('CHAIR PRO', 'app.getchair.pro · /pro/* · mobile + desktop', ['Agenda, réservations, planning', 'Clients, fidélité, prestations', 'Portfolio, profil, QR, performance', 'CHAIR+ (achat intégré Apple)'], true),
    box('CHAIR BUSINESS', 'app.getchair.business · /business/* · mobile + desktop', ['Coquille gérant posée sur les écrans PRO', 'Salon, équipe, recrutement, fauteuils', 'Abonnement : prochainement', 'Desktop : propositions marquées'], false),
  ] }));
  add(archi, tx('Compte : un client ne peut se connecter qu\'à CHAIR ; un compte pro sert à PRO et à BUSINESS avec les mêmes identifiants ; les ponts entre apps ouvrent vraiment l\'autre app.', 'Corps/M', { c: 'texte/secondaire', w: 1600 }));
  add(ov, archi);
  const legend = block('Statuts de conception', null);
  add(legend, fr('Légende', { dir: 'H', gap: 16, kids: [['E', 'Existant et fonctionnel'], ['I', 'Existant mais incomplet'], ['P', 'Prévu dans le produit'], ['N', 'Nouvelle proposition UX à valider']].map(([k, t]) => fr(t, { dir: 'H', gap: 8, align: 'center', kids: [statusPill(k), tx(t, 'Corps/S')] })) }));
  const counts = {};
  for (const r of INVENTORY) counts[r.product] = (counts[r.product] || 0) + 1;
  add(legend, tx(INVENTORY.length + ' écrans générés · ' + Object.entries(counts).map(([k, v]) => k + ' ' + v).join(' · ') + ' · ' + links.ok + ' liens de prototype', 'Corps/M', { c: 'texte/secondaire' }));
  add(ov, legend);
  const inv = block('Tableau de correspondance', 'Produit · route réelle · écran Figma · formats · prototype · statut. Généré à partir des écrans réellement créés dans ce fichier.');
  add(inv, docTable('Inventaire', ['Produit', 'Route réelle', 'Nom écran Figma', 'Mobile', 'Desktop', 'Prototype', 'Statut'],
    INVENTORY.map((r) => [r.product, r.route, r.name, r.format === 'Mobile' ? '✓' : '—', r.format === 'Desktop' ? '✓' : '—', r.proto ? '✓' : '·', statusPill(r.status)]),
    [150, 340, 380, 70, 70, 90, 150]));
  add(ov, inv);
  ov.x = 100; ov.y = 100;
  closeContainer(p0);
  if (p0.type === 'SECTION') { p0.y = -p0.height - 400; }

  // ── 08 — User Flows ───────────────────────────────────────────────────
  const p8 = await newPage('08 — User Flows');
  await go(p8);
  const fb = board('Parcours utilisateurs', 'Les parcours clés de chaque app. Chaque étape correspond à un écran du fichier ; les mêmes enchaînements sont câblés dans le prototype.', 2400);
  p8.appendChild(fb);
  for (const [prod, name, steps] of FLOWS) {
    const b = block(prod + ' — ' + name, null);
    const lane = fr('Étapes', { dir: 'H', gap: 10, wrap: true, fillW: true, align: 'center' });
    steps.forEach((s, i) => {
      add(lane, fr(s, { dir: 'V', gap: 4, w: 170, pad: 14, r: 18, bg: i === 0 ? 'cta/fond' : 'fond/app', stroke: 'bordure/moyenne', kids: [tx(s.split(' ')[0], 'Micro-titre', { c: i === 0 ? 'neutre/400' : 'texte/tertiaire' }), tx(s.split(' ').slice(1).join(' '), 'Corps/S fort', { c: i === 0 ? 'cta/texte' : 'texte/principal', w: 142 })] }));
      if (i < steps.length - 1) add(lane, ic('ArrowRight', 18, 'texte/tertiaire'));
    });
    add(b, lane);
    add(fb, b);
  }
  fb.x = 100; fb.y = 100;
  closeContainer(p8);

  // ── 09 — Interactive Prototypes ───────────────────────────────────────
  const p9 = await newPage('09 — Interactive Prototypes');
  await go(p9);
  const pb = board('Prototypes interactifs', 'Les prototypes vivent sur les pages des écrans (Figma ne relie que des écrans d\'une même page). Ouvrir une page d\'écrans, puis Présenter (▶) : chaque point de départ ci-dessous est disponible dans le menu des parcours.', 1600);
  p9.appendChild(pb);
  const starts = block('Points de départ', null);
  const allFlows = [];
  for (const p of figma.root.children) for (const f of p.flowStartingPoints || []) allFlows.push([p.name, f.name]);
  add(starts, docTable('Points de départ', ['Page', 'Parcours'], allFlows.map(([p, f]) => [p, f]), [500, 700]));
  add(pb, starts);
  add(pb, block('Interactions câblées', links.ok + ' liens : onglets (sans transition), poussées (glissement), feuilles du bas (montée), modales (fondu), retours (Retour arrière), fermetures de superposition. Défilement vertical sur les écrans longs, horizontal sur les bandeaux.'));
  pb.x = 100; pb.y = 100;
  closeContainer(p9);

  // ── 10 — Variants & Experiments ───────────────────────────────────────
  const p10 = await newPage('10 — Variants & Experiments');
  await go(p10);
  startProduct(p10, 'Variantes');
  row('Variantes à comparer', 'Propositions d\'évolution à comparer avec l\'existant, clairement séparées. Rien ici ne remplace l\'identité actuelle.');
  mobile('V-01 Accueil client — variante « recherche héros »', { route: '/app (proposition)', status: 'N', top: null, tab: ['Onglets/CHAIR', 'Accueil'], gap: 20, pad: [12, 16, 24, 16] }, (b) => {
    add(b, tx('Le coiffeur fait pour toi.', 'Titre/XL', { fillW: true }));
    add(b, searchBar(null));
    add(b, hstrip('Spécialités', DEMO.specialites.map(([t, img]) => specialtyTile(t, img))));
    add(b, sectionHead('Pour toi', 'Faits pour ton style', false));
    DEMO.coiffeurs.slice(0, 3).forEach((c) => add(b, resultCard(c)));
  });
  mobile('V-02 Accueil PRO — variante « agenda d\'abord »', { route: '/pro (proposition)', status: 'N', top: topBar('CHAIR PRO', { logo: true }), tab: ['Onglets/CHAIR PRO — indépendant', 'Accueil'], gap: 14, pad: [16, 16, 24, 16] }, (b) => {
    add(b, tx('5 rendez-vous aujourd\'hui', 'Titre/L'));
    add(b, agendaDay('Journée', 520, [[9.5, 10.25, 'Terminé', 'Lucas M.', '9:30'], [10.5, 11.25, 'Confirmé', 'Camille R. · Coupe + barbe', '10:30'], [14, 14.75, 'Confirmé', 'Yanis B.', '14:00'], [16, 16.5, 'En attente', 'Demande', '16:00']]));
  });
  mobile('V-03 Accueil client — mode sombre (choix explicite)', { route: '/app (mode sombre)', status: 'E', note: 'Le sombre n\'est jamais imposé', dark: true, top: fr('Recherche fixe', { dir: 'V', gap: 10, w: 390, pad: [8, 16, 10, 16], bg: 'fond/app', kids: [searchBar(null)] }), tab: ['Onglets/CHAIR', 'Accueil'], gap: 16, pad: [16, 16, 24, 16] }, (b) => {
    add(b, sectionHead('Pour toi', 'Faits pour ton style', false));
    DEMO.coiffeurs.slice(0, 3).forEach((c) => add(b, resultCard(c)));
  });
  endRow();
  closeContainer(p10);

  // ── 11 — Design Handoff ───────────────────────────────────────────────
  const p11 = await newPage('11 — Design Handoff');
  await go(p11);
  const hb = board('Livraison aux développeurs', 'Correspondance entre le système Figma et le code. Les variables portent les mêmes valeurs que globals.css et lib/proStyle.ts.', 1600);
  p11.appendChild(hb);
  const map = block('Composants Figma ↔ composants React', null);
  add(map, docTable('Correspondance', ['Composant Figma', 'Code'], HANDOFF, [360, 900]));
  add(hb, map);
  const tok = block('Jetons', null);
  add(tok, docTable('Jetons', ['Variable Figma', 'Valeur clair', 'Valeur sombre', 'Équivalent code'], [
    ['fond/app', '#fafafa', '#101013', 'bg-neutral-50'], ['fond/surface', '#ffffff', '#17171a', 'bg-white'], ['texte/principal', '#171717', '#f6f6f7', 'text-neutral-900'],
    ['texte/secondaire', '#737373', '#a6a6ae', 'text-neutral-500'], ['cta/fond', '#171717', '#26262b', 'bg-neutral-900 (CTA noirs)'], ['accent/or', '#f5b942', '#f5b942', 'premium uniquement'],
    ['rayon/carte', '28', '—', 'rounded-[28px]'], ['rayon/bouton', '16', '—', 'rounded-2xl'], ['Carte (effet)', '0 1 2 · 0 10 26 −14', '—', 'CARTE (proStyle)'],
  ], [260, 220, 220, 520]));
  add(hb, tok);
  add(hb, block('Règles', 'Une ligne de texte maximum par message. Thème clair par défaut, le sombre sur choix explicite. Partage par lien natif uniquement, jamais de visuel généré. Pages légales ouvertes depuis le site (feuille Safari). Dans les apps iOS, aucun lien vers un paiement externe. Régénérer ce fichier : relancer le plugin « CHAIR — Générateur » (design/figma-generator), il remplace ses propres pages sans toucher au reste.'));
  hb.x = 100; hb.y = 100;
  closeContainer(p11);
  await flush();
}
