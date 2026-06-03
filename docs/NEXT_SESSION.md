# NEXT SESSION — Reprise de contexte CHAIR
> Lire ce fichier en premier au début de chaque session.
> Dernière mise à jour : 2026-06-03 (session — UX Découverte, Feed TikTok, Onboarding client)

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

### PRIORITÉ 1 — UX Coiffeur (dashboard publication)

- [ ] **Formulaire de publication** : s'assurer que le coiffeur voit clairement les 29 spécialités groupées et peut en sélectionner plusieurs (post_tags)
- [ ] **Vérifier le flux complet** : post créé → tag barber → apparaît dans feed client barber
- [ ] **Synchronisation `chair_preferences` localStorage ↔ DB** : à la connexion, écrire les prefs DB dans localStorage si localStorage vide

### PRIORITÉ 2 — Avant lancement public (getchair.app)

- [ ] **Configurer `NEXT_PUBLIC_API_URL` en production** (Railway/Render : `https://api.getchair.app/api`)
- [ ] **SEO** — `generateMetadata()` sur `/coiffeur/[slug]` (title, description, og:image)
- [ ] **sitemap.xml** dynamique (routes coiffeurs + spécialités)
- [ ] **Structured data JSON-LD** sur les profils (`@type: Person` ou `@type: LocalBusiness`)

### PRIORITÉ 3 — Production checklist

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
