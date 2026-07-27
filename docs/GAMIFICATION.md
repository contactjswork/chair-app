# CHAIR — Système de gamification (badges, niveaux, streak, anneaux)

> Document de référence créé le 2026-07-08, mis à jour le 2026-07-09 (badges "discipline" liés aux anneaux, refonte visuelle, flamme streak sur le profil public, audit de cohérence des badges vérification/spécial via Miro de Julien — `top_10` recalculé en vrai percentile, `formation_badge` renommé/reclassé pour honnêteté, `identity_verified`/`siret_verified` identifiés comme morts/cassés mais correction différée). Décrit tout le système tel qu'il fonctionne réellement dans le code (pas l'intention, le comportement réel vérifié).

## Vue d'ensemble

Le coiffeur gagne des **points** en débloquant des **badges**. La somme des points détermine son **niveau CHAIR**. Le **streak** (jours d'activité consécutifs) et les **anneaux** (objectifs du jour) sont des indicateurs à côté du système de points — voir section dédiée sur ce qu'ils changent (ou pas) concrètement.

Fichier source de vérité : `backend/app/Services/BadgeService.php` (backend) — dupliqué côté frontend dans `frontend/app/pro/badges/page.tsx` (`ALL_BADGES_DEF`). **Ces deux listes doivent rester synchronisées manuellement** — ce n'est pas automatique, un badge ajouté côté backend doit être répliqué côté frontend ou il reste invisible (bug trouvé et corrigé le 2026-07-08 : 8 badges existaient côté backend sans jamais s'afficher).

---

## 1. Les 6 niveaux CHAIR

| Niveau | Seuil (pts) | Couleur | Ce que ça débloque en plus (perks affichés dans la roadmap) |
|---|---|---|---|
| **Débutant** | 0 | neutre | Profil visible sur CHAIR |
| **Actif** | 100 | bronze | Apparaît dans les résultats de recherche, ring "Actif" sur la carte publique |
| **Confirmé** | 250 | argent | Mis en avant dans "Coiffeurs à la une", badge Confirmé affiché sur la carte, priorité affichage local |
| **Expert** | 500 | or | Priorité dans les recherches locales, badge Expert doré visible par les clients, accès section "Top coiffeurs" |
| **Elite** | 1000 | violet | Featured en homepage CHAIR, badge Elite violet exclusif, profil mis en avant dans sa ville |
| **Légende CHAIR** | 2500 | diamant | Profil épinglé en tête des résultats, statut Légende CHAIR à vie, badge légendaire ultra-exclusif |

⚠️ **Ces perks sont actuellement des promesses affichées dans la modale "Roadmap" de `/pro/badges` (frontend `LEVEL_PERKS`) — à vérifier s'ils sont réellement appliqués ailleurs dans le code (mise en avant recherche, homepage, etc.) ou si ce sont juste des textes motivationnels pas encore branchés à une vraie logique de mise en avant.**

Le score total nécessaire pour "Légende CHAIR" (2500 pts) représente environ le cumul de presque tous les badges de tier 3 et 4 — c'est volontairement un statut très rare, atteignable seulement après une activité soutenue sur plusieurs mois/années.

---

## 2. Les 39 badges, par catégorie

Légende tier : 🥉 bronze (1) · 🥈 argent (2) · 🥇 or (3) · 💎 diamant (4)
Colonne "Visible" = apparaît sur le profil public (`ProfileBadgesRow` — voir section 4, actuellement non branché nulle part malgré ce flag).

### Profil (compléter son profil)
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Première impression | Photo de profil ajoutée | 20 | 🥉 | non |
| Vitrine | Bannière ajoutée | 15 | 🥉 | non |
| Profil complet | Score de complétion ≥ 80% (photo+bannière+tagline+ville+2 spé+3 posts) | 50 | 🥈 | **oui** |

### Contenu (publications)
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Première réalisation | 1 publication | 30 | 🥉 | non |
| Photographe | 5 publications | 50 | 🥈 | **oui** |
| Portfolio Pro | 20 publications | 100 | 🥇 | **oui** |
| Artiste CHAIR | 50 publications | 200 | 💎 | **oui** |

### Communauté (abonnés)
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Premiers fans | 1 abonné | 15 | 🥉 | non |
| Populaire | 30 abonnés | 60 | 🥈 | **oui** |
| Influenceur | 100 abonnés | 120 | 🥇 | **oui** |
| Star CHAIR | 500 abonnés | 300 | 💎 | **oui** |

### Avis reçus
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Voix des clients | 1 avis reçu | 25 | 🥉 | non |
| Bien noté | Note ≥ 4.5 avec 5+ avis | 80 | 🥈 | **oui** |
| Excellent | Note ≥ 4.8 avec 10+ avis | 150 | 🥇 | **oui** |
| Perfectionniste | Note ≥ 4.95 avec 5+ avis | 250 | 💎 | **oui** |

### Réservations (RDV terminés)
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Premier client | 1 RDV terminé | 50 | 🥉 | non |
| Pro confirmé | 10 RDV | 100 | 🥈 | **oui** |
| Expert | 50 RDV | 250 | 🥇 | **oui** |
| Maestro | 100 RDV | 500 | 💎 | **oui** |

### Visites vérifiées (QR CHAIR — la visite "certifiée physiquement")
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Actif certifié | 10 visites QR | 30 | 🥉 | **oui** |
| Pro certifié | 50 visites QR | 80 | 🥈 | **oui** |
| Expert certifié | 250 visites QR | 200 | 🥇 | **oui** |
| Maestro certifié | 1000 visites QR | 500 | 💎 | **oui** |

### Spécial
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Certifié CHAIR | Profil vérifié manuellement par l'équipe CHAIR | 100 | 🥇 | **oui** |
| Nouveau talent | Inscrit depuis ≤ 90 jours ET a publié au moins 1 post | 0 | 🥉 | **oui** |
| **Top 10%** *(mécanique corrigée 2026-07-09)* | Fait réellement partie des 10% de coiffeurs actifs (posts≥1) avec le `chair_score` le plus élevé — nécessite au moins 10 coiffeurs actifs sur toute la plateforme, sinon verrouillé (un "top 10%" sur 5 personnes n'a pas de sens) | 150 | 💎 | **oui** |
| **Professionnel actif** *(déplacé 2026-07-09, ex-catégorie "Vérification")* | ≥3 posts ET ≥5 RDV terminés | 50 | 🥈 | **oui** |

⚠️ **Avant le 2026-07-09**, `Top 10%` comparait un score composite à un **seuil absolu fixe (≥300)** sans jamais comparer aux autres coiffeurs — un profil pouvait l'obtenir sans être proche du top 10% réel, ou l'inverse. Corrigé pour comparer le `chair_score` (déjà persisté) contre celui de tous les coiffeurs actifs via deux requêtes `COUNT` indexées (pas de scan complet). `Professionnel actif` était classé en "Vérification" alors que ce n'est pas un critère vérifié par CHAIR — juste un critère d'engagement, comme les badges streak — déplacé en "Spécial" pour cohérence.

### Vérification
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Identité vérifiée | Identité confirmée par CHAIR (admin) | 80 | 🥇 | **oui** |
| SIRET vérifié | SIRET du salon validé | 100 | 🥇 | **oui** |
| **Diplômé** *(ajouté 2026-07-08)* | Diplôme officiel renseigné (CAP/BP/BM Coiffure) sur le profil | 70 | 🥈 | **oui** |

⚠️ **`Identité vérifiée` et `SIRET vérifié` sont des badges morts en l'état (2026-07-09)** : aucun code, panel admin ou seeder ne fixe jamais `identity_verified`/`is_verified` sur un profil — `Identité vérifiée` est structurellement impossible à débloquer. `SIRET vérifié` ne vérifie que le SIRET d'un *salon* (`salons.verification_status`), donc **impossible pour un coiffeur indépendant** (pas de `salon_id`) — alors que les indépendants sont le cœur de cible de CHAIR. Julien a été informé, décision volontairement différée (le sujet dépend de la distinction salon/indépendant, à retravailler avec l'associé) — voir [[sprint_associe_juillet2026]]. `Certifié CHAIR` (`verified`) est également mort aujourd'hui, mais c'est voulu : il est prévu de le lier à un futur abonnement payant CHAIR+ (voir décision Julien 2026-07-09), pas à corriger maintenant.

### Profil (déclaratif — pas de vérification CHAIR derrière)
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| **Formations suivies** *(renommé 2026-07-09, ex-"Formation certifiée")* | Au moins une formation/institution auto-déclarée dans un menu déroulant | 60 | 🥈 | **oui** |

⚠️ Ce badge était classé en "Vérification" alors qu'il n'y a **aucune vérification** — n'importe quel coiffeur peut se l'auto-attribuer en un clic en choisissant une institution dans une liste (la table pivot a bien une colonne `is_verified` mais elle n'est jamais utilisée par le check du badge). Renommé et déplacé en "Profil" pour ne plus mentir sur ce qu'il atteste, description mise à jour en conséquence. Aucune vérification de document n'existe côté CHAIR à ce jour.

### Streak (activité consécutive)
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Sur un rythme | 7 jours d'activité consécutifs | 50 | 🥈 | **oui** |
| Mois parfait | 4 semaines actives consécutives | 100 | 🥇 | **oui** |
| Inarrêtable | 30 jours consécutifs | 150 | 🥇 | **oui** |
| Légende du quotidien | 100 jours consécutifs | 400 | 💎 | **oui** |

### Discipline (journées parfaites) *(ajouté 2026-07-09)*
| Badge | Condition | Points | Tier | Visible |
|---|---|---|---|---|
| Journée parfaite | 1 journée avec les 3 anneaux du jour complétés | 20 | 🥉 | **oui** |
| Semaine sans faute | 7 journées parfaites cumulées | 80 | 🥈 | **oui** |
| Discipline de fer | 30 journées parfaites cumulées | 200 | 🥇 | **oui** |
| Machine CHAIR | 100 journées parfaites cumulées | 450 | 💎 | **oui** |

---

## 3. Le streak — ce qu'il fait vraiment

Une activité qualifiante (publier, recevoir un avis, terminer un RDV) enregistre l'activité du jour. Si le coiffeur était déjà actif hier → le compteur augmente de 1. S'il a raté un jour → retombe à 1.

**Ce que ça rapporte** : les 4 badges streak ci-dessus, à des seuils fixes (7/30/100 jours, 4 semaines). Entre ces seuils, le streak n'a toujours pas d'effet sur le score. **Mais depuis le 2026-07-09, le streak a une utilité indépendante des points : au-delà de 3 jours consécutifs, il s'affiche publiquement** sur `/app/coiffeur/[slug]` (flamme + nombre de jours en overlay sur la photo de profil, façon Snapchat/Duolingo) — c'est un signal social vu par les clients potentiels, pas juste un compteur interne. Toujours pas de mécanique de "sauvetage" (streak freeze) si le streak est sur le point de casser.

## 4. Les anneaux (objectifs du jour) — ce qu'ils font vraiment

Trois anneaux façon Apple Santé, calculés en temps réel : RDV du jour (vs objectif quotidien, défaut 3), streak actif (rempli si actif aujourd'hui), engagement client (avis + likes des 7 derniers jours, vs objectif 5).

**Depuis le 2026-07-09, fermer les 3 anneaux le même jour compte comme une "journée parfaite"** (`RingService::get()` détecte que les 3 progress sont à 100%, appelle `StreakService::recordPerfectDay()` — idempotent, une fois par jour — puis `BadgeService::refresh()`). Le compteur `perfect_days_count` (table `hairdresser_streaks`) alimente les 4 badges "Discipline" ci-dessus, qui rapportent de vrais points et remontent le niveau CHAIR. Les anneaux ne sont donc plus un tableau de bord purement informatif : les compléter a un effet direct et cumulatif sur le score. `RingsWidget` affiche la progression vers le prochain badge discipline ("3/7 vers le badge Semaine sans faute").

## 5. Sur le profil public (ce que voient les clients)

**Branché depuis le 2026-07-08, enrichi le 2026-07-09.** `/app/coiffeur/[slug]` affiche :
- Un anneau coloré autour de la photo (couleur = niveau : bronze/argent/or/violet/diamant) + pastille sous la photo avec le nom du niveau **et le nombre de badges débloqués** (ex. "Confirmé · 11").
- Une **flamme streak** en overlay sur la photo (coin haut-droit) si le coiffeur a 3 jours d'activité consécutifs ou plus — orange vif si actif aujourd'hui, grise s'il ne l'a pas encore été (mais streak toujours vivant). Alimentée par `chair_streak` (nouveau champ public renvoyé par `HairdresserController::show()`).
- Une rangée de badges "confiance client" (`TrustBadgesRow`) : sélection curée des badges les plus impressionnants (max 3), pas la liste brute.

Tous les badges (dashboard ET profil public) utilisent désormais un médaillon circulaire avec dégradé métal par tier (bronze/argent/or/légendaire) au lieu d'un carré plat coloré — composant partagé `BadgeMedallion` (`frontend/components/ui/ChairBadges.tsx`).

---

## Fichiers clés

- `backend/app/Services/BadgeService.php` — définition des 39 badges + 6 niveaux + logique de déblocage + `refresh()` (persistance + notif)
- `backend/app/Services/StreakService.php` — logique streak (incrément/reset) + `recordPerfectDay()` / `perfect_days_count`
- `backend/app/Services/RingService.php` — calcul des 3 anneaux + détection de journée parfaite
- `backend/app/Http/Controllers/Api/HairdresserController.php` — `show()` expose `chair_streak` publiquement (flamme profil)
- `backend/app/Http/Controllers/Api/LeaderboardController.php` — classement public (`index()`) + rang privé (`myRank()`)
- `frontend/app/pro/badges/page.tsx` — page badges dashboard (contient `ALL_BADGES_DEF`, dupliqué du backend)
- `frontend/components/ui/ChairBadges.tsx` — composants réutilisables (`BadgeMedallion`, `BadgeChip`, `LevelBadge`, `ProfileBadgesRow`, `TrustBadgesRow`), `StreakWidget.tsx`, `RingsWidget.tsx`, `MyRankWidget.tsx`
- `backend/database/migrations/2026_07_08_*` — tables `hairdresser_badges`, colonnes `chair_score`/`chair_level`/`daily_appointment_goal`
- `backend/database/migrations/2026_07_09_100000_*` — colonnes `perfect_days_count`/`last_perfect_date` sur `hairdresser_streaks`

---

## 6. Dashboard "cockpit" (`/pro`, refonte 2026-07-10) — ce qui est dedans vs. la roadmap V2

Julien a demandé de transformer `/pro` (home coiffeur) en cockpit quotidien centré sur le profil ("le cœur de CHAIR PRO est le profil, pas la réservation"), mais **explicitement sans nouvelle infra backend pour cette passe** — uniquement des données déjà réelles, réorganisées. Voir `frontend/lib/profileScore.ts` (source unique de la progression du profil, remplace l'ancien `computeScore()` dupliqué dans `pro/page.tsx`) et les nouveaux composants `frontend/components/ui/{ProfileProgressCard,NextStepCard,ProfileBrandCard,PortfolioSnapshotCard}.tsx`.

**`RingsWidget`, `StreakWidget`, `MyRankWidget` ne sont plus rendus sur `/pro`** dans cette version — retirés du home (pas supprimés du code, toujours fonctionnels/appelables) car ils représentent des concepts (streak, classement) que Julien a explicitement classés en roadmap V2 pour cette passe.

### Roadmap V2 — nécessite une nouvelle infra backend, pas encore développée

- **Classement local par spécialité** ("Coupe Homme #3 à Haguenau") : `LeaderboardController::myRank()` ne renvoie aujourd'hui qu'un rang unique par ville (toutes spécialités confondues), pas de filtrage par `specialty_id`. Il faudrait étendre la requête pour grouper par spécialité (max 10 désormais, taxonomie consolidée) et appliquer une garde d'échantillon minimum (comme le badge `top_10` qui se verrouille si moins de 10 coiffeurs actifs sur la plateforme).
- **Fil d'activité récente** ("Lucas vous suit désormais", "votre réalisation a eu 34 nouveaux likes", "vous êtes entré dans le Top 5") : la table `notifications` couvre déjà les nouveaux abonnés et badges débloqués, mais rien ne trace les paliers de likes ou les changements de classement — nécessiterait soit une table d'événements dédiée, soit un diff côté client contre un snapshot (ex. localStorage) des dernières valeurs connues.
- **Objectifs mensuels** ("1000 visites profil : 742/1000") : aucun tracking de vues de profil n'existe (`hairdresser_profiles.visits_count` correspond aux RDV terminés, pas aux vues de page). Nécessiterait une table d'agrégation quotidienne (`hairdresser_profile_views`, par jour) incrémentée sur `HairdresserController::show()`, en excluant les vues du coiffeur sur son propre profil.
- **`posts.views_count`** existe en base mais n'est incrémenté nulle part dans le code — toujours à 0. Ne pas l'afficher tant que ce n'est pas câblé (c'est exactement le "faux chiffre" que Julien a demandé d'éviter) — le nouveau `PortfolioSnapshotCard` n'affiche donc que les likes (réels) et le nombre de réalisations, pas les vues.
