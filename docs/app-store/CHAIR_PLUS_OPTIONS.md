# CHAIR+ et la règle App Store 3.1.1(a) — options pour le gérant

**Statut : document d'aide à la décision. Aucune décision n'est prise ici.**
Rédigé par l'audit technique de mise en conformité App Store. Il présente la
règle, ce qui a déjà été corrigé dans le code, et les options possibles avec
leur coût, leur délai et leur risque. Le choix appartient au gérant.

Dernière mise à jour : 2026-08-24.

---

## 1. La règle, exactement

App Store Review Guidelines, **3.1.1(a)** — hors storefront américain, et la
France en fait partie :

> les apps et leurs métadonnées ne peuvent pas contenir de boutons, de liens
> externes ou d'autres appels à l'action dirigeant les clients vers des moyens
> d'achat autres que l'achat intégré.

Cette règle vise le **contenu et les services numériques**. Elle ne se limite
pas au bouton de paiement : un **tarif affiché**, un bouton « S'abonner », un
lien vers une page de souscription web, sont tous des « appels à l'action ».

### Ce qui est concerné chez CHAIR

| Offre | Prix affiché | Nature | Encaissement actuel | Concerné par 3.1.1(a) |
|---|---|---|---|---|
| **CHAIR+** (stories, vidéos, posts épinglés, badge, boost local, analytics avancées) | 15,99 €/mois | **numérique** | Stripe Checkout | **Oui** |
| **CHAIR Business** (badge salon, support prioritaire) | 49,99 €/mois | **numérique** | Stripe Checkout | **Oui** |

### Ce qui n'est PAS concerné — et ne doit surtout pas basculer en achat intégré

La **prestation de coiffure** réservée via CHAIR est un **service physique**,
rendu en personne. La guideline **3.1.3(e)** l'exclut explicitement du champ de
l'achat intégré. Y appliquer l'achat intégré serait à la fois une erreur
produit (30 % de commission Apple sur le chiffre d'affaires des coiffeurs) et
un motif de rejet en soi. **Le tunnel de réservation ne doit pas bouger.**

La location de fauteuil entre professionnels relève de la même logique (accès
à un poste de travail physique) — mais ce point n'a pas été audité en détail
ici et mérite une vérification à part le jour où la location sera facturée
dans l'app.

---

## 2. Pourquoi le problème existe : un site, deux binaires

CHAIR CLIENT (`app.getchair.client`) et CHAIR PRO (`app.getchair.pro`) sont
deux applications natives distinctes, mais elles **chargent le même site
distant** via `server.url` (mode Capacitor sans bundle web embarqué) :

- CHAIR CLIENT démarre sur `https://www.getchair.app/app`
- CHAIR PRO démarre sur `https://www.getchair.app/pro`

Tout le reste est identique. Conséquence : **toute page `/pro/*` atteinte par
un routage interne s'affiche à l'intérieur du binaire CLIENT**, y compris la
page qui affiche 15,99 €/mois et le bouton de souscription Stripe.

### Chemins recensés (audit exhaustif, code au 2026-08-24)

**a) Liens explicites `/app` → `/pro`** — tous sortent déjà vers le navigateur
système (`target="_blank"`, que Capacitor traite comme une navigation externe),
donc hors de l'app :

| Fichier | Ligne | Destination | Sortie navigateur |
|---|---|---|---|
| `frontend/app/app/compte/page.tsx` | 148 | `/pro/inscription` | oui |
| `frontend/app/app/compte/page.tsx` | 219 | `/pro` | oui |
| `frontend/app/app/compte/page.tsx` | 230 | `/pro/salon` | oui |
| `frontend/app/app/compte/page.tsx` | 473 | `/pro/inscription` | oui |

**b) Redirections internes de rôle — le vrai trou, sans sortie navigateur :**

| Fichier | Ligne | Comportement |
|---|---|---|
| `frontend/app/app/layout.tsx` | 51 | `router.replace('/pro')` dès qu'un compte `hairdresser` ou `salon_owner` ouvre une page `/app` |
| `frontend/app/app/onboarding/page.tsx` | 59 | idem à la fin de l'onboarding |

Un professionnel qui installe **CHAIR CLIENT** et s'y connecte est donc déposé
dans l'espace pro **à l'intérieur du binaire client**, sans passer par Safari.

**c) Depuis `/pro`, les chemins qui mènent à un tarif :**

| Fichier | Ligne | Chemin |
|---|---|---|
| `frontend/app/pro/page.tsx` | 301 | ligne « CHAIR+ » de l'accueil pro → `/pro/chair-plus` |
| `frontend/hooks/useProNav.ts` | 46, 71 | entrée « CHAIR+ » de la nav secondaire (sidebar desktop + page `/pro/plus`) |
| `frontend/hooks/useProNav.ts` | 93 | entrée « CHAIR Business » → `/pro/salon/business` (49,99 €) |
| `frontend/app/pro/portfolio/page.tsx` | 318 | `window.location.href = '/pro/chair-plus'` au clic sur « vidéo » |
| `frontend/components/ui/StoryCreateCard.tsx` | 146 | carte d'upsell stories → `/pro/chair-plus` |
| `frontend/components/ui/PremiumLock.tsx` | 38 | `PremiumLockCard`, utilisée par `/pro/business` (lignes 346 et 435) |
| `frontend/components/ui/PremiumUpsellSheet.tsx` | 36 | CTA du bottom sheet → `/pro/chair-plus` |

**d) Vérifié et sans risque :** dans tout `frontend/app/app/**`, les composants
qui parlent de CHAIR+ (`SearchMiniCard`, `SearchResultCard`, `FeedPostCard`,
`HairdresserCard`, `PostCard`, `RecommendationCard`, `app/app/classements`)
n'importent que `PremiumBadge` — une pastille d'affichage, sans lien ni tarif.
`PremiumLockCard` (qui, elle, porte un lien) n'est utilisée que dans `/pro`.

---

## 3. Ce qui a été corrigé maintenant (base technique, sans décision produit)

Rien n'a été supprimé du modèle économique. CHAIR+ reste vendu, au même prix,
au même endroit sur le web et dans CHAIR PRO.

1. **Le binaire est désormais identifiable au runtime.** Chaque configuration
   Capacitor ajoute un marqueur au User-Agent de la WebView :
   `CHAIRClient/1` (`frontend/capacitor.chair.config.ts`) et `CHAIRPro/1`
   (`frontend/capacitor.pro.config.ts`), sur iOS **et** Android. C'était la
   pièce manquante : avant, aucun signal ne distinguait les deux apps.

2. **`frontend/lib/appContext.ts`** expose la détection :
   `getAppContext()` → `'client' | 'pro' | 'web' | 'unknown'`,
   `isClientBinary()`, `isProBinary()`, `isUnidentifiedBinary()`,
   `allowsDigitalSubscriptionUI()` et le hook `useAppContext()`.
   Sûr au rendu serveur (aucun accès à `window` pendant le SSR).

3. **`frontend/app/pro/chair-plus/page.tsx`** : dans le binaire CLIENT, la page
   n'affiche plus ni tarif, ni bouton de souscription, ni bouton de gestion
   Stripe. Elle explique que la souscription et la résiliation se font dans
   l'espace professionnel sur le web, et propose une sortie navigateur
   explicite vers `/pro` (l'espace pro, pas un tunnel de paiement).

> ⚠️ **Le marqueur n'existera qu'à partir du prochain build.** Il est injecté
> par le shell natif au lancement ; tout binaire déjà installé (TestFlight ou
> Xcode local) compilé avant cette modification continuera d'envoyer un
> User-Agent sans marqueur. Recharger le site ne suffit pas : il faut
> recompiler. La CI le fait automatiquement — `codemagic.yaml` exécute
> `npm run cap:chair:sync` puis `npx cap sync ios` à chaque build.
>
> **Comportement retenu pour un binaire non identifié : le plus prudent.**
> `'unknown'` est traité comme le binaire CLIENT — pas de tarif, pas de bouton.
> Le coût des deux erreurs possibles n'est pas symétrique : un professionnel
> sur une ancienne version de CHAIR PRO ne voit temporairement plus le tarif
> dans l'app (l'écran lui dit où aller, et le cas disparaît à la mise à jour),
> alors qu'un tarif affiché par erreur dans le binaire CLIENT est un motif de
> rejet. On tranche donc du côté prudent.

**Ce n'est pas un contournement d'App Review.** Le comportement dépend
uniquement du binaire, jamais de qui l'utilise : un reviewer voit exactement
ce que voit n'importe quel utilisateur de la même application. Aucune
détection de reviewer n'a été introduite, nulle part.

### Ce qui n'a délibérément pas été touché

- **La nav pro (`useProNav.ts`, `ProNav.tsx`)** conserve son entrée « CHAIR+ »
  dans le binaire client. La page de destination ne contient plus ni tarif ni
  appel à l'action de paiement : ce n'est donc plus un lien vers un moyen de
  paiement, et la retirer priverait un professionnel de l'explication dont il
  a besoin. À rediscuter si App Review le relève.
- **`/pro/salon/business` (CHAIR Business, 49,99 €/mois)** n'était pas dans le
  périmètre de cette intervention et **reste exposée dans le binaire CLIENT**
  pour un compte `salon_owner`. Elle appelle strictement le même traitement.
  → voir « Suites à donner ».
- **`app/app/layout.tsx:51`** (redirection de rôle vers `/pro` sans sortie
  navigateur) n'a pas été modifiée : hors périmètre, et c'est une décision
  produit à part entière (que doit faire l'app CLIENT quand un pro s'y
  connecte ?).

---

## 4. Le vrai sujet : CHAIR PRO affrontera exactement la même règle

À dire clairement, car c'est facile à perdre de vue : **séparer proprement les
deux apps résout le problème du binaire CLIENT, pas celui de CHAIR PRO.**

CHAIR PRO est un binaire distinct, soumis à la même App Store Review. Le jour
où il sera soumis, la règle 3.1.1(a) s'appliquera à lui **à l'identique** — et
il contient, lui, l'intégralité du parcours d'abonnement : tarif, bouton
« Essayer CHAIR+ gratuitement », redirection vers Stripe Checkout, portail de
gestion Stripe, plus CHAIR Business à 49,99 €.

Autrement dit : les options ci-dessous ne se posent pas « si un jour » — elles
se poseront à la première soumission de CHAIR PRO. La seule question ouverte
est **quand** trancher, pas **si**.

Une nuance existe : Apple applique 3.1.1 avec un peu plus de souplesse aux
apps dites « business/entreprise » vendues à des professionnels, et il existe
des dispositifs officiels (voir option B ci-dessous). Mais aucun de ces
dispositifs ne s'obtient sans démarche, et aucun ne s'improvise la veille
d'une soumission.

---

## 5. Les options

Les estimations de délai sont des estimations d'ingénierie, données à titre
indicatif ; elles n'engagent pas de devis. Les chiffres de revenu ne sont pas
calculés ici, faute des données réelles (voir « Action gérant requise »).

### Option A — Séparation stricte : CHAIR+ absent du binaire CLIENT, vendu uniquement dans CHAIR PRO et sur le web

*(C'est la direction que prépare le travail technique décrit en §3.)*

- **En quoi ça consiste** : le binaire CLIENT ne montre jamais de tarif ni de
  CTA d'abonnement. Le parcours d'achat reste dans CHAIR PRO et sur le web,
  inchangé, via Stripe.
- **Coût de développement** : faible. L'essentiel est fait. Reste à étendre le
  même traitement à `/pro/salon/business` et à décider du sort de la
  redirection `app/app/layout.tsx:51` (≈ 0,5 à 1 jour).
- **Délai** : immédiat — disponible dès le prochain build.
- **Conséquence sur le revenu** : **aucune** tant que CHAIR PRO n'est pas
  soumis. Aucune commission Apple, encaissement Stripe inchangé. Le seul effet
  est une friction pour un professionnel qui aurait installé l'app CLIENT par
  erreur : il doit passer par le web.
- **Risque Apple sur CHAIR CLIENT** : **faible**. Le binaire ne contient plus
  ni tarif ni bouton d'abonnement numérique.
- **Risque résiduel, à connaître** : la page conserve un lien de sortie vers
  l'espace professionnel. Sous une lecture stricte, un reviewer peut estimer
  qu'un lien externe menant, en plusieurs étapes, à un abonnement reste un
  « appel à l'action ». La formulation a été choisie pour rester de la gestion
  de compte (aucun prix, aucun verbe d'achat, destination `/pro` et non un
  tunnel de paiement), mais le risque n'est pas nul. Le supprimer entièrement
  est un simple retrait de bouton si App Review le demande.
- **Risque Apple sur CHAIR PRO** : **entier et non traité**. Cette option ne
  fait que déplacer le problème dans l'autre binaire (voir §4).

### Option B — Achat intégré Apple dans CHAIR PRO

- **En quoi ça consiste** : CHAIR+ (et CHAIR Business) vendus via StoreKit
  dans l'app CHAIR PRO, Apple encaissant et reversant. Stripe reste utilisé
  pour les souscriptions web ; les deux sources doivent alors être
  réconciliées côté backend (un même professionnel ne doit pas payer deux
  fois, et l'entitlement doit être unique).
- **Coût de développement** : **élevé**. C'est le chantier le plus lourd des
  trois. À prévoir : intégration StoreKit 2 côté natif (donc l'ajout d'un
  second plugin natif à une app aujourd'hui en mode `server.url` avec un seul
  plugin — ce n'est pas anodin), gestion des reçus et des webhooks
  App Store Server Notifications côté Laravel, unification de l'entitlement
  avec Stripe, restauration d'achats, gestion des essais gratuits et des
  remboursements, configuration produit dans App Store Connect. Estimation :
  plusieurs semaines de développement, plus une phase de test.
- **Délai** : long. À la charge de développement s'ajoutent la création des
  produits dans App Store Connect, les accords bancaires et fiscaux Apple
  (Paid Apps Agreement), et le délai de review.
- **Conséquence sur le revenu** : **commission Apple sur les abonnements
  souscrits dans l'app**. Taux officiels publics au moment de la rédaction :
  30 % la première année, 15 % à partir de la deuxième année d'abonnement
  continu ; 15 % dès la première année pour les développeurs éligibles au
  *Small Business Program* (seuil de chiffre d'affaires annuel, à vérifier sur
  le site Apple Developer avant toute projection). Ces taux remplacent la
  commission Stripe pour les achats concernés — le manque à gagner net doit
  être calculé sur les chiffres réels de Stripe (voir « Action gérant requise »).
- **Risque Apple** : **le plus faible des trois**. C'est le modèle qu'Apple
  attend. Il ouvre aussi, en complément, deux dispositifs officiels à examiner
  côté juridique : le *Small Business Program* (taux réduit) et, pour les
  services vendus à des entreprises, les *External Purchase Link Entitlements*
  disponibles dans l'Union européenne — qui autorisent un lien de paiement
  externe **avec** une commission Apple réduite et un formulaire d'inscription
  préalable. Aucun de ces dispositifs ne dispense de démarche.

### Option C — CHAIR+ désactivé le temps de la première soumission

- **En quoi ça consiste** : basculer le flag existant `chair_plus_enabled` à
  `false` (Super Admin, `GET /api/feature-flags`, lu par
  `frontend/lib/featureFlags.ts`). La page bascule alors sur l'écran
  « Bientôt disponible » déjà en place. Le mécanisme est déjà codé et
  fonctionne : **les abonnements en cours restent gérables** — le flag ne
  bloque que les nouvelles souscriptions, jamais l'accès déjà acquis (voir
  `SubscriptionController::subscribe` et le commentaire correspondant dans
  `app/pro/chair-plus/page.tsx`).
- **Coût de développement** : **nul**. Un interrupteur. Attention toutefois :
  ce flag couvre CHAIR+, **pas** CHAIR Business — `/pro/salon/business` a sa
  propre logique et resterait exposée.
- **Délai** : immédiat, sans rebuild.
- **Conséquence sur le revenu** : **arrêt des nouvelles souscriptions CHAIR+**
  pendant toute la durée où le flag est à `false`, sur tous les canaux, y
  compris le web où rien ne l'imposait. C'est l'option la plus coûteuse
  commercialement et la seule qui coupe une source de revenu.
- **Risque Apple** : **très faible** pendant la période. Mais attention à
  l'effet de bord : réactiver le flag après approbation, sans autre changement,
  fait réapparaître le tarif dans un binaire déjà approuvé. Cela ressemble à ce
  qu'Apple qualifie de *bait and switch* (guideline 2.3.1, fonctionnalités
  cachées à la review) et expose à un retrait de l'app. **Cette option n'a de
  sens que combinée à l'option A ou B, jamais seule comme moyen de passer la
  review puis de tout rallumer.**

### Tableau de synthèse

| | A — Séparation stricte | B — Achat intégré dans CHAIR PRO | C — CHAIR+ désactivé |
|---|---|---|---|
| Coût de dev | faible (≈ 1 j restant) | élevé (plusieurs semaines) | nul |
| Délai | immédiat | long | immédiat |
| Effet sur le revenu | aucun | commission Apple (15–30 %) sur les achats in-app | arrêt des nouvelles ventes CHAIR+ |
| Risque Apple — CHAIR CLIENT | faible | faible | très faible |
| Risque Apple — CHAIR PRO | **non traité** | traité | reporté |
| Réversible | oui | non (chantier structurel) | oui |

Les options ne s'excluent pas : A est la base technique commune ; C peut
servir de mesure temporaire **au-dessus** de A ou de B ; B est la seule qui
règle durablement le cas de CHAIR PRO.

---

## 6. Suites à donner (technique, indépendamment du choix commercial)

1. **`/pro/salon/business` (CHAIR Business, 49,99 €/mois)** : appliquer le
   même garde-fou `allowsDigitalSubscriptionUI()` qu'à `/pro/chair-plus`.
   Aujourd'hui, un compte `salon_owner` connecté dans le binaire CLIENT voit
   le tarif et le bouton de souscription. **C'est le trou restant le plus
   direct.**
2. **`frontend/app/app/layout.tsx:51`** : décider ce que fait CHAIR CLIENT
   quand un compte professionnel s'y connecte. Aujourd'hui il ouvre l'espace
   pro complet à l'intérieur du binaire client, sans sortie navigateur.
   Alternatives possibles : un écran « ce compte est un compte professionnel,
   ouvrez CHAIR PRO » avec sortie navigateur, ou laisser en l'état maintenant
   que les pages de tarif sont neutralisées. Décision produit.
3. **Vérifier le marqueur sur le prochain build TestFlight** : ouvrir le menu
   développeur / une page de diagnostic et confirmer que le User-Agent
   contient `CHAIRClient/1` (app CLIENT) ou `CHAIRPro/1` (app PRO). Tant que
   ce n'est pas vérifié sur un appareil réel, la détection est correcte en
   théorie mais non confirmée en conditions réelles.
4. **`frontend/capacitor.config.ts`** est un fichier généré (copié depuis
   `capacitor.chair.config.ts` par `npm run cap:chair:sync`) mais versionné :
   il est actuellement en retard d'une modification. Sans effet sur la CI, qui
   régénère la copie à chaque build.

---

## ACTION GÉRANT REQUISE

Ces informations ne sont pas dans le code et ne doivent pas être devinées.

| Information | Où la récupérer | À quoi elle sert |
|---|---|---|
| Nombre d'abonnés CHAIR+ actifs et MRR CHAIR+ | Tableau de bord Stripe → Billing → Abonnements, filtrés sur le produit CHAIR+ | Chiffrer le manque à gagner de l'option B et le coût d'arrêt de l'option C |
| Nombre d'abonnés CHAIR Business actifs et MRR | idem, produit CHAIR Business | idem |
| Taux de commission Stripe réellement facturé | Stripe → Paramètres → Tarification (varie selon le type de carte et le pays) | Comparer honnêtement Stripe vs commission Apple |
| Chiffre d'affaires annuel total de la société sur l'App Store | Comptabilité / App Store Connect | Déterminer l'éligibilité au *Small Business Program* d'Apple (15 % au lieu de 30 %) |
| Décision : soumet-on CHAIR PRO à l'App Store, et quand ? | Décision du gérant | C'est ce qui détermine si l'option B est un chantier à planifier ou un sujet théorique |
| Statut juridique pour les *External Purchase Link Entitlements* (UE) | Apple Developer → Agreements, + conseil juridique | Savoir si le lien de paiement externe avec commission réduite est ouvert à CHAIR |

Aucune donnée juridique, financière ou d'identité n'a été inventée dans ce
document. Les taux de commission Apple cités sont des taux publics documentés
par Apple ; ils doivent être revérifiés sur le site Apple Developer avant toute
projection financière, car Apple les fait évoluer.
