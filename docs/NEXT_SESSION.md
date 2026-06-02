# NEXT SESSION — Reprise de contexte CHAIR
> Lire ce fichier en premier au début de chaque session.
> Dernière mise à jour : 2026-06-02 (session — Beta Stabilisation : env var, onboarding, données fake, navigation, légal, feed, typos)

---

## OÙ EN SOMMES-NOUS ?

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

## BASE DE DONNÉES — ÉTAT APRÈS NETTOYAGE

| Table | Quantité |
|---|---|
| users | 17 |
| hairdresser_profiles | 14 |
| posts | 4 |
| reviews | 5 |
| specialties | 12 |

Tous les profils sont des comptes réels créés manuellement pendant les tests.

---

## PRIORITÉS POUR LA PROCHAINE SESSION

### PRIORITÉ 1 — Avant lancement public (getchair.app)

- [ ] **Configurer `NEXT_PUBLIC_API_URL` en production** (Railway/Render : `https://api.getchair.app/api`)
- [ ] **SEO** — `generateMetadata()` sur `/coiffeur/[slug]` (title, description, og:image)
- [ ] **sitemap.xml** dynamique (routes coiffeurs + spécialités)
- [ ] **Structured data JSON-LD** sur les profils (`@type: Person` ou `@type: LocalBusiness`)

### PRIORITÉ 2 — Inscription améliorée

- [ ] `/inscription` step 2 coiffeur indépendant : ajouter "Type de lieu" (`work_status`) + "Adresse pro" (`work_address`)
- [ ] `AuthController::register()` : accepter `work_status` + `work_address`
- [ ] Redirect `/onboarding` après inscription (déjà implémenté dans `redirectPathForRole()`)

### PRIORITÉ 3 — Améliorations UX post-beta

- [ ] Recalcul automatique `avg_rating` / `reviews_count` sur les profils après suppression d'un avis
- [ ] Photos de profil des coiffeurs existants (14 profils manquent de photos)
- [ ] Seeder mis à jour : ne plus créer de coiffeurs fictifs (garder juste les spécialités)
- [ ] Notifications push Firebase/OneSignal (table `push_subscriptions` prête)

### PRIORITÉ 4 — Production checklist

- [ ] `.env.production` avec vraies URLs (API Railway, Cloudinary configuré)
- [ ] `next.config.ts` : remplacer `localhost:8000` dans `remotePatterns` par domaine prod
- [ ] Certificat SSL + domaine `getchair.app` configuré
- [ ] Monitoring erreurs (Sentry ou similar)

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
