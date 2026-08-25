# JULIEN — Guide de mise en production, pas à pas

Ce guide est **la** liste de tout ce que toi seul peux faire pour que CHAIR parte
sur TestFlight puis en review Apple. Chaque étape dit **où aller, quoi cliquer,
quoi copier, où le coller, et comment vérifier** que c'est bon avant de passer à
la suivante. Les étapes sont dans l'ordre des dépendances : fais-les dans l'ordre.

Règles du guide :

- **Aucune valeur n'est inventée ici.** Quand une information vit chez Apple ou
  chez Infomaniak, le guide te donne le chemin pour la lire, jamais une valeur
  supposée. Si un champ est un blanc `________`, c'est à toi de le remplir.
- Les libellés de menus changent parfois d'une version d'interface à l'autre :
  quand un libellé est incertain, le guide donne le libellé probable **et** un
  repère fonctionnel (« le menu qui liste vos domaines »).
- Les commandes serveur utilisent `php artisan` : sur ce serveur, `php` en
  ligne de commande résout déjà vers le bon binaire (`which php` →
  `/opt/php8.4/bin/php`, voir `docs/DEPLOY.md`). En cas d'erreur de version,
  liste les binaires avec `ls /opt/ | grep php` et préfixe avec le chemin complet.

Récapitulatif à cocher tout en bas du document.

---

## ÉTAPE 1 — Informations juridiques (mentions légales + politique de confidentialité)

Sans ces informations, les pages `/mentions-legales` et `/confidentialite` sont
**incomplètes au regard de la loi française** (LCEN, RGPD) et de la guideline
Apple 5.1.1(i). Rien d'autre ne dépend de cette étape techniquement, mais la
soumission ne doit pas partir sans elle.

### 1.1 Remplis d'abord ce formulaire (sources : Kbis, statuts)

| Champ | Où le trouver | Ta valeur |
|---|---|---|
| Nom de l'éditeur (raison sociale exacte) | Extrait Kbis | `________________` |
| Forme juridique (+ capital social) | Kbis / statuts | `________________` |
| SIREN (ou RCS complet) | Kbis | `________________` |
| N° TVA intracommunautaire (si tu en as un) | Avis de situation SIRENE / comptable | `________________` |
| Adresse du siège social complète | Kbis | `________________` |
| Email légal (contact publié) | Décision à toi — `hello@getchair.app` est déjà câblé partout | `________________` |
| Directeur de la publication (nom, prénom) | Le représentant légal (toi ou ton associé) | `________________` |
| DPO ou contact vie privée (facultatif si pas de DPO désigné) | Décision à toi | `________________` |
| Médiateur de la consommation (organisme + adresse + site) | Ton contrat d'adhésion à un médiateur — **adhésion obligatoire** pour un pro vendant à des consommateurs | `________________` |
| Téléphone réellement joignable (facultatif) | Décision à toi | `________________` |

### 1.2 Pose chaque valeur dans le code — deux fichiers, trois constantes

Les deux pages sont écrites pour ne **rien afficher** tant qu'un champ vaut
`null` : dès que tu remplaces un `null` par une chaîne, la ligne apparaît.
Aucune autre modification n'est nécessaire.

**Fichier 1 : `frontend/app/confidentialite/page.tsx`** — constante `CONTROLLER`
(vers la ligne 17). Sa forme exacte dans le code :

```ts
const CONTROLLER: {
  legalName: string | null;
  legalForm: string | null;
  address: string | null;
  registration: string | null;
  dpo: string | null;
} = {
  legalName:    null, // ex. « CHAIR SAS »
  legalForm:    null, // ex. « SAS au capital de X € »
  address:      null, // siège social complet
  registration: null, // SIREN / SIRET / RCS
  dpo:          null, // DPO désigné, ou point de contact vie privée
};
```

Exemple rempli — **toutes les valeurs ci-dessous sont fictives (EXEMPLE), remplace-les
par les tiennes** :

```ts
const CONTROLLER = {
  legalName:    'CHAIR SAS',                                    // EXEMPLE
  legalForm:    'Société par actions simplifiée au capital de 5 000 €', // EXEMPLE
  address:      '10 rue de l’Exemple, 67000 Strasbourg, France', // EXEMPLE
  registration: 'RCS Strasbourg 123 456 789',                   // EXEMPLE
  dpo:          null, // pas de DPO désigné → laisser null
};
```

**Fichier 2 : `frontend/app/mentions-legales/page.tsx`** — trois constantes,
en tête de fichier :

- `PUBLISHER` — champs `legalName`, `legalForm`, `capital`, `address`,
  `registration`, `vatNumber`, `publicationDirector`, `phone`. Même principe :
  remplace les `null`. Exemple fictif :

```ts
const PUBLISHER = {
  legalName:           'CHAIR SAS',                        // EXEMPLE
  legalForm:           'Société par actions simplifiée',   // EXEMPLE
  capital:             'Capital social : 5 000 €',         // EXEMPLE
  address:             '10 rue de l’Exemple, 67000 Strasbourg, France', // EXEMPLE
  registration:        'RCS Strasbourg 123 456 789',       // EXEMPLE
  vatNumber:           'FR12123456789',                    // EXEMPLE
  publicationDirector: 'Julien Schillinger',               // EXEMPLE
  phone:               null, // seulement une ligne réellement joignable, sinon null
};
```

- `HOST` — l'hébergeur. La LCEN (art. 6-III) exige **nom/raison sociale, adresse
  et téléphone** de l'hébergeur. Attention, CHAIR a **deux** hébergeurs :
  - le **site web** (`www.getchair.app`) est servi par **Vercel** ;
  - l'**API et les données** (`api.getchair.app`) sont chez **Infomaniak**.

  Le plus sûr juridiquement est de citer les deux dans la page (le champ
  `address` accepte un texte libre : tu peux y mettre les deux blocs, ou ne
  remplir `HOST` qu'avec l'hébergeur principal et ajouter l'autre dans le même
  champ). **Ne recopie pas ces coordonnées de mémoire ni depuis ce guide** :
  - Infomaniak : leurs mentions légales publiques — sur `www.infomaniak.com`,
    lien « Mentions légales » (ou « Legal ») en pied de page ; la raison
    sociale, l'adresse à Genève et le téléphone y figurent officiellement.
  - Vercel : sur `vercel.com`, le lien « Legal » en pied de page (raison
    sociale Vercel Inc. et adresse officielle y sont publiées).

- `MEDIATOR` — `name`, `address`, `website` de l'organisme de médiation auquel
  tu as adhéré. Si tu n'as pas encore adhéré, c'est une démarche à faire (tout
  professionnel vendant à des consommateurs doit proposer un médiateur) — en
  attendant, les champs restent `null` et la section ne s'affiche pas.

### 1.3 Vérifie la compilation

Sur le PC, dans `frontend/` :

```powershell
npx tsc --noEmit
```

Attendu : aucune erreur (les guillemets français `’` dans une chaîne TypeScript
sont valides ; si tu as une erreur, c'est presque toujours un `'` non échappé —
utilise `’` ou échappe `\'`).

**✓ Vérification :** ouvre `http://localhost:3000/mentions-legales` et
`http://localhost:3000/confidentialite` (front local lancé) : le bloc « Éditeur
du service » affiche ta raison sociale, la section hébergeur apparaît, et la
section « 1. Responsable du traitement » de la politique affiche l'identité
complète. Tant qu'une ligne attendue n'apparaît pas, le champ correspondant est
resté à `null`.

---

## ÉTAPE 2 — SMTP Infomaniak (les emails, dont « mot de passe oublié »)

Aujourd'hui **aucun email ne part en production** : un utilisateur qui perd son
mot de passe perd son compte, et Apple teste ce parcours. Le code est prêt
(`MailService` + commande `chair:test-mail`) — il ne manque que les accès SMTP.

> Procédure de référence détaillée (avec l'alternative Brevo, les pièges, le
> dépannage) : [ACTION_GERANT_SMTP.md](ACTION_GERANT_SMTP.md). Ce qui suit est
> le chemin court Infomaniak.

### 2.1 Choisis et crée l'adresse d'expédition

Recommandation : une adresse **dédiée aux envois automatiques**, par exemple
`notifications@getchair.app`, avec une redirection vers `hello@getchair.app`
pour ne perdre aucune réponse. Pourquoi une adresse dédiée : si un jour un envoi
automatique est marqué comme spam, la réputation de `hello@getchair.app` (ton adresse de
support publiée, câblée dans l'app) n'est pas entraînée avec. **Décision à figer
une bonne fois** : changer d'expéditeur en cours de route abîme la délivrabilité.

1. Va sur **https://manager.infomaniak.com** et connecte-toi.
2. Ouvre le produit **Service Mail** (le produit qui liste tes boîtes email —
   selon l'interface : « Service Mail », « Mail » ou l'icône enveloppe).
3. Sélectionne le domaine **getchair.app**.
4. Clique sur le bouton de création d'adresse (« Créer une adresse email » ou
   « + ») → saisis `notifications` → choisis un **mot de passe fort** et
   **note-le immédiatement** (tu le colleras à l'étape 2.3).

### 2.2 Relève les paramètres SMTP dans l'interface

Toujours dans le Service Mail, sur l'adresse créée, ouvre la rubrique de
configuration d'un client de messagerie — libellé probable : **« Configurer un
client de messagerie »**, « Paramètres IMAP/SMTP » ou « Configuration
manuelle » (c'est l'écran qui affiche serveur entrant/serveur sortant).
**Recopie ce que l'écran affiche, ne devine rien** :

| Ce qu'Infomaniak affiche à l'écran | Variable `.env` | Ta valeur relevée |
|---|---|---|
| Serveur sortant (SMTP) | `MAIL_HOST` | `________________` |
| Port SMTP (en général 465 ou 587) | `MAIL_PORT` | `________` |
| Chiffrement (SSL ou STARTTLS) | `MAIL_ENCRYPTION` | `________` |
| Nom d'utilisateur (= l'adresse complète chez Infomaniak) | `MAIL_USERNAME` | `________________` |

Règle de correspondance chiffrement/port : port **465** → `MAIL_ENCRYPTION=ssl` ;
port **587** (STARTTLS) → `MAIL_ENCRYPTION=tls`.

### 2.3 Pose les variables dans le `.env` de production

Le `.env` du backend vit **sur le serveur Infomaniak**, jamais dans Git :

1. Connecte-toi en SSH (Manager Infomaniak → Hébergement → getchair.app → SSH,
   ou ton client SSH habituel).
2. Ouvre le fichier :

```bash
nano ~/sites/api.getchair.app/backend/.env
```

3. Renseigne ces **9 variables** (les lignes existent peut-être déjà — modifie-les
   plutôt que de les dupliquer, une variable en double prend la dernière valeur) :

```env
MAIL_MAILER=smtp
MAIL_HOST=<serveur sortant relevé en 2.2>
MAIL_PORT=<port relevé en 2.2>
MAIL_ENCRYPTION=<ssl si port 465, tls si port 587>
MAIL_USERNAME=<l'adresse complète, ex. notifications@getchair.app>
MAIL_PASSWORD=<le mot de passe de la boîte, noté en 2.1>
MAIL_FROM_ADDRESS=<la même adresse d'expédition>
MAIL_FROM_NAME=CHAIR
FRONTEND_URL=https://www.getchair.app
```

`FRONTEND_URL` est vitale : c'est la base de **tous les liens** dans les emails
(réinitialisation, avis). Sans elle, les liens pointent sur `localhost` et sont
morts. Enregistre (`Ctrl+O`, Entrée) puis quitte (`Ctrl+X`).

### 2.4 Teste depuis le serveur

Toujours en SSH :

```bash
cd ~/sites/api.getchair.app/backend
php artisan config:clear
php artisan chair:test-mail
```

> Sur ce serveur, `php` en ligne de commande résout déjà vers le bon binaire
> (`which php` → `/opt/php8.4/bin/php`, voir `docs/DEPLOY.md`). Si jamais
> `php artisan` renvoie une erreur de version, liste les binaires disponibles
> avec `ls /opt/ | grep php` et préfixe avec le chemin complet.

La deuxième commande **n'envoie rien** : elle relit la configuration, ouvre une
vraie connexion SMTP et te dit exactement ce qui manque si quelque chose cloche.
Quand elle sort sans erreur, envoie les vrais emails de test vers ta boîte perso :

```bash
php artisan chair:test-mail ton-adresse@perso.fr
```

**✓ Vérification :** dans ta boîte perso, les 6 emails de test sont arrivés
**en boîte de réception** (pas en spam), l'expéditeur affiché est **CHAIR**
(`notifications@getchair.app`), et les boutons/liens ouvrent bien
`https://www.getchair.app/...` — jamais `localhost`. Refais ensuite le parcours
réel : https://www.getchair.app/connexion → « Mot de passe oublié » → l'email
arrive et le lien fonctionne.

---

## ÉTAPE 3 — SPF, DKIM, DMARC (pour ne pas finir en spam)

Une phrase chacun :

- **SPF** : un enregistrement DNS qui liste les serveurs autorisés à envoyer des
  emails au nom de `getchair.app` — sans lui, n'importe qui peut usurper ton
  domaine et tes emails partent en spam.
- **DKIM** : une signature cryptographique apposée sur chaque email sortant,
  vérifiée par la boîte du destinataire via une clé publiée en DNS.
- **DMARC** : la consigne donnée aux boîtes de réception sur quoi faire d'un
  email qui échoue SPF/DKIM (et où t'envoyer les rapports).

**Bonne nouvelle, à vérifier plutôt qu'à croire** : quand le domaine **et** le
Service Mail sont tous les deux chez Infomaniak (ton cas), Infomaniak
préconfigure très souvent SPF et DKIM automatiquement.

### 3.1 Vérifie ce qui existe déjà

1. **Manager Infomaniak → Domaines → getchair.app → Zone DNS** (le menu qui
   liste tous les enregistrements DNS du domaine).
2. Cherche dans les enregistrements **TXT** :
   - un TXT sur `getchair.app` commençant par `v=spf1` (contenant un
     `include:` Infomaniak) → **SPF présent** ;
   - un TXT (ou CNAME selon la configuration) sur un sous-domaine du type
     `<sélecteur>._domainkey.getchair.app` → **DKIM présent** ;
   - un TXT sur `_dmarc.getchair.app` commençant par `v=DMARC1` → **DMARC
     présent** (souvent absent, c'est le plus fréquent des trois à créer).
3. Si Infomaniak propose un **outil de diagnostic email** (dans le Service Mail,
   une rubrique du type « Diagnostic » ou « Vérification de la configuration »),
   lance-le : il te dit directement l'état SPF/DKIM.

### 3.2 Si un des trois manque

- **DKIM absent** : dans le **Service Mail** (pas la zone DNS), cherche la
  rubrique sécurité/authentification du domaine — libellé probable « DKIM » ou
  « Authentification des emails » — et clique sur **Activer**. Infomaniak crée
  l'enregistrement DNS tout seul quand la zone est chez lui.
- **SPF absent** : crée un TXT sur `getchair.app` avec la valeur `include:`
  exacte indiquée par la doc Infomaniak (la rubrique DKIM/SPF du Service Mail
  l'affiche). **Règle absolue : un seul enregistrement SPF par domaine** — si un
  TXT `v=spf1` existe déjà (par exemple pour un autre outil), **fusionne** les
  `include:` dans le même enregistrement, n'en crée jamais un deuxième.
- **DMARC absent** : crée un TXT sur le sous-domaine `_dmarc` avec :

  ```
  v=DMARC1; p=none; rua=mailto:<l'adresse où tu veux recevoir les rapports>
  ```

  `p=none` = mode observation, aucun email n'est bloqué. L'adresse des rapports
  est ton choix (par exemple `hello@getchair.app`) ; les rapports sont des
  XML automatiques quotidiens, peu digestes mais inoffensifs.

Les modifications DNS mettent de quelques minutes à quelques heures à se
propager.

**✓ Vérification :** envoie un email de test vers une adresse **Gmail** :
`php artisan chair:test-mail ton-adresse@gmail.com`. Dans
Gmail, ouvre le message → menu ⋮ → **« Afficher l'original »** : la page doit
afficher `SPF : PASS` et `DKIM : PASS` (et `DMARC : PASS` si configuré), et le
détail du message doit indiquer un chiffrement standard (TLS). Si l'email est
arrivé en spam, re-vérifie 3.1.

---

## ÉTAPE 4 — Apple Team ID (Universal Links)

Le site sert le fichier `apple-app-site-association` dynamiquement, mais il
répond volontairement **404 tant que le Team ID n'est pas fourni** (un Team ID
faux serait mis en cache plusieurs jours par le CDN d'Apple — pire que rien).

### 4.1 Récupère le Team ID

1. Va sur **https://developer.apple.com/account** et connecte-toi.
2. Ouvre **Membership details** (la rubrique qui montre ton nom d'équipe, ton
   type de compte et tes identifiants d'adhésion).
3. Copie la valeur de la ligne **Team ID** : exactement **10 caractères**
   alphanumériques majuscules.

> Ne confonds pas avec l'**Issuer ID** (App Store Connect → Users and Access →
> clés API) : celui-là est un long UUID avec des tirets — ce n'est pas lui.

### 4.2 Pose-le sur Vercel (l'hébergeur du FRONTEND — pas Infomaniak)

Pourquoi là : la route Next `/.well-known/apple-app-site-association` lit la
variable `APPLE_TEAM_ID` **côté frontend** pour construire le JSON que le CDN
d'Apple viendra chercher sur `www.getchair.app`.

1. Va sur **https://vercel.com**, ouvre le projet qui sert `www.getchair.app`.
2. **Settings → Environment Variables**.
3. Ajoute : Name `APPLE_TEAM_ID`, Value = les 10 caractères copiés en 4.1,
   environnement **Production** (coche aussi Preview si proposé).
4. **Redéploie** le projet (onglet Deployments → menu ⋯ du dernier déploiement
   → Redeploy) : une variable d'environnement n'est pas relue à chaud.

### 4.3 Étapes natives restantes

Le fichier AASA seul ne suffit pas : il faut aussi la capability **Associated
Domains** dans le projet Xcode et un **nouveau build TestFlight**. Tout est
détaillé (sans rien à décider) dans [DEEPLINKS_SETUP.md](DEEPLINKS_SETUP.md),
section 4 — ne le duplique pas ici, suis-le au moment du build (étape 8).

**✓ Vérification :**

```bash
curl -i https://www.getchair.app/.well-known/apple-app-site-association
```

Attendu **après** le redéploiement Vercel : `200` avec
`content-type: application/json` et un JSON dont les `appIDs` commencent par ton
Team ID. **Avant** configuration : `404` — c'est l'état normal et sain, pas un
bug. Piège : la réponse doit être un 200 direct sur `www.getchair.app`, jamais
une redirection.

---

## ÉTAPE 5 — Clé APNs (notifications push)

Le backend envoie les push directement à Apple (APNs). Il lui faut une **clé
d'authentification `.p8`** créée dans ton compte développeur. Cette clé est un
secret : **un seul téléchargement possible, jamais dans Git, jamais par email**.

### 5.1 Crée la clé sur developer.apple.com

1. **https://developer.apple.com/account** → **Certificates, Identifiers &
   Profiles** → **Keys** (le menu qui liste les clés d'authentification).
2. Clique **+** (Create a key).
3. Nom : `CHAIR APNs`.
4. Coche **Apple Push Notifications service (APNs)** → **Continue** →
   **Register**.
5. **Download** : tu récupères un fichier `AuthKey_XXXXXXXXXX.p8`.
   **C'est le SEUL téléchargement possible** — range-le immédiatement en lieu
   sûr (gestionnaire de mots de passe, coffre), et note :
   - le **Key ID** affiché sur la page (10 caractères) : `________________`
   - ton **Team ID** (déjà relevé à l'étape 4.1) : `________________`

### 5.2 Vérifie la capability Push sur l'App ID

**Certificates, Identifiers & Profiles → Identifiers → app.getchair.client**
→ onglet/section **Capabilities** : la ligne **Push Notifications** doit être
cochée. Si tu la coches maintenant, sauvegarde — le provisioning profile sera
régénéré au prochain build Xcode.

### 5.3 Dépose le fichier `.p8` sur le serveur backend — HORS webroot

Le fichier doit être lisible par Laravel mais **jamais servi par le web**. Le
webroot est `public/` : tout ce qui est dans `storage/` est inaccessible depuis
internet. Chemin recommandé :

```bash
mkdir -p ~/sites/api.getchair.app/backend/storage/app/keys
# puis dépose le fichier (depuis ton PC) :
scp AuthKey_XXXXXXXXXX.p8 <ton-user-ssh>@<hôte-ssh-infomaniak>:~/sites/api.getchair.app/backend/storage/app/keys/
chmod 600 ~/sites/api.getchair.app/backend/storage/app/keys/AuthKey_XXXXXXXXXX.p8
```

> **Source de vérité au moment où tu le feras** : le bloc APNs de
> `backend/.env.example` (le fichier commenté du dépôt). Si le chemin ou les
> noms de variables y diffèrent de ce guide, c'est `.env.example` qui fait foi —
> il est maintenu avec le code.

### 5.4 Pose les variables dans le `.env` de production

Dans `~/sites/api.getchair.app/backend/.env` (comme à l'étape 2.3) :

```env
APNS_KEY_PATH=storage/app/keys/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=<le Key ID noté en 5.1>
APNS_TEAM_ID=<le Team ID de l'étape 4.1>
APNS_BUNDLE_ID=app.getchair.client
APNS_BUNDLE_ID_PRO=app.getchair.pro
APNS_ENVIRONMENT=production
```

`APNS_KEY_PATH` accepte un chemin relatif à la racine du backend (comme
ci-dessus) ou un chemin absolu. **La même clé `.p8` signe pour toutes les apps
du Team** : un seul fichier suffit pour CHAIR CLIENT et CHAIR PRO.

**Piège classique, retiens-le : TestFlight utilise l'environnement APNs
`production`**, pas `sandbox`. `sandbox` ne sert que pour une app lancée
directement depuis Xcode sur un iPhone branché. Si les push ne partent pas sur
TestFlight, c'est la première chose à vérifier.

### 5.5 Teste

Deux conditions préalables, sinon le test ne peut pas réussir :

1. le **nouveau build TestFlight** (celui de l'étape 8, qui embarque le plugin
   push) est installé sur ton iPhone, et tu as accepté les notifications ;
2. tu t'es connecté dans l'app avec ton compte (c'est ce qui enregistre ton
   iPhone dans la table `push_subscriptions`).

Puis, en SSH :

```bash
cd ~/sites/api.getchair.app/backend
php artisan config:clear
php artisan chair:test-push <ton user_id ou ton email>
```

(La forme exacte de l'argument est affichée par
`php artisan help chair:test-push` — la commande te guide si tu
te trompes.)

**✓ Vérification :** la notification arrive sur ton iPhone, écran verrouillé
compris. Si la commande dit « pas d'abonnement push pour cet utilisateur »,
c'est la condition 2 ; si elle envoie mais que rien n'arrive, c'est presque
toujours `APNS_ENVIRONMENT` (voir 5.4) ou un build qui n'embarque pas encore le
plugin.

---

## ÉTAPE 6 — Compte de review Apple

Le reviewer d'Apple doit pouvoir se connecter à un compte **client** déjà
garni. La procédure complète, avec le script tinker **prêt à coller** et vérifié
contre le schéma réel de la base, est dans
[APPLE_REVIEW_ACCOUNT_SETUP.md](APPLE_REVIEW_ACCOUNT_SETUP.md) — suis-la telle
quelle, ne la refais pas de tête.

Résumé de ce que tu vas créer (le détail et le script sont dans le document) :

- un compte **client** (`role = 'client'`), email dédié type
  `appreview@getchair.app` — **jamais** une adresse `@demo.getchair.app` ;
- mot de passe unique, **différent de `chairdemo2026`**, 12 caractères minimum ;
- ville **Strasbourg** (là où la production a des coiffeurs actifs) ;
- données préparées : 3 favoris, 1 abonnement (pour le fil), 1 rendez-vous à
  venir (pour tester l'annulation), 1 rendez-vous passé sans avis (pour tester
  le dépôt d'avis) ;
- le tout **sur la production** (l'app charge `www.getchair.app` — un compte
  local n'existe pas pour Apple), après un backup de la base (la première
  commande du script).

### Où saisir les identifiants pour Apple

1. **https://appstoreconnect.apple.com** → **Apps** → **CHAIR**.
2. Dans la fiche de la version, section **App Review** (la rubrique où tu
   fournis les informations pour l'équipe de review).
3. Coche **Sign-in required** et renseigne **User name** (l'email du compte de
   review) et **Password** (son mot de passe).

**✓ Vérification :** déconnecte-toi de l'app (ou navigation privée sur
https://www.getchair.app/app), connecte-toi avec **exactement** les identifiants
saisis dans App Store Connect : le fil a du contenu, le compte montre un
rendez-vous à venir annulable et un rendez-vous passé qui propose de laisser un
avis.

---

## ÉTAPE 7 — App Store Connect, la fiche

Tout se passe sur **https://appstoreconnect.apple.com → Apps → CHAIR**.
Coche au fur et à mesure :

- [ ] **App Information** (menu latéral, section générale de l'app) :
  - Catégorie principale : **Style de vie (Lifestyle)** — argumentaire dans
    [APP_STORE_CONNECT_METADATA.md](APP_STORE_CONNECT_METADATA.md) §6 ; pas de
    catégorie secondaire.
  - URL de politique de confidentialité :
    `https://www.getchair.app/confidentialite`.
- [ ] **App Privacy** (menu latéral) : réponds à chaque question du
  questionnaire avec [APP_PRIVACY_MAPPING.md](APP_PRIVACY_MAPPING.md) — chaque
  case y est justifiée par un fichier du code. **Point clé : à la question sur
  le tracking (données utilisées pour suivre l'utilisateur / ATT), la réponse
  est « No »** — l'app n'a ni SDK publicitaire ni rapprochement avec des données
  tierces, et elle ne doit PAS demander l'autorisation ATT.
- [ ] **Age Rating** : réponds au questionnaire pour aboutir à la
  classification argumentée dans le dossier
  ([APP_STORE_CONNECT_METADATA.md](APP_STORE_CONNECT_METADATA.md) §7 :
  **13+, à cause du contenu généré par les utilisateurs** — un 4+ serait un
  rejet quasi certain).
- [ ] **App Review Information** (dans la fiche de version) :
  - le compte de review de l'étape 6 (Sign-in required) ;
  - tes coordonnées de contact joignables pendant la review ;
  - dans **Notes**, colle le texte anglais **intégral** de
    [APPLE_REVIEW_NOTES.md](APPLE_REVIEW_NOTES.md).
- [ ] **Chiffrement (Export Compliance)** : à chaque envoi de build, Apple pose
  la question **« Does your app use encryption? »**. Le contexte, simplement :
  toute app qui parle en HTTPS « utilise du chiffrement », mais l'usage
  exclusif du chiffrement standard du système (HTTPS/TLS, pas de crypto
  maison) correspond au cas d'**exemption courant** prévu par la
  réglementation américaine d'export — c'est exactement le cas de CHAIR, qui
  n'embarque aucune cryptographie propre. **C'est néanmoins une déclaration
  légale d'export qui t'engage, et la réponse t'appartient** — ce guide ne
  décide pas à ta place. Où répondre : **App Store Connect → Apps → CHAIR →
  TestFlight (ou la fiche de version) → sélectionner le build → Export
  Compliance** ; le questionnaire guide vers l'exemption si tes réponses la
  décrivent. (Une clé `ITSAppUsesNonExemptEncryption` dans l'Info.plist peut
  pré-répondre « NO » à cette question pour tous les builds — même logique,
  même responsabilité.)
- [ ] **Captures d'écran** : l'app est déclarée iPhone seul
  (`TARGETED_DEVICE_FAMILY = "1"`), donc **pas de captures iPad**. Les tailles
  iPhone exigées évoluent avec les gammes d'écrans — plutôt que de te donner
  des dimensions qui seront peut-être fausses le jour J, prends la liste
  officielle : cherche « **screenshot specifications App Store Connect** » sur
  le site d'Apple (page « Screenshot specifications » de l'aide App Store
  Connect). La liste des 6 écrans à capturer, dans l'ordre, est dans
  [APP_STORE_CONNECT_METADATA.md](APP_STORE_CONNECT_METADATA.md) §10 — des
  captures réelles du build, aucune maquette.
- [ ] **Nom, sous-titre, promotion, description, mots-clés** : tout est rédigé
  et calibré (limites de caractères comprises) dans
  [APP_STORE_CONNECT_METADATA.md](APP_STORE_CONNECT_METADATA.md) §1 à §5 —
  copie-colle depuis là.
  - URL marketing : `https://www.getchair.app` · URL d'assistance :
    `https://www.getchair.app/contact` (§9).

**✓ Vérification :** dans App Store Connect, la fiche de version n'affiche plus
aucun bandeau jaune « information manquante », et le bouton **Add for Review /
Submit** devient cliquable (ne clique pas encore — il faut d'abord le build de
l'étape 8).

---

## ÉTAPE 8 — Déploiement et build final

L'ordre est important : Apple teste **ce qui est en production**, pas ce qui est
dans le dépôt.

### 8.1 Push Git → Vercel (frontend)

Le commit et le push de tout le travail en cours sont faits par la session de
développement (orchestrateur). Dès que `main` est poussé, **Vercel redéploie le
frontend automatiquement** (2-3 min).

- [ ] Vérifie sur https://vercel.com que le dernier déploiement est **vert**.

### 8.2 Backend Infomaniak (SSH)

Procédure de référence : [../DEPLOY.md](../DEPLOY.md) — **lis-y le « piège
connu » sur la structure de dossier avant de commencer**, il se reproduit à
chaque déploiement. Résumé :

```bash
cd ~/sites/api.getchair.app/backend
git pull origin main
# ⚠ si "ls backend/routes/api.php" existe après le pull, applique le
#   correctif de structure décrit dans docs/DEPLOY.md (cp -a backend/. . ...)
composer install --no-dev --optimize-autoloader
# ⚠ puis le correctif platform_check décrit dans docs/DEPLOY.md si besoin
php artisan migrate --force
php artisan config:clear
php artisan route:cache
```

- [ ] `https://api.getchair.app/api/...` répond (pas de 500) — en cas de 500,
  la section diagnostic de `docs/DEPLOY.md`.

### 8.3 Build iOS sur le Mac

```bash
cd frontend
npm install        # OBLIGATOIRE : le plugin push est nouveau, il doit s'installer
npm run ios:chair  # reconfigure le projet Xcode partagé pour le binaire CLIENT
npx cap open ios
```

Dans Xcode, cible **App** → onglet **Signing & Capabilities** :

- [ ] la capability **Push Notifications** est présente ;
- [ ] la capability **Associated Domains** est présente avec
  `applinks:www.getchair.app` (détail : [DEEPLINKS_SETUP.md](DEEPLINKS_SETUP.md) §4) ;
- [ ] le Team sélectionné est le tien et la signature ne montre aucune erreur.

Puis : menu **Product → Archive** → dans l'Organizer, **Distribute App →
App Store Connect → Upload**. Réponds à la question Export Compliance (étape 7,
point Chiffrement).

### 8.4 Tests sur TestFlight

Quand le build apparaît dans TestFlight (traitement : quelques minutes à une
heure), installe-le sur ton iPhone et teste **dans cet ordre** :

- [ ] **Universal Links** : envoie-toi par iMessage/WhatsApp les liens de la
  liste de test de [DEEPLINKS_SETUP.md](DEEPLINKS_SETUP.md) (profil coiffeur,
  réalisation, avis…) → ils doivent ouvrir **l'app**, pas Safari.
- [ ] **Push** : relance `chair:test-push` (étape 5.5) → notification reçue.
- [ ] **Page d'erreur réseau** : passe l'iPhone en **mode avion**, ouvre l'app →
  la page d'erreur native s'affiche (pas une page blanche), et le bouton
  réessayer fonctionne une fois le réseau revenu.
- [ ] Parcours complet avec le compte de review (étape 6) : connexion,
  réservation, annulation, dépôt d'avis, suppression de compte sur un compte
  jetable si tu veux aller au bout.

**✓ Vérification :** les quatre cases ci-dessus cochées sur le build TestFlight
exact que tu comptes soumettre — pas sur un build antérieur.

---

## Récapitulatif — les 8 cases

- [ ] **1. Informations juridiques** — `CONTROLLER`, `PUBLISHER`, `HOST`,
  `MEDIATOR` remplis, pages vérifiées
- [ ] **2. SMTP Infomaniak** — 9 variables posées en prod, `chair:test-mail`
  reçu en boîte de réception
- [ ] **3. SPF / DKIM / DMARC** — vérifiés dans la zone DNS, test Gmail
  « Afficher l'original » = PASS
- [ ] **4. APPLE_TEAM_ID sur Vercel** — `curl` de l'AASA répond 200 JSON
- [ ] **5. Clé APNs** — `.p8` hors webroot, 5 variables `APNS_*` posées,
  `chair:test-push` reçu (nécessite le build de l'étape 8)
- [ ] **6. Compte de review** — créé en production via le script, identifiants
  saisis dans App Store Connect
- [ ] **7. Fiche App Store Connect** — catégorie, privacy (tracking = No),
  âge, notes de review, captures, métadonnées
- [ ] **8. Déploiement + build** — Vercel vert, backend migré, build TestFlight
  uploadé, 4 tests TestFlight passés

Quand les 8 cases sont cochées : App Store Connect → la version → **Add for
Review**.
