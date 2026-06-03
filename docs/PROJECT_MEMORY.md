# CHAIR — Project Memory
> Source de vérité du projet. À relire au début de chaque session.  
> Dernière mise à jour : 2026-06-03 (session — UX Découverte, Feed TikTok, Onboarding client, Préférences)

---

## TABLE DES MATIÈRES

1. [Vision & Positionnement](#1-vision--positionnement)
2. [Utilisateurs](#2-utilisateurs)
3. [ADN Produit](#3-adn-produit)
4. [Business Model](#4-business-model)
5. [Analyse Concurrentielle](#5-analyse-concurrentielle)
6. [Avantage Concurrentiel](#6-avantage-concurrentiel)
7. [Stack Technique](#7-stack-technique)
8. [Architecture](#8-architecture)
9. [Base de Données](#9-base-de-données)
10. [API Backend](#10-api-backend)
11. [Frontend — Pages](#11-frontend--pages)
12. [Frontend — Composants](#12-frontend--composants)
13. [État du Développement](#13-état-du-développement)
14. [Direction UX/UI](#14-direction-uxui)
15. [Données de Test](#15-données-de-test)
16. [Conventions de Développement](#16-conventions-de-développement)
17. [Problèmes Connus](#17-problèmes-connus)
18. [Backlog Fonctionnel](#18-backlog-fonctionnel)
19. [Roadmap 3 Ans](#19-roadmap-3-ans)
20. [Commandes de Lancement](#20-commandes-de-lancement)

---

## 1. VISION & POSITIONNEMENT

### Nom
**CHAIR** — Référence au fauteuil du coiffeur, centre du métier. Évoque aussi la future marketplace de location de fauteuils.

### Problème résolu
Les clients choisissent un salon alors que la qualité dépend du coiffeur. Aucune plateforme ne permet aux coiffeurs de construire une réputation individuelle portable. Les coiffeurs dépendent d'Instagram (algorithme instable, pas professionnel) et de leur salon (réputation non transférable).

### Vision
Créer la plateforme incontournable de la coiffure en France — pas un agenda, pas un réseau social généraliste, mais un **écosystème complet** dédié aux professionnels.

**Objectif fondateur :** Faire en sorte qu'un client choisisse un coiffeur *avant* de choisir un salon.

### Positionnement
```
Instagram + LinkedIn + Planity + Airbnb
= adapté exclusivement au monde de la coiffure
```

### Ce que CHAIR n'est PAS
- Pas un logiciel de caisse
- Pas un agenda simple
- Pas un réseau social généraliste
- Pas un clone de Planity

### Le cœur du produit
1. **Visibilité** — le coiffeur existe en dehors de son salon
2. **Réputation** — avis certifiés, portfolio structuré, capital accumulé
3. **Découverte** — feed photographique, recherche par technique et ville
4. La réservation est **secondaire** (V2)

---

## 2. UTILISATEURS

### Client
- Crée un compte
- Suit des coiffeurs
- Recherche par spécialité / ville / note
- Sauvegarde des profils
- Consulte des portfolios et avis
- (V2) Réserve des rendez-vous

### Coiffeur Salarié
- Profil individuel appartenant au coiffeur (pas au salon)
- Portfolio de réalisations
- Abonnés et avis
- Associé à un salon sans en dépendre
- Le profil est portable si changement de salon

### Coiffeur Indépendant
- Même profil que salarié
- (V2) Prestations, tarifs, disponibilités, réservation en ligne, agenda

### Patron de Salon
- Page établissement
- Associe plusieurs coiffeurs
- Met en avant son équipe
- (V2) Publie des fauteuils à louer (CHAIR Rent)

### Admin (interne)
- Gestion de la plateforme
- Modération, vérification des profils

---

## 3. ADN PRODUIT

### Le Feed
- Fonctionne comme TikTok / Instagram
- Photos de réalisations, avant/après, transformations
- Favorise la découverte organique
- Chronologique en V1, algorithmique en V2

### Les Publications
- Photo prioritaire (vidéo en V2)
- Peut contenir : photo avant, photo après, photos résultat
- Métadonnées : spécialité, durée, prix indicatif, description

### Les Avis
- Fondamentaux pour la réputation
- En V1 : libres (vérifiés manuellement)
- En V2 : uniquement après RDV confirmé (code QR ou lien réservation)
- Deviennent un actif précieux et non transférable pour le coiffeur

### Les Abonnés
- Mécanisme de rétention clé
- Plus un coiffeur accumule abonnés + avis + réalisations, plus il est lié positivement à la plateforme

### Le Moteur de Recherche
- Recherche par : ville, spécialité, distance, prix, note
- Exemples de requêtes cibles : "Balayage Strasbourg", "Barber Paris", "Boucles Lyon"

### Les Spécialités (29 en base)
| Spécialité | Catégorie |
|---|---|
| Balayage | Couleur |
| Blond | Couleur |
| Coloration | Couleur |
| Ombré Hair | Couleur |
| Hair Contouring | Couleur |
| Tie & Dye | Couleur |
| Roux | Couleur |
| Couleur Homme | Couleur |
| Coupe Femme | Coupe |
| Coupe Homme | Coupe |
| Coupe Courte | Coupe |
| Coupe Longue | Coupe |
| Frange | Coupe |
| Barber | Coupe |
| Dégradé | Coupe |
| Taper | Coupe |
| Fade | Coupe |
| Buzz Cut | Coupe |
| Boucles | Texture |
| Extensions | Texture |
| Lissage | Texture |
| Kératine | Texture |
| Ondulations | Texture |
| Dreads & Locks | Style |
| Barbe | Homme |
| Braid | Style |
| Chignon | Occasion |
| Mariage | Occasion |
| Coiffure Soirée | Occasion |

---

## 4. BUSINESS MODEL

### Freemium — Gratuit (toujours)
- Profil coiffeur complet
- Portfolio illimité
- Avis et abonnés
- Objectif : masse critique sans friction financière

### Pro (29 €/mois — V2)
- Réservation en ligne
- Agenda professionnel
- Gestion des prestations et tarifs

### Business (99 €/mois — V3)
- CRM client
- Statistiques avancées
- Automatisations (rappels, relances)

### Growth (49–199 €/mois — V3)
- Référencement premium dans les résultats
- Mise en avant dans le feed
- Boost de visibilité

### CHAIR Rent (commission 15% — V2)
- Salons publient fauteuils disponibles
- Indépendants réservent à la journée / demi-journée
- Modèle Airbnb appliqué au fauteuil

### CHAIR Brands (partenariats B2B — V3)
- Marques pro (L'Oréal, Wella, Schwarzkopf) accèdent à l'audience
- Contenu sponsorisé natif
- Données de tendances (anonymisées)
- Objectif : 50 000 à 500 000 €/an par partenaire

### CHAIR Talent (recrutement — V3)
- Salons recherchent des coiffeurs selon leur portfolio
- Abonnement ou commission sur embauche

### CHAIR Certification (ponctuel)
- Label "CHAIR Certifié" — processus de vérification diplôme + expérience
- 49 € one-shot + 19 €/an renouvellement

---

## 5. ANALYSE CONCURRENTIELLE

| Critère | Planity | Treatwell | Fresha | Instagram | **CHAIR** |
|---|---|---|---|---|---|
| Profil coiffeur individuel | Non | Non | Non | Oui (limité) | **Oui (central)** |
| Portfolio structuré | Non | Non | Non | Partiel | **Oui** |
| Recherche par spécialité | Non | Partiel | Non | Non | **Oui** |
| Avis certifiés | Non | Oui | Oui | Non | **Oui** |
| Feed de découverte | Non | Non | Non | Oui (général) | **Oui (vertical)** |
| Réservation native | Oui | Oui | Oui | Non | V2 |
| Appartenance profil | Salon | Salon | Salon | Coiffeur | **Coiffeur** |
| Réputation portable | Non | Non | Non | Oui | **Oui** |
| SEO profil individuel | Non | Non | Non | Limité | **Oui** |
| Coût entrée | Élevé | Commission | Gratuit | Gratuit | **Gratuit** |

**Faille principale exploitée :** Planity et Treatwell ne peuvent pas valoriser le coiffeur individuel sans trahir leur client (le salon). C'est une contrainte structurelle qu'ils ne pourront pas résoudre.

---

## 6. AVANTAGE CONCURRENTIEL

### Moat (barrières défensives)
1. **Capital numérique accumulé** — avis, abonnés, portfolio = actif non transférable
2. **SEO local** — chaque profil = une page Google ("balayage strasbourg", "barber paris 11")
3. **Réseau de pairs** — coiffeurs se recommandent entre eux
4. **Contrats marques** — partenariats pluriannuels = barrière financière et relationnelle
5. **Données propriétaires** — corpus de réalisations + tendances, unique en France

### Argument coiffeur vs Instagram
- Sur Instagram : 1 créateur parmi 2 milliards, algorithmique instable, avis inexistants, profil non professionnel
- Sur CHAIR : profil dans un écosystème 100% coiffure, avis certifiés, statistiques pro, profil portable à vie

### Argument client vs Google
- Google donne le salon le plus proche
- CHAIR donne le spécialiste de la technique souhaitée dans la ville souhaitée

---

## 7. STACK TECHNIQUE

### Backend
| Composant | Technologie | Version |
|---|---|---|
| Framework | Laravel | 8.x |
| Langage | PHP | 8.0 (XAMPP) |
| Base de données | MySQL | XAMPP (8.x) |
| Auth API | Laravel Sanctum | 2.x |
| Package manager | Composer | 2.10 |

### Frontend
| Composant | Technologie | Version |
|---|---|---|
| Framework | Next.js | 16.2.6 |
| Langage | TypeScript | 5.x |
| CSS | Tailwind CSS | 4.x |
| Icônes | Lucide React | latest |
| Runtime | Node.js | 22.x |

### Infrastructure locale (développement)
| Service | Outil |
|---|---|
| Serveur web | Apache (XAMPP) |
| MySQL | XAMPP MySQL |
| PHP | XAMPP PHP (`C:\xampp\php\php.exe`) |
| Composer | Installé dans `C:\xampp\php\composer` |

### À venir (production)
- Hébergement : Railway ou Render
- Médias : Cloudinary ✓ **intégré** — cloud `dnwtc0dra`, dossiers `chair/avatars`, `chair/banners`, `chair/posts`
- Recherche : Meilisearch
- Emails : Resend
- Cache : Redis

---

## 8. ARCHITECTURE

```
chair-app/
├── backend/          ← Laravel 8 — API REST
│   ├── app/
│   │   ├── Http/Controllers/Api/   ← Controllers
│   │   └── Models/                 ← Modèles Eloquent
│   ├── database/
│   │   ├── migrations/             ← 15 tables
│   │   └── seeders/                ← Données de démo
│   └── routes/api.php              ← Routes API
│
├── frontend/         ← Next.js 16 — App Router
│   ├── app/          ← Pages (file-system routing)
│   ├── components/
│   │   ├── layout/   ← AppShell, TopNav, BottomNav
│   │   └── ui/       ← HairdresserCard, PostCard, StarRating
│   └── lib/
│       └── mockData.ts   ← Données fictives (temporaire)
│
└── docs/             ← Documentation projet
    ├── PROJECT_MEMORY.md
    └── NEXT_SESSION.md
```

### Principe d'architecture
- Backend : API REST stateless, réponses JSON paginées
- Frontend : Next.js App Router, Server Components par défaut, Client Components uniquement si interactivité requise
- CORS configuré : `localhost:3000` autorisé depuis `localhost:8000`
- Auth : Bearer token Sanctum stocké côté client (localStorage ou cookie httpOnly en V2)

---

## 9. BASE DE DONNÉES

### Schéma complet

```sql
users
├── id, name, email, password
├── role ENUM('client', 'hairdresser', 'salon_owner', 'admin')
├── avatar, city, bio, phone
└── created_at, updated_at

salons
├── id, owner_id (→ users), name, slug
├── description, address, city, postal_code
├── latitude, longitude, phone, website, instagram_url
├── cover_image, logo, is_verified
└── created_at, updated_at

hairdresser_profiles
├── id, user_id (→ users), salon_id (→ salons, nullable)
├── slug, banner_image, tagline
├── years_experience, diploma, city, postal_code
├── latitude, longitude
├── is_independent, is_verified
├── followers_count, posts_count, avg_rating, reviews_count
├── visits_count INT UNSIGNED DEFAULT 0  ← prestations réalisées (RDV completed)
├── instagram_url, tiktok_url, booking_url
└── created_at, updated_at

specialties
├── id, name, slug, icon, category, is_active
└── created_at, updated_at

hairdresser_specialties [pivot]
├── hairdresser_id (→ hairdresser_profiles)
└── specialty_id (→ specialties)

posts
├── id, hairdresser_id (→ hairdresser_profiles)
├── specialty_id (→ specialties, nullable)
├── type ENUM('before_after', 'result', 'technique')
├── description, duration_minutes, price_indication
├── is_published, views_count, likes_count, cover_image
└── created_at, updated_at

post_images
├── id, post_id (→ posts)
├── url, type ENUM('before', 'after', 'result')
├── order
└── created_at, updated_at

service_categories
├── id, hairdresser_id (→ hairdresser_profiles)
├── name, description, image_url (nullable)
├── display_order, visits_count  ← incrémenté à chaque réservation confirmée
└── created_at, updated_at

services
├── id, hairdresser_id (→ hairdresser_profiles), category_id (→ service_categories)
├── name, description
├── price DECIMAL(8,2), duration_minutes INT
├── is_active BOOLEAN, visits_count  ← incrémenté à chaque réservation confirmée
├── image_url (nullable)
└── created_at, updated_at

hairdresser_schedules
├── id, hairdresser_id (→ hairdresser_profiles)
├── day_of_week TINYINT (0=Dim … 6=Sam)
├── start_time, end_time, break_start, break_end (nullable TIMEs)
├── is_open BOOLEAN
└── [UNIQUE hairdresser_id + day_of_week]

hairdresser_unavailabilities
├── id, hairdresser_id (→ hairdresser_profiles)
├── start_datetime, end_datetime DATETIME
├── reason (nullable)
└── created_at, updated_at

appointments
├── id, hairdresser_id (→ hairdresser_profiles), client_id (→ users, nullable)
├── client_name, client_email, client_phone (nullable)
├── service (texte legacy), service_id (→ services, nullable)
├── desired_date (legacy), desired_slot (legacy)
├── appointment_date DATE (nullable), appointment_time TIME (nullable)
├── duration_minutes INT (nullable), price DECIMAL (nullable)
├── payment_method ENUM('on_site','deposit','full') nullable
├── message (nullable)
├── status ENUM('pending','pending_payment','confirmed','declined','completed','cancelled','no_show')
├── review_token VARCHAR(64) UNIQUE nullable
├── review_unlocked BOOLEAN DEFAULT false
└── created_at, updated_at

[hairdresser_profiles également mis à jour]
├── work_status ENUM('home','private_salon','rented_chair','studio') nullable
└── work_address VARCHAR(255) nullable

reviews
├── id, hairdresser_id (→ hairdresser_profiles)
├── client_id (→ users, nullable)
├── appointment_id (→ appointments, nullable) ← lien avis certifié
├── rating (1-5), comment, is_verified, specialty
└── created_at, updated_at
[UNIQUE: appointment_id — 1 avis max par rendez-vous]
[Index séparés: hairdresser_id, client_id — support FK]

follows [pivot]
├── follower_id (→ users)
├── hairdresser_id (→ hairdresser_profiles)
└── created_at

saved_profiles [pivot]
├── user_id (→ users)
├── hairdresser_id (→ hairdresser_profiles)
└── created_at

notifications
├── id, user_id (→ users)
├── type, data (JSON), read_at
└── created_at, updated_at
```

### Données en base (comptes réels — seed fictif supprimé)
| Table | Quantité | Notes |
|---|---|---|
| users | 17+ | Comptes réels uniquement |
| hairdresser_profiles | 14+ | Profils réels |
| specialties | 29 | 10 ajoutées session 2026-06-03 |
| posts | 8+ | Posts publiés réels avec tags |
| post_tags | actif | Pivot posts ↔ specialties — table créée 2026-06-03 |
| reviews | 5+ | Avis réels |
| saved_posts | actif | Inspirations clients |
| user_preferences | actif | genre + interests[] par user |
| appointments | selon utilisation | |
| follows | selon utilisation | |

**Note :** Les données fictives (sophie@chair.fr etc.) ont été supprimées en Sprint Beta. La DB ne contient que des comptes créés manuellement pendant les tests.

---

## 10. API BACKEND

**Base URL :** `http://localhost:8000/api/`

### Routes publiques

| Méthode | Endpoint | Description | Notes |
|---|---|---|---|
| POST | `/register` | Inscription — crée HairdresserProfile + Salon si type salon |
| POST | `/login` | Connexion → token + user + hairdresser_profile |
| GET | `/feed` | Feed global des posts paginé (inclut hairdresser.user) |
| GET | `/hairdressers` | Liste coiffeurs paginée (`?city=&specialty=`) |
| GET | `/hairdressers/{slug}` | Profil complet + avis + spécialités + salon + booking_url |
| GET | `/hairdressers/{slug}/posts` | Posts publiés du coiffeur |
| GET | `/hairdressers/{slug}/services` | Catégories + services actifs (pour parcours client) |
| GET | `/hairdressers/{slug}/availability` | Créneaux disponibles (`?date=YYYY-MM-DD&service_id=X`) |
| GET | `/hairdressers/{slug}/available-dates` | Jours disponibles dans un mois (`?service_id=X&month=YYYY-MM`) |
| GET | `/posts/{id}` | Post unique public (pour page détail réalisation) |
| GET | `/specialties` | Liste des spécialités actives |
| POST | `/appointments` | Créer une demande de RDV (client connecté ou guest) |
| POST | `/review-by-token/{token}` | Soumettre un avis certifié via token |

### Routes protégées (Bearer token requis)

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/logout` | Révocation du token courant |
| GET | `/me` | Utilisateur connecté + profil |
| GET | `/profile` | Profil éditable (auto-crée si absent) |
| PUT | `/profile` | Mise à jour bio/tagline/ville/instagram/booking_url/specialties |
| POST | `/profile/avatar` | Upload avatar (multipart, champ `avatar`) |
| POST | `/profile/banner` | Upload bannière (multipart, champ `banner`) |
| GET | `/posts` | Réalisations du coiffeur connecté |
| POST | `/posts` | Créer réalisation (`after_image` obligatoire, `before_image` optionnel) |
| PUT | `/posts/{id}` | Modifier description/spécialité/durée/prix |
| DELETE | `/posts/{id}` | Supprimer réalisation + fichiers |
| GET | `/appointments` | Liste des RDVs du coiffeur connecté |
| GET | `/my-appointments` | Liste des RDVs du client connecté (avec hairdresser.user + review) |
| POST | `/appointments/{id}/review` | Soumettre un avis in-app pour un RDV terminé (client connecté) |
| GET | `/notifications` | Notifications non lues du client connecté |
| POST | `/notifications/{id}/read` | Marquer une notification comme lue |
| POST | `/notifications/read-all` | Marquer toutes les notifications comme lues |
| PUT | `/appointments/{id}/status` | Changer statut (confirmed/declined/completed/cancelled/no_show) |
| GET | `/stats` | Stats agrégées du coiffeur (profil + RDVs + revenus) |
| GET | `/service-categories` | Catégories du coiffeur connecté |
| POST | `/service-categories` | Créer catégorie |
| PUT | `/service-categories/{id}` | Modifier catégorie |
| DELETE | `/service-categories/{id}` | Supprimer catégorie |
| GET | `/services` | Services du coiffeur connecté |
| POST | `/services` | Créer service |
| PUT | `/services/{id}` | Modifier service (prix, durée, actif...) |
| DELETE | `/services/{id}` | Désactiver service |
| GET | `/schedule` | Horaires de la semaine (7 jours) |
| PUT | `/schedule` | Mettre à jour les horaires |
| GET | `/unavailabilities` | Indisponibilités à venir |
| POST | `/unavailabilities` | Créer indisponibilité |
| DELETE | `/unavailabilities/{id}` | Supprimer indisponibilité |
| GET | `/interactions/{id}` | Status suivre + sauvegarder pour un profil |
| POST | `/follows/{id}` | Suivre un coiffeur |
| DELETE | `/follows/{id}` | Ne plus suivre |
| POST | `/saved-profiles/{id}` | Sauvegarder un profil |
| DELETE | `/saved-profiles/{id}` | Retirer des favoris |
| GET | `/saved-profiles` | Liste des profils sauvegardés |

### Controllers
- `AuthController.php` — register (multi-step coiffeur, crée Salon si besoin), login, logout, me
- `HairdresserController.php` — index, show, posts, feed
- `ProfileController.php` — show (auto-crée), update (+ booking_url), uploadAvatar, uploadBanner
- `PostController.php` — index, show (public), store, update, destroy
- `AppointmentController.php` — store (mode réel + legacy), index, updateStatus (+ notification client), submitReview (in-app), reviewByToken (token email), clientAppointments (+ review chargée), stats (+ review_breakdown)
- `NotificationController.php` — NOUVEAU — index, markRead, markAllRead
- `ServiceController.php` — NOUVEAU — publicList, indexCategories, storeCategory, updateCategory, destroyCategory, indexServices, storeService, updateService, destroyService
- `ScheduleController.php` — NOUVEAU — index, update (horaires), indexUnavailabilities, storeUnavailability, destroyUnavailability
- `AvailabilityController.php` — NOUVEAU — slots (créneaux dispo), availableDates (jours ouverts)
- `ReviewController.php` — store (legacy — avis libres; nouvelles reviews via AppointmentController)
- `InteractionController.php` — follow/unfollow, save/unsave, status, savedIndex
- `SpecialtyController.php` — index

### Format de réponse
```json
// Liste paginée (hairdressers, feed)
{ "current_page": 1, "data": [...], "per_page": 20, "total": 5 }

// Auth
{ "user": {..., "hairdresser_profile": {...}}, "token": "1|abc123..." }

// Review créée
{ "id": 16, "rating": 5, "comment": "...", "client": {...} }
```

---

## 11. FRONTEND — PAGES

**Base URL :** `http://localhost:3000`

| Route | Fichier | Statut | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | Terminé | Hero + spécialités + feed + coiffeurs + CTA visiteurs (masqué si connecté) |
| `/rechercher` | `app/rechercher/page.tsx` | Terminé | Pills spécialités + filtres ville/note + empty state contextuel |
| `/favoris` | `app/favoris/page.tsx` | Terminé | API réelle, retrait possible |
| `/compte` | `app/compte/page.tsx` | Terminé | Auth réelle + avatar |
| `/connexion` | `app/connexion/page.tsx` | Terminé | Auth API Sanctum |
| `/inscription` | `app/inscription/page.tsx` | Terminé | Multi-step : identité → type coiffeur (salon/indépendant) + champs adaptés |
| `/coiffeur/[slug]` | `app/coiffeur/[slug]/page.tsx` | Terminé | Profil premium : bannière, avatar, statut salon, CTA dynamique, stats, badges, portfolio 3-col |
| `/coiffeur/[slug]/reserver` | `app/coiffeur/[slug]/reserver/page.tsx` | Terminé | Parcours multi-étapes réservation réelle : catégorie → service → date → créneau → infos → confirmation |
| `/dashboard/services` | `app/dashboard/services/page.tsx` | Terminé | CRUD catégories + services (prix, durée, actif/inactif) |
| `/dashboard/planning` | `app/dashboard/planning/page.tsx` | Terminé | Calendrier RDV + gestion horaires de la semaine |
| `/realisation/[id]` | `app/realisation/[id]/page.tsx` | Terminé | Détail réalisation : image, avant/après, infos, nav prev/next, thumbnails |
| `/avis/[token]` | `app/avis/[token]/page.tsx` | Terminé | Formulaire avis certifié via token |
| `/dashboard` | `app/dashboard/page.tsx` | Terminé | Stats + onboarding + réalisations récentes |
| `/dashboard/profil` | `app/dashboard/profil/page.tsx` | Terminé | Édition complète + booking_url + DashboardNav |
| `/dashboard/realisations` | `app/dashboard/realisations/page.tsx` | Terminé | CRUD réalisations + DashboardNav |
| `/dashboard/reservations` | `app/dashboard/reservations/page.tsx` | Terminé | Gestion RDVs + DashboardNav |
| `/dashboard/statistiques` | `app/dashboard/statistiques/page.tsx` | Terminé | Stats profil + stats RDVs |
| `/not-found` | `app/not-found.tsx` | Terminé | Page 404 CHAIR |
| `/_error` | `app/error.tsx` | Terminé | Page erreur globale |
| `/loading` | `app/loading.tsx` | Terminé | Skeleton hero dark |
| `/onboarding` | `app/onboarding/page.tsx` | Terminé | Wizard 7 étapes post-inscription coiffeur |
| `/salon/[slug]` | `app/salon/[slug]/page.tsx` | Terminé | Page publique salon : bannière, logo, équipe, infos |
| `/dashboard/salon` | `app/dashboard/salon/page.tsx` | Terminé | Gestion salon (owner) : équipe, demandes, édition |
| `/dashboard/rejoindre-salon` | `app/dashboard/rejoindre-salon/page.tsx` | Terminé | Coiffeur cherche + demande à rejoindre un salon |

**Toutes les pages utilisent l'API réelle. `mockData.ts` n'est plus utilisé.**

---

## 12. FRONTEND — COMPOSANTS

### Layout
| Composant | Fichier | Description |
|---|---|---|
| `AppShell` | `components/layout/AppShell.tsx` | Wrapper global : TopNav + children + BottomNav. Prop `noPaddingTop` pour le hero homepage |
| `TopNav` | `components/layout/TopNav.tsx` | Desktop fixe, auth-aware, avatar réel. **Transparent scroll-aware sur `/`** — devient blanc après 60px de scroll |
| `BottomNav` | `components/layout/BottomNav.tsx` | Navigation mobile fixe, icônes + point actif. Icônes : Découvrir / Recherche / **Feed** (Clapperboard carré) / Favoris / Compte ou Dashboard. z-[60] pour passer au-dessus du feed TikTok. |
| `DashboardNav` | `components/layout/DashboardNav.tsx` | Nav mobile fixe dans le dashboard (Accueil / Profil / Portfolio / Aperçu) |

### UI
| Composant | Fichier | Description |
|---|---|---|
| `HairdresserCard` | `components/ui/HairdresserCard.tsx` | Carte coiffeur 3:4 — bannière floue en fond + avatar rond centré avec ring, spécialités, note pill |
| `PostCard` | `components/ui/PostCard.tsx` | Carte réalisation (avant/après ou image seule). Prop `hairdresser` optionnelle. Optional chaining défensif. |
| `FeedPostCard` | `components/ui/FeedPostCard.tsx` | Carte compacte homepage : image seule + overlay gradient (pas de section blanche). Prop `aspect` portrait/square. |
| `PersonalizedSection` | `components/ui/PersonalizedSection.tsx` | Section "Pour toi — Spécialistes X" : coiffeurs matchant l'intérêt aléatoire du user. CTA inscription pour visiteurs non connectés. |
| `PersonalizedFeedSection` | `components/ui/PersonalizedFeedSection.tsx` | Section "Inspirations X" : posts filtrés par préférences. Double filtre backend+client. "Voir tout" → `/rechercher?specialty=`. |
| `NearbySection` | `components/ui/NearbySection.tsx` | Coiffeurs proches (géolocalisation, sort=scored) |
| `HeroSearch` | `components/ui/HeroSearch.tsx` | Barre de recherche dans le hero → navigue vers `/rechercher?q=...` |
| `StarRating` | `components/ui/StarRating.tsx` | Étoiles SVG, configurable en taille |
| `ProfileActions` | `components/ui/ProfileActions.tsx` | Suivre/Sauvegarder (API) — "Modifier mon profil" si profil propre |
| `ImageUpload` | `components/ui/ImageUpload.tsx` | Upload fichier vers endpoint API (avatar ou bannière) |
| `ReviewForm` | `components/ui/ReviewForm.tsx` | Formulaire avis : étoiles cliquables + commentaire. Visible clients connectés non-coiffeurs uniquement. |
| `ReviewsSection` | `components/ui/ReviewsSection.tsx` | Section avis complète : formulaire + liste. État React local (ajout optimistic). Intégré dans `/coiffeur/[slug]`. |

### Lib
| Fichier | Contenu |
|---|---|
| `lib/api.ts` | Client HTTP (`get/post/put/delete`) + helpers interactions |
| `lib/auth.ts` | Types `AuthUser`, `HairdresserProfile`, localStorage utils, redirect par rôle |
| `lib/types.ts` | Types API (`ApiHairdresserProfile`, `ApiPost`…) + `resolveMediaUrl()`, `getAfterImage()`, `formatDate()`. `hairdresser` optionnel dans `ApiPost`. |

### Contextes & Hooks
| Fichier | Contenu |
|---|---|
| `contexts/AuthContext.tsx` | `AuthProvider` + `useAuth` hook + `updateUser()` |
| `components/Providers.tsx` | Wrapper client pour le layout |
| `hooks/useRequireAuth.ts` | Protection des routes, redirect si non connecté ou mauvais rôle |

---

## 13. ÉTAT DU DÉVELOPPEMENT

### Terminé ✓
- [ x ] Structure du projet (backend + frontend + docs)
- [ x ] Base de données MySQL — 15 tables créées et migrées
- [ x ] Seed de données de démo (5 coiffeurs, posts, avis, spécialités)
- [ x ] API REST Laravel — 9 endpoints fonctionnels et testés
- [ x ] Auth Sanctum (register / login / logout / me)
- [ x ] Modèles Eloquent avec relations complètes
- [ x ] Frontend Next.js — 8 pages créées
- [ x ] Navigation mobile (BottomNav) + desktop (TopNav)
- [ x ] Refonte UI page d'accueil — direction artistique premium définie
- [ x ] Composant HairdresserCard refait (format portrait, overlay)
- [ x ] Composant PostCard refait (image dominante, avant/après propre)
- [ x ] Suppresssion de tous les emojis du frontend
- [ x ] **Sprint 1 — Auth fonctionnelle** (session 2026-06-01)
  - `lib/api.ts` — couche HTTP centralisée (fetch + headers + gestion erreurs)
  - `lib/auth.ts` — types AuthUser/HairdresserProfile, gestion localStorage, redirect selon rôle
  - `contexts/AuthContext.tsx` — AuthProvider + useAuth hook (login, register, logout, état user)
  - `components/Providers.tsx` — wrapper client pour le layout
  - `hooks/useRequireAuth.ts` — protection des routes (redirect si non connecté ou mauvais rôle)
  - `/connexion` — appel API réel, gestion d'erreur, redirect selon rôle
  - `/inscription` — appel API réel, sélection rôle interactive, redirect selon rôle
  - `/compte` — affiche profil connecté ou invite à se connecter, bouton logout
  - `/dashboard` — protégé (hairdresser uniquement), stats réelles depuis `/me`, logout
- [ x ] **Sprint 2 — Navigation + Interactions** (session 2026-06-01)
  - Backend : `InteractionController` — follow/unfollow, save/unsave, status combiné
  - Backend : 5 nouvelles routes API protégées (`/follows`, `/saved-profiles`, `/interactions`)
  - `TopNav` — auth-aware : Connexion/Inscription si déconnecté ; Prénom + Dashboard (si hairdresser) + Déconnexion si connecté
  - `BottomNav` — auth-aware : icône Dashboard apparaît pour les coiffeurs connectés
  - `ProfileActions` — nouveau composant client : Suivre/Sauvegarder avec état réel + optimistic update
  - `/coiffeur/[slug]` — boutons Suivre et Sauvegarder fonctionnels
  - `/favoris` — liste réelle depuis API, retrait possible, état non-connecté géré
  - `/dashboard` — sidebar nettoyée, sections indisponibles marquées "Bientôt", 0 bouton mort
  - `/rechercher` — emoji supprimé, conforme à la charte
- [ x ] **Sprint 3 — Coiffeur utilisable** (session 2026-06-01)
  - **Connexion API pages publiques** : `/`, `/rechercher`, `/coiffeur/[slug]` connectées à l'API réelle (mockData supprimé)
  - `lib/types.ts` — types API centralisés (`ApiHairdresserProfile`, `ApiPost`, `ApiSpecialty`, helpers)
  - `HairdresserCard` + `PostCard` — refactorés pour accepter les types API directement
  - **Backend `ProfileController`** — `GET/PUT /api/profile`, `POST /api/profile/avatar`, `POST /api/profile/banner`
  - **Backend `PostController`** — `GET/POST/PUT/DELETE /api/posts` avec upload images
  - **Backend `PostImage` model** — créé (manquant)
  - `ImageUpload` — composant client réutilisable pour upload fichier vers l'API
  - `/dashboard/profil` — page édition complète : bio, tagline, ville, Instagram, spécialités, avatar, bannière
  - `/dashboard/realisations` — gestion CRUD : ajout avant/après, modification, suppression
  - `/dashboard` — liens "Modifier profil" + "Gérer réalisations" fonctionnels ; sidebar mise à jour
  - `storage:link` Laravel créé (stockage local `public/storage`)
  - `api.put()` ajouté dans `lib/api.ts`
- [ x ] **Sprint 4 — Debug & QA + Stabilisation** (session 2026-05-31)
  - `next.config.ts` — `localhost:8000` ajouté dans `remotePatterns` (images uploadées fonctionnelles)
  - `lib/types.ts` — `resolveMediaUrl()` helper pour préfixer les URLs `/storage/`
  - `HairdresserCard`, `PostCard`, `/coiffeur/[slug]` — utilisent `resolveMediaUrl()`
  - `AuthController::register()` — crée `HairdresserProfile` automatiquement pour les coiffeurs
  - `AuthController::login()` — retourne `hairdresser_profile` dans la réponse
  - `ProfileController::show()` — auto-crée le profil si absent (fix défensif permanent)
  - `AuthContext` — ajout de `updateUser(updates)` pour mettre à jour user + localStorage sans refetch
  - `TopNav` — affiche l'avatar réel avec `resolveMediaUrl()`, fallback icône `<User>`
  - `/compte` — affiche l'avatar réel avec `resolveMediaUrl()`, fallback icône `<User>`
  - `/dashboard/profil` — appelle `updateUser({avatar: url})` après upload → propagation immédiate
  - `/inscription` — lit `?role=hairdresser` depuis `window.location.search` au montage
  - `DatabaseSeeder.php` — emojis supprimés des descriptions de posts
  - Profil manquant pour `julien.amazon06@gmail.com` créé manuellement (id=7, slug=`julien-coiffeur`)
  - **Stratégie complète rédigée** — 17 zones (Vision, Personas, Business Model, Acquisition, Lancement, Risques, KPIs…)
  - `docs/chair_miro.py` — script Python générant le board Miro automatiquement via API
- [ x ] **Sprint 5 — Stabilisation & Professionnalisation A** (session 2026-05-31)
  - `app/not-found.tsx` — page 404 créée dans le style CHAIR
  - `/favoris` — `resolveMediaUrl()` appliqué sur les avatars (bug avatars cassés corrigé)
  - `/coiffeur/[slug]` — bannière sans image : fond `bg-neutral-800` (texte blanc lisible)
  - `/coiffeur/[slug]` — `avg_rating` affiche `"—"` si `reviews_count === 0`
  - `/connexion` — lien "Mot de passe oublié ?" mort supprimé
  - `/inscription` — rôle "Salon" retiré (espace inexistant), grille 2 colonnes
  - `/inscription` — champ "Ville" marqué `(optionnelle)`
  - `/dashboard` — "Réalisations" retiré du bloc "En cours de développement" (contradiction)
  - `/dashboard` — lien "Mon compte" retiré de la sidebar (hors contexte dashboard)
  - `/dashboard` — avatar réel du coiffeur affiché dans la sidebar (avec `resolveMediaUrl()`)
  - `/dashboard/realisations` — ordre "Avant / Résultat" corrigé (logique narrative)
- [ x ] **Sprint 6 — Stabilisation & Professionnalisation B** (session 2026-05-31)
  - **Diagnostic complet** : infrastructure images OK (symlink valide, fichiers servis à 200)
  - `ProfileController::update()` — correction du bug `null ?? old_value` (`array_key_exists` pattern)
  - `DatabaseSeeder.php` — `posts_count: 3` ajouté
  - Migration `city` nullable + nettoyage `banner_image = ''` → `null`
  - `ProfileController::uploadBanner()` — auto-création du profil si absent
  - `/rechercher` — `useSearchParams()` + filtres depuis l'URL
  - `/dashboard` — réalisations récentes, banner onboarding, skeletons, page erreur
  - `ProfileActions` — bouton "Modifier mon profil" si profil propre
- [ x ] **Sprint C — Avis + Recherche + Dashboard nav** (session 2026-05-31)
  - **Bug B20** : `PostCard` crash `post.hairdresser undefined` → `HairdresserController::posts()` ajoute `hairdresser.user` + PostCard défensif avec prop optionnelle
  - **Bug B21** : 404 sur réalisations → même fix (hairdresser.slug disponible)
  - `lib/types.ts` — `hairdresser` optionnel dans `ApiPost`
  - **`ReviewController.php`** — `POST /api/hairdressers/{id}/reviews` : 1 avis/client, interdit sur son propre profil, recalcule `avg_rating` + `reviews_count`
  - **`Review` model** — `$fillable` complet + relations `client` / `hairdresser`
  - **`ReviewForm.tsx`** — étoiles interactives + commentaire, clients connectés uniquement
  - **`ReviewsSection.tsx`** — section complète avec état React, intégrée dans `/coiffeur/[slug]`
  - `/coiffeur/[slug]` — passe `hairdresser=` à PostCard, remplace section avis par `ReviewsSection`
  - `/rechercher` — refonte mobile-first : panneau dépliable, spécialités par catégorie, chips actifs
  - **`DashboardNav.tsx`** — nav mobile fixe dans les 3 pages dashboard (Accueil / Profil / Portfolio / Aperçu)
- [ x ] **Sprint D — Refonte accueil** (session 2026-05-31)
  - **`AppShell`** — prop `noPaddingTop` pour les pages avec hero plein écran
  - **`TopNav`** — transparent scroll-aware : transparent sur `/` si scroll < 60px, blanc sinon. Textes en blanc/blanc-70 en mode transparent.
  - **`HeroSearch`** — barre de recherche Client Component → `/rechercher?q=...`
  - **`FeedPostCard`** — carte compacte image-only avec overlay gradient (pas de section blanche)
  - **`app/page.tsx`** — refonte complète : hero plein écran (88svh mobile) + tuiles spécialités visuelles (12 photos Unsplash) + feed 2col remonté + coiffeurs scroll horizontal + bloc preuve sociale + CTA inscription
  - **`app/loading.tsx`** — skeleton adapté au hero dark
- [ x ] **Sprint E — UX Homepage auth + Refonte profil coiffeur** (session 2026-05-31)
  - **`HomeCTABlock.tsx`** — composant Client : bloc noir (stats + CTA inscription) masqué si user connecté (client ou coiffeur), visible uniquement pour les visiteurs anonymes
  - **`app/page.tsx`** — import `HomeCTABlock`, section CTA déléguée au composant client
  - **`/coiffeur/[slug]`** — refonte complète premium :
    - Bannière plein-largeur taller (h-48 md:h-64), gradient overlay, bouton retour mobile
    - Avatar circulaire large (w-24) avec initiale fallback
    - Identité : nom + badge vérifié + tagline + ville + statut salon ("Chez X" / "Indépendant(e)")
    - CTA principal "Prendre rendez-vous" (disabled, Bientôt disponible) — prêt pour `booking_url` futur
    - Actions secondaires ProfileActions (Suivre / Sauvegarder / Instagram) — hiérarchie clarifiée
    - Stats révisées : Abonnés | Avis | Note | Expérience (données réelles, "—" si absent)
    - Signaux de confiance : badges "Profil vérifié", "X ans d'expérience", "Portfolio actif", "X avis clients"
    - Spécialités cliquables → `/rechercher?specialty=`
    - Portfolio Instagram-style : grille 3 colonnes dense, `gap-px`, hover overlay spécialité — chaque item est un `<Link>` vers `/realisation/{id}`
    - Indicateur "Avant/Après" en hover sur les posts de type `before_after`
    - Stats : Abonnés | Avis | Note | Visites ("—" jusqu'à système de RDV)
    - Avis : StarRating summary + ReviewsSection interactive
- [ x ] **Sprint F — Page détail réalisation** (session 2026-05-31)
  - **Backend** : `PostController::show()` — endpoint public `GET /api/posts/{id}` avec `hairdresser.user`, `hairdresser.salon`, `specialty`, `images`
  - **`routes/api.php`** — `Route::get('/posts/{postId}', ...)` ajoutée en section publique
  - **`app/realisation/[id]/page.tsx`** — page détail complète :
    - Header : retour vers `/coiffeur/{slug}` + compteur "X / N" + navigation Prev/Next
    - Image plein-largeur (ou Avant/Après côte à côte avec labels)
    - Coiffeur : avatar + nom (lien vers profil) + ville
    - Spécialité cliquable → `/rechercher?specialty=`
    - Description, durée, prix indicatif
    - Engagement : likes_count + date de publication
    - Thumbnails scroll horizontal des autres réalisations du même coiffeur
  - **`app/realisation/[id]/loading.tsx`** — skeleton de chargement
- [ x ] **Sprint G — Refonte page Recherche** (session 2026-05-31)
  - **`app/rechercher/page.tsx`** — refonte complète :
    - Spécialités en pills horizontales **toujours visibles** (scroll horizontal, plus de panneau caché)
    - Panneau filtres "Filtres" réduit à : ville (avec suggestions dynamiques depuis résultats) + note minimum (Toutes / 4+ / 4.5+)
    - Chips actifs visibles quand panneau fermé (ville + note)
    - Filtre note côté client (`parseFloat(avg_rating) >= minRating`)
    - Compteur contextuel : "X coiffeurs · Spécialité · Ville"
    - "Tout effacer" inline dans le compteur
    - Empty state contextuel avec messages précis (filtre spécialité + ville)
    - Bouton "Voir tous les coiffeurs" + "Retirer le filtre spécialité" en état vide
    - Skeleton du Suspense fallback aligné avec le nouveau layout
  - **`HairdresserCard.tsx`** — fallback premium quand pas de bannière :
- [ x ] **Sprint I — Système de réservation professionnel** (session 2026-06-01)
  - **DB** : 4 nouvelles tables (`service_categories`, `services`, `hairdresser_schedules`, `hairdresser_unavailabilities`) + 2 migrations d'altération (`appointments` + 6 colonnes, `hairdresser_profiles` + `work_status`, `work_address`)
  - **Backend** :
    - `ServiceCategory` + `Service` + `HairdresserSchedule` + `HairdresserUnavailability` — nouveaux modèles Eloquent
    - `ServiceController` — CRUD catégories + services (public list + protégé)
    - `ScheduleController` — horaires de la semaine (7 jours, upsert) + indisponibilités
    - `AvailabilityController` — calcul créneaux dispo (exclut pauses, RDVs existants, indisponibilités, passé) + jours dispo dans un mois
    - `AppointmentController::store()` — mode réel (`service_id` + `appointment_date` + `appointment_time`) → status `confirmed` automatique + double-check anti-collision
    - `AppointmentController::stats()` — revenue_estimate + appointments_this_month
    - `HairdresserProfile.$fillable` — `work_status` + `work_address`
    - 15 nouvelles routes API
  - **Frontend** :
    - `lib/types.ts` — `ApiServiceCategory`, `ApiService`, `ApiScheduleDay`, `ApiUnavailability`, `ApiAppointment` (champs réels), `ApiStats` (revenus), `ApiHairdresserProfile` (work_status/address)
    - `lib/api.ts` — helpers `services`, `schedule`, `availability` + `appointments.book()`
    - `/dashboard/services` — CRUD catégories (accordéon) + services (prix, durée, actif/inactif)
    - `/dashboard/planning` — calendrier mini + rendez-vous par date + prochains RDV + gestion horaires hebdo
    - `/coiffeur/[slug]/reserver` — parcours 6 étapes : catégorie → service → calendrier (jours dispo) → créneaux → coordonnées → récapitulatif + confirmation
    - `DashboardNav` — remplacé "Portfolio/RDV" par "Services/Planning"
    - `/dashboard/reservations` — statuts étendus (no_show, pending_payment)
    - `/dashboard/statistiques` — revenus estimés + RDV ce mois
    - `/coiffeur/[slug]` — CTA "Réserver" (au lieu de "Demander un rendez-vous")
  - **Build** : TypeScript 0 erreur, Next.js build 19 routes propres
- [ x ] **Sprint L — Popularité, visites réelles et référencement interne** (session 2026-06-01)
  - **DB** : migration `visits_count INT UNSIGNED DEFAULT 0` sur `hairdresser_profiles`. Backfill : `visits_count` = nombre de RDV `completed` existants. Backfill `service_categories.visits_count` = somme des `visits_count` de leurs services.
  - **Backend** :
    - `HairdresserProfile.$fillable` — `visits_count` ajouté
    - `AppointmentController::store()` — incrément `service_categories.visits_count` en plus de `services.visits_count` à chaque réservation créée
    - `AppointmentController::updateStatus()` — incrément `hairdresser_profiles.visits_count` quand `status = completed` (1 RDV terminé = 1 visite réelle)
    - `AppointmentController::stats()` — `visits_count` inclus dans la réponse
  - **Frontend** :
    - `lib/types.ts` — `visits_count` ajouté dans `ApiHairdresserProfile` et `ApiStats`
    - `/coiffeur/[slug]` — stat "Visites" affiche la vraie valeur (au lieu de "—")  + note avec 1 décimale
    - `/coiffeur/[slug]/reserver` step Catégorie — "X reservations" affiché sous le nom de catégorie si > 0
    - `/coiffeur/[slug]/reserver` step Service — "X reservations" affiché avec la durée si > 0
    - `dashboard/statistiques` — carte "Visites" ajoutée dans la section Profil (icon Activity)
  - **Préparé pour l'avenir** : ces compteurs permettront classements (services les plus demandés), catégories tendances, mise en avant automatique, référencement interne, recommandations intelligentes
  - **Build** : TypeScript 0 erreur, Next.js build 19 routes propres
- [ x ] **Sprint N — UX Navigation & Architecture** (session 2026-06-01)
  - **Nouveaux composants** :
    - `DashboardPageHeader` — header mobile standardisé (← Retour + titre centré + Bell badge) pour toutes les pages dashboard coiffeur
    - `PageHeader` — header mobile générique (← Retour + titre + action droite optionnelle) pour les pages AppShell
  - **Back navigation ajoutée** sur : `/dashboard/profil`, `/dashboard/realisations`, `/dashboard/services`, `/dashboard/planning`, `/dashboard/reservations`, `/dashboard/statistiques`, `/notifications`, `/favoris`
  - **DashboardNav** : "Aperçu" renommé "Public" (plus intuitif), "Alertes" → Bell icon avec badge
  - **TopNav desktop** : Bell icon avec badge rouge pour tous les utilisateurs connectés → lien vers `/notifications`
  - **Dashboard home** : section "Aujourd'hui" ajoutée (RDV confirmés/en attente + compteur notifications) ; header mobile enrichi avec Bell icon
  - **Mobile header dashboard** : Bell icon + badge rouge dans le header de toutes les pages dashboard
  - **Build** : TypeScript 0 erreur, Next.js build 20 routes propres
- [ x ] **Sprint M — Système de notifications complet** (session 2026-06-01)
  - **DB** : migration `title` + `message` sur la table `notifications` ; nouvelle table `push_subscriptions` (user_id, platform, provider, token, enabled, last_used_at)
  - **Backend** :
    - `NotificationService` — NOUVEAU — `sendInternal()` + `sendPush()` (TODO) + `send()` : abstraction unique, prête pour Firebase/OneSignal
    - `Notification.$fillable` — `title` + `message` ajoutés
    - `AppointmentController::store()` — notifications `appointment_created` (coiffeur) + `appointment_confirmed` (client) à chaque réservation réelle créée
    - `AppointmentController::updateStatus()` — notification `appointment_confirmed` (client, confirmation manuelle) + `appointment_cancelled` (client ET coiffeur) + `review_request` via `NotificationService`
    - `AppointmentController::submitReview()` — notification `review_received` envoyée au coiffeur
    - `InteractionController::follow()` — notification `new_follower` envoyée au coiffeur
    - `NotificationController::index()` — supporte `?all=true` (toutes les notifs) ou sans (non lues) ; retourne `{ notifications, unread_count }`
  - **Frontend** :
    - `lib/types.ts` — `ApiNotification` enrichi (`title`, `message`, `data: Record<string, unknown>`) + `NotificationType` union + `ApiNotificationsResponse`
    - `lib/api.ts` — `notifications.list()` → `ApiNotificationsResponse` ; `notifications.listAll()` ajouté
    - `/notifications` — NOUVELLE page : non lues + lues, groupées par section, marquer lu individuel + tout marquer lu, skeletons, empty state, date relative
    - `BottomNav` — badge pour tous les rôles connectés (coiffeur sur Dashboard, client sur Compte) — polling 60s
    - `DashboardNav` — onglet Bell "Alertes" avec badge rouge pour les coiffeurs
    - `/compte` — import `Bell` + lien "Notifications" avec badge dans le bloc Actions
    - `/dashboard` — lien "Notifications" dans la sidebar desktop avec badge rouge
  - **Build** : TypeScript 0 erreur, Next.js build 20 routes propres
- [ x ] **Sprint K — Système d'avis premium** (session 2026-06-01)
  - **DB** : migration — suppression UNIQUE(hairdresser_id, client_id) → UNIQUE(appointment_id). Un client peut maintenant donner un avis par rendez-vous (pas un seul par coiffeur).
  - **Backend** :
    - `Notification` model — `$fillable`, cast `data` → array, cast `read_at` → datetime
    - `AppointmentController::updateStatus()` — quand status = completed : crée une notification `review_request` pour le client (si compte connecté)
    - `AppointmentController::submitReview()` — `POST /api/appointments/{id}/review` (auth) : soumet un avis in-app, vérifie que le RDV appartient au client + est completed + pas encore d'avis, recalcule avg_rating + reviews_count, marque la notification lue
    - `AppointmentController::clientAppointments()` — charge la relation `review` pour que le frontend sache si un avis existe
    - `AppointmentController::stats()` — ajoute `review_breakdown` (répartition 1-5 étoiles)
    - `NotificationController` — NOUVEAU : `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`
    - `routes/api.php` — 5 nouvelles routes protégées
  - **Frontend** :
    - `lib/types.ts` — `ApiNotification`, champ `review` dans `ApiAppointment`, `review_breakdown` dans `ApiStats`, avatar dans `hairdresser` de `ApiAppointment`
    - `lib/api.ts` — `appointments.submitReview()`, `notifications.list/markRead/markAllRead`
    - `ReviewPromptModal.tsx` — NOUVEAU — popup plein écran premium : avatar coiffeur, service, date, étoiles interactives animées avec label contextuel, commentaire optionnel, écran succès
    - `ReviewPromptTrigger.tsx` — NOUVEAU — monté dans AppShell, détecte automatiquement les RDVs terminés sans avis et déclenche la popup. Gestion dismissal via localStorage (TTL 4h), file d'attente si plusieurs avis pendants
    - `AppShell.tsx` — injection de `ReviewPromptTrigger`
    - `BottomNav.tsx` — badge rouge sur l'icône "Compte" si notifications non lues (client uniquement), polling 60s
    - `ReviewsSection.tsx` — refonte premium : résumé note globale + barres de répartition 1-5, cartes d'avis avec avatar client + initiale fallback + badge Certifié + guillemets
    - `dashboard/statistiques/page.tsx` — section "Répartition des avis" avec barres visuelles
  - **Build** : TypeScript 0 erreur, Next.js build 19 routes propres
- [ x ] **Sprint J — Dashboard branchement + Bugfixes** (session 2026-06-01)
  - **`app/dashboard/page.tsx`** — sidebar desktop reécrite : suppression cadenas + items verrouillés ; `navItems` pointe sur `/dashboard/services`, `/dashboard/planning`, `/dashboard/reservations`, `/dashboard/statistiques` ; logique active `pathname.startsWith(href)` ; actions rapides "Gérer mes services" + "Mon planning" ajoutées
  - **`components/layout/DashboardNav.tsx`** — mobile nav : Scissors/CalendarDays remplacent ImageIcon/Calendar ; active-state corrigé avec `startsWith`
  - **Bug B24** : `POST /api/services` → 500 "Cannot unpack array with string keys" — PHP 8.0 ne supporte pas `[...$assocArray]` dans les littéraux tableau (requiert PHP 8.1) → `array_merge()` dans `ServiceController::storeService()`
  - **Bug B25** : même correctif appliqué à `ScheduleController::storeUnavailability()` et `AppointmentController::store()` mode legacy (prévention)
  - **Bug B26** : warnings React "NaN is not a valid number" sur l'input prix de ServiceForm → `parseFloat(e.target.value)` sur champ vidé donnait `NaN` → remplacé par `isNaN(v) ? 0 : v` ; init `price` corrigée (`!= null` au lieu de truthy pour gérer le cas prix = 0)
- [ x ] **Sprint H — Réservation V1 complète** (session 2026-05-31)
  - **DB** : migration `booking_url` sur `hairdresser_profiles`, table `appointments` (7 champs + statuts ENUM + review_token), colonne `appointment_id` sur `reviews`
  - **Backend** :
    - `Appointment` model + `$fillable` + relations `hairdresser`, `client`, `review`
    - `AppointmentController` : `store` (public), `index` (coiffeur), `updateStatus` (confirm/decline/complete/cancel + génération review_token), `reviewByToken` (public, 1 avis/token), `stats` (agrégats)
    - `AuthController` : inscription multi-step coiffeur — `hairdresser_type`, `salon_name`, `salon_city`, `booking_url` → crée `Salon` si salon_name fourni, lie `salon_id`
    - `ProfileController` : `booking_url` ajouté dans validation + update
    - `HairdresserProfile.$fillable` : `booking_url` ajouté
    - `Review.$fillable` : `appointment_id` ajouté
    - Routes : `POST /api/appointments`, `POST /api/review-by-token/{token}`, `GET /api/appointments`, `PUT /api/appointments/{id}/status`, `GET /api/stats`
  - **Frontend** :
    - `lib/types.ts` : `booking_url` sur `ApiHairdresserProfile`, types `ApiAppointment`, `AppointmentStatus`, `ApiStats`
    - `lib/api.ts` : `appointments` helpers (create, list, updateStatus, reviewByToken, getStats)
    - `contexts/AuthContext.tsx` : `RegisterData` étendu (champs coiffeur step 2)
    - `/inscription` : formulaire multi-step — step 1 = base, step 2 coiffeur = type (indépendant/salon) + champs adaptés
    - `/coiffeur/[slug]` : CTA dynamique — indépendant → "Demander un RDV", salon + booking_url → "Réserver au salon" (lien externe), salon sans booking_url → bouton grisé
    - `/coiffeur/[slug]/reserver` : formulaire complet — nom, email, téléphone, service (avec suggestions spécialités), date, créneau (Matin/Après-midi/Soir), message optionnel
    - `/dashboard/reservations` : gestion RDVs — tabs "En cours" / "Historique", cartes avec actions (confirmer/refuser/terminer/annuler), bouton "Lien d'avis" copiable après completion
    - `/dashboard/statistiques` : stats profil (abonnés, favoris, réalisations, note) + stats RDVs (en attente, confirmés, terminés, total)
    - `/avis/[token]` : formulaire avis certifié — étoiles interactives + commentaire → `POST /api/review-by-token/{token}`
    - `ReviewsSection.tsx` : formulaire libre supprimé, notice "avis certifiés après RDV", badge "Certifié" sur les avis vérifiés
    - `DashboardNav.tsx` : ajout onglets "RDV" et "Stats" (6 tabs + Aperçu)
    - Si avatar disponible : centré sur fond `bg-neutral-800`, opacité 60%
    - Si pas d'avatar : initiale en `text-5xl text-white/20` sur fond sombre
    - Note affichée seulement si `reviews_count > 0`
    - Nom truncate, city truncate — pas de débordement

### Terminé ✓ (Sprint U — 2026-06-02)
- [ x ] **Onboarding coiffeur** — wizard 7 étapes post-inscription, barre de progression, bouton "Voir mon profil public" sticky
- [ x ] **Feed intelligent géo-aware** — scoring PHP multi-critères (`?sort=scored&lat=X&lng=Y`)
- [ x ] **Disponibilités dans la recherche** — `AvailableHairdressersController`, filtre Aujourd'hui/Demain/Cette semaine/Week-end dans `/rechercher`, section homepage "Disponible aujourd'hui"
- [ x ] **Salons complets** — table `salon_join_requests`, `SalonController`, page `/salon/[slug]`, dashboard salon, page "Rejoindre un salon"

### Terminé ✓ (Sprint Découverte — 2026-06-03)
- [ x ] **Bug critique** : `vendor/composer/platform_check.php` bypassé (PHP 8.0 ≠ vendor 8.4.1) — re-appliquer après `composer install`
- [ x ] **CORS fix** : `HandleCors` déplacé avant `TrustProxies` dans `Kernel.php`
- [ x ] **Migration `post_tags`** : table pivot posts ↔ specialties créée et opérationnelle
- [ x ] **10 nouvelles spécialités** : barbe, coupe-courte, coupe-longue, keratine, ondulations, frange, coiffure-soiree, dreads, roux, couleur-homme → 29 total
- [ x ] **HairdresserCard + FeaturedCard redesign** : bannière floue + assombrie en fond, avatar rond centré avec ring
- [ x ] **Feed TikTok scroll snap** : structure `fixed top-0 left-0 right-0 bottom:60px` + `h-full` sur container + cartes. Snap natif parfaitement aligné.
- [ x ] **BottomNav Feed** : icône Clapperboard entre Recherche et Favoris, carré arrondi, z-[60]
- [ x ] **BottomNav dans /feed** : rendue directement (feed n'utilise pas AppShell)
- [ x ] **Algorithme feed personnalisé** : match `post.specialty.slug` ET `post_tags`, `_match_count > 0` obligatoire, récence 150pts dominant, double filtre client-side
- [ x ] **Hybride trending+perso** : posts perso en premier, trending sans doublons pour compléter
- [ x ] **PersonalizedSection** : CTA premium pour visiteurs non connectés, rotation aléatoire de l'intérêt
- [ x ] **PersonalizedFeedSection** : "Voir tout" → `/rechercher?specialty=`, filtre client-side robuste
- [ x ] **Onboarding client** : refonte complète — 4 genres, grille 3col par groupe, done screen chips
- [ x ] **compte/modifier** : section "Mes goûts & inspirations" — sélecteur genre + 29 styles, sync localStorage+API
- [ x ] **Homepage** : "Réalisations tendance" masquée si aucun post

### Terminé ✓ (Sprint Beta — 2026-06-02)
- [ x ] **Variable d'env `NEXT_PUBLIC_API_URL`** — `.env.local` créé, tous les `localhost:8000` remplacés (16 fichiers)
- [ x ] **Bug onboarding photos** — aperçu instantané avatar/bannière via `URL.createObjectURL()` avant réponse API
- [ x ] **Données fake supprimées** — 5 faux coiffeurs, 15 posts, 15 avis, 15 clients seedés supprimés de la DB
- [ x ] **Pages légales** — `/cgu` et `/confidentialite` créées ; footer desktop dans `AppShell` ; lien `/inscription` corrigé
- [ x ] **Feed amélioré** — `trending` avec décroissance temporelle ; `scored` inclut `reviews_count` et `visits_count` ; `AvailableTodaySection` injectée dans la homepage
- [ x ] **Navigation salon dashboard** — lien "Mon salon" / "Rejoindre un salon" conditionnel dans la sidebar desktop
- [ x ] **Navigation `/favoris`** — `PageHeader` avec bouton retour ajouté
- [ x ] **Typos accents corrigés** — `/reserver`, `/compte`, `/dashboard`, `/inscription`
- [ x ] **Badge prototype supprimé** — "Bientôt Premium" retiré de la homepage
- [ x ] **`mockData.ts` supprimé** — fichier inutilisé

### Bugs actifs 🐛

**B40 — `chair_preferences` localStorage peut être désyncronisé avec la DB** : à la connexion, si localStorage est vide mais que la DB a des préférences, la section "Pour toi" ne s'affiche pas. Fix prévu : écrire les prefs DB dans localStorage dans `AuthContext::login()`.

**B41 — PHP 8.0 / vendor 8.4** : `vendor/composer/platform_check.php` doit être bypassé manuellement après chaque `composer install` (le vendor a été généré sur une machine PHP 8.4).

### Bugs résolus (historique complet)
| # | Symptôme | Fix |
|---|---|---|
| B1 | Nouveau coiffeur inscrit → "Profil introuvable" | `register()` crée `HairdresserProfile` |
| B2 | Images uploadées cassées dans `<Image>` | `localhost:8000` dans `next.config.ts` `remotePatterns` |
| B3 | URLs `/storage/...` vides partout | Helper `resolveMediaUrl()` utilisé dans tous les composants |
| B4 | Stats dashboard vides après connexion | `login()` retourne `hairdresser_profile` |
| B5 | Avatar uploadé invisible dans TopNav et `/compte` | `updateUser()` dans AuthContext + affichage réel |
| B6 | `GET /api/profile` → 404 si profil absent | `ProfileController::show()` auto-crée le profil |
| B7 | `/inscription?role=hairdresser` ignorait le paramètre | Lecture de `window.location.search` au montage |
| B8 | Message d'erreur générique cachait la vraie cause | `catch((e) => ...)` affiche `e.message` |
| B9 | Emojis dans les descriptions des posts seedés | Supprimés du `DatabaseSeeder.php` |
| B10 | Avatars cassés dans la page Favoris | `resolveMediaUrl()` ajouté dans `/favoris` |
| B11 | Nom coiffeur illisible sans bannière | Fond `bg-neutral-800` sur le profil public |
| B12 | `avg_rating` affichait "0.00" sans avis | Conditionné sur `reviews_count > 0`, affiche "—" sinon |
| B13 | Champs nullable impossibles à vider | `array_key_exists` dans `ProfileController::update()` |
| B14 | `posts_count = 0` pour les coiffeurs seedés | `posts_count: 3` ajouté dans `DatabaseSeeder` |
| B15 | `banner_image = ''` au lieu de null | Migration SQL + nettoyage DB |
| B16 | `city` NOT NULL en DB | Migration `ALTER TABLE ... MODIFY city ... NULL` |
| B17 | Filtres spécialités ignorés dans `/rechercher` | `useSearchParams()` + initialisation depuis URL |
| B18 | Coiffeur voit "Suivre/Sauvegarder" sur son propre profil | Bouton "Modifier mon profil" si profil propre |
| B19 | `PostCard` crash `post.hairdresser undefined` | `HairdresserController::posts()` charge `hairdresser.user` + PostCard défensif |
| B20 | 404 en cliquant sur réalisation depuis le feed | Même fix que B19 (hairdresser.slug disponible) |
| B21 | Apostrophes JSX cassaient le parser (`/rechercher`) | Strings avec apostrophe en double quotes |
| B22 | Images `localhost:8000/storage/...` → 400 Bad Request | Next.js 16 bloque les IP privées par défaut → `dangerouslyAllowLocalIP: true` + `pathname: '/storage/**'` dans `next.config.ts` |
| B23 | Images uploadées en prod non servies (localhost) | Intégration Cloudinary — nouveaux uploads → `res.cloudinary.com`, anciens `/storage/...` conservés |
| B24 | `POST /api/services` → 500 "Cannot unpack array with string keys" | PHP 8.0 n'accepte pas `[...$assocArray]` → `array_merge()` dans `ServiceController::storeService()` |
| B25 | Même risque dans `ScheduleController` et `AppointmentController` legacy | `array_merge()` appliqué par précaution |
| B26 | Warnings React "NaN is not a valid number" sur l'input prix | `parseFloat('')` = NaN → `isNaN(v) ? 0 : v` + init `!= null` |
| B27 | Sidebar dashboard affichait cadenas au lieu des vraies pages | `navItems` reécrit avec 7 liens réels, cadenas supprimés |
| B28 | Compteur abonnés dans `/dashboard` figé à la valeur du login | `/dashboard/page.tsx` — ajout `apptApi.getStats()` au montage → `liveStats` prioritaire sur le cache localStorage |
| B29 | Services créés dans dashboard invisibles côté client | Faux bug — code correct : le slug de `publicList` cible bien le profil du coiffeur. Cause réelle : test effectué avec un compte différent (julien-2 ≠ julien-schillinger). Liaison vérifiée et validée. |
| B30 | Aucun créneau proposé dans le parcours réservation | `start_time`/`end_time` sauvegardés `NULL` en base : le toggle "Ouvert" n'initialisait pas les heures (le `?? '09:00'` était purement visuel, jamais dans le state React). Fix : `toggleDay()` initialise `start_time='09:00'` et `end_time='19:00'` si null. Fix DB : UPDATE des 6 rows existantes. |
| B31 | Pas de confirmation après sauvegarde des horaires | Aucun toast success. Fix : `successMsg` state + banner `"Horaires enregistres"` (disparaît après 3s). |
| B32 | `start_time` retourné "09:00:00" par MySQL → bug validation au 2e save | DB TIME → "HH:MM:SS", validation `date_format:H:i`. Fix : `normalizeSchedule()` coupe à 5 chars au chargement. |
| B33 | "Invalid Date" dans les cartes RDV du planning | `appointment_date` casté `'date'` en Laravel → sérialisé "2026-06-03T00:00:00.000000Z". `dateStr + 'T00:00:00'` invalide. Fix : cast `'date:Y-m-d'` dans `Appointment.php` + helpers `apptDateStr()` / `formatApptDate()` dans `types.ts`. |
| B34 | Dots calendrier planning absents / vue jour vide | Même cause que B33 (comparaison string "2026-06-03" ≠ "2026-06-03T…"). Fix : `apptDateStr()` normalise via `.slice(0, 10)` avant comparaison. |
| B35 | Pas de vue client pour ses réservations | Pas d'endpoint `GET /my-appointments`. Fix : `clientAppointments()` dans `AppointmentController` + route + section "Mes reservations" dans `/compte`. |
| B36 | Réservations client absentes dans `/compte` malgré l'endpoint | `POST /appointments` est une route publique — sur ces routes, `$request->user()` retourne `null` même si un token est envoyé (Sanctum n'authentifie pas sans middleware). `client_id` restait `NULL` en base. Fix : `\Auth::guard('sanctum')->user()` dans `store()` et `reviewByToken()` pour résoudre le token même sans middleware. RDVs existants patchés via `UPDATE appointments SET client_id = 31 WHERE client_email = 'client@gmail.com'`. |
| B37 | `ALTER TABLE reviews DROP INDEX` échoue (FK support) | MySQL refuse de supprimer un index UNIQUE si des FK l'utilisent. Fix : créer d'abord des index séparés sur `hairdresser_id` et `client_id`, puis supprimer l'index UNIQUE composite. |
| B38 | Stat "Visites" affichait "—" sur le profil public | `visits_count` absent de `hairdresser_profiles`. Fix : migration + backfill + `$fillable` + incrément dans `updateStatus()`. |
| B39 | `service_categories.visits_count` jamais incrémenté | `store()` incrémentait seulement le service, pas la catégorie. Fix : ajout `ServiceCategory::where('id', $service->category_id)->increment('visits_count')`. |

### Non commencé ○ (prochaines priorités)
- [ ] SEO — `generateMetadata()` + sitemap.xml + structured data JSON-LD ← **critique acquisition**
- [ ] Config production : `NEXT_PUBLIC_API_URL` en prod (Railway/Render)
- [ ] `next.config.ts` remotePatterns en prod (remplacer localhost:8000 par domaine API)
- [ ] Entité juridique ← **bloquant lancement commercial**
- [ ] Inscription : champs `work_status` / `work_address` coiffeur indépendant

---

## 14. DIRECTION UX/UI

### Principes fondateurs
1. **Mobile-first absolu** — l'expérience mobile est la référence, desktop est une adaptation
2. **Photo-first** — les images occupent le maximum d'espace, pas les textes
3. **Sobre et éditorial** — inspiré de Vogue, Airbnb, Apple Photos
4. **Simple pour les coiffeurs** — une grande partie n'est pas experte en digital

### Palette
| Rôle | Valeur |
|---|---|
| Fond principal | `#ffffff` blanc pur |
| Texte principal | `#0a0a0a` quasi-noir |
| Texte secondaire | `neutral-400` (#a3a3a3) |
| Bordures | `neutral-100` à `neutral-200` |
| Fond surfaces | `neutral-50` (#fafafa) |
| CTA principal | `neutral-900` fond noir, texte blanc |
| Interdit | Toute couleur vive, emojis, dégradés colorés |

### Typographie
- Police : Geist Sans (Google Fonts, chargée via Next.js)
- Taille corps mobile : 12–14px
- Labels de section : `text-[13px] font-semibold tracking-wide uppercase`
- Titres hero : mélange bold + italic léger
- Prix / stats : `font-semibold` jamais `font-bold` dans les cartes

### Composants clés — règles
**HairdresserCard**
- Format `aspect-[3/4]` portrait
- Image pleine, gradient `from-black/80`
- Spécialités : micro-badges `backdrop-blur`, `uppercase tracking-wide` 10px
- Jamais de zone blanche sous l'image

**PostCard**
- Image carrée `aspect-square`
- Avant/Après : séparateur `gap-px bg-neutral-900` 1px
- Labels "Avant" / "Après" : 9px, `tracking-[0.15em] uppercase`, blancs semi-transparents
- Infos sous l'image : fond blanc pur, jamais sur l'image

**BottomNav**
- Icônes seules, sans labels texte
- Strokewidth : 2 actif, 1.5 inactif
- Indicateur : point 4px noir sous l'icône active
- `pb-safe` pour iPhones avec home bar

**TopNav desktop**
- Logo `CHAIR` en `tracking-[0.12em] uppercase font-bold`
- Navigation : texte seul, pas d'icônes, pas de fond actif lourd
- CTA "S'inscrire" : `rounded-full` (pill)

### Ce qu'on évite
- Emojis (aucun, nulle part)
- Couleurs d'accentuation vives
- Ombres portées lourdes (`shadow-xl`)
- Bordures trop épaisses
- Textes sur images sans gradient de protection
- Rounded excessif (`rounded-3xl`)
- Cards avec beaucoup de sections séparées par des `border-t`

---

## 15. DONNÉES DE TEST

### Comptes coiffeurs (mot de passe universel : `password`)

| Nom | Email | Slug | Ville | Note |
|---|---|---|---|---|
| Sophie Martin | sophie@chair.fr | `sophie-martin` | Strasbourg | 4.9 |
| Lucas Bernard | lucas@chair.fr | `lucas-bernard` | Strasbourg | 4.8 |
| Amara Diallo | amara@chair.fr | `amara-diallo` | Paris | 5.0 |
| Clara Petit | clara@chair.fr | `clara-petit` | Lyon | 4.7 |
| Mehdi Razzouk | mehdi@chair.fr | `mehdi-razzouk` | Colmar | 4.6 |

### Clients de test (générés automatiquement)
- Emails : `client{index}{i}@example.com`
- Mot de passe : `password`

### URLs de test
- Profil Sophie : `http://localhost:3000/coiffeur/sophie-martin`
- API coiffeurs : `http://localhost:8000/api/hairdressers`
- API feed : `http://localhost:8000/api/feed`

---

## 16. CONVENTIONS DE DÉVELOPPEMENT

### Backend Laravel
- Controllers dans `app/Http/Controllers/Api/`
- Noms de controllers : `NomController.php` (PascalCase)
- Routes toutes dans `routes/api.php`, préfixe `/api` automatique
- Réponses JSON toujours via `response()->json()`
- Pagination : `->paginate(20)` par défaut
- Validation : dans le controller directement avec `$request->validate()`
- Modèles : `$fillable` explicite, jamais `$guarded = []`

### Frontend Next.js
- App Router (pas Pages Router)
- Server Components par défaut
- `'use client'` uniquement si hooks React ou événements navigateur
- Params dynamiques : `async` + `await params` (Next.js 16)
- Imports : alias `@/` pour la racine du projet
- Toutes les pages utilisent l'API réelle — `mockData.ts` obsolète (ne pas réintroduire)
- Pas de `any` TypeScript — typer tous les composants
- `useSearchParams()` nécessite un `<Suspense>` wrapper dans les pages Client Components

### CSS / Tailwind
- Mobile-first : classes sans préfixe = mobile, `md:` = desktop
- Pas de `style={{}}` inline sauf cas exceptionnel
- Classes utilitaires Tailwind uniquement (pas de CSS custom sauf `globals.css`)
- Variantes d'état : `hover:`, `focus:`, `active:` — pas de JS pour ça
- `no-scrollbar` défini dans `globals.css` pour les scroll horizontaux

### Git (à mettre en place)
- Branches : `feat/nom-feature`, `fix/description`, `refactor/scope`
- Commits : type + description courte en français
- Pas de `git push --force` sur main

### Nommage
- Composants : `PascalCase.tsx`
- Hooks : `use` prefix
- Fonctions utilitaires : `camelCase`
- Routes API : `kebab-case`
- Slugs : `kebab-case` généré depuis le nom

---

## 17. PROBLÈMES CONNUS

### Actifs (à traiter)

**P1 — PHP non dans le PATH système**
`C:\xampp\php\php.exe` n'est pas dans le PATH Windows. Chaque session PowerShell nécessite :
```powershell
$env:PATH = "C:\xampp\php;" + $env:PATH
```
Solution permanente : ajouter ce chemin dans les variables d'environnement système Windows.

**P2 — `post_images` vide dans les données seedées**
Les posts du seed utilisent `cover_image` (URL Unsplash directe) mais n'ont pas d'entrées dans `post_images`. Fonctionnel en affichage via le fallback dans `getAfterImage()`. Les nouveaux posts créés via le dashboard ont leurs `post_images` correctement renseignées. Impact : aucun post seedé n'affiche d'avant/après — seulement les posts uploadés par les vrais utilisateurs.

**P3 — Icônes spécialités avec emojis en base**
Le champ `icon` de la table `specialties` contient des emojis (💛, 🌀…). Non utilisé par le frontend. À nettoyer lors du prochain `migrate:fresh --seed`.

**P4 — Page profil coiffeur pré-refonte UI**
`/coiffeur/[slug]` design antérieur à la refonte globale. Refonte planifiée (tabs Réalisations / Avis, inspiré LinkedIn/Instagram).

~~**P5 — `http://localhost:8000` hardcodé dans le frontend**~~ ✓ Corrigé Sprint Beta — `.env.local` créé, tous les hardcodes remplacés par `process.env.NEXT_PUBLIC_API_URL`. **Pour la production**, créer `.env.production` avec `NEXT_PUBLIC_API_URL=https://api.getchair.app/api` et mettre à jour `next.config.ts` remotePatterns.

**P6 — `doctrine/dbal` incompatible avec PHP 8.0 + laravel 8.x-dev**
`composer require doctrine/dbal` échoue. Workaround : `DB::statement()` pour les migrations ALTER TABLE (déjà appliqué).

### Résolus ✓
- ~~SSL Avast bloquait Composer~~ → désactivation Avast temporaire
- ~~PHP 8.0 incompatible Laravel 9+~~ → utilisation Laravel 8
- ~~Params async Next.js 16~~ → `await params`
- ~~Emojis dans le frontend~~ → tous supprimés
- ~~Frontend non connecté à l'API~~ → toutes les pages utilisent l'API réelle
- ~~Auth formulaires non fonctionnels~~ → auth complète avec Sanctum
- ~~Nouveau coiffeur inscrit sans profil~~ → `register()` crée le profil automatiquement
- ~~Images uploadées non affichées~~ → `resolveMediaUrl()` + `localhost:8000` dans remotePatterns
- ~~Avatar non propagé après upload~~ → `updateUser()` dans AuthContext
- ~~`GET /api/profile` 404 si profil absent~~ → auto-création défensive dans `ProfileController`
- ~~Page 404 générique Next.js~~ → `app/not-found.tsx` créé dans le style CHAIR
- ~~Avatars cassés dans Favoris~~ → `resolveMediaUrl()` ajouté
- ~~Texte illisible sans bannière (fond gris clair)~~ → fond `bg-neutral-800`
- ~~`avg_rating = "0.00"` pour nouveaux coiffeurs~~ → `"—"` si `reviews_count === 0`
- ~~Champs nullable impossibles à vider~~ → `array_key_exists` dans `ProfileController::update()`
- ~~`posts_count = 0` pour coiffeurs seedés~~ → `posts_count: 3` dans le seeder
- ~~`banner_image = ''` (chaîne vide) au lieu de `null`~~ → migration SQL + nettoyage
- ~~`city` NOT NULL en DB~~ → migration ALTER TABLE nullable
- ~~Filtres spécialités ignorés dans `/rechercher`~~ → `useSearchParams()` ajouté
- ~~Coiffeur voit "Suivre" sur son propre profil~~ → bouton "Modifier mon profil" si profil propre
- ~~`PostCard` crash `post.hairdresser undefined`~~ → `HairdresserController::posts()` charge `hairdresser.user` + PostCard défensif
- ~~404 en cliquant sur réalisation depuis le feed~~ → même fix
- ~~Aucun système d'avis fonctionnel~~ → `ReviewController` + `ReviewForm` + `ReviewsSection`
- ~~Page d'accueil sans effet "wow"~~ → refonte complète Sprint D

---

## 18. BACKLOG FONCTIONNEL

### Priorité 1 — Avant le lancement

| Tâche | Complexité | Impact | Statut |
|---|---|---|---|
| Variable env `NEXT_PUBLIC_API_URL` | Très faible | **Bloquant prod** | À faire |
| Onboarding post-inscription coiffeur | Faible | **Critique** | À faire |
| CGU + Politique confidentialité + Footer légal | Faible | **Bloquant légal** | À faire |
| SEO — `generateMetadata` + sitemap + structured data | Faible | **Critique acquisition** | À faire |
| Réservation V0 — champ `booking_url` + bouton redirect | Très faible | **Haute** | À faire |

### Priorité 2 — Pour une V1 complète

| Tâche | Complexité | Impact | Statut |
|---|---|---|---|
| Refonte UI — page Profil coiffeur (tabs Réalisations/Avis) | Faible | Haute | À faire |
| Page salon (liste des coiffeurs de l'équipe) | Moyenne | Haute | À faire |
| Système de notifications | Moyenne | Haute | À faire |

### Terminé ✓

| Tâche | Sprint |
|---|---|
| Dashboard — section "Réalisations récentes" | 6 |
| Page 404 personnalisée | 5 |
| Page erreur globale + skeletons de chargement | 6 |
| Système d'avis complet (ReviewController + ReviewForm + ReviewsSection) | C |
| Navigation mobile dashboard (DashboardNav) | C |
| Refonte page Recherche (filtres mobile-first, catégories) | C |
| Refonte page Accueil (hero + tuiles + feed remonté) | D |
| TopNav transparent scroll-aware sur homepage | D |

### Priorité 3 — Post-lancement V1

| Tâche | Complexité | Impact |
|---|---|---|
| Réservation native (Pro — formulaire demande RDV) | Haute | Critique V2 |
| Agenda coiffeur avec disponibilités | Très haute | Critique V2 |
| Paiement en ligne Stripe | Très haute | Critique V2 |
| CHAIR Rent (marketplace fauteuils) | Très haute | Stratégique |
| Meilisearch (recherche avancée) | Moyenne | Haute |
| Cloudinary (médias production) | Moyenne | Haute |
| Rappels SMS (Twilio) | Haute | Moyenne |
| Notifications push | Haute | Moyenne |
| Application mobile native | Très haute | V3 |
| Vidéos dans les posts | Haute | V3 |
| Messagerie interne | Haute | V3 |
| CHAIR Brands (B2B) | Haute | Stratégique V3 |
| CHAIR Talent (recrutement) | Haute | V3 |

---

## 19. ROADMAP 3 ANS

### Année 1 — Fondations & Validation (2026)
**Objectifs :**
- V1 lancée : profil, portfolio, feed, recherche, avis
- 2 000 coiffeurs actifs
- 10 000 clients
- 5 régions françaises
- ARR : 0 → 200 K€

**Milestones :**
- M3 : 100 coiffeurs en Alsace, product-market fit local
- M6 : expansion régionale, premiers abonnements Pro
- M9 : 1 000 coiffeurs
- M12 : 2 000 coiffeurs, levée de fonds envisageable

### Année 2 — Croissance & Monétisation (2027)
**Objectifs :**
- 15 000 coiffeurs (10% marché français)
- 80 000 clients
- Couverture nationale
- Réservation native (Pro)
- CHAIR Rent beta
- ARR : 1,5 → 3 M€
- Levée Série A possible (5–10 M€)

### Année 3 — Domination & Expansion (2028)
**Objectifs :**
- 40 000 coiffeurs (25% marché)
- 300 000 clients
- CHAIR Brands, Academy, Talent
- Expansion Belgique / Suisse / Maroc
- ARR : 8 → 15 M€
- Valorisation cible : 50 → 150 M€

### Go To Market
1. **Lancement invite-only** dans 1 ville (Strasbourg recommandé)
2. **Les 20 premiers coiffeurs** : meilleurs comptes Instagram locaux, approche personnalisée
3. **Statut Fondateur** : accès gratuit à vie au Pro en échange d'ambassadoriat
4. **Levier patron de salon** : 1 patron = 4 à 8 coiffeurs onboardés simultanément
5. **Partenariat CFA** : apprentis = utilisateurs naturels qui ont besoin de portfolio
6. Ne pas monétiser avant 1 000 coiffeurs actifs

---

## 20. DOCUMENTS STRATÉGIQUES

| Fichier | Contenu |
|---|---|
| `docs/PROJECT_MEMORY.md` | Source de vérité technique — stack, DB, API, composants, état du développement |
| `docs/NEXT_SESSION.md` | Reprise de contexte — bugs résolus, priorités, commandes de lancement |
| `docs/chair_miro.py` | Script Python → génère automatiquement le board Miro stratégique (17 zones) via API |

### Board Miro CHAIR — contenu des 17 zones

| Zone | Contenu |
|---|---|
| 01 | Vision, Mission, North Star, Ambitions 3/5/10 ans |
| 02 | État actuel — diagnostic honnête produit + business + marketing |
| 03 | Thèse de marché — pourquoi maintenant, contrainte structurelle concurrents |
| 04 | Personas — Coiffeur Salarié, Indépendant, Patron, Client, Apprenti CFA |
| 05 | Business Model — 4 moteurs de revenus, projections MVP→V3 |
| 06 | Offres & Tarification — Free / Pro / Business / Salon / Certification |
| 07 | Acquisition Coiffeurs — 0→100, 100→1 000, 1 000→10 000 |
| 08 | Acquisition Clients — SEO, Instagram, TikTok, réseau coiffeurs |
| 09 | Plan de Communication — Instagram, TikTok, LinkedIn, Email, Presse |
| 10 | Plan de Lancement — Alsace → Grand Est → National |
| 11 | CHAIR Rent — analyse froide, verdict : V4 pas avant 10 000 coiffeurs |
| 12 | Roadmap Produit — Maintenant, 3m, 6m, 12m, 24-36m |
| 13 | Risques — matrice complète + cercle vicieux à éviter |
| 14 | Tableau de Bord CEO — KPIs hebdo, mensuels, trimestriels |
| 15 | Plan d'Action Fondateur — Demain, semaine, mois, trimestre, année |
| 16 | Hypothèses Fondatrices — 6 croyances à valider avec deadlines |
| 17 | Avantages Concurrentiels — 5 moats + questions à remettre en question |

### Générer le board Miro
```powershell
# 1. Créer une app sur miro.com/app/settings/user-profile/apps → copier le token
# 2. Créer un board Miro vide → copier le Board ID depuis l'URL
# 3. Renseigner TOKEN et BOARD_ID dans docs/chair_miro.py
pip install requests
python docs/chair_miro.py
```

---

## 21. COMMANDES DE LANCEMENT

**Prérequis :** XAMPP démarré (Apache + MySQL actifs)

### Backend
```powershell
# Ajouter PHP au PATH (à faire chaque session)
$env:PATH = "C:\xampp\php;" + $env:PATH

# Démarrer l'API
cd C:\xampp\htdocs\chair-app\backend
php artisan serve --port=8000
```
→ API disponible sur `http://localhost:8000`

### Frontend
```powershell
cd C:\xampp\htdocs\chair-app\frontend
npm run dev
```
→ App disponible sur `http://localhost:3000`

### Reset complet de la base
```powershell
$env:PATH = "C:\xampp\php;" + $env:PATH
cd C:\xampp\htdocs\chair-app\backend
php artisan migrate:fresh --seed
```

### Build de vérification
```powershell
cd C:\xampp\htdocs\chair-app\frontend
npx next build
```

### Tester l'API
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/hairdressers" | ConvertTo-Json -Depth 2
```

### Tester mobile dans Chrome
1. Ouvrir `http://localhost:3000`
2. F12 → icône téléphone (Toggle device toolbar) ou Ctrl+Shift+M
3. Sélectionner iPhone 14 Pro (393px) ou iPhone SE (375px)
