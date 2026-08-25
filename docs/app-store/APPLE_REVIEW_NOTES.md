# App Review Notes — CHAIR (client) — version finale

Texte à coller dans **App Store Connect → App Review Information → Notes**. En anglais (langue
de travail d'App Review). Les deux `<>` sont à remplir : identifiants du compte de review
(`APPLE_REVIEW_ACCOUNT_SETUP.md`) et adresse de support (`ACTION_GERANT.md` entrée 4).

**Chaque chemin ci-dessous a été re-vérifié dans le code le 24 août 2026 (vague 3).** Rappel :
l'app charge `https://www.getchair.app/app` — ces notes ne sont vraies qu'une fois le working
tree **déployé en production**. Ne pas soumettre avant.

---

## Texte à coller

```
CHAIR is a French marketplace for discovering and booking hairdressers.
Interface in French; test region: France. Haircuts are physical services
performed in a salon and paid on site: the app contains no payment of any
kind - no in-app purchase, no subscription, no card field (guideline
3.1.3(e)). Hairdressers and salon owners use a separate app, CHAIR PRO;
no professional feature is part of this app.

DEMO ACCOUNT (client): <email> / <password>
Browsing, search and profiles work without an account; booking, favorites
and posting reviews require one. The account has favorites, one upcoming
appointment (cancellable from the "Compte" tab) and one past appointment
on which a review can be posted.

BOOKING: "Rechercher" tab > type a city (e.g. "Strasbourg") or allow
location > open a profile > "Réserver un rendez-vous" > pick a service,
date and slot > confirm. The confirmation states payment happens at the
salon; no amount is ever charged.

ACCOUNT DELETION (5.1.1(v)): "Compte" tab > "Supprimer mon compte" > type
SUPPRIMER > "Supprimer définitivement mon compte". Immediate, in-app.

UGC (1.2): reports via the "..." button on profiles, feed posts and post
details ("Signaler"); reviews via profile > "Avis" tab > "Signaler un
avis". Text is also filtered server-side at submission (insults, hate
speech, contact details are rejected). Blocking: "..." > "Bloquer ce
compte"; blocked accounts disappear from feed, search and suggestions,
and are managed at /app/regles-communaute (community rules page).

NOTIFICATIONS: "Compte" > "Notifications" (10 switches). In-app and email
only; this version never asks for push permission.

LOCATION: requested only on the search screen, only after tapping
"Autoriser", foreground only, used to sort results by distance. If
denied, search by city works and every screen stays reachable.

Privacy policy: https://www.getchair.app/confidentialite
Support: <adresse de support> (answered within 72 business hours)
```

---

## Chemins vérifiés le 24 août 2026 (vague 3)

| Affirmation | Vérifié dans |
|---|---|
| Onglet « Rechercher » | `components/layout/BottomNav.tsx:14` |
| CTA « Réserver un rendez-vous » sur la fiche | `components/ui/BookingCTA.tsx:42` ; masqué sur l'onglet Services (`coiffeur/[slug]/page.tsx:197`, `hideStickyCtaOnTab="services"`) où chaque prestation a son bouton (`PublicProfileServices.tsx:131`) |
| Paiement au salon affiché à la confirmation | `components/ui/BookingSheet.tsx:412` (« Sur place, au salon »), `:784` (« Aucun paiement dans l'application ») |
| Suppression : Compte → « Supprimer mon compte » | `app/app/compte/page.tsx:504-508` → `/app/compte/supprimer` ; saisie `SUPPRIMER` (`supprimer/page.tsx:157-178`) ; backend immédiat (`AuthController::deleteAccount`) |
| Menu `⋯` « Signaler » / « Bloquer ce compte » | `ContentMenu` (`ReportSheet.tsx`) posé sur `coiffeur/[slug]:120`, `feed:275`, `realisation/[id]:136`, `salon/[slug]:101,163` |
| « Signaler un avis » dans l'onglet Avis | `components/ui/PublicProfileReviews.tsx:62` |
| Filtrage serveur au dépôt | `backend/app/Services/ContentFilter.php`, branché sur `VisitController:223`, `AppointmentController:584,658`, `PostController` (4 points) — 422 avec message. **Le filtre n'analyse pas les images** ; ne pas prétendre le contraire |
| Blocage : fil, recherche, suggestions, liste | `UserBlock::blockedIdsFor` dans `HairdresserController:96` (index) et `:394` (fil), `SearchController:80,204`, `ExploreController:77`, `RecommendationController:57`. **Les classements ne sont pas filtrés** — c'est pourquoi les notes disent « feed, search and suggestions », rien de plus |
| Comptes bloqués gérés sur les règles de communauté | `app/app/regles-communaute/page.tsx:194` (`BlockedAccountsList`) |
| 10 interrupteurs de notification | `app/app/notifications/preferences/page.tsx` : 10 booléens (`DEFAULT`), 10 `<Row>` ; lien depuis `compte:401` |
| Aucun push système | aucun SDK push dans `frontend/package.json`, `packageClassList = ["GeolocationPlugin"]` |
| Position : `/app/recherche` seulement, sur tap | `components/ui/GeoPermissionModal.tsx:38,67` (`GEO_RELEVANT_PATH`) |
| Annulation du RDV à venir | `PUT /appointments/{id}/cancel` (`routes/api.php:328`), bouton `compte:636` |
| Avis possible sur le RDV passé | `AppointmentController::submitReview:558` — exige `completed` + aucun avis existant (d'où un RDV passé **sans** avis dans le compte de review) |

## À ne pas faire

- Ne pas coller avant le **déploiement en production** et un test sur appareil.
- Ne rien promettre d'absent du build ; pas de demande d'indulgence ; **aucun comportement
  spécifique reviewer** (motif de bannissement, pas de simple rejet).
- Ne pas mentionner CHAIR PLUS, Stripe ni l'espace pro au-delà de la phrase « separate app » —
  l'app client ne vend rien, inutile d'attirer la lecture 3.1.1(a).
- Ne pas écrire que le blocage fait « disparaître » un compte partout : la fiche ouverte en lien
  direct affiche un bandeau « compte bloqué » (`BlockedProfileNotice`) et les classements ne sont
  pas filtrés. La formulation des notes s'en tient à la portée réelle.
- Si la production n'a pas de coiffeurs réservables à Strasbourg le jour de l'envoi, changer la
  ville citée dans les notes **et** celle du compte de review.
