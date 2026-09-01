# CHAIR+ — abonnement, entitlement et features

Stories livrées le 2026-07-13. Stripe + `subscriptions` livrés le 2026-07-13
(suite). CHAIR+ est maintenant un vrai produit payant, pas juste une
récompense banquée.

## Principe

CHAIR gratuit permet de construire sa réputation. CHAIR+ accélère la
visibilité d'un mérite réel — il ne fabrique jamais un mérite qui n'existe
pas. Aucune fonctionnalité gratuite existante ne doit jamais devenir payante.

## Entitlement — un seul point de vérité

`HairdresserProfile::hasChairPlus()` vérifie, dans l'ordre :
1. **Banqué** — `chair_plus_until > now()` (récompense parrainage, palier 5 filleuls).
2. **Payé individuel** — une ligne `subscriptions` (`plan=chair_plus`) dont `coversToday()` est vrai (trialing dans la fenêtre d'essai, ou active/past_due avant `current_period_end`).
3. **CHAIR BUSINESS du salon** — si le coiffeur est rattaché à un salon dont `Salon::hasChairBusiness()` est vrai (couvre toute l'équipe, voir plus bas).

Trois sources, une seule méthode. Rien d'autre dans le code ne doit vérifier
ces sources séparément — chaque nouvelle feature CHAIR+ appelle `hasChairPlus()`,
jamais `chair_plus_until` ou `subscriptions` directement.

## Stripe — architecture

**Table `subscriptions`** : `hairdresser_profile_id` (nullable, chair_plus)
OU `salon_id` (nullable, chair_business) — exactement un des deux rempli.
`plan`, `status` (trialing|active|past_due|canceled), `stripe_customer_id`,
`stripe_subscription_id` (unique), `trial_ends_at`, `current_period_end`,
`canceled_at`.

**Table `stripe_webhook_events`** : idempotence — chaque `stripe_event_id`
n'est traité qu'une fois (Stripe peut renvoyer le même événement plusieurs
fois). Contrainte unique + `insertOrIgnore`, si l'insert échoue (déjà vu) on
répond 200 sans retraiter.

**`StripeService`** :
- `createCheckoutSession(User, plan)` — Stripe Checkout, `mode=subscription`, `trial_period_days=30`, métadonnées (`plan`, `hairdresser_profile_id` ou `salon_id`) posées à la fois sur la session ET `subscription_data` pour être lisibles depuis le webhook.
- `createBillingPortalSession(customerId)` — lien vers le Stripe Customer Portal (le client y gère sa carte, ses factures, son annulation — pas d'UI custom à construire/sécuriser nous-mêmes).
- `handleEvent(Event)` — route `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` / `invoice.payment_failed` vers les handlers qui synchronisent `subscriptions`.

**`StripeWebhookController`** (`POST /stripe/webhook`, route PUBLIQUE — Stripe
n'a pas de token Sanctum) : vérifie `Stripe-Signature` via `Webhook::constructEvent()`
(400 si invalide), déduplique via `stripe_webhook_events`, appelle `StripeService::handleEvent()`
dans un try/catch (une erreur de traitement est loguée mais ne fait pas
retenter Stripe indéfiniment sur un event qu'on ne pourra de toute façon pas
traiter).

**Statut `past_due`** : `coversToday()` garde l'accès tant que
`current_period_end` n'est pas dépassé — Stripe retente automatiquement le
paiement (Smart Retries) pendant ce temps. L'accès n'est coupé qu'à
`customer.subscription.deleted` (annulation réelle) ou passé la date de fin
de période.

## CHAIR BUSINESS — architecture prête, achat pas construit

`subscriptions.salon_id` + `Salon::hasChairBusiness()` existent. Le flow
`POST /subscribe {plan: chair_business}` fonctionne déjà côté backend (créé
un Checkout Session pour le gérant). Pas encore construit : page de vente
CHAIR BUSINESS dédiée, badge salon premium visible publiquement, analytics
équipe consolidées, support prioritaire — la donnée d'abonnement existe,
l'exploitation produit reste à faire.

## Endpoints

```
GET  /my-subscription        → état (has_chair_plus, ma souscription, celle du salon)
POST /subscribe              → {plan} → URL Stripe Checkout
POST /subscribe/manage       → URL Stripe Customer Portal
POST /stripe/webhook         → PUBLIC, signature Stripe uniquement
```

## Ce qui reste un placeholder tant que Julien n'a pas fourni ses vraies clés Stripe

`.env` contient des valeurs de test locales (`STRIPE_SECRET=sk_test_placeholder...`)
qui permettent de tester toute la logique webhook (signature, idempotence,
transitions de statut) sans clés réelles — mais **la création de Checkout
Session réelle échoue** (401 côté Stripe) tant que `STRIPE_SECRET` et les
deux `STRIPE_PRICE_*` ne sont pas remplacés par de vraies valeurs du
dashboard Stripe (mode test d'abord). Le code gère cet échec proprement
(502 côté API, pas de crash) — testé.

## Stories — première feature CHAIR+

Outil de fidélisation quotidienne, **pas** un outil de découverte : pas de
feed mondial, pas d'algorithme, pas de stories d'inconnus. Un client ne voit
que les stories des coiffeurs qu'il suit.

### Modèle de données

```
stories (id, user_id, media_url, type[image|video], expires_at, views_count, created_at)
story_views (id, story_id, user_id, created_at, unique[story_id, user_id])
```

`story_views` n'était pas dans le schéma demandé initialement — ajouté comme
détail d'implémentation nécessaire : sans dédoublonnage par spectateur,
`views_count` compterait des rechargements de page, pas des personnes
réelles (exactement le type de "faux chiffre" à éviter). Sert aussi à
calculer `has_unseen` par bulle.

### Règles

- Création réservée aux comptes `hasChairPlus()` — 403 sinon (`StoryService::create`).
- Durée de vie 24h (`expires_at`), purge automatique via `php artisan chair:purge-expired-stories` (planifiée toutes les heures, `Kernel::schedule`).
- Suppression manuelle réservée à l'auteur.
- Vue comptée une seule fois par spectateur (hors l'auteur lui-même).
- Feed = uniquement les coiffeurs que le client suit (`follows` table) — jamais de fallback vers une liste globale.

### Endpoints

```
GET    /stories/feed                    → bulles (coiffeurs suivis uniquement)
GET    /stories/mine                    → mes stories actives (coiffeur)
GET    /stories/by-hairdresser/{id}     → lecteur plein écran
POST   /stories                         → création (multipart, 403 si pas CHAIR+)
POST   /stories/{id}/view               → vue (dédupliquée)
DELETE /stories/{id}                    → suppression (auteur uniquement)
```

### Frontend

- `StoriesBar.tsx` — bulles horizontales sous la barre de recherche sticky de la home client (`/app`), DA CHAIR (anneau noir/blanc, pas le dégradé Instagram). Non-vues en premier.
- `StoryViewer.tsx` — plein écran, barres de progression segmentées, avance auto 5s (image) ou fin de lecture (vidéo), tap gauche/droite pour naviguer.
- `StoryCreateCard.tsx` — sur la home CHAIR PRO (`/pro`) : upload + gestion pour les abonnés, sinon message verrouillé pointant vers `/pro/parrainage` (seul moyen d'obtenir CHAIR+ tant que Stripe n'existe pas).

## Prochaines features CHAIR+ analysées (pas codées)

Voir le tour de discussion produit précédent pour l'analyse complète
(valeur/coût/risque/conversion/cohérence) : badge Certifié CHAIR discret,
réalisation épinglée, réalisation mise en avant, boost local plafonné, Coup
de cœur CHAIR, analytics d'évolution (abonnés/avis/réalisations). La
provenance des visites et les vidéos longues restent en V2 (tracking de vues
et coût Cloudinary vidéo à construire/chiffrer d'abord).

## V2 stories (pas fait)

Réponses, likes, mise en avant automatique d'une disponibilité de dernière
minute, statistiques avancées CHAIR+, stories visibles pour les favoris (pas
seulement les abonnements).

## Achat intégré Apple — binaire CHAIR PRO iOS (2026-09-01)

Le web reste sur Stripe ; DANS l'app iOS, la règle App Store 3.1.1 impose la
feuille de paiement Apple pour un abonnement numérique. Les deux tunnels
alimentent la MÊME table `subscriptions` (colonne `provider` : stripe|apple),
`hasChairPlus()` reste l'unique point de vérité.

**Flux** : `/pro/chair-plus` (binaire PRO détecté via lib/appContext.ts) →
`lib/iap.ts` → plugin `@capgo/native-purchases` (StoreKit) → feuille Apple →
reçu base64 → `POST /iap/verify` → `AppleIapService::syncFromReceipt()`
(validation /verifyReceipt avec la clé secrète partagée, repli sandbox sur
statut 21007) → ligne `subscriptions` provider=apple.

- L'identifiant produit `app.getchair.pro.chairplus.monthly` est défini en DEUX
  endroits à garder synchrones : `PRODUIT_CHAIR_PLUS` (frontend/lib/iap.ts) et
  `APPLE_IAP_PRODUCT_CHAIR_PLUS` (backend .env / config/services.php).
- Les 30 jours gratuits côté Apple = offre d'essai configurée SUR LE PRODUIT
  dans App Store Connect (le code ne fait que refléter `is_trial_period`).
- Renouvellements/annulations : `chair:sync-apple-subscriptions` (scheduler,
  05:15) re-valide chaque jour les reçus proches d'échéance avec le
  `apple_latest_receipt` stocké. Pas d'App Store Server Notifications en V1.
- Gestion/annulation d'un abo Apple : `manageSubscriptions()` natif (réglages
  App Store), jamais le portail Stripe. « Restaurer mes achats » obligatoire :
  `restorePurchases()` + `getPurchases()` → re-`/iap/verify`.
- Garde anti-partage : un `apple_original_transaction_id` déjà rattaché à un
  autre profil → 409, jamais de déplacement silencieux.

### Checklist d'activation (Julien)

**Stripe (web)** — dashboard.stripe.com, mode test d'abord :
1. Créer les produits CHAIR+ (15,99 €/mois) et CHAIR BUSINESS → copier les `price_...`.
2. `.env` serveur : `STRIPE_SECRET`, `STRIPE_PRICE_CHAIR_PLUS`, `STRIPE_PRICE_CHAIR_BUSINESS`.
3. Webhook → endpoint `https://api.getchair.app/api/stripe/webhook`, événements
   checkout.session.completed, customer.subscription.updated/deleted,
   invoice.payment_failed → copier le secret dans `STRIPE_WEBHOOK_SECRET`.
4. `php artisan config:clear` sur le serveur. C'est tout — le code est prêt.

**Apple (app)** — App Store Connect :
1. App CHAIR PRO → Abonnements → créer le groupe + l'abonnement
   `app.getchair.pro.chairplus.monthly`, 15,99 €/mois, offre d'essai « 1 mois gratuit ».
2. Informations sur l'app → Clé secrète partagée → `.env` : `APPLE_IAP_SHARED_SECRET`.
3. Sur le Mac : `npm install` puis `npx cap sync ios` (le plugin
   @capgo/native-purchases est déjà dans package.json) → build → TestFlight.
4. Tester en sandbox (compte Sandbox App Store Connect) : achat, restauration,
   annulation.
