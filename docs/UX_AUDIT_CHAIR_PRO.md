# CHAIR PRO — Audit UX & refonte d'architecture produit

> Document de référence, 2026-07-10. Rédigé après inspection complète du code (22 pages sous `/pro/`, 3 rôles, les deux systèmes de navigation existants). Ce n'est pas une opinion générale sur "les bonnes pratiques UX" — chaque point cité s'appuie sur un fichier et une ligne réels du code actuel. Aucune interview utilisateur n'a été menée — c'est un audit d'architecture, pas un audit terrain.

**Verdict en une phrase** : CHAIR PRO a déjà les bons composants (cockpit profil, gamification, spécialités) mais les **expose à travers 22 pages faiblement hiérarchisées**, avec **un seul système de navigation qui ne distingue pas indépendant/salarié**, et **un vrai bug qui casse la promesse "jamais de cul-de-sac"** pour les gérants de salon.

---

## 1. Audit complet — état actuel

### 1.1 Trois rôles, deux "shells" de navigation, zéro cohérence entre les deux

- **Coiffeur (indépendant ou salarié)** → `DashboardNav.tsx` : Accueil · Agenda · Portfolio · **Business** · Profil. **Identique pour les deux sous-types**, alors que le salarié n'a ni facturation, ni réservation directe (toute la philosophie produit validée cette session dit explicitement que le salarié ne reçoit pas de RDV via CHAIR).
- **Gérant de salon** → `SalonOwnerNav.tsx` : Accueil · Salon · Équipe · Recrutement · **Profil**. Système totalement séparé, découvert uniquement en lisant le code — rien dans l'architecture ne signale que ces deux navs existent en parallèle.
- Le layout commun (`app/pro/layout.tsx`) ne fait AUCUNE distinction de rôle au niveau du shell — chaque page réimporte sa propre nav (`DashboardNav` ou `SalonOwnerNav`) individuellement. C'est fragile : rien n'empêche une page de ne pas importer la bonne nav, ou d'en importer aucune.

### 1.2 Inventaire des 22 pages sous `/pro/`

| Page | Rôle(s) | Dans la nav ? | Verdict |
|---|---|---|---|
| `/pro` (Accueil) | coiffeur | ✅ | Vient d'être refondu en cockpit — bon état |
| `/pro/agenda` | coiffeur (indépendant surtout) | ✅ | Se chevauche avec Planning et Réservations |
| `/pro/planning` | coiffeur indépendant | ❌ (accès via ⚙ dans Agenda) | **Doublon** — horaires/blocages, sujet identique à Agenda |
| `/pro/reservations` | coiffeur indépendant | ✅ (sidebar desktop uniquement) | **Doublon** — liste de RDV, sujet identique à Agenda |
| `/pro/portfolio` | coiffeur | ✅ | Bon état, objectif clair |
| `/pro/business` | coiffeur indépendant | ✅ | Chevauche Statistiques |
| `/pro/statistiques` | coiffeur indépendant | ✅ (sidebar desktop) | **Doublon** — mêmes données que Business sous un autre nom |
| `/pro/profil` | coiffeur | ✅ | Vient d'être refondu — bon état |
| `/pro/services` | coiffeur | ❌ (lien depuis Profil) | Bon état, bien rattaché à Profil |
| `/pro/badges` | coiffeur | ✅ (sidebar desktop) | Devrait vivre **dans** Profil, pas à côté (règle "profil = cœur du produit") |
| `/pro/mon-qr` | coiffeur salarié | ✅ (sidebar desktop, salarié) | Devrait être une action, pas une page de nav |
| `/pro/invitations` | coiffeur indépendant | ✅ (sidebar desktop) | **Doublon conceptuel** avec Rejoindre un salon — les deux gèrent "ma relation à un salon" |
| `/pro/rejoindre-salon` | coiffeur indépendant | ❌ (orpheline, aucun lien trouvé dans la nav) | Orpheline + doublon avec Invitations |
| `/pro/offres-emploi` | coiffeur | ❌ (lien depuis Business) | Isolée, gagnerait à fusionner avec Rejoindre un salon dans un hub "Opportunités" |
| `/pro/fauteuils-a-louer` | coiffeur indépendant | ❌ (lien depuis Business) | Niche, correcte en sous-page de Business |
| `/pro/notifications` | tous | ✅ | Correct tel quel |
| `/pro/salon-owner` (Accueil gérant) | salon_owner | ✅ | Bon état |
| `/pro/salon` | salon_owner | ✅ | **Doublon** avec Équipe (gère aussi les membres) |
| `/pro/equipe` | salon_owner | ✅ | **Doublon** avec Salon |
| `/pro/fauteuils` | salon_owner | ✅ (sidebar desktop) | Bon état, gagnerait à vivre sous Équipe |
| `/pro/recrutement` | salon_owner | ✅ | Bon état, objectif clair |

**Bilan chiffré** : sur 22 pages, **7 sont des doublons ou quasi-doublons directs**, **2 sont orphelines** (jamais liées dans aucune nav), et **1 lien de nav pointe vers une page interdite au rôle qui la voit** (détail ci-dessous). Sur le plan brut de la règle 7 ("cette page mérite-t-elle d'exister ?"), la réponse honnête est non pour au moins 6 d'entre elles en tant que pages séparées — leur contenu doit survivre, pas leur statut de page autonome.

---

## 2. Liste des problèmes UX (classés par gravité)

### 🔴 Critique — viole une règle absolue explicitement posée

1. **Cul-de-sac déguisé pour le gérant de salon.** `SalonOwnerNav.tsx` (ligne 13) pointe l'onglet **Profil** vers `/pro/profil`. Mais `app/pro/profil/page.tsx` (ligne 72) est gardée par `useRequireAuth(['hairdresser'])` — **un gérant de salon n'a pas le droit d'y accéder**. Le hook (`useRequireAuth.ts`) le redirige silencieusement vers `/pro/salon-owner`. Concrètement : le gérant tape sur l'onglet que son propre menu lui propose, et se retrouve renvoyé à l'accueil sans aucune explication. C'est exactement le "cul-de-sac UX" interdit par la règle 1 — sauf qu'ici il est caché derrière un bouton qui semble légitime.
2. **Navigation coiffeur non différenciée par sous-rôle.** `DashboardNav.tsx` affiche "Business" à un coiffeur salarié qui n'a ni facturation, ni réservation directe, ni abonnement à gérer (confirmé par la philosophie produit validée cette session : le salarié ne réserve pas via CHAIR). Aucune condition de rendu sur `is_independent` dans ce composant — c'est un simple tableau statique.

### 🟠 Élevé — doublons directs (règle 2)

3. **Trois pages pour un seul sujet "temps"** : Agenda, Planning, Réservations couvrent toutes la gestion du temps/RDV du coiffeur indépendant, avec des recoupements (horaires dans Planning, mais aussi consultables depuis Agenda ; liste de RDV dans Réservations, mais aussi visible dans Agenda "Aujourd'hui").
4. **Deux pages pour la gestion d'équipe côté salon** : `/pro/salon` affiche déjà la liste des membres + demandes en attente ; `/pro/equipe` refait la même chose avec en plus la recherche/invitation. Un gérant doit deviner laquelle des deux pages consulter pour une tâche donnée.
5. **Deux pages pour les statistiques** : `/pro/business` et `/pro/statistiques` présentent des métriques qui se recoupent (revenus, RDV, tendances) sous deux noms différents, sans qu'aucune ne soit clairement "la" source de vérité.
6. **Invitations vs Rejoindre un salon** : conceptuellement la même relation ("mon rattachement à un salon") éclatée en deux écrans distincts, dans deux directions (reçues / envoyées) qui pourraient être deux onglets d'un seul écran.

### 🟡 Moyen — pages orphelines / mal rattachées

7. `/pro/rejoindre-salon` n'est liée nulle part dans la navigation actuelle — seul un utilisateur qui connaît l'URL peut y accéder.
8. `/pro/badges` est une page à part entière alors que la règle 6 ("le profil est le produit") dit explicitement que réputation et badges doivent faire partie du profil, pas vivre à côté.
9. `/pro/mon-qr` occupe un onglet entier de la sidebar salarié pour une action ponctuelle (générer un QR) — ce n'est pas une destination, c'est un bouton.

### 🟢 Mineur — à vérifier lors de l'implémentation

10. Les pages Business/Statistiques n'ont pas été auditées ligne à ligne pour des KPI décoratifs (la règle 10 l'interdit) — ce nettoyage a été fait pour la home le 2026-07-10, pas encore pour ces deux pages qui existent toujours en parallèle.

---

## 3. Architecture idéale par rôle

### 3.1 Coiffeur salarié — ce qu'il voit / ce qui lui manque / ce qui est inutile

**Contexte fondamental** : il ne réserve pas de RDV via CHAIR (ses réservations passent par le système du salon ou en direct). Son usage de CHAIR est **100% construction de réputation et de marque personnelle** — c'est un usage plus proche d'un portfolio professionnel + carte de visite que d'un outil de gestion.

- **Voit aujourd'hui** : Business (inutile — aucune donnée financière/réservation à y afficher), Réservations en sidebar (inutile, même raison), un onglet Agenda qui mélange dispo et gestion de RDV (alors qu'il n'a pas de RDV à gérer).
- **Manque** : un point d'entrée clair vers les opportunités (offres d'emploi + recherche de salon) — aujourd'hui éclaté et mal rattaché.
- **Architecture proposée** : Accueil · Agenda (disponibilités uniquement — pas de confirmation/annulation de RDV) · Portfolio · **Opportunités** (fusion offres d'emploi + recherche de salon + invitations reçues) · Profil (identité + spécialités + services + badges + réputation).

### 3.2 Coiffeur indépendant — ce qu'il voit / ce qui lui manque / ce qui est inutile

- **Voit aujourd'hui** : la bonne liste de sujets, mais éclatée en trop de pages pour les mêmes deux thèmes (temps, argent).
- **Manque** : rien de fonctionnel — le vrai manque est la consolidation.
- **Architecture proposée** : Accueil · **Agenda** (fusion Agenda + Planning + Réservations, à onglets internes : Aujourd'hui / Semaine / Horaires & blocages) · Portfolio · **Business** (fusion Business + Statistiques : revenus, réservations, stats, abonnement, accès rapide à Services) · Profil (identité + spécialités + services + badges + réputation + diplôme vérifié).

### 3.3 Gérant de salon — ce qu'il voit / ce qui lui manque / ce qui est inutile

- **Voit aujourd'hui** : un onglet "Profil" qui ne fonctionne pas pour lui (bug critique ci-dessus), deux pages qui gèrent la même équipe.
- **Manque** : une vraie page "Profil" à lui (infos personnelles du gérant, pas la page coiffeur), une vision d'ensemble de l'agenda collectif de l'équipe (actuellement absente — chaque coiffeur gère le sien séparément, le gérant n'a aucune vue consolidée).
- **Architecture proposée** : Accueil · Agenda (vue consolidée des RDV de toute l'équipe — **nouveau**, absent aujourd'hui) · **Équipe** (fusion Salon + Équipe, à onglets internes : Infos du salon / Membres / Fauteuils à louer / Demandes) · Recrutement (déjà bien conçu, inchangé) · Profil (nouvelle page, propre au gérant — nom, email, notifications, pas de spécialités/diplôme).

---

## 4. Nouvelle navigation par rôle

Voir le diagramme ci-dessus pour la comparaison visuelle actuel/proposé. Résumé textuel :

| Rôle | Navigation actuelle | Navigation proposée |
|---|---|---|
| Salarié | Accueil · Agenda · Portfolio · **Business** · Profil | Accueil · Agenda · Portfolio · **Opportunités** · Profil |
| Indépendant | Accueil · Agenda · Portfolio · Business · Profil | *(inchangée en surface — fusion en interne)* |
| Gérant | Accueil · Salon · Équipe · Recrutement · **Profil (cassé)** | Accueil · Agenda (nouveau) · **Équipe** · Recrutement · **Profil (corrigé, propre au gérant)** |

---

## 5. Pages à fusionner

| Fusion | Devient | Justification |
|---|---|---|
| Agenda + Planning + Réservations | **Agenda** (à onglets) | Même sujet — temps et RDV du coiffeur indépendant |
| Business + Statistiques | **Business** (à onglets) | Mêmes données présentées deux fois |
| Salon + Équipe | **Équipe** (à onglets : Infos / Membres / Fauteuils / Demandes) | Même responsabilité — gérer le salon et ses gens |
| Invitations + Rejoindre un salon | **Mon salon** (à onglets : Rechercher / Reçues) | Même relation vue sous deux angles |
| Offres d'emploi + Rejoindre un salon (côté salarié) | **Opportunités** | Le salarié cherche soit une mission, soit un salon — un seul hub |

## 6. Pages à supprimer *(en tant que pages autonomes dans la navigation — le contenu survit, absorbé ailleurs)*

- `/pro/planning` → contenu absorbé dans Agenda
- `/pro/reservations` → contenu absorbé dans Agenda
- `/pro/statistiques` → contenu absorbé dans Business
- `/pro/equipe` → contenu absorbé dans Équipe (fusionné avec Salon)
- `/pro/badges` → contenu absorbé dans Profil (nouveau bloc "Réputation & badges")
- `/pro/invitations` → contenu absorbé dans Mon salon
- `/pro/mon-qr` → devient une action (bouton), plus une destination de nav

## 7. Éléments à déplacer

- **QR code de génération** : sort de la nav, devient un bouton dans Profil (salarié) ou Business (indépendant).
- **Vérification SIRET du salon** : doit vivre dans Équipe > Infos, pas ailleurs (actuellement dans Salon, cohérent après fusion).
- **Bloc badges/réputation** : sort de sa page dédiée, devient une section du Profil, juste après Spécialités & services (cohérent avec le travail déjà fait le 2026-07-10 sur `ProfileProgressCard`).
- **Lien "Voir mon profil public"** : une seule occurrence par écran (déjà corrigé sur la home et le profil le 2026-07-10 — à vérifier sur les autres écrans lors de la fusion).

---

## 8. Nouveau parcours utilisateur complet

### Coiffeur salarié — un matin ordinaire
1. Ouvre CHAIR PRO → Accueil : voit en 3 secondes sa progression de profil, sa prochaine étape, et si son employeur a confirmé son rattachement au salon.
2. Onglet Agenda : vérifie/ajuste ses disponibilités du jour (pas de RDV à confirmer — il n'en reçoit pas).
3. Onglet Portfolio : ajoute une réalisation de la veille.
4. Onglet Opportunités : consulte si de nouvelles offres correspondent à son profil (uniquement s'il a signalé qu'il est en recherche — cf. `work_availability`).
5. Onglet Profil : complète une spécialité manquante, poussé par le nudge de l'accueil.

### Coiffeur indépendant — un matin ordinaire
1. Accueil : voit son score, sa progression, ses RDV du jour.
2. Agenda : confirme les demandes en attente, vérifie sa semaine.
3. Business : consulte ses revenus de la semaine, ajuste un service.
4. Profil : identique au salarié, en plus riche (diplôme, services avec prix).

### Gérant de salon — un matin ordinaire
1. Accueil : voit les alertes (nouvelle demande de rattachement, candidature reçue, demande de fauteuil).
2. Équipe > Membres : valide une demande de rattachement.
3. Équipe > Fauteuils : répond à une demande de location.
4. Recrutement : consulte une nouvelle candidature.
5. Profil (le sien, enfin fonctionnel) : met à jour ses informations de contact.

---

## 9. Maquettes logiques écran par écran

### Accueil coiffeur (existant depuis le 2026-07-10, à conserver tel quel)
```
┌─────────────────────────────┐
│ Bonjour + avatar             │
│ [Alerte RDV en attente]      │
│ Progression du profil (hero) │
│ Chiffres clés (5 stats)      │
│ Anneaux du jour               │
│ Prochaine étape (1 seule)    │
│ Actions recommandées          │
│ Marque personnelle             │
│ Portfolio (aperçu)            │
│ Aujourd'hui (indépendant)     │
└─────────────────────────────┘
```

### Agenda (fusionné — indépendant)
```
┌─────────────────────────────┐
│ [Aujourd'hui] [Semaine] [Horaires] │  ← onglets
│                               │
│ Vue Aujourd'hui :             │
│   Liste RDV du jour           │
│   Demandes en attente         │
│                               │
│ Vue Horaires :                │
│   Grille horaires hebdo       │
│   Fenêtre de réservation      │
│   Blocages ponctuels          │
└─────────────────────────────┘
```

### Agenda (nouveau — salarié, disponibilités seules)
```
┌─────────────────────────────┐
│ Mes disponibilités            │
│   Grille horaires (simple)    │
│   [Je suis en congés du...]  │
└─────────────────────────────┘
```

### Business (fusionné — indépendant)
```
┌─────────────────────────────┐
│ [Revenus] [Réservations] [Stats] │
│                               │
│ Revenus : ce mois vs dernier  │
│ Réservations : taux de remplissage │
│ Stats : tendance abonnés/avis │
│ → Raccourci "Gérer mes services" │
└─────────────────────────────┘
```

### Équipe (fusionné — gérant)
```
┌─────────────────────────────┐
│ [Infos] [Membres] [Fauteuils] [Demandes] │
│                               │
│ Infos : nom, SIRET, photos    │
│ Membres : liste + inviter     │
│ Fauteuils : annonces actives  │
│ Demandes : rattachement + location │
└─────────────────────────────┘
```

### Profil gérant (nouveau — n'existe pas aujourd'hui)
```
┌─────────────────────────────┐
│ Photo, nom, email             │
│ Notifications                 │
│ Se déconnecter                │
└─────────────────────────────┘
```
Volontairement minimal — le gérant n'a pas de "marque personnelle" à construire au sens coiffeur, juste un compte à gérer.

---

## 10. Plan d'implémentation priorisé

### Phase 1 — Corriger le cassé (urgent, gain élevé, risque faible)
1. Corriger le bug critique : créer une vraie page `/pro/profil` pour le gérant (ou rediriger intelligemment `SalonOwnerNav` vers un écran qui fonctionne).
2. Différencier `DashboardNav` par `is_independent` : "Business" → "Opportunités" pour le salarié, contenu Agenda ajusté.

### Phase 2 — Fusionner le temps (indépendant)
3. Fusionner Agenda + Planning + Réservations en une seule page à onglets.

### Phase 3 — Fusionner l'équipe (gérant)
4. Fusionner Salon + Équipe en une seule page à onglets.

### Phase 4 — Fusionner l'argent (indépendant) + Profil enrichi
5. Fusionner Business + Statistiques.
6. Intégrer Badges dans Profil (bloc réputation).
7. Transformer Mon QR en action plutôt qu'en page de nav.

### Phase 5 — Opportunités (salarié) + nettoyage final
8. Fusionner Offres d'emploi + Rejoindre un salon + Invitations en un hub "Opportunités"/"Mon salon".
9. Audit ligne à ligne de Business/Statistiques pour retirer tout KPI décoratif (règle 10) avant/pendant la fusion de la phase 4.

**Recommandation** : traiter la Phase 1 en premier et séparément — c'est un vrai bug de production (pas une question de goût UX), il mérite un correctif immédiat indépendamment du reste du calendrier.
