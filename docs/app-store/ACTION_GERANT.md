# ACTION GÉRANT — CHAIR CLIENT

**À lire en premier. Rien ne part sur l'App Store tant que ce document n'est pas soldé.**

Ce document rassemble tout ce qui **ne peut venir que de Julien** : identité juridique,
identifiants de services, décisions produit et arbitrages. Aucune de ces valeurs ne peut être
déduite du code, et aucune n'a été inventée. Une raison sociale, un SIREN, une adresse ou un nom
de DPO inventés dans des mentions légales ou dans App Store Connect constituent une **fausse
déclaration**, vis-à-vis d'Apple (guideline 5.6, Developer Code of Conduct) comme de la loi
française.

Chaque entrée dit : ce qu'il faut fournir · où le récupérer exactement · où le poser · ce qui
reste bloqué tant que ce n'est pas fait.

**État au 24 août 2026 : 0 entrée sur 10 est soldée.**

---

## Vue d'ensemble

| # | Sujet | Bloquant ? | Effort |
|---|---|---|---|
| 1 | Identité juridique de l'éditeur et hébergeur | **BLOCKER** | Recherche de documents, 30 min |
| 2 | Identifiants SMTP de production | **BLOCKER** | Création d'un compte fournisseur + DNS, 1 à 2 h |
| 3 | Compte de review Apple | **BLOCKER** | 30 min sur la production |
| 4 | Adresse de contact : confirmer qu'elle est relevée, plus réseaux sociaux | **BLOCKER** (guideline 1.2) | Vérification, 10 min |
| 5 | Décision Stripe / CHAIR PLUS | **BLOCKER** pour l'app PRO, HIGH pour le client | Décision |
| 6 | Apple Team ID et compte développeur (dont `APPLE_TEAM_ID` pour les Universal Links) | **BLOCKER** | Selon l'état du compte |
| 7 | Déclaration de chiffrement (`ITSAppUsesNonExemptEncryption`) | HIGH — bloque le téléversement | 5 min |
| 8 | URL publiques : confidentialité, assistance, marketing | MEDIUM | 15 min |
| 9 | Contenu de la base de production | **BLOCKER** | Décision + éventuel nettoyage |
| 10 | Engagements de modération et d'annulation | HIGH | Décision, à écrire dans les CGU |

---

## 1. Identité juridique de l'éditeur et hébergeur — BLOCKER

### Ce qu'il faut fournir

- Raison sociale exacte (dénomination telle qu'inscrite au registre)
- Forme juridique (SAS, SASU, SARL, micro-entreprise, association…)
- Capital social, si société
- SIREN (9 chiffres) et SIRET du siège (14 chiffres)
- Numéro de TVA intracommunautaire, si assujetti
- Adresse complète du siège social
- RCS : ville d'immatriculation et numéro
- Nom du représentant légal, et nom du directeur de la publication
- DPO désigné : oui ou non. Si oui, nom et coordonnées. Si non, le confirmer par écrit
  (la désignation n'est obligatoire que dans certains cas)
- **Hébergeur du site et de l'API** : dénomination, adresse postale, téléphone, pays des serveurs

### Où le récupérer exactement

- Raison sociale, forme, SIREN, SIRET, RCS, adresse, capital : sur l'**extrait Kbis**, ou
  gratuitement sur `annuaire-entreprises.data.gouv.fr` en cherchant le nom ou le SIREN.
- Numéro de TVA : sur les factures émises, ou reconstitué depuis le SIREN par le service des
  impôts des entreprises (espace professionnel `impots.gouv.fr`).
- Hébergeur : dans l'interface du prestataire qui héberge `www.getchair.app` et
  `api.getchair.app`. Chez OVH : *Espace client → Hébergements* ; chez Scaleway :
  *Console → Instances / Serveurs* ; chez Vercel : *Settings → General*. La dénomination légale
  et l'adresse à publier sont celles des **mentions légales du prestataire**, pas son nom
  commercial.

### Où le poser

Deux fichiers, deux constantes. Les champs laissés à `null` ne sont simplement pas rendus : la
page s'affiche, mais incomplète.

| Valeur | Fichier / constante / champ exact |
|---|---|
| Raison sociale, forme, capital, adresse, immatriculation, TVA, directeur de la publication, téléphone | `frontend/app/mentions-legales/page.tsx`, constante **`PUBLISHER`** : `legalName`, `legalForm`, `capital`, `address`, `registration`, `vatNumber`, `publicationDirector`, `phone` |
| Hébergeur : raison sociale, adresse, téléphone, site | même fichier, constante **`HOST`** : `legalName`, `address`, `phone`, `website` |
| Médiateur de la consommation | même fichier, constante **`MEDIATOR`** : `name`, `address`, `website` (voir aussi entrée 10) |
| Raison sociale, forme, adresse, immatriculation, DPO | `frontend/app/confidentialite/page.tsx`, constante **`CONTROLLER`** : `legalName`, `legalForm`, `address`, `registration`, `dpo` |
| Hébergeur (répété dans la politique) | même fichier, section 5, ligne « Hébergeur de l'application et de la base » — remplacer « À préciser — voir mentions légales » |
| Raison sociale | App Store Connect → *App Information* → champ **Copyright**, et fiche éditeur du compte Apple Developer |
| Raison sociale, vendeur de la prestation | `frontend/app/cgu/page.tsx` |

> La page `/mentions-legales` **a été créée pendant la session** et est liée depuis le pied de
> page. Elle est exemptée du portail bêta (`frontend/proxy.ts:53`). Elle n'attend que ces valeurs.

### Ce qui reste bloqué sans ça

La politique de confidentialité n'identifie pas le responsable du traitement, et les mentions
légales n'identifient ni l'éditeur ni l'hébergeur — **guideline 5.1.1(i), RGPD article 13, et
obligation française de mentions légales**. C'est le constat B-5 / H-5 de
`APPLE_RELEASE_AUDIT.md`. Les deux pages existent, elles sont à jour, elles attendent uniquement
ces valeurs.

---

## 2. Identifiants SMTP de production — BLOCKER

### Ce qu'il faut fournir

Un compte chez un fournisseur d'emails transactionnels (Postmark, Resend, Brevo, Amazon SES,
Mailgun — au choix), et les identifiants qui vont avec.

### Où le récupérer exactement

Après création du compte et **validation du domaine d'envoi**, la clé SMTP se trouve :
- Postmark : *Servers → (votre serveur) → API Tokens / SMTP*
- Resend : *Settings → SMTP*
- Brevo : *SMTP & API → SMTP*
- Amazon SES : *Account dashboard → SMTP settings → Create SMTP credentials*

Les enregistrements SPF, DKIM et DMARC sont fournis par le même écran, à poser chez le
registrar du domaine `getchair.app`. **Sans eux, les emails partent en spam** — pour un
reviewer, cela revient au même qu'une absence d'envoi.

### Où le poser

`backend/.env` **de production**, exactement ces variables :

```
MAIL_MAILER=smtp
MAIL_HOST=<hôte SMTP du fournisseur>     # ni mailhog, ni localhost, ni 127.0.0.1
MAIL_PORT=587
MAIL_USERNAME=<identifiant SMTP>
MAIL_PASSWORD=<clé / mot de passe SMTP>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=<adresse d'expédition sur le domaine CHAIR, ex. no-reply@getchair.app>
MAIL_FROM_NAME=CHAIR
FRONTEND_URL=https://www.getchair.app     # sert à construire le lien de réinitialisation
```

Vérification une fois posé : `php artisan chair:test-mail` (la commande affiche le diagnostic de
`MailService::configurationProblem()`), puis un vrai « mot de passe oublié » de bout en bout
depuis l'app.

**Ne jamais mettre ces identifiants dans le dépôt Git, ni dans un document de ce dossier.**

### Ce qui reste bloqué sans ça

Un reviewer qui teste « Mot de passe oublié » voit « email envoyé » et ne reçoit rien —
guideline 2.1, constat B-4 et `ACCOUNT_AUDIT.md` §7. L'email de bienvenue est dans le même cas.
Le mécanisme lui-même est complet et testé (jeton à usage unique, expiration 60 min, révocation
des sessions) : **il ne manque que le transport.**

> **Procédure détaillée : [ACTION_GERANT_SMTP.md](ACTION_GERANT_SMTP.md)** — choix du fournisseur,
> pas-à-pas Infomaniak et Brevo, enregistrements SPF/DKIM/DMARC, commande de vérification. Ce
> document-ci ne donne que la liste de variables ; ne pas dupliquer la procédure.

---

## 3. Compte de review Apple — BLOCKER

### Ce qu'il faut fournir

Un compte **client** dédié, créé **sur la production**, avec du contenu sur chaque écran.

### Où le récupérer

Il n'existe pas : il est à créer. La procédure exacte, avec le script `tinker` prêt à coller,
est dans **`APPLE_REVIEW_CHECKLIST.md` §2**. Points non négociables :

- adresse **hors** `@demo.getchair.app` — `php artisan chair:demo-reset` est destructif et
  effacerait le compte en pleine review ;
- mot de passe unique, différent de `chairdemo2026`, au moins 12 caractères ;
- ni un compte réel (Julien SCHILLINGER, Koehler Antoine…) : ils contiennent de vraies données
  personnelles qui ne doivent pas être communiquées à un tiers ;
- données minimales : 3 favoris, 2 abonnements, 1 rendez-vous à venir, 2 rendez-vous passés dont
  un avec un avis.

### Où le poser

App Store Connect → *App Review Information* → champs **Sign-In required / User Name / Password**.
Et dans `APPLE_REVIEW_NOTES.md`, bloc `DEMO ACCOUNT`, à la place des `<>`.

### Ce qui reste bloqué sans ça

La réservation, les favoris et le dépôt d'avis exigent un compte. Sans identifiants, le reviewer
ne peut pas tester la fonction principale de l'app — rejet 2.1 quasi certain.

---

## 4. Adresse de contact et réseaux sociaux — BLOCKER (guideline 1.2)

### Ce qu'il faut confirmer

Le code a tranché pendant la session : `frontend/lib/contact.ts` est désormais la **source
unique**, et retient `contact@getchair.app` — parce que c'est l'adresse à laquelle
`ContactController` envoie déjà le formulaire de contact du site.

**Ce qui reste au gérant :**
1. **Confirmer que `contact@getchair.app` est réellement relevée** par un humain. C'est
   l'exigence de la guideline 1.2 : une adresse publiée qui répond. La cohérence du code ne
   remplace pas une boîte mail lue.
2. **Confirmer les délais annoncés**, qui sont des engagements dès qu'ils sont affichés :
   `SUPPORT_HOURS = 'Lun–Ven, 9h–18h'`, `SUPPORT_RESPONSE_DELAY = 'sous 72h'`,
   `MODERATION_DELAY = 'sous 72 heures'`.
3. **Désigner qui traite les signalements** au quotidien, et sous quel délai réel.
4. **Fournir les comptes Instagram et TikTok de CHAIR, s'ils existent.** `lib/contact.ts` expose
   `SOCIAL_LINKS` avec `instagram: null` et `tiktok: null` : les liens morts précédents ont été
   retirés et le bloc n'est pas rendu tant que les valeurs manquent. Un lien qui tombe sur une
   404 pendant la review fait mauvais effet — ne remplir que si le compte existe.

### Ce qui reste en dur, à aligner

| Adresse | Où | Action |
|---|---|---|
| `hello@getchair.app` | `frontend/app/confidentialite/page.tsx`, constante locale `CONTACT_EMAIL` (6 occurrences rendues) | Remplacer par un import de `lib/contact.ts` |
| `hello@getchair.app` | `frontend/components/ui/ReportSheet.tsx:144` | Idem |
| `bonjour@getchair.app` | `MAIL_FROM_ADDRESS` côté serveur | Décider : adresse d'expédition distincte de l'adresse de contact, ou la même (voir entrée 2) |

### Où le poser aussi

App Store Connect → *App Review Information* → **Contact Email**, et *App Information* →
**Support URL** (voir entrée 8).

### Ce qui reste bloqué sans ça

Guideline 1.2 exige des coordonnées publiées **et joignables**. Une adresse cohérente partout mais
que personne ne relève ne satisfait pas la règle — et se paie au premier email d'App Review resté
sans réponse.

---

## 5. Décision Stripe / CHAIR PLUS — BLOCKER pour l'app PRO, HIGH pour le client

### Ce qu'il faut décider

Deux questions distinctes :

1. **Stripe est-il configuré en production ?** Un bouton d'abonnement visible qui renvoie une
   erreur est un motif de rejet. Le drapeau `chair_plus_enabled` permet de masquer entièrement
   prix et CTA (`/pro/chair-plus` bascule alors sur `ComingSoonState`) — vérifié.
2. **Que deviennent les liens de l'app client vers l'espace PRO ?** Ils sont aujourd'hui au
   nombre de cinq, tous en `target="_blank"`, donc ouverts dans Safari. C'est l'atténuation
   retenue, pas la suppression. L'option la plus sûre pour cette soumission reste de les retirer
   de l'app client.

### Où le poser

Décision produit, pas une variable. Les conséquences se répercutent sur `app/app/compte/page.tsx`,
`components/ui/ProfileActions.tsx`, la FAQ de `/app/aide` et les CGU.

### Ce qui reste bloqué sans ça

Constat H-1 de `APPLE_RELEASE_AUDIT.md`, guideline 3.1.1(a). Le risque est **incertain**, pas
nul : il dépend du comportement réel de la WebView sur appareil, qui n'a pas encore été testé.

> **Aide à la décision : [CHAIR_PLUS_OPTIONS.md](CHAIR_PLUS_OPTIONS.md)** — la règle 3.1.1(a)
> énoncée exactement, ce qui a déjà été corrigé dans le code, et les options avec leur coût, leur
> délai et leur risque. Il ne tranche rien : le choix reste au gérant. Le détail technique est
> dans `PAYMENTS_AUDIT.md` §2 et §8.

---

## 6. Apple Team ID et compte développeur — BLOCKER

### Ce qu'il faut fournir

- **Apple Developer Program actif**. Organisation (nécessite un numéro **D-U-N-S**) ou individuel
  — à trancher : un compte individuel affiche le **nom de la personne physique** comme éditeur sur
  la fiche App Store.
- **Team ID** (10 caractères alphanumériques)
- Nom d'éditeur affiché sur l'App Store, cohérent avec la raison sociale de l'entrée 1
- Certificat de distribution et profil d'approvisionnement App Store valides
- **App Review Contact** : nom, prénom, téléphone, email d'une personne joignable pendant la
  review

### Où le récupérer exactement

- Team ID : `developer.apple.com/account` → *Membership details* → **Team ID**
- Numéro D-U-N-S (compte organisation) : `developer.apple.com/enroll/duns-lookup`
- Certificats et profils : `developer.apple.com/account/resources`

### Où le poser

- Xcode → cible `App` → *Signing & Capabilities* → **Team**
- `codemagic.yaml` si le build passe par la CI (voir les blocs `app_store_connect`)
- **Variable d'environnement `APPLE_TEAM_ID` chez l'hébergeur du front.** Sans elle,
  `frontend/app/.well-known/apple-app-site-association/route.ts` renvoie **404** et les Universal
  Links restent inactifs : tout lien CHAIR partagé continue d'ouvrir Safari. Le 404 est
  volontaire — un Team ID inventé serait mis en cache plusieurs jours par le CDN d'Apple. Format
  attendu : exactement 10 caractères alphanumériques majuscules. Suite de la procédure dans
  **`DEEPLINKS_SETUP.md`** (capability *Associated Domains* + nouveau build TestFlight)
- App Store Connect → *App Review Information* → coordonnées

### Ce qui reste bloqué sans ça

Aucun build ne peut être signé ni téléversé. Et sans `APPLE_TEAM_ID` côté hébergeur, les Universal
Links restent inactifs — ce qui affaiblit l'argument 4.2 (constat H-4) et laisse les QR codes
d'avis certifiés ouvrir Safari plutôt que l'app (L-3).

---

## 7. Déclaration de chiffrement à l'export — HIGH

### Ce qu'il faut décider

Répondre à la question « votre app utilise-t-elle du chiffrement ? ». CHAIR n'utilise que
**HTTPS/TLS standard**, cas d'exemption habituel — mais c'est une **déclaration légale d'export**
et elle engage le déclarant. Aucun agent ne peut la faire à la place du gérant.

### Où le poser

Deux façons, l'une évite la question à chaque téléversement :

- `frontend/ios/App/App/Info.plist`, ajouter la clé **`ITSAppUsesNonExemptEncryption`**
  (booléen). Elle est **absente** aujourd'hui — vérifié.
- ou répondre à la main dans App Store Connect → *(le build)* → **Export Compliance**, à chaque
  nouveau build.

Si l'exemption est retenue et déclarée dans le plist, `frontend/scripts/sync-ios-chair.sh` devra
la poser aussi (comme il pose déjà les textes de permission), sinon un `cap sync` peut la perdre.

### Ce qui reste bloqué sans ça

Le build reste en attente dans App Store Connect et ne peut pas être soumis à la review.

---

## 8. URL publiques à déclarer — HIGH

### Ce qu'il faut fournir

| Champ App Store Connect | Valeur proposée | État vérifié dans `frontend/proxy.ts` |
|---|---|---|
| **Privacy Policy URL** | `https://www.getchair.app/confidentialite` | Exemptée du portail bêta (ligne 52) |
| **Support URL** | `https://www.getchair.app/contact` | Exemptée du portail bêta (ligne 54) — corrigé pendant la session |
| Mentions légales | `https://www.getchair.app/mentions-legales` | Exemptée du portail bêta (ligne 53) |
| **Marketing URL** (facultatif) | `https://www.getchair.app` | **Attention** : la page d'accueil `/` **n'est pas** exemptée |

### Ce qu'il faut faire

1. Confirmer que **`NEXT_PUBLIC_BETA_ENABLED` vaut `false`** dans l'environnement de production au
   moment de la soumission. C'est la seule vérification qui couvre tous les cas.
2. Sinon : ne pas déclarer de Marketing URL (le champ est facultatif), ou exempter `/` dans
   `frontend/proxy.ts`.
3. Tester chaque URL en navigation privée, sans être connecté, avant de la saisir.

### Ce qui reste bloqué sans ça

Un reviewer qui tombe sur un mot de passe en ouvrant une URL déclarée refuse l'app — constat M-7.

---

## 9. Contenu de la base de production — BLOCKER

### Ce qu'il faut décider

La base de production contient-elle des profils de démonstration
(`@demo.getchair.app`, générés par `php artisan chair:demo-reset`) ?

- **Si oui :** l'app présente à un reviewer, et à de vrais utilisateurs, des professionnels et
  des avis qui n'existent pas. Guidelines 2.3.1 et 2.3, et problème de droit de la consommation
  en France.
- **Si la production doit rester peuplée pour la review :** chaque profil doit correspondre à un
  professionnel réel ayant consenti à y figurer.

### Où vérifier

Sur la base de production :
`SELECT COUNT(*) FROM users WHERE email LIKE '%@demo.getchair.app';`

### À faire aussi

Retirer `images.unsplash.com` et `i.pravatar.cc` de `frontend/next.config.ts` (lignes 68-69) une
fois la décision prise — ce sont des vestiges des données de démonstration.

### Interdiction absolue

**`php artisan chair:demo-reset` ne doit JAMAIS être lancé en production**, et surtout pas
pendant la période de review : la commande supprime tous les comptes sauf les comptes nommés et
les admins — elle effacerait le compte fourni à Apple en pleine session.

---

## 10. Engagements de modération et d'annulation — HIGH

Ce ne sont pas des identifiants mais des décisions qui doivent être **écrites** avant de pouvoir
répondre honnêtement au questionnaire d'âge et aux notes de review.

### À trancher, puis à écrire dans les CGU

- **Qui est le vendeur de la prestation ?** Le coiffeur ou le salon, CHAIR n'étant
  qu'intermédiaire de mise en relation — à écrire noir sur blanc.
- **Politique d'annulation réelle — délai de préavis : à définir si besoin.**
  **État actuel, vérifié dans le code :** un client peut annuler **jusqu'à l'heure de début** du
  rendez-vous — `AppointmentController::clientCancel` (ligne 736) refuse seulement un rendez-vous
  déjà annulé, déjà terminé, ou déjà commencé (`hasAlreadyStarted`, ligne 768). Aucun préavis
  minimum, aucune pénalité, aucune limite de fréquence au-delà du throttle technique.
  **À trancher par le gérant :** faut-il imposer un préavis (ex. 2 h ou 24 h avant le créneau) ?
  Ce n'est pas une obligation Apple — l'état actuel est soumis tel quel et décrit honnêtement.
  **Le jour où un préavis est décidé, l'implémenter à trois endroits :**
  1. côté serveur : le contrôle dans `AppointmentController::clientCancel` (à côté de
     `hasAlreadyStarted`) ;
  2. côté UI : le texte de `CancelAppointmentSheet` dans `frontend/app/app/compte/page.tsx`
     (fonction ligne 668) ;
  3. côté contrat : les CGU (`frontend/app/cgu/page.tsx`) et la FAQ de `/app/aide`.
  Reste aussi à écrire dans les CGU : les conséquences d'un rendez-vous non honoré.
- **Le professionnel peut-il annuler ?** Dans quelles conditions, avec quelle information du
  client.
- **Traitement des litiges client ↔ coiffeur** : rôle exact de CHAIR.
- **Médiateur de la consommation** : obligatoire pour un professionnel vendant à des
  consommateurs en France. CHAIR étant intermédiaire, le point doit être tranché avec un conseil.
  Le cas échéant, le médiateur se renseigne dans la constante **`MEDIATOR`** de
  `frontend/app/mentions-legales/page.tsx` (`name`, `address`, `website`) et se cite dans les CGU.
- **Âge minimum d'utilisation**, à aligner avec la classification par âge App Store.
- **Procédure de recours** pour un professionnel dont un contenu est masqué ou supprimé.
- **Sort des avis en cas de suppression de compte.** Aujourd'hui le backend les **supprime**, ce
  qui efface aussi l'historique de notation des coiffeurs concernés, et `avg_rating` n'est pas
  recalculée. Une anonymisation serait plus juste pour les professionnels — décision gérant, à
  refléter ensuite dans les CGU et la politique de confidentialité.

### À confirmer pour la politique de confidentialité

- **Contrats de sous-traitance** (RGPD art. 28) signés avec Cloudinary et le prestataire email.
- **Durée de conservation des journaux** réellement configurée chez l'hébergeur. La politique
  annonce 12 mois maximum : le confirmer ou corriger.
- **Notifications promotionnelles** : le type `promotion` existe côté serveur, désactivé par
  défaut. Si des messages promotionnels sont réellement envoyés, ajouter la finalité *Developer's
  Advertising or Marketing* aux entrées *Email Address* et *User ID* du questionnaire App Privacy.

---

## Ce que ce document ne couvre pas

Les corrections de code restantes — filtrage des contenus au dépôt (B-3), portée du blocage
(B-2), déploiement en production (B-6) — ne sont pas des actions gérant : ce sont des
développements. Ils sont décrits dans `APPLE_RELEASE_AUDIT.md` §3 et comptés dans
`ETAT_FINAL.md`.
