# NEXT SESSION — Reprise de contexte CHAIR
> Lire ce fichier en premier au début de chaque session.
> Dernière mise à jour : 2026-05-31 (session Sprints E→H — Profil, Réalisation, Recherche, Réservation V1)

---

## OÙ EN SOMMES-NOUS ?

CHAIR est dans un état **stable, cohérent, visuellement premium et fonctionnellement complet pour une V1**. Le parcours coiffeur est bouclé de bout en bout :

- Inscription multi-step (type salon / indépendant)
- Profil public premium avec CTA dynamique selon le type
- Demande de RDV (indépendants) ou lien externe (salons)
- Dashboard de gestion des réservations avec statuts
- Avis certifiés débloqués après RDV terminé (via token)
- Statistiques dashboard

Ce qui manque avant un vrai lancement : variable d'environnement API, pages légales, SEO, onboarding coiffeur post-inscription.

---

## CE QUI FONCTIONNE (état complet au 2026-05-31)

### Flux coiffeur complet
- Inscription : step 1 (identité) → step 2 coiffeur (type : indépendant ou salon + champs adaptés)
- Si salon : création automatique d'un enregistrement `Salon` avec nom/ville/booking_url/instagram
- `HairdresserProfile` créé automatiquement à l'inscription
- Upload avatar → propagation immédiate TopNav + `/compte` + sidebar dashboard
- Upload bannière → affichée sur le profil public
- CRUD réalisations avec images (upload avant/après, liste, modification, suppression)
- Images servies via symlink Laravel : `http://localhost:8000/storage/...`
- Dashboard : stats réelles, réalisations récentes, onboarding si profil incomplet
- Dashboard navigation mobile : Accueil / Profil / Portfolio / RDV / Stats / Aperçu
- Édition profil : bio, tagline, ville, instagram, booking_url (pour coiffeurs salon), années d'expérience, spécialités
- Gestion des réservations : confirmer / refuser / terminer / annuler
- Lien d'avis copiable depuis le dashboard après un RDV terminé
- Statistiques : abonnés, favoris, réalisations, note, RDVs en attente / confirmés / terminés

### Flux client complet
- Inscription / Connexion / Déconnexion
- Recherche coiffeurs : pills spécialités toujours visibles + filtres ville + note minimum
- Profil public coiffeur :
  - CTA dynamique (demander RDV / réserver au salon / indisponible)
  - Portfolio grille 3 colonnes cliquable → page détail réalisation
  - Avis certifiés avec badge "Certifié"
  - Badges de confiance : profil vérifié, expérience, portfolio actif
- Favoris : liste + retrait + avatars corrects
- Suivre / Sauvegarder un coiffeur (optimistic update)
- Formulaire de demande de RDV : nom, email, téléphone, service (suggestions), date, créneau, message
- Laisser un avis vérifié via lien token `/avis/{token}` après RDV terminé

### Pages actives
| Route | Description |
|---|---|
| `/` | Hero plein écran + tuiles spécialités + feed + coiffeurs + CTA visiteurs uniquement |
| `/rechercher` | Pills spécialités + filtres ville/note + empty state contextuel |
| `/coiffeur/[slug]` | Profil premium : bannière, avatar, statut salon, CTA, stats, badges, portfolio |
| `/coiffeur/[slug]/reserver` | Formulaire demande de RDV (indépendants) |
| `/realisation/[id]` | Détail réalisation : image, avant/après, infos, likes, nav prev/next, thumbnails |
| `/avis/[token]` | Formulaire avis certifié via token |
| `/dashboard` | Stats + onboarding + réalisations récentes |
| `/dashboard/profil` | Édition complète + upload avatar/bannière |
| `/dashboard/realisations` | CRUD réalisations avec images |
| `/dashboard/reservations` | Gestion RDVs (tabs En cours / Historique, actions, lien avis) |
| `/dashboard/statistiques` | Stats profil + stats RDVs |
| `/inscription` | Multi-step : identité → type coiffeur + infos adaptées |
| `/connexion` | Auth Sanctum |
| `/compte` | Profil connecté + avatar |
| `/favoris` | Profils sauvegardés |
| `/not-found` | 404 CHAIR |

### Infrastructure
- TypeScript 0 erreur sur tout le projet
- Build Next.js 16 propre (16 routes)
- API Laravel 8 : 20+ endpoints fonctionnels
- `resolveMediaUrl()` utilisé dans tous les composants image
- Avis certifiés : `is_verified = true` + `appointment_id` sur `reviews`

---

## PRIORITÉS POUR LA PROCHAINE SESSION

### PRIORITÉ 1 — Variable d'environnement API (BLOQUANT PROD)
`http://localhost:8000` est hardcodé dans 8+ fichiers frontend.
- [ ] Créer `frontend/.env.local` avec `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] Remplacer dans : `lib/api.ts`, `lib/types.ts`, `app/page.tsx`, `app/rechercher/page.tsx`, `app/dashboard/page.tsx`, `app/dashboard/realisations/page.tsx`, `app/coiffeur/[slug]/reserver/page.tsx`, `components/ui/ImageUpload.tsx`

### PRIORITÉ 2 — Légal (BLOQUANT lancement réel)
- [ ] Page `/cgu` — Conditions Générales d'Utilisation (modèle RGPD)
- [ ] Page `/confidentialite` — Politique de confidentialité
- [ ] Footer dans `AppShell` avec liens légaux (CGU, Confidentialité, Contact)
- [ ] Remplacer `href="#"` dans `/inscription` (lien CGU)

### PRIORITÉ 3 — SEO
- [ ] `generateMetadata()` sur `/coiffeur/[slug]` (title, description, og:image)
- [ ] `generateMetadata()` sur `/rechercher`
- [ ] `sitemap.xml` dynamique (coiffeurs + pages statiques)
- [ ] Structured data JSON-LD sur profils coiffeurs

### PRIORITÉ 4 — Onboarding post-inscription coiffeur
- [ ] Après inscription coiffeur : redirect vers `/dashboard/profil?onboarding=1` (actuellement `/dashboard`)
- [ ] Modifier `lib/auth.ts` : `redirectPathForRole('hairdresser')` → `/dashboard/profil`
- [ ] Dans `/dashboard/profil` : si `?onboarding=1`, afficher message de bienvenue et guider

### PRIORITÉ 5 — Page salon
- [ ] `/salon/[slug]` — page publique d'un salon avec ses coiffeurs
- [ ] Lister les coiffeurs liés via `salon_id`
- [ ] Lien depuis le profil coiffeur vers la page du salon

### PRIORITÉ 6 — Notifications
- [ ] Notifier le coiffeur quand une nouvelle demande de RDV arrive
- [ ] Notifier le client quand son RDV est confirmé / refusé
- [ ] Table `notifications` déjà en base, à relier

---

## ROUTES API COMPLÈTES

**Base URL :** `http://localhost:8000/api`

### Publiques (pas de token)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/register` | Inscription — crée `HairdresserProfile` (+ `Salon` si type salon) |
| POST | `/login` | Connexion → token + user + hairdresser_profile |
| GET | `/feed` | Feed posts paginé (inclut `hairdresser.user`) |
| GET | `/hairdressers` | Liste coiffeurs (`?city=&specialty=`) |
| GET | `/hairdressers/{slug}` | Profil complet + avis + spécialités + salon + booking_url |
| GET | `/hairdressers/{slug}/posts` | Posts publiés du coiffeur |
| GET | `/posts/{id}` | Post unique (pour page détail réalisation) |
| GET | `/specialties` | 12 spécialités actives |
| POST | `/appointments` | Créer une demande de RDV (client connecté ou guest) |
| POST | `/review-by-token/{token}` | Soumettre un avis certifié via token |

### Protégées (Bearer token requis)
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/logout` | Révocation token |
| GET | `/me` | User connecté + hairdresser_profile |
| GET | `/profile` | Profil éditable — auto-crée si absent |
| PUT | `/profile` | Mise à jour bio/tagline/ville/instagram/booking_url/specialties |
| POST | `/profile/avatar` | Upload avatar (multipart, champ `avatar`) |
| POST | `/profile/banner` | Upload bannière (multipart, champ `banner`) |
| GET | `/posts` | Réalisations du coiffeur connecté |
| POST | `/posts` | Créer réalisation (`after_image` obligatoire, `before_image` optionnel) |
| PUT | `/posts/{id}` | Modifier description/spécialité/durée/prix |
| DELETE | `/posts/{id}` | Supprimer réalisation + fichiers |
| GET | `/appointments` | Liste des RDVs du coiffeur connecté |
| PUT | `/appointments/{id}/status` | Changer statut (confirmed/declined/completed/cancelled) |
| GET | `/stats` | Stats agrégées du coiffeur (profil + RDVs) |
| GET | `/interactions/{id}` | Status suivre + sauvegarder pour un profil |
| POST | `/follows/{id}` | Suivre un coiffeur |
| DELETE | `/follows/{id}` | Ne plus suivre |
| POST | `/saved-profiles/{id}` | Sauvegarder un profil |
| DELETE | `/saved-profiles/{id}` | Retirer des favoris |
| GET | `/saved-profiles` | Liste des profils sauvegardés |

---

## STRUCTURE DES FICHIERS CLÉS

```
backend/app/Http/Controllers/Api/
├── AuthController.php         ← register (multi-step coiffeur, crée Salon si besoin) + login + logout + me
├── HairdresserController.php  ← index, show, posts, feed
├── ProfileController.php      ← show (auto-crée), update (+ booking_url), uploadAvatar, uploadBanner
├── PostController.php         ← index, show (public), store, update, destroy
├── AppointmentController.php  ← store (public), index, updateStatus, reviewByToken, stats
├── ReviewController.php       ← store (OBSOLÈTE — avis libres remplacés par reviewByToken)
├── InteractionController.php  ← follow/unfollow, save/unsave, status, savedIndex
└── SpecialtyController.php    ← index

backend/app/Models/
├── User.php
├── HairdresserProfile.php     ← $fillable inclut booking_url
├── Salon.php
├── Appointment.php            ← NOUVEAU — statuts, review_token, relations
├── Post.php
├── PostImage.php
├── Review.php                 ← $fillable inclut appointment_id + is_verified
├── Specialty.php

backend/database/migrations/   ← 18 fichiers dont 3 nouveaux (booking_url, appointments, appointment_id)

frontend/app/
├── page.tsx                              ← Accueil : hero + spécialités + feed + CTA visiteurs
├── loading.tsx                           ← Skeleton hero dark
├── error.tsx                             ← Page erreur globale
├── not-found.tsx                         ← Page 404 CHAIR
├── rechercher/page.tsx                   ← Pills spécialités + filtres ville/note + empty state
├── favoris/page.tsx
├── compte/page.tsx
├── connexion/page.tsx
├── inscription/page.tsx                  ← Multi-step : identité → type coiffeur (salon/indépendant)
├── coiffeur/[slug]/page.tsx              ← Profil premium + CTA dynamique + portfolio 3-col
├── coiffeur/[slug]/loading.tsx
├── coiffeur/[slug]/reserver/page.tsx     ← NOUVEAU — Formulaire demande de RDV
├── realisation/[id]/page.tsx             ← NOUVEAU — Détail réalisation (image, infos, nav)
├── realisation/[id]/loading.tsx
├── avis/[token]/page.tsx                 ← NOUVEAU — Formulaire avis certifié
└── dashboard/
    ├── page.tsx                          ← Stats + onboarding + réalisations récentes
    ├── profil/page.tsx                   ← Édition complète + booking_url
    ├── realisations/page.tsx             ← CRUD complet
    ├── reservations/page.tsx             ← NOUVEAU — Gestion RDVs
    └── statistiques/page.tsx             ← NOUVEAU — Stats profil + RDVs

frontend/components/
├── layout/
│   ├── AppShell.tsx         ← noPaddingTop pour hero homepage
│   ├── TopNav.tsx           ← Transparent scroll-aware sur /, auth-aware
│   ├── BottomNav.tsx        ← Auth-aware, icône Dashboard coiffeurs
│   └── DashboardNav.tsx     ← 6 onglets : Accueil/Profil/Portfolio/RDV/Stats + Aperçu
└── ui/
    ├── HairdresserCard.tsx  ← Portrait 3:4, fallback avatar/initiale sur fond sombre
    ├── PostCard.tsx         ← Avant/après ou image seule, prop hairdresser optionnelle
    ├── FeedPostCard.tsx     ← Carte compacte homepage image-only + overlay
    ├── HeroSearch.tsx       ← Barre de recherche hero → /rechercher?q=
    ├── HomeCTABlock.tsx     ← NOUVEAU — Bloc CTA visiteurs (masqué si connecté)
    ├── StarRating.tsx       ← Étoiles SVG
    ├── ProfileActions.tsx   ← Suivre/Sauvegarder ou "Modifier mon profil"
    ├── ImageUpload.tsx      ← Upload avatar ou bannière vers l'API
    └── ReviewsSection.tsx   ← Liste avis + badge Certifié + notice avis certifiés

frontend/lib/
├── api.ts      ← HTTP client + interactions helpers + appointments helpers
├── auth.ts     ← Types AuthUser, HairdresserProfile, localStorage, redirect par rôle
└── types.ts    ← Types API (+ ApiAppointment, ApiStats, booking_url) + helpers

frontend/contexts/
└── AuthContext.tsx  ← AuthProvider + useAuth + updateUser() — RegisterData étendu

frontend/hooks/
└── useRequireAuth.ts  ← Protection des routes, redirect si non connecté ou mauvais rôle
```

---

## COMMANDES DE LANCEMENT

```powershell
# Terminal 1 — Backend (XAMPP Apache + MySQL doivent être démarrés)
$env:PATH = "C:\xampp\php;" + $env:PATH
cd C:\xampp\htdocs\chair-app\backend
php artisan serve --port=8000

# Terminal 2 — Frontend
cd C:\xampp\htdocs\chair-app\frontend
npm run dev
```

**Reset complet de la base :**
```powershell
$env:PATH = "C:\xampp\php;" + $env:PATH
cd C:\xampp\htdocs\chair-app\backend
php artisan migrate:fresh --seed
php artisan storage:link
```

**Vérification TypeScript :**
```powershell
cd C:\xampp\htdocs\chair-app\frontend
npx tsc --noEmit
```

**Build de vérification :**
```powershell
cd C:\xampp\htdocs\chair-app\frontend
npx next build
```

---

## COMPTES DE TEST

| Email | Mot de passe | Rôle | Slug | Ville |
|---|---|---|---|---|
| `sophie@chair.fr` | `password` | hairdresser | `sophie-martin` | Strasbourg |
| `lucas@chair.fr` | `password` | hairdresser | `lucas-bernard` | Strasbourg |
| `amara@chair.fr` | `password` | hairdresser | `amara-diallo` | Paris |
| `clara@chair.fr` | `password` | hairdresser | `clara-petit` | Lyon |
| `mehdi@chair.fr` | `password` | hairdresser | `mehdi-razzouk` | Colmar |
| `client11@example.com` | `password` | client | — | — |
| `julien.schillinger06@gmail.com` | (perso) | hairdresser | `julien-coiffeur` | — |

**Scénario de test V1 complet :**
1. Créer compte coiffeur indépendant → profil créé automatiquement
2. Voir "Demander un rendez-vous" sur `/coiffeur/{slug}`
3. En tant que client : remplir le formulaire `/coiffeur/{slug}/reserver`
4. En tant que coiffeur : voir la demande dans `/dashboard/reservations`
5. Confirmer → marquer terminé → token généré
6. Copier le lien d'avis → ouvrir `/avis/{token}`
7. Soumettre l'avis → visible sur le profil avec badge "Certifié"

---

## RAPPELS DESIGN (invariants absolus)

- **Aucun emoji** — zéro, nulle part, jamais
- **Palette** : blanc `#ffffff` / noir `#0a0a0a` / neutres uniquement — aucune couleur vive
- **Labels de section** : `text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400`
- **Texte sur image** : toujours protégé par `bg-gradient-to-t from-black/70` ou similaire
- **Arrondis** : `rounded-xl` ou `rounded-2xl` — jamais `rounded-3xl`
- **Ombres** : `shadow-sm` ou `shadow-md` max
- **Typographie hero** : `font-bold` + `font-light italic` en mélange
- **Grille feed** : 2 colonnes mobile, 3 colonnes desktop
- **CTA principal** : `bg-neutral-900 text-white rounded-xl` — pas de couleur vive

## RAPPELS TECHNIQUES

- **Images locales** : URLs `/storage/xxx` → utiliser `resolveMediaUrl()` de `lib/types.ts`
- **`localhost:8000`** dans `next.config.ts` → `remotePatterns` (ne pas supprimer)
- **Auth** : token dans `localStorage['chair_token']`, user dans `localStorage['chair_user']`
- **`updateUser()`** dans AuthContext → met à jour état + localStorage sans refetch
- **Server Components** : pages publiques fetchent directement via `fetch()` sans `'use client'`
- **Next.js 16** : params dynamiques = Promise → toujours `const { slug } = await params`
- **`useSearchParams()`** nécessite un `<Suspense>` wrapper dans les pages Client Components
- **`AppShell`** accepte `noPaddingTop` pour la homepage
- **`TopNav`** : transparent sur `/` quand scroll < 60px, blanc au-delà
- **`doctrine/dbal`** incompatible PHP 8.0 + Laravel 8 → utiliser `DB::statement()` pour les ALTER TABLE
- **Avis** : le formulaire libre (`ReviewForm.tsx`) est désactivé sur le profil public — les avis passent par `/review-by-token/{token}` uniquement
- **Appointments** : `is_independent` du profil détermine si le coiffeur voit les RDVs dans le dashboard
- **`DashboardNav`** : 6 onglets fixes + Aperçu — intégré dans toutes les pages dashboard
