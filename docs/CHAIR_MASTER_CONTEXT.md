# CHAIR — Contexte complet du projet
> Fichier à lire en PREMIER par toute nouvelle session Claude. Écrit le 2026-07-23 pour transférer le contexte complet lors d'un changement de compte Claude.
> Ce fichier **remplace** `docs/PROJECT_MEMORY.md` et `docs/NEXT_SESSION.md` comme point d'entrée — ces deux-là datent de juin 2026, contiennent des routes/specialités obsolètes (ex: `/dashboard/*` au lieu de `/pro/*`, 29 spécialités au lieu de 10) et n'ont plus été tenus à jour. Gardés uniquement pour l'historique très ancien (sprints de mai/juin 2026). En cas de contradiction, CE fichier fait foi.

---

## 0. Qui est Julien, comment lui parler

Julien Schillinger — co-fondateur de CHAIR (avec un associé), porte le dev produit/frontend. Windows 11 + XAMPP (PHP 8.0). Écrit en français, style oral/vocal retranscrit, fautes volontaires, messages courts ("tej ça", "c'est bof", "lâche en plein maintenant que je peux trouver...").

- Donne le feeling, pas les specs. Fais les choix à sa place, il redirige si besoin.
- Screenshots sans description longue = normal, analyse l'image.
- "C'est moche" = manque de hiérarchie visuelle/respiration. "Ça donne pas envie" = copy générique ou design plat.
- Références UX qu'il aime : Instagram, TikTok, LinkedIn, Strava, Uber, Apple, Linear, Vercel.
- Résultats directs, pas d'explications longues. Code propre, sans commentaires inutiles, jamais d'emoji nulle part (code, UI, docs).
- Son associé est impliqué sur les décisions produit stratégiques (ex: gamification, badges) — ne pas trancher unilatéralement les sujets explicitement marqués "en attente de l'associé", implémenter le backend flexible mais ne pas figer le frontend.
- Email pro CHAIR à utiliser partout (CGU, contact, legal) : `hello@getchair.app` — jamais de nom personnel dans les documents légaux.

---

## 1. C'est quoi CHAIR

Réseau social + réservation dédié aux professionnels de la coiffure. Le pari central : **le coiffeur est la marque, pas le salon**. Aujourd'hui les gens choisissent une adresse ("salon Paris 11") à l'aveugle ; CHAIR fait choisir "Antoine, coiffeur" — avec son portfolio, ses avis certifiés, ses abonnés, indépendamment du salon où il travaille.

Positionnement résumé : `Instagram + LinkedIn + Planity + Airbnb, adapté 100% coiffure`.

Couvre tous les statuts : coiffeur salarié en salon, indépendant, gérant de salon.

**Deux applications distinctes, un seul backend Laravel :**
- **CHAIR** (`/app/*` + racine `/`) — l'app client : découverte, feed, réservation, avis.
- **CHAIR PRO** (`/pro/*`) — l'app professionnelle : profil pro, portfolio, agenda, gamification, gestion salon.
- Séparation stricte volontaire entre les deux (un compte pro connecté est automatiquement redirigé hors de `/app/*`, et vice-versa) — corrigé explicitement cette session (contamination croisée entre les deux apps natives).

---

## 2. Stack technique & infrastructure

| Couche | Techno |
|---|---|
| Frontend | Next.js 16.2.6 (App Router, TypeScript, Tailwind CSS, Turbopack) |
| Backend | Laravel 8, PHP 8.0.30, MySQL |
| Auth | Laravel Sanctum (Bearer token, stocké `localStorage` sous `chair_token`/`chair_user`) |
| Images/médias | Cloudinary |
| App native | Capacitor 8.x — **deux apps Capacitor séparées** : `app.getchair.chair` (CHAIR client) et `app.getchair.pro` (CHAIR PRO), chacune en mode `server.url` (chargement distant du site, PAS d'export statique — le middleware Next.js est incompatible avec l'export statique) |
| Push notifications | OneSignal — code complet (`lib/oneSignal.ts`, `onesignal-cordova-plugin`, `NotificationService::sendPush()` backend) mais **no-op tant que Julien n'a pas créé le compte OneSignal** et fourni `ONESIGNAL_APP_ID`/`ONESIGNAL_REST_API_KEY` |
| CI/CD natif | Codemagic (`codemagic.yaml` à la racine) — build + signature iOS pour TestFlight |
| Hébergement frontend | **Vercel**, déploiement auto sur push vers `main` (repo GitHub `contactjswork/chair-app`) |
| Hébergement backend | **Infomaniak (hébergement mutualisé)** — pas de déploiement auto via git, à surveiller si le volume utilisateur grossit (limite de scaling à anticiper vers 10k users) |
| Domaines prod | `https://getchair.app` (client), `https://getchair.app/pro` (CHAIR PRO) |
| Dev local | Frontend `localhost:3000`, backend `localhost:8000/api`, XAMPP MySQL |

### Contraintes techniques dures (PHP 8.0 / Laravel 8)
- **Jamais** `[...$assocArray]` dans un littéral tableau PHP (spread associatif = PHP 8.1+, plante en silencieux 500). Toujours `array_merge($validated, ['key' => 'val'])`.
- **Jamais** `doctrine/dbal` (incompatible). `ALTER TABLE` via `DB::statement()`.
- React : inputs numériques contrôlés → protéger contre `NaN` (`parseFloat('') = NaN`), initialiser avec `!= null` pas juste truthy (pour gérer la valeur 0).
- Next.js 16 : dans un Server Component, `const { slug } = await params;` ; dans un Client Component, `const { slug } = use(params);`.
- Charte design : **blanc + noir + neutres uniquement, jamais de couleur vive.** CTA = `bg-neutral-900 text-white rounded-2xl`. Labels = `text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400`. Mobile-first absolu (classes sans préfixe = mobile, `md:` = desktop).

---

## 3. Modèle de rôles

| Rôle | Champ(s) clé | Accès |
|---|---|---|
| `client` | — | `/app/*` |
| `hairdresser` | `hairdresser_profile.is_independent` (bool), `hairdresser_profile.salon_id` (nullable) | `/pro/*` |
| `salon_owner` | — | `/pro/*` (vue gérant) |
| `admin` | — | `/admin/*` |

Trois personas effectives côté pro : **salarié** (`is_independent === false`), **indépendant** (`is_independent !== false`), **gérant de salon** (`role === 'salon_owner'`). Chacune voit une nav et des fonctionnalités différentes (ex : le salarié n'a jamais de prix/durée sur ses services, l'indépendant en a).

---

## 4. Le système de gamification (priorité stratégique n°1, décidée en réunion co-fondateurs le 2026-07-08)

C'est LE chantier jugé le plus stratégique par l'associé : objectif explicite "un truc où le coiffeur est obligé de se connecter tout le temps, ou boucler des rdv". Très largement construit :

- **39 badges** répartis en 9 catégories (profil, contenu, communauté, avis, réservations, visites QR, spécial, vérification, discipline/streak), avec tier bronze/argent/or/diamant, points, description narrative par badge (`BADGE_STORY`).
- **6 niveaux** (Débutant → Légende CHAIR, 0 → 2500 pts). Le score = somme des points des badges débloqués, rien d'autre n'ajoute de points.
- **Streaks** quotidiens/hebdo (`StreakService`), 4 badges à seuils fixes (7j/30j/100j/4 semaines). Entre les paliers : purement visuel, pas de bonus/multiplicateur.
- **Réputation par spécialité** (architecture plus récente, voir `docs/REPUTATION_ARCHITECTURE.md`) — progression/niveau/rang PAR spécialité (ex: "Top Coupe Homme Haguenau"), pas seulement un score global.
- **Classement (leaderboard)** public (`GET /leaderboard?city=&type=engagement|reviews|posts|progression`, page client `/app/classements`) ET rang privé du coiffeur (`GET /my-rank`) — les deux existent et fonctionnent.
- **Anneaux "journée parfaite"** — fermer 3 anneaux le même jour compte comme une "journée parfaite", alimente des badges discipline. ⚠️ **Cassé cette session** : le service qui calculait ça (`RingService.php`) a été supprimé par erreur et est irrécupérable (jamais commité). L'endpoint `/my-rings` a été retiré proprement. Impact réel : nul (confirmé qu'aucun frontend n'affichait plus rien de ça avant suppression), mais si Julien veut relancer ce concept, c'est à reconstruire de zéro.
- **Vérification diplôme** — flow réel avec upload de document + validation manuelle admin (`/admin/diplomes`), réservé aux indépendants uniquement (403 si salarié en salon).
- **Décision actée, pas codée** : le badge "Certifié CHAIR" / vérification légendaire sera un avantage payant **CHAIR+** (abonnement) quand la monétisation sera construite. Rien à changer tant que CHAIR+ n'existe pas techniquement (voir section 6).
- **Non tranché, en attente de l'associé** : `identity_verified`/`siret_verified` (les indépendants n'ont structurellement pas de SIRET salon, badge injuste pour eux) — Julien a explicitement dit "on verra avec mon associé", ne pas trancher seul.

Doc détaillée : `docs/GAMIFICATION.md`.

---

## 5. CHAIR PRO — refonte UX/UI complète, livrée cette session (2026-07-22/23)

C'est le plus gros chantier de la session qui vient de se clore. Contexte : Julien a demandé une refonte totale ("je préfère que tu passes plusieurs heures à reconstruire une application exceptionnelle plutôt que d'ajouter une nouvelle fonctionnalité", "digne d'une application qui pourrait être utilisée demain par 100 000 coiffeurs"), en réutilisant l'existant, sans nouvelle feature.

**Livré et poussé sur `main` (commit `9cb1019`, déployé sur Vercel) :**

- **Navigation unifiée** : un seul système piloté par rôle (`frontend/hooks/useProNav.ts` + `components/layout/ProNav.tsx` bottom nav mobile + `ProSidebar.tsx` sidebar desktop), remplace 3 anciens composants dupliqués (`DashboardNav`, `SalonOwnerNav`, `SalonOwnerSidebar`, tous supprimés). Avant : la sidebar desktop disparaissait en naviguant hors du cockpit (bug structurel corrigé).
- **Cockpit reconstruit** (`app/pro/page.tsx`) avec une vraie hiérarchie au lieu de 9 cards empilées sans priorité : Zone 1 = prochaine étape dominante (`NextStepCard`, fusion de deux anciennes cards concurrentes), Zone 2 = niveau/classement/spécialité, Zone 3 = agenda du jour, Zone 4 = snapshots secondaires (portfolio, business, profil).
- **Fusions de pages** :
  - Business + Statistiques → une seule page **Performance** (`/pro/business`, `/pro/statistiques` redirige en 308).
  - Cockpit gérant de salon (`/pro/salon-owner`) intègre maintenant un aperçu équipe (avatars + lien direct invitation) et un accès édition directe de la fiche salon (`?edit=1` auto-ouvre le formulaire), au lieu de renvoyer systématiquement vers des pages séparées.
  - Rejoindre un salon + Invitations reçues → fusionnés dans `/pro/salon` (onglets Rechercher / Invitations) pour les coiffeurs sans salon. Avant, cette situation affichait un vrai dead-end ("vous n'êtes pas gestionnaire d'un salon"). `/pro/rejoindre-salon` et `/pro/invitations` redirigent en 308.
- **Nettoyage dette** : types `ApiRings`/`ApiMyRank`/`ApiRing` supprimés (morts, jamais affichés côté frontend), composants `NextActionCard`/`NextBadgeCard` supprimés (fusionnés dans `NextStepCard`), méthode backend `LeaderboardController::myRank()` conservée mais route `/my-rings` retirée (voir perte RingService section 4).
- **Bugs de régression trouvés et corrigés pendant l'audit final** : une marge `md:ml-60` en double sur 2 pages (`fauteuils-a-louer`, `offres-emploi` — la sidebar globale applique déjà cette marge, ces pages l'appliquaient une deuxième fois), un header mobile dupliqué sur le cockpit gérant (logo+cloche affichés deux fois car `ProTopBar` global + un ancien header local pas nettoyé).

**Volontairement PAS fait** (à ne pas présenter comme fait si Julien redemande) :
- Pas de refonte visuelle pixel par pixel des ~15 pages restantes (agenda, portfolio, profil, services, réservations, badges, mon-qr, chair-plus, parrainage, notifications, recrutement, offres-emploi, fauteuils×2) — celles-ci étaient déjà cohérentes visuellement après l'unification de nav, donc l'audit final a cherché de vraies régressions plutôt que de tout repeindre.
- Dette de lint préexistante (pattern `set-state-in-effect`, `Date.now()` en render) répandue dans **tout** le repo (49+ occurrences, y compris hors `/pro`) — pas corrigée, hors scope de cette passe, à traiter séparément si Julien veut un audit qualité de code dédié.

**Vérifications faites** : `tsc --noEmit` propre, `next build` production réussi, ESLint propre sur tout fichier touché (hors dette préexistante ci-dessus), tests manuels en navigateur (login réel, navigation entre rôles, sidebar/bottom-nav persistants).

---

## 6. Monétisation — état réel

- **CHAIR+** (abonnement premium coiffeur) : page `/pro/chair-plus` existe côté frontend (récemment ajoutée, encore non commitée dans l'historique avant cette session — livrée avec le commit de refonte). Fonctionnalités listées : Stories (24h), badge Certifié CHAIR, réalisation épinglée, boost local plafonné, coup de cœur CHAIR éditorial, analytics premium. **Stripe n'est pas branché** — mentionné explicitement en commentaire dans le code (`StoryCreateCard.tsx`) : "Stripe pas encore branché", le seul moyen actuel d'obtenir CHAIR+ est le parrainage.
- **Backend Stripe/Subscription** (`StripeWebhookController`, `SubscriptionController`, modèle `Subscription`) : code présent dans le repo mais **jamais commité**, jamais testé par moi. Fait partie du gros bloc de travail backend en cours, non lié à la session de refonte CHAIR PRO (voir section 8).
- **Modèle business prévu** (voir `docs/PROJECT_MEMORY.md` section 4, non réactualisé récemment mais toujours valable en intention) : Freemium gratuit à vie (profil, portfolio, avis, abonnés) → Pro payant (réservation, agenda) → Business (CRM, stats) → CHAIR Rent (location fauteuil, commission 15%) → CHAIR Brands (partenariats marques) → CHAIR Talent (recrutement) → CHAIR Certification.
- **Parrainage** : `/pro/parrainage` existe, `lib/referral.ts` présent — système de récompenses (CHAIR+ offert, badge ambassadeur, mise en avant) en échange de parrainages. Backend `ReferralController`/`ReferralService`/`ReferralReward` — **non commité non plus**.

---

## 7. Stories (fonctionnalité sociale récente, non commitée côté backend)

Composants frontend présents et intégrés dans le cockpit (`StoryCreateCard.tsx`, `StoriesBar.tsx`, `StoryViewer.tsx`) : story 24h façon Instagram/Snapchat, réservée aux abonnés CHAIR+ (`hasChairPlus(profile)` côté client, 403 côté serveur si pas abonné — le serveur fait autorité). Le backend (`StoryController`, `StoryService`, modèles `Story`/`StoryView`, commande `PurgeExpiredStories`) existe dans le repo mais est **non commité** — fait partie du même gros chantier en cours que Referral/Subscription (section 8).

---

## 8. État Git & déploiement — CRITIQUE

**Mise à jour du 2026-07-27** : le bloc backend ~70 fichiers mentionné comme "non commité" plus tôt dans cette session (Referral/Story/Subscription/SpecialtyProgress) a depuis été committé et poussé par Julien lui-même dans `fe750d8` ("chantier complet weekend"). Le repo GitHub est donc à jour et cohérent — plus de working tree chargé à surveiller au moment de l'écriture de cette note.

**Perte réelle à garder en tête** : `backend/app/Services/RingService.php` a été supprimé par erreur pendant un nettoyage de dette technique en début de session, jamais lu avant suppression, jamais commité, irrécupérable. Impact fonctionnel nul (code mort confirmé avant suppression), mais perte de source si Julien veut un jour relancer le concept "anneaux".

### Le backend de PRODUCTION n'est PAS déployé automatiquement — à faire manuellement, régulièrement

**Découverte critique du 2026-07-27** : le frontend (Vercel) se déploie automatiquement à chaque `git push origin main`. **Le backend (Infomaniak) non — jamais.** Le 2026-07-27, on a découvert que `api.getchair.app` tournait encore sur du code de début juin (près de 2 mois de retard : pas de consolidation des spécialités, pas de parrainage, pas d'abonnements CHAIR+, un bug de classement jamais corrigé). Rien de tout ça n'était un bug de code — c'était juste un déploiement backend jamais fait.

**Procédure complète et à jour, avec les pièges rencontrés, dans `docs/DEPLOY.md`** — à suivre à chaque fois que du code backend est modifié/committé. Résumé des pièges découverts ce jour-là (détail complet dans DEPLOY.md) :
1. Le dossier serveur est un clone du mono-repo entier, mais le site attend les fichiers Laravel à plat à la racine — un `git pull`/`reset` classique les recrée imbriqués dans un sous-dossier `backend/` sans toucher aux fichiers réellement servis. Il faut fusionner manuellement (`cp -a backend/. . && rm -rf backend frontend`).
2. Le PHP utilisé en SSH (8.4) diffère de celui qui sert le site (8.2.31) — chaque `composer install` génère un `platform_check.php` qui casse tout en 500 tant qu'on ne le neutralise pas (`sed -i 's/PHP_VERSION_ID >= 80401/true/' vendor/composer/platform_check.php`).
3. `FRONTEND_URL` n'était pas définie en prod → tous les liens partageables (parrainage, QR visite, invitations salon, Stripe checkout) pointaient vers `localhost:3000`. Corrigé (`config/app.php` + `.env` du serveur), mais si un nouveau `.env` de prod est un jour recréé, ne pas oublier cette variable.

**Un token GitHub avec accès complet (`repo` scope) est passé en clair dans le terminal de cette session** (visible dans `git remote -v` côté serveur) — Julien a été prévenu de le régénérer sur GitHub par précaution.

**Le frontend est intégralement commité et poussé** (refonte CHAIR PRO + tous les fixes iOS + corrections FRONTEND_URL de cette session). C'est ce qui est actuellement live sur `getchair.app/pro`.

---

## 9. Travail iOS / TestFlight / Codemagic (fait juste avant la refonte CHAIR PRO)

- Deux apps Capacitor distinctes (CHAIR client, CHAIR PRO), toutes deux en mode `server.url` (chargement web distant, pas d'export statique — incompatible avec le middleware Next.js).
- **Pipeline de signature Codemagic corrigé** : le vrai bug était que `codemagic.yaml` n'avait que `xcode-project use-profiles` (cherche uniquement dans le store local Codemagic) sans jamais appeler `app-store-connect fetch-signing-files --create` (récupère/crée depuis Apple) ni `keychain add-certificates`. Les deux étapes manquantes ont été ajoutées pour les deux workflows (`chair-client-ios`, `chair-pro-ios`).
- **Blocage organisationnel rencontré** : la génération de clé API App Store Connect pour un Individual Key nécessite que le titulaire du compte Apple Developer active d'abord l'accès API — blocage contourné via build manuel sur un Mac emprunté en attendant.
- **Bug géolocalisation résolu** : WKWebView + Capacitor + contenu distant déclenchait un double prompt (popup natif CoreLocation + popup JS WebKit séparé). Corrigé en utilisant le plugin natif `@capacitor/geolocation` directement (bypasse l'API JS `navigator.geolocation`) quand `isNativeApp()`.
- **Séparation stricte app client / app pro** : les deux apps natives ne doivent jamais se contaminer (ex: un lien profil pro cliqué depuis l'app client doit ouvrir un lien externe, pas naviguer en interne).
- Doc dédiée : `docs/IOS_TESTFLIGHT.md`.

---

## 10. Concurrents identifiés (utile pour piquer des idées UX/algos)

Recherché et discuté en session (2026-07-23) :

**Côté CHAIR (client)** : **Fresha** (dominant en France, 4,7/5 — comparaison de dispos multi-salons, paiement in-flow), **Planity** (15M d'utilisateurs FR, très fort sur l'affichage prestations/tarifs et rappels SMS), **Booksy** (fidélisation intégrée à la découverte), **Instagram** (pas un concurrent direct mais référence absolue pour feed/stories/découverte vu que c'est le vrai différenciateur de CHAIR), **Sephora Beauty Insider / Ulta Beauty** (paliers de fidélité gamifiés, "Points Bazaar" — inspirant pour CHAIR+/points).

**Côté CHAIR PRO (business)** : **SQUIRE Commander** (app business barbershops US, UX mobile très soignée, proche esthétique de CHAIR PRO — waitlist intégrée, commissions/pointage staff, intégration Instagram, widget résa embarquable), **Fresha for Business** (dashboard pro référence du secteur), **Duolingo** (pas un concurrent — LA référence gamification/streaks à copier pour rendre la progression addictive).

---

## 11. Comptes de test (locaux, mots de passe réinitialisés en session)

| Email | Mot de passe | Rôle | Notes |
|---|---|---|---|
| `test_new_coiffeur@test.com` | `chairdemo2026` | hairdresser (indépendant, `salon_id=14`) | Compte de démo principal, slug `test-coiffeur` |
| `test999@gmail.com` | `chairdemo2026` | salon_owner | Salon "Koehler Coiffeur", Schweighouse |

`BYPASS_ACCOUNTS` dans `frontend/contexts/AuthContext.tsx` référence `test_new_coiffeur@test.com` pour le flow de bypass démo (`NEXT_PUBLIC_AUTH_BYPASS`, désactivé en prod, réversible).

---

## 12. Où trouver le détail si besoin (docs existantes, valables mais partielles)

- `docs/GAMIFICATION.md` — détail complet badges/niveaux/streaks/anneaux (⚠️ mentionne encore les anneaux comme fonctionnels — plus vrai depuis la perte de `RingService.php`, voir section 4/8).
- `docs/REPUTATION_ARCHITECTURE.md` — réputation par spécialité.
- `docs/GROWTH.md` — programme ambassadeur/parrainage.
- `docs/CHAIR_PLUS.md` — spec CHAIR+.
- `docs/UX_AUDIT_CHAIR_PRO.md` — l'audit qui a précédé la refonte de cette session (largement exécuté depuis, voir section 5).
- `docs/IOS_TESTFLIGHT.md` — détail pipeline iOS.
- `docs/DEPLOY.md` — déploiement.
- `docs/PROJECT_MEMORY.md` / `docs/NEXT_SESSION.md` — historique très ancien (mai-juin 2026), routes obsolètes, à ne consulter que pour l'archéologie de features très anciennes (système de réservation initial, etc.).

Les fichiers de mémoire persistante Claude (si le nouveau compte a accès au même système de mémoire — sinon ignorer cette ligne) : `chair_app_client.md`, `chair_pro.md`, `project_state.md`, `user_profile.md`, `feedback_dev.md`, `sprint_associe_juillet2026.md` dans le dossier memory du projet — plus à jour que PROJECT_MEMORY.md/NEXT_SESSION.md mais moins à jour que ce fichier-ci sur la refonte CHAIR PRO.

---

## 13. Commandes utiles

```powershell
# Backend
cd C:\xampp\htdocs\chair-app\backend
php artisan serve --port=8000

# Frontend
cd C:\xampp\htdocs\chair-app\frontend
npm run dev

# Vérification avant tout commit
npx tsc --noEmit
npx eslint .
npm run build
```
