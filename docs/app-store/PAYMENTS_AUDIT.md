# PAYMENTS_AUDIT — CHAIR CLIENT (app.getchair.client)

Audit des mécanismes de paiement exposés par le binaire **CHAIR CLIENT**, au regard des
App Store Review Guidelines 3.1.1, 3.1.1(a), 3.1.3(e) et 4.2.

Date de l'audit : 2026-08-24. Périmètre : lecture du code réel (frontend + backend),
tests curl sur l'API locale, lecture des sources Capacitor iOS installées.
Aucune supposition : chaque affirmation ci-dessous renvoie au fichier et à la ligne qui la fonde.

---

## 1. Matrice des achats

| # | Achat | Nature | Mécanisme réel dans le code | Atteignable depuis le binaire CLIENT ? | Guideline | Risque |
|---|---|---|---|---|---|---|
| A | Réservation d'une prestation (coupe, couleur…) chez un coiffeur indépendant | **Physique** — service consommé hors de l'app | **Aucun paiement.** `AppointmentController::store()` crée le RDV avec `status='confirmed'`, copie `price` depuis le service à titre informatif et ne touche jamais `payment_method` (défaut SQL `on_site`). Aucun appel Stripe, aucune carte, aucun `payment_intent`. | Oui — c'est la fonction principale | 3.1.3(e) : l'achat intégré est **interdit** pour ce cas ; paiement hors app autorisé | **LOW** (conforme) |
| B | Réservation chez un coiffeur **salarié** dont le salon a un `booking_url` | **Physique** | Lien externe `<a href={bookingUrl} target="_blank">` → ouvert **dans Safari** par Capacitor. Aucune transaction côté CHAIR. | Oui | 3.1.3(e) — hors du champ de 3.1.1(a), qui ne vise que les biens/services **numériques** | **MEDIUM** (wording + validation d'URL, voir §5) |
| C | **CHAIR+** — abonnement coiffeur, 15,99 €/mois après 30 j d'essai | **Numérique** — débloque des fonctionnalités *dans* l'app (Stories, vidéos, posts épinglés, badge, boost, analytics avancées) | Stripe Checkout. `SubscriptionController::subscribe()` → `StripeService::createCheckoutSession()` → le front fait `window.location.href = res.checkout_url` (`app/pro/chair-plus/page.tsx:100`) | **Oui, par un chemin résiduel** — voir §2 | 3.1.1 + **3.1.1(a)** | **BLOCKER conditionnel** |
| D | **CHAIR BUSINESS** — abonnement salon | **Numérique** | Idem C (`/pro/salon/business`) | Même chemin résiduel que C, un cran plus loin | 3.1.1 + 3.1.1(a) | **BLOCKER conditionnel** |
| E | Location de fauteuil (`chair_rentals`, `deposit_amount`) | Physique (location d'un poste de travail) | **Aucun flux d'argent.** `App\Models\ChairRental` : « aucun paiement réel ne transite (Stripe Connect non branché) ». Les montants affichés sont des estimations pour le gérant. | Non — pages `/pro/fauteuils*` uniquement | — | **LOW** |

### Ce qui fonde la ligne A

`backend/app/Http/Controllers/Api/AppointmentController.php:130-148` — le `Appointment::create()`
ne contient ni `payment_method` ni aucun identifiant de transaction ;
`backend/database/migrations/2026_06_01_100004_extend_appointments_for_booking.php:17`
pose `payment_method ENUM("on_site","deposit","full") NULL DEFAULT "on_site"`.

Le statut `pending_payment` existe dans l'énumération et dans la table de transitions
(`AppointmentController.php:40,51`) mais **aucune ligne de code ne le produit** — c'est un
vestige d'un design de paiement jamais implémenté. Il était rendu au client sous le libellé
« Paiement en attente » (`frontend/app/app/compte/page.tsx:27`), ce qui laissait entendre un
débit en attente dans l'app. Corrigé (§7).

---

## 2. Point critique : CHAIR+ est-il atteignable depuis l'app CLIENT ?

**Oui. Deux chemins existent ; un seul est un problème, et c'est un vrai problème.**

### 2.1 Comment Capacitor arbitre « dans l'app » vs « dans Safari »

Trois mécanismes distincts, vérifiés dans les sources installées
(`frontend/node_modules/@capacitor/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift`) :

1. **Navigation client-side Next.js** (`<Link href>` sans `target`) → History API, **aucune**
   navigation WKWebView, donc `decidePolicyFor` n'est jamais appelé. La page s'affiche
   **dans l'app**, quel que soit `allowNavigation`. C'est le cas dangereux.
2. **`<Link href target="_blank">`** → Next saute son routeur client
   (`isModifiedEvent()` renvoie vrai dès que `target && target !== '_self'`,
   `node_modules/next/dist/client/link.js:70-75`), WebKit demande une nouvelle fenêtre,
   Capacitor répond par `UIApplication.shared.open(url)` puis `return nil`
   (`WebViewDelegationHandler.swift:328-333`) → **ouverture dans Safari**, systématiquement.
3. **Navigation top-level vers un autre host** (`window.location.href = …`) → si le host n'est
   pas dans `allowNavigation`, `UIApplication.shared.open` + `.cancel`
   (`WebViewDelegationHandler.swift:96-116`) → **Safari**.

`allowNavigation: ['getchair.app', 'www.getchair.app']`
(`frontend/capacitor.chair.config.ts:18`) ne protège donc de rien ici : tout `/pro/*` est sur
le **même host** que `/app/*`, et le mécanisme (1) court-circuite de toute façon le contrôle.

### 2.2 Les entrées PRO de `/app/compte` sont saines

Les quatre liens PRO de `frontend/app/app/compte/page.tsx`
(lignes 115, 186, 197, 400 : `/pro/inscription`, `/pro`, `/pro/salon`, `/pro/inscription`)
portent tous **`target="_blank" rel="noopener noreferrer"`**. Ils relèvent donc du cas (2) :
ils ouvrent Safari, hors de l'app. Deux d'entre eux annoncent déjà explicitement
« Sur l'app CHAIR PRO, séparée ». **Rien à corriger ici.**

### 2.3 Le chemin qui pose problème (BLOCKER)

Un compte de rôle `hairdresser` peut se connecter dans le binaire CLIENT : `/connexion`
renvoie tout le monde vers `/app` sans distinction de rôle
(`frontend/app/connexion/page.tsx:36`). En consultant **sa propre fiche publique**
`/app/coiffeur/<son-slug>`, ce compte voit deux affordances « propriétaire » :

- `frontend/components/ui/ProfileActions.tsx:164` — `<SecondaryButton href="/pro/profil">` **sans `target`**
- `frontend/components/ui/PublicProfileOwnerActions.tsx:20` — `<Link href="/pro/profil">` **sans `target`**

Cas (1) : navigation client-side → `/pro/profil` s'ouvre **dans l'app CLIENT**. À partir de là
la navigation PRO est présente : `ProNav` (mobile) expose l'onglet « Plus » → `/pro/plus`, qui
rend la liste `secondary` de `useProNav` — laquelle contient
`{ href: '/pro/chair-plus', label: 'CHAIR+' }` (`frontend/hooks/useProNav.ts:46` et `:71`).

Sur `/pro/chair-plus` le reviewer verrait alors, **à l'intérieur du binaire CLIENT** :
- le prix « 30 jours gratuits, puis 15,99€/mois » (`app/pro/chair-plus/page.tsx:186` et `:278`) ;
- un bouton d'abonnement qui appelle `POST /api/subscribe` puis
  `window.location.href = checkout_url` vers `checkout.stripe.com` — cas (3), donc Safari.

C'est **exactement** le schéma que 3.1.1(a) interdit hors storefront américain :
« apps and their metadata may not include buttons, external links, or other calls to action
that direct customers to purchasing mechanisms other than in-app purchase ». La France est
concernée. Le fait que Stripe s'ouvre dans Safari n'atténue rien — c'est précisément le
« external link to a purchasing mechanism » visé.

**Nuance honnête sur la probabilité** : ce chemin exige un compte de rôle `hairdresser`
connecté dans l'app CLIENT. `/inscription` côté client force `role: 'client'`
(`frontend/app/inscription/page.tsx:92`), et `/pro/chair-plus` est protégé par
`useRequireAuth(['hairdresser'])` qui redirige un compte client vers `/app`. Donc :

- si le compte de démo fourni à App Review pour le binaire CLIENT est **un compte client**,
  le reviewer ne peut pas atteindre `/pro/chair-plus` → risque faible en pratique ;
- si un compte **coiffeur** est fourni (ou si le reviewer réutilise les identifiants de la
  soumission CHAIR PRO, ce qui arrive quand les deux binaires sont soumis ensemble),
  le chemin est ouvert → **BLOCKER**.

Le risque n'est pas hypothétique : les deux apps partagent le même site, et Apple examine
souvent deux binaires du même compte développeur en parallèle.

### 2.4 Options de correction — à trancher par le gérant, aucune n'est appliquée ici

Aucune de ces options n'est un contournement d'App Review : il ne s'agit pas de masquer
une fonction pour la review puis de la réactiver, mais de **séparer réellement** deux
produits qui n'ont pas la même audience. La règle à respecter : ce qui est retiré du binaire
CLIENT doit l'être **de façon permanente**, pas le temps de l'examen.

| Option | Ce qu'il faut faire | Conséquence produit | Effort | Réversible |
|---|---|---|---|---|
| **O1 — Ajouter `target="_blank"` aux deux liens `/pro/profil`** | Modifier `ProfileActions.tsx:164` et `PublicProfileOwnerActions.tsx:20` (et donner à `Button.tsx` un prop `rel`). Le coiffeur qui édite son profil depuis l'app CLIENT bascule alors dans Safari, comme les autres entrées PRO. | Aligne ces deux liens sur le traitement déjà retenu pour les quatre autres. Petite friction pour un coiffeur, mais c'est déjà le parcours annoncé (« Sur l'app CHAIR PRO, séparée »). | Faible | Oui | 
| **O2 — Discriminer le binaire au runtime** | Ajouter `ios.appendUserAgent: 'CHAIRClient'` dans `capacitor.chair.config.ts` (et l'équivalent PRO), puis un helper `isClientBinary()` à côté de `isNativeApp()` (`hooks/useGeolocation.ts:12`). Toute entrée `/pro/*` est masquée quand `isClientBinary()`. | Solution structurelle. **Aujourd'hui c'est impossible** : rien ne distingue les deux binaires au runtime — même site, même `window.Capacitor`, seule l'URL de démarrage diffère et elle n'est pas persistante. | Moyen | Oui |
| **O3 — Garde de route sur `/pro/*`** | Un garde dans le layout `/pro` qui, en contexte natif CLIENT (nécessite O2), redirige vers `/app` au lieu de rendre la page. | Ceinture + bretelles par-dessus O1. Ne dispense pas de O1 (mieux vaut ne pas afficher un lien qui mène à une redirection). | Moyen | Oui |
| **O4 — Retirer le prix de `/pro/chair-plus` côté client** | Non recommandé seul. Retirer le prix sans retirer le bouton laisse un CTA d'abonnement atteignable : 3.1.1(a) vise les *boutons et liens*, pas seulement l'affichage du tarif. | Fausse sécurité | Faible | Oui |
| **O5 — Ne pas exposer CHAIR+ du tout dans la version soumise** | Basculer le feature flag `chair_plus_enabled` à `false` (voir §3). | Traite aussi le problème §3 (Stripe non configuré). Impacte les **deux** apps, donc c'est une décision produit, pas une décision technique. | Faible | Oui |

**Recommandation** : **O1 immédiatement** (elle est manifestement sûre, cohérente avec les
quatre autres liens PRO, et suffit à fermer le chemin in-app), **+ O5 tant que Stripe n'est
pas réellement configuré** (§3). O2/O3 sont le bon investissement structurel pour la suite.

O1 n'a **pas** été appliquée ici : `ProfileActions.tsx`, `PublicProfileOwnerActions.tsx` et
`Button.tsx` sont hors du périmètre de fichiers de cet audit (d'autres agents y travaillent).

---

## 3. État Stripe : la fonctionnalité est annoncée mais ne peut pas aboutir

`backend/.env` :

```
STRIPE_SECRET=sk_test_placeholder_not_a_real_key
STRIPE_PRICE_CHAIR_PLUS=price_test_chair_plus_placeholder
STRIPE_PRICE_CHAIR_BUSINESS=price_test_chair_business_placeholder
```

Et le feature flag qui commande la visibilité est **activé par défaut** :
`database/migrations/2026_08_17_120000_seed_feature_flags.php:17` →
`['key' => 'chair_plus_enabled', 'enabled' => true]`.

**Preuve de test** (API locale, compte coiffeur de démo) :

```
POST /api/login  → 200, token obtenu
POST /api/subscribe {"plan":"chair_plus"}
  → HTTP 502
  → {"message":"Le service de paiement est momentanément indisponible. Réessayez dans quelques instants."}
GET  /api/my-subscription → 200 {"has_chair_plus":false, ...}
```

Le bouton « S'abonner » est donc **visible et cliquable**, et mène systématiquement à une
erreur. Sous **4.2** (« features, content, and UI that elevate it beyond a repackaged
website ») et plus largement sous le motif de rejet « app crashes / features don't work »,
c'est un motif de rejet direct s'il est atteint.

**Recommandation, dans l'ordre de préférence :**

1. **Ne pas exposer CHAIR+ dans la version soumise** tant que Stripe n'est pas configuré :
   passer `chair_plus_enabled` à `false` en production. Masquer une fonctionnalité qui n'est
   pas prête est parfaitement légitime — Apple ne demande pas qu'on livre tout, il demande
   que ce qui est visible fonctionne. **Un bouton visible qui mène à une erreur, lui, ne
   l'est pas.** Ce levier est fiable, vérifié dans le code : `SubscriptionController::subscribe()`
   refuse le plan quand le flag est faux (ligne 48), et côté front
   `app/pro/chair-plus/page.tsx:133` calcule `showComingSoon` qui **remplace toute la page**
   par `ComingSoonState` — ni prix, ni bouton d'abonnement. Les abonnés existants conservent
   l'accès à la gestion de leur abonnement (`canManage`), ce qui est le comportement souhaitable.
2. Sinon, configurer réellement Stripe (clés live, price IDs, webhook secret) **avant** la
   soumission, et retester le parcours complet de bout en bout.

Dans les deux cas, la question 3.1.1(a) du §2 reste entière : Stripe fonctionnel **aggrave**
le problème plutôt qu'il ne le résout, tant que le parcours est atteignable depuis le
binaire CLIENT.

---

## 4. Prestation physique (3.1.3(e)) — ce que le client voit aujourd'hui

3.1.3(e) autorise explicitement le paiement hors achat intégré pour un service physique
consommé en dehors de l'app. **L'achat intégré serait au contraire interdit ici.** CHAIR est
du bon côté : aucun paiement n'a lieu dans l'app pour une prestation.

Restait à s'assurer qu'**aucun texte ne laisse croire le contraire**. État avant correction :

| Écran | Ce qui était affiché | Problème |
|---|---|---|
| `BookingSheet` → étape Confirmation | « **Montant total** » + prix en 22 px gras, immédiatement au-dessus du bouton « Confirmer le rendez-vous ». Mention « Paiement sur place » présente mais discrète, en 12 px gris clair. | Grammaire visuelle de tunnel de paiement. Un reviewer peut lire « Confirmer » comme « Payer ». |
| `BookingSheet` → étape Succès | Récapitulatif prestation / date / heure. Aucune mention du paiement. | Rien ne dit qu'aucun débit n'a eu lieu. |
| `PublicProfileServices` | Prix par prestation, aucune mention du mode de paiement. | Prix nu, interprétable comme un tarif prélevé par l'app. |
| `/app/compte` → carte réservation | Prix nu à côté de la durée ; statut `pending_payment` libellé « **Paiement en attente** ». | « Paiement en attente » suggère un débit en attente dans l'app, sur un statut qu'aucun code ne produit. |

Corrections appliquées : §7.

---

## 5. Réservation externe (`booking_url`)

### 5.1 Pourquoi 3.1.1(a) ne s'applique pas — et comment le défendre

Le lien `booking_url` mène au système de réservation du **salon** (Planity, Treatwell, site
propre…) pour une **prestation de coiffure**, c'est-à-dire un service physique consommé hors
de l'app. 3.1.1(a) ne vise que les mécanismes d'achat concurrents de l'achat intégré, et
l'achat intégré est **interdit** pour ce type de bien par 3.1.3(e). Il n'y a donc aucune
alternative à l'IAP à concurrencer : la restriction est sans objet.

L'argument à tenir devant un reviewer, si la question est posée : *« CHAIR ne vend rien.
La prestation est un service physique réalisé en salon, réglé sur place au professionnel.
Quand le coiffeur est salarié, son salon impose son propre agenda ; nous renvoyons vers cet
agenda plutôt que d'inventer une double réservation. Aucun contenu numérique n'est
déverrouillé par ce lien. »*

### 5.2 Wording — ce qui n'allait pas

Le bouton disait « Réserver au salon » avec une icône `ExternalLink`, `target="_blank"`, et
**aucune phrase** avertissant qu'on quitte CHAIR. En contexte natif, ce clic éjecte
l'utilisateur dans Safari sans préavis. Corrigé (§7).

### 5.3 Validation de l'URL côté backend — **HIGH, hors périmètre**

`booking_url` est saisi librement par le professionnel et validé par
`'nullable|url|max:500'` (`AuthController.php:43` et `ProfileController.php:86`).

La règle `url` de Laravel 8.83 **n'impose pas https** : elle accepte une liste d'environ
250 schémas (`vendor/laravel/framework/src/Illuminate/Validation/Concerns/ValidatesAttributes.php:2005`).

**Preuve de test** (compte coiffeur de démo, `PUT /api/profile`, données restaurées ensuite) :

```
200  <- http://evil-booking.example.com/rdv        ← http en clair accepté
422  <- file://///etc/passwd                       ← rejeté
200  <- itms://apps.apple.com/x                    ← ouvre l'App Store
200  <- market://details?id=x                      ← accepté
200  <- view-source://www.getchair.app/pro         ← accepté
422  <- javascript://alert(1)                      ← rejeté
```

Bonne nouvelle : `javascript:` et `file:` sont rejetés, donc **pas de vecteur XSS**.
Mauvaise nouvelle :

- **`http://` accepté** — l'app enverrait l'utilisateur sur une page non chiffrée ; les
  identifiants et coordonnées saisis sur cette page circulent en clair (5.1.2 / 5.1.1(iii)).
- **`itms://`, `market://` acceptés** — un professionnel peut faire sortir l'utilisateur du
  binaire CLIENT vers l'App Store depuis un bouton libellé « Réserver ». Apple regarde ce
  genre de sortie de très près.
- **`view-source://` accepté** — sans usage légitime.

**Correctif recommandé** (fichiers hors périmètre — `AuthController.php` et
`ProfileController.php` sont modifiés par d'autres agents) : remplacer la règle par

```php
'booking_url' => 'nullable|url|max:500|starts_with:https://',
```

et, tant qu'à faire, refuser les hosts de type `getchair.app` pour éviter qu'un `booking_url`
serve de tremplin vers `/pro/*` (cf. §2 : un host autorisé reste dans l'app).
Prévoir une migration de nettoyage des `booking_url` existants en `http://`.

### 5.4 `rel` manquant sur le lien externe — LOW, hors périmètre

`PublicProfileServices.tsx` passe `target="_blank"` à `PrimaryButton`, mais
`components/ui/Button.tsx:53` ne transmet que `target` : **aucun `rel="noopener noreferrer"`**
n'est posé sur ce `<Link>`. Tous les navigateurs modernes appliquent `noopener` par défaut
sur `target="_blank"`, donc l'exposition réelle est faible, mais `Button.tsx` devrait
accepter un prop `rel` — fichier hors périmètre.

### 5.5 Comportement de retour

Aucun retour à gérer : Capacitor ouvre l'URL via `UIApplication.shared.open` puis annule la
navigation (`WebViewDelegationHandler.swift:328-333`). L'app CLIENT reste où elle était, en
arrière-plan, et l'utilisateur y revient par le sélecteur d'apps iOS. Rien à corriger.

---

## 6. Constats annexes hors périmètre, à signaler

| # | Constat | Guideline | Risque |
|---|---|---|---|
| X1 | `/cgu` (`app/cgu/page.tsx:148-152`) affirme : « Si l'application propose des fonctionnalités payantes (abonnements professionnels), **les achats sont traités via l'App Store d'Apple** ». C'est **faux** — CHAIR+ passe par Stripe. Un reviewer qui lit les CGU dans l'app y trouve la contradiction écrite noir sur blanc. | 3.1.1 (facteur aggravant), 2.3 (métadonnées exactes) | **HIGH** |
| X2 | `/cgu` (`app/cgu/page.tsx:141`) : « La fonctionnalité de réservation en ligne **est en cours de déploiement** ». Elle est en production et c'est la fonction principale de l'app. | 2.3 | MEDIUM |
| X3 | Le statut `pending_payment` reste dans l'ENUM SQL et dans la table de transitions alors qu'aucun code ne le produit. À supprimer proprement (migration + `AppointmentController`) plutôt qu'à re-libeller éternellement. | — | LOW (dette) |
| X4 | `frontend/components/ui/BookingSheet.tsx` mélange vouvoiement (« Votre nom », « Précisions sur votre demande ») et tutoiement (« Connecte-toi », « Ta sélection »). La DA CHAIR impose le tutoiement côté client. Seules les chaînes touchées par cet audit ont été alignées. | DA interne | LOW |

---

## 7. Corrections appliquées dans le périmètre

Trois fichiers, wording uniquement — aucune logique, aucun flux modifié.

### `frontend/components/ui/BookingSheet.tsx`

1. Étape Confirmation : « Montant total » → « **Prix de la prestation** », et la valeur est
   suivie de « à régler sur place ». La grammaire de tunnel de paiement disparaît.
2. Étape Confirmation : la mention de paiement passe en bloc encadré au-dessus du bouton et
   devient explicite : « **Aucun paiement dans l'application.** Tu règles X € sur place… ».
3. Étape Succès : ajout d'une ligne « Paiement — Sur place, au salon » dans le récapitulatif,
   et de la phrase « Aucun montant n'a été débité. »
4. Étape Prestation : note discrète « Tarifs fixés par le coiffeur, réglés sur place. »

### `frontend/components/ui/PublicProfileServices.tsx`

1. Bouton salarié : « Réserver au salon » → « **Réserver sur le site du salon** », suivi d'une
   phrase explicite : le coiffeur utilise l'agenda de son salon, le lien s'ouvre **hors de
   CHAIR** dans le navigateur. Le client sait ce qui va se passer **avant** de cliquer.
2. Note de bas de bloc : tutoiement + « Le paiement se fait sur place, jamais dans
   l'application. »

### `frontend/app/app/compte/page.tsx`

1. Libellé du statut `pending_payment` : « Paiement en attente » → « **À régler sur place** ».
2. Carte réservation : le prix nu devient « X € sur place ».

### Vérifications

- `npx tsc --noEmit` — voir §8
- `npx eslint` sur les trois fichiers — voir §8
- Aucune donnée de test laissée en base : le `booking_url` du profil de démo #196 (Élisa
  Moreau) a été remis à `NULL` après les tests du §5.3, vérifié.

---

## 8. À fournir / à trancher par le gérant

| # | Décision ou information attendue | Bloquant pour la soumission CLIENT ? |
|---|---|---|
| H1 | **Trancher l'option de §2.4.** Recommandation : appliquer O1 (deux liens `/pro/profil` en `target="_blank"`) — c'est ce qui ferme le chemin in-app vers CHAIR+. | **Oui, si un compte coiffeur est fourni à App Review** |
| H2 | **Quel compte de démo est fourni à App Review pour le binaire CLIENT ?** S'il s'agit d'un compte `client`, le risque §2.3 tombe à faible ; s'il s'agit d'un compte coiffeur, il devient bloquant. À décider explicitement et à noter dans les App Review Notes. | Oui |
| H3 | **Stripe : configurer réellement, ou passer `chair_plus_enabled` à `false` en production ?** Un bouton d'abonnement visible qui renvoie 502 est un motif de rejet. | Oui |
| H4 | Corriger les CGU (X1) : la phrase « les achats sont traités via l'App Store d'Apple » est fausse et doit décrire le mécanisme réel — ou disparaître si CHAIR+ n'est pas exposé. | Oui |
| H5 | Corriger les CGU (X2) : la réservation n'est plus « en cours de déploiement ». | Non, mais visible |
| H6 | Durcir la validation de `booking_url` en `https://` et migrer les URL `http://` existantes (§5.3). | Non (aucun `booking_url` en base ne pose problème aujourd'hui), mais **HIGH** avant ouverture publique |
| H7 | *(vérifié, aucune action)* `/pro/chair-plus` masque bien prix et CTA quand `chair_plus_enabled` est faux — `showComingSoon` remplace la page par `ComingSoonState`. Le flag est donc un levier fiable pour H3. | — |
