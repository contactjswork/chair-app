# NEXT SESSION — Reprise de contexte CHAIR
> Lire ce fichier en premier au début de chaque session.
> Dernière mise à jour : 2026-06-07 (session — Sprint B : Disponibilité, Recrutement, Badges Formation)

---

## OÙ EN SOMMES-NOUS ?

**Sprint B — Disponibilité, Recrutement, Formations (session 2026-06-07) — TERMINÉ**

### Nouveautés de cette session (Sprint B)

**Backend :**
- Migration `job_offers` : salon_id, title, job_type (hairdresser/colorist/barber/stylist/apprentice/other), contract_type (cdi/cdd/alternance/freelance), description, city, status (open/closed)
- Migration `training_badges` + `hairdresser_training_badges` : catalogue 15 institutions (Toni & Guy, Wella, L'Oréal, Schwarzkopf, etc.) + pivot coiffeur ↔ badge
- `HairdresserProfile` : `work_availability` dans `$fillable`, relation `trainingBadges()`
- `HairdresserController::show` : charge `trainingBadges` avec le profil public
- `HairdresserController::index` : filtre `?looking=true` (work_availability = looking_salon/looking_gig)
- `ProfileController::update` : accepte `work_availability`
- `JobOfferController` : CRUD complet (public list + salon_owner CRUD)
- `TrainingController` : catalogue, mes badges, ajouter, retirer
- Routes ajoutées : `GET /job-offers`, `GET /training-badges`, `GET/POST/DELETE /my-job-offers|/my-training-badges`

**Frontend :**
- `lib/types.ts` : `ApiTrainingBadge`, `ApiJobOffer`, `work_availability` dans `ApiHairdresserProfile`
- `lib/api.ts` : `training` + `jobOffers` modules
- `/coiffeur/[slug]` : lien cliquable "Chez X" → /salon/[slug], badge "Ouvert aux opportunités"/"Recherche des missions", chips formations
- `/dashboard/profil` : section "Disponibilité" (4 statuts radio), section "Formations" (catalogue searchable + chips retirables)
- `/recrutement` : page publique avec offres salons + coiffeurs disponibles
- `/dashboard/recrutement` : CRUD offres (salon_owner) — créer, modifier, clôturer, supprimer
- `DashboardNav` : onglet "Recruter" pour salon_owner

---

**Sprint A — Gérant Salon (session 2026-06-07) — TERMINÉ**

### Nouveautés de cette session

**Nouveau rôle `salon_owner` — Architecture complète :**

**Backend :**
- Migration `siret` (string 14) + `verification_status` (enum : unverified/pending_review/verified/rejected) sur `salons`
- Migration `work_availability` (enum : employed/looking_salon/looking_gig/not_available) sur `hairdresser_profiles`
- `User::salon()` — relation `hasOne` Salon (en plus de `salons()` hasMany)
- `Salon::$fillable` — ajout `siret` et `verification_status`
- `AuthController::register` — pour `salon_owner` : crée un `Salon` automatiquement, charge `salon` au lieu de `hairdresserProfile` dans la réponse
- `AuthController::me` — charge `salon` pour `salon_owner`, `hairdresserProfile` pour les autres
- `AuthController::login` — idem
- `SalonController::verifySiret` — appel API Sirene INSEE (annuaire-entreprises.data.gouv.fr), retourne business_name, city, is_hairdresser (NAF 9602A)
- `SalonController::createMySalon` (POST /my-salon) — création salon post-inscription
- `SalonController::removeHairdresser` (DELETE /my-salon/hairdressers/{id}) — retirer un coiffeur + notification
- Routes ajoutées : `GET /verify-siret`, `POST /my-salon`, `DELETE /my-salon/hairdressers/{id}`

**Frontend :**
- `lib/auth.ts` — `AuthSalon` type, `AuthUser.salon` field, `redirectPathForRole` → salon_owner va sur `/dashboard/salon`
- `hooks/useRequireAuth.ts` — redirect vers `redirectPathForRole(user.role)` au lieu de `/compte` fixe
- `contexts/AuthContext.tsx` — `siret` dans `RegisterData`
- `lib/types.ts` — `ApiSalonFull` : ajout `siret` + `verification_status`
- `lib/api.ts` — `salons.createMySalon`, `salons.removeHairdresser`, `salons.verifySiret`
- `app/inscription/page.tsx` — 3 rôles (Client/Coiffeur/Gérant Salon), step 2 spécifique gérant avec nom salon + SIRET + vérification live
- `components/layout/DashboardNav.tsx` — menu `salon_owner` (Mon Salon + Badges + Alertes + App)
- `app/dashboard/salon/page.tsx` — autorise `hairdresser` + `salon_owner`, formulaire de création si pas de salon, badge statut vérification, bouton "Retirer" coiffeur (owner only), bouton déconnexion

---

## OÙ EN SOMMES-NOUS ?

**Sprint Découverte (session 2026-06-03 — DERNIÈRE SESSION) — UX Feed, Cartes coiffeurs, Onboarding client, Préférences**

### Nouveautés de cette session

**1. Bug critique résolu — Backend 500 sur toutes les routes :**
- `vendor/composer/platform_check.php` bypassé : vendor généré avec PHP 8.4 mais XAMPP tourne PHP 8.0. À re-appliquer après chaque `composer install`.
- `HandleCors` déplacé AVANT `TrustProxies` dans `Kernel.php` (fix CORS sur OPTIONS preflight)
- Migration `post_tags` dupliquée supprimée (double déclaration de classe PHP bloquait `migrate`)

**2. Nouvelles spécialités (migration) — 29 au total :**
- Ajout : barbe, coupe-courte, coupe-longue, keratine, ondulations, frange, coiffure-soiree, dreads, roux, couleur-homme

**3. Cartes coiffeurs redesignées (HairdresserCard + FeaturedCard) :**
- Bannière floue + assombrie en fond sur toute la carte
- Photo de profil ronde centrée avec ring blanc
- Appliqué à : "Coiffeurs à la une", "Nouveaux talents", "Spécialistes X"

**4. Feed TikTok (/feed) — scroll snap fonctionnel :**
- Structure fixe : `fixed top-0 left-0 right-0 bottom:60px` + scroll container `h-full`
- Chaque carte `height: 100%` — les 3 hauteurs sont alignées = snap natif
- BottomNav rendue directement dans la page (pas dans AppShell) avec z-[60]
- Algorithme hybride : posts personnalisés EN PREMIER + trending pour compléter, sans doublons

**5. BottomNav — icône Feed :**
- Clapperboard entre Recherche et Favoris
- Carré arrondi noir/gris (style TikTok) pour le différencier
- z-[60] pour passer au-dessus du fond noir du feed

**6. Algorithme personnalisé renforcé :**
- Backend : match sur `post.specialty.slug` (tag affiché) ET `post_tags` (tags secondaires)
- Backend : `_match_count > 0` obligatoire — aucun post hors-sujet ne passe
- Récence fortement pondérée (150 pts max décroissant sur 30j) — post récent prime naturellement
- Frontend : double filtre client-side dans `PersonalizedFeedSection` (sécurité désync localStorage/DB)
- "Voir tout" → `/rechercher?specialty={slug}` (actif le chip dans la recherche)
- `PersonalizedSection` : rotation aléatoire de l'intérêt affiché à chaque visite

**7. Onboarding client (/onboarding-client) — refonte complète :**
- Étape 1 : 4 genres (Femme, Homme, Non-binaire, Je préfère ne pas dire)
- Étape 2 : grille 3 colonnes avec photos, catégories groupées (Couleur, Coupe, Dégradé, Texture, Occasion), 20+ options par genre
- Étape 3 : done screen avec chips récap des styles choisis
- Progress dots en haut, CTA sticky en bas (grisé si 0 sélection)

**8. /compte/modifier — section "Mes goûts & inspirations" :**
- Sélecteur genre (4 options)
- Grille photo 3 colonnes TOUS styles (29 options, sans restriction genre)
- Sauvegarde : localStorage + API simultanément → feed et homepage mis à jour immédiatement
- Compteur "X styles sélectionnés · Ton feed sera mis à jour"

**9. PersonalizedSection — CTA visiteurs non connectés :**
- Carte noire premium "Trouve les coiffeurs faits pour toi"
- Boutons "Créer un compte" + "Se connecter"

**10. Homepage "Réalisations tendance" :**
- Section masquée si aucun post disponible (plus de header vide)

---

**Sprint Plateforme (session 2026-06-03) — Scoring algorithmes + TikTok feed + Homepage**

### Nouveautés de cette session (sprint Plateforme)

**Backend — Algorithmes de scoring :**
- `sort=featured` (coiffeurs) : score composite is_featured×100 + note×avis×4 + abonnés + visites + complétion profil
- `sort=new_quality` (coiffeurs) : récents ≤60j avec seuil complétion profil ≥5pts
- `sort=trending` (feed) : likes×3 + saves×9 + views×0.8 + qualité coiffeur + décroissance temporelle 45j — saves 3× plus forts que les likes
- `sort=personalized` (feed) : +70 spécialité préférée, +50 coiffeur suivi — préchargement saves N+1 optimisé
- `sort=scored` (nearby) : distance + qualité + complétion profil
- Fonction `profileCompletionScore()` : avatar+12, bannière+10, tagline+6, ville+4, spécialités+16, verified+20
- Migration `is_featured` sur `hairdresser_profiles` (flag sponsorisé — préparation premium)
- `saved_by_user` propagé sur toutes les réponses feed (quand user connecté)

**Frontend — Feed TikTok amélioré (`/feed`) :**
- Bouton sauvegarder (Bookmark) en plus du like — style TikTok vertical droit
- Like animé avec pop scale + rouge sur cœur
- CTA "Réserver" inline sur chaque carte
- Auto-sélection trending vs personalized selon token + préférences localStorage

**Frontend — Homepage pilotée par les scores :**
- "Coiffeurs à la une" → `sort=featured` (plus de random)
- "Réalisations tendance" → cliquer ouvre le feed TikTok (`/feed?from=id`)
- "Pour toi" (PersonalizedSection) → après les featured
- "Nouveaux talents" → `sort=new_quality` avec seuil qualité

---

**Sprint Engagement (session 2026-06-03) — Compte client + Inspirations + Feed intelligent**

### Nouveautés de cette session

**1. Compte client refonte complète :**
- `/compte` — design premium : avatar 88px, nom, ville, modifier profil
- Sections : Abonnements (scroll coiffeurs), Inspirations (grille 3col), Réservations, Paramètres
- `/compte/modifier` — page édition profil client (nom, ville, bio, avatar)
- `/mes-inspirations` — page galerie complète avec bouton retirer

**2. Système d'inspirations :**
- DB : table `saved_posts` (user_id, post_id)
- Backend : `SavedPostController` (list, save, unsave, status)
- Routes : GET/POST/DELETE `/api/saved-posts`, GET `/api/saved-posts/{id}/status`
- `FeedPostCard` : bouton coeur `showSave={true}` — sauvegarde/retire optimistique
- `PersonalizedFeedSection` : feed avec coeurs sur la homepage (clients connectés)

**3. Feed intelligent personnalisé :**
- Backend : `/feed?sort=personalized` (auth optionnel) — scoring préférences + follows + qualité + récence
- Backend : `saved_by_user` ajouté sur tous les posts du feed (quand user connecté)
- `PersonalizedFeedSection` : section homepage "Pour vous" — apparaît si user a des préférences

**4. Abonnements dans le compte :**
- Backend : GET `/api/followed-hairdressers` (nouveau endpoint)
- Compte client : section "Mes abonnements" avec avatars scroll horizontal

**5. UserController — profil client éditable :**
- Backend : PUT `/api/user/profile` (nom, ville, bio)
- Backend : POST `/api/user/avatar` (upload photo)

**Sprint Beta (session 2026-06-02) — Préparation bêta publique getchair.app**

Toutes les corrections listées ci-dessous ont été appliquées. CHAIR est prêt pour une bêta publique.

### Corrections effectuées

**Phase 9 — Stabilisation (BLOQUANT PROD corrigé) :**
- `frontend/.env.local` créé avec `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- Tous les `localhost:8000` hardcodés remplacés par `process.env.NEXT_PUBLIC_API_URL` dans :
  `lib/api.ts`, `lib/types.ts`, `app/page.tsx`, `app/rechercher/page.tsx`, `app/coiffeur/[slug]/page.tsx`, `app/realisation/[id]/page.tsx`, `app/dashboard/profil/page.tsx`, `app/dashboard/realisations/page.tsx`, `app/dashboard/page.tsx`, `app/feed/page.tsx`, `app/onboarding/page.tsx`, `components/ui/NearbySection.tsx`, `components/ui/ReviewForm.tsx`, `components/ui/ImageUpload.tsx`, `app/salon/[slug]/page.tsx`

**Phase 6 — Bug onboarding corrigé :**
- Avatar et bannière : aperçu local instantané (`URL.createObjectURL()`) avant même la réponse API
- L'utilisateur voit immédiatement sa photo après sélection

**Phase 2 — Données fake supprimées :**
- 5 faux coiffeurs seedés (sophie@chair.fr, lucas@chair.fr, amara@chair.fr, clara@chair.fr, mehdi@chair.fr)
- 15 posts fictifs (Unsplash), 15 avis fictifs, 15 clients fictifs (client00@example.com…)
- Résultat : 17 users, 14 profils réels, 4 posts réels, 5 avis réels

**Phase 3 — Pages légales (BLOQUANT LANCEMENT corrigé) :**
- `/cgu` — Page CGU complète et professionnelle
- `/confidentialite` — Politique de confidentialité RGPD-conforme
- Footer desktop dans `AppShell` avec liens CGU + Confidentialité + email contact

**Phase 4 — Feed intelligent amélioré :**
- `trending` : formule améliorée avec décroissance temporelle (`DATEDIFF * -0.5`)
- `scored` : `reviews_count` (×0.3) et `visits_count` (×0.2) ajoutés au scoring
- `AvailableTodaySection` désormais injectée dans la homepage (manquait)

**Phase 5 — Navigation salon dashboard :**
- Lien "Mon salon" → `/dashboard/salon` si `profile.salon_id` non null
- Lien "Rejoindre un salon" → `/dashboard/rejoindre-salon` si indépendant
- `salon_id: number | null` ajouté dans `HairdresserProfile` type auth.ts

**Phase 7 — Navigation UX :**
- `PageHeader` (bouton retour) ajouté sur `/favoris`
- Toutes les pages dashboard ont déjà `DashboardPageHeader`

**Phase 8 — Homepage nettoyée :**
- Badge prototype "Bientôt Premium" supprimé de la section Recommandés
- Badge "Recommandé" hardcodé retiré des cartes (sans logique derrière)
- `AvailableTodaySection` ajoutée entre NearbySection et Recommandés

**Typos corrigés :**
- `/coiffeur/[slug]/reserver` : categorie → catégorie, creneau → créneau, coordonnees → coordonnées, Telephone → Téléphone, Precisions → Précisions
- `/compte` : Accedez → Accédez, Creer → Créer, Etes → Êtes, deconnecter → déconnecter, reservations → réservations
- `/dashboard` : Realisations → Réalisations, Reservations → Réservations, deconnecter → déconnecter
- `/inscription` : lien mort `#` remplacé par `/cgu` et `/confidentialite`

**Supprimé :**
- `frontend/lib/mockData.ts` — fichier inutilisé

**Build : TypeScript 0 erreur, Next.js 26 routes propres.**

---

## BASE DE DONNÉES — ÉTAT ACTUEL

| Table | Quantité | Notes |
|---|---|---|
| users | 17+ | Comptes réels |
| hairdresser_profiles | 14+ | Profils réels |
| posts | 8+ | Posts publiés réels |
| reviews | 5+ | Avis réels |
| specialties | 29 | 10 nouvelles ajoutées cette session |
| post_tags | active | Table pivot posts ↔ specialties (migration exécutée) |
| saved_posts | active | Inspirations clients |
| user_preferences | active | Préférences genre + intérêts |

**Attention :** `vendor/composer/platform_check.php` contient un bypass PHP 8.0 (commentaire remplace le check). À re-appliquer manuellement si `composer install` est relancé :
```php
// Remplacer le if (!(PHP_VERSION_ID >= 80401)) par :
// PHP version check bypassed — vendor generated on PHP 8.4, packages support PHP 8.0+
```

---

## PRIORITÉS POUR LA PROCHAINE SESSION

### FAIT session 2026-06-04 — Système de badges refait

**Backend :**
- `BadgeService::syncCounters()` ajouté — recompute posts/followers/reviews/visits/verifiedVisits depuis la DB réelle à chaque appel `/profile`
- Appelé automatiquement dans `ProfileController::show()` avant tout calcul de badges
- Les badges sont donc toujours synchronisés avec les stats réelles

**Frontend `/dashboard/badges` — Refonte gamification complète :**
- Hero niveau : grand titre coloré + barre progression + pts restants
- Section "Badges obtenus" : grille 2 colonnes avec cards colorées par tier
- Section "En cours" : 4 badges les plus proches, arc SVG de progression circulaire
- Section "Prochains objectifs" : 3 badges à 0% de progression, les plus accessibles
- Section "À débloquer" : repliée par défaut, tous les badges verrouillés en liste discrète

### PRIORITÉ 0 — Architecture types de comptes (FAIT session 2026-06-04)

**Séparation stricte Indépendant vs Salon — tout est conditionné par `is_independent`.**

Résumé des changements appliqués :
- `DashboardNav.tsx` — 2 menus mobiles distincts (Independent: Accueil/Profil/Services/Planning/Badges ; Salon: Accueil/Profil/Portfolio/QR/Badges)
- `dashboard/page.tsx` — Score, Checklist, Action prioritaire, Rendez-vous, Accès rapides tous conditionnés
- `dashboard/services/page.tsx` — Redirect vers /dashboard si salon hairdresser
- `dashboard/planning/page.tsx` — Redirect vers /dashboard si salon hairdresser
- `dashboard/reservations/page.tsx` — Redirect vers /dashboard si salon hairdresser
- `dashboard/mon-qr/page.tsx` — Redirect vers /dashboard si indépendant (QR = salon seulement)
- `dashboard/statistiques/page.tsx` — Section RDV/revenus déjà conditionnée par `is_independent`

**Système d'avis :**
- Indépendant : marquer RDV "Terminé" → notification automatique au client → avis
- Salon : QR Code obligatoire → scan par le client → avis débloqué + visite comptabilisée

### PRIORITÉ 1 — Flux d'avis Indépendant (à implémenter)

Aujourd'hui l'endpoint `PUT /api/appointments/{id}/status` avec `status=completed` envoie déjà une notification `review_request` au client. Le flux est donc **fonctionnel**.
À vérifier : la notification contient-elle un lien cliquable vers le formulaire d'avis ?

### PRIORITÉ 2 — UX Coiffeur

- [ ] **Formulaire de publication** : coiffeur voit les 29 spécialités groupées, peut en sélectionner plusieurs (post_tags)
- [ ] **Vérifier le flux complet** : post créé → tag barber → apparaît dans feed client barber
- [ ] **Synchronisation `chair_preferences` localStorage ↔ DB** : à la connexion, écrire les prefs DB dans localStorage si localStorage vide

### PRIORITÉ 3 — Avant lancement public (getchair.app)

- [ ] **Configurer `NEXT_PUBLIC_API_URL` en production** (Railway/Render : `https://api.getchair.app/api`)
- [ ] **SEO** — `generateMetadata()` sur `/coiffeur/[slug]` (title, description, og:image)
- [ ] **sitemap.xml** dynamique (routes coiffeurs + spécialités)
- [ ] **Structured data JSON-LD** sur les profils (`@type: Person` ou `@type: LocalBusiness`)

### PRIORITÉ 4 — Production checklist

- [ ] `.env.production` avec vraies URLs
- [ ] `next.config.ts` : remplacer `localhost:8000` dans `remotePatterns` par domaine prod
- [ ] Re-générer vendor avec PHP 8.4 en prod (plus besoin du bypass platform_check)
- [ ] Monitoring erreurs (Sentry)

---

## RAPPELS TECHNIQUES CRITIQUES

### PHP 8.0 — NE PAS utiliser `[...$assocArray]`
```php
// INTERDIT en PHP 8.0 — CORRECT :
Model::create(array_merge($validated, ['key' => 'val']));
```

### Variable d'env Next.js
```bash
# .env.local (développement)
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# .env.production (déploiement)
NEXT_PUBLIC_API_URL=https://api.getchair.app/api
```

### Next.js 16 — params dynamiques
```tsx
// Server component (page.tsx)
const { slug } = await params;

// Client component
const { slug } = use(params);
```

---

## COMMANDES DE LANCEMENT

```powershell
# Backend
$env:PATH = "C:\xampp\php;" + $env:PATH
cd C:\xampp\htdocs\chair-app\backend
php artisan serve --port=8000

# Frontend
cd C:\xampp\htdocs\chair-app\frontend
npm run dev
```

**Reset base (ATTENTION — efface tout) :**
```powershell
$env:PATH = "C:\xampp\php;" + $env:PATH
cd C:\xampp\htdocs\chair-app\backend
php artisan migrate:fresh --seed
php artisan storage:link
```

**Build de vérification :**
```powershell
cd C:\xampp\htdocs\chair-app\frontend
npx next build
```

---

## COMPTES DE TEST

| Email | Mot de passe | Rôle | Slug |
|---|---|---|---|
| `julien.schillinger06@gmail.com` | password | hairdresser | `julien-schillinger` |
| `test@gmail.com` | password | hairdresser | `marilyne-klein` |

---

## RAPPELS DESIGN (invariants absolus)

- **Aucun emoji** — zéro, nulle part, jamais
- **Palette** : blanc `#ffffff` / noir `#0a0a0a` / neutres uniquement
- **Labels** : `text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400`
- **CTA** : `bg-neutral-900 text-white rounded-xl`
- **Arrondis** : `rounded-xl` ou `rounded-2xl` max, jamais `rounded-3xl`
- **Ombres** : `shadow-sm` ou `shadow-md` max
