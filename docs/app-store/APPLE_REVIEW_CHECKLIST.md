# CHAIR (client) — Checklist de soumission (build + App Store Connect)

**Document unique** pour la soumission de **CHAIR** (`app.getchair.client`) : prérequis, build
iOS, production web, test appareil, et toutes les cases App Store Connect. Révisé contre le code
réel le 24 août 2026 (vague 3). Les constats référencés (`B-…`, `H-…`, `M-…`) sont détaillés
dans `APPLE_RELEASE_AUDIT.md` ; les actions gérant dans `ACTION_GERANT.md` ; le compte de review
dans `APPLE_REVIEW_ACCOUNT_SETUP.md`.

Ordre voulu : ce qui bloque d'abord, la mécanique ensuite.

---

## 0. Prérequis bloquants — ne pas soumettre tant que ces cases ne sont pas cochées

- [ ] **B-6 — Tout est commité et déployé en production.** L'app iOS charge
      `https://www.getchair.app/app` : rien de ce qui dort dans le working tree n'existe pour
      App Review. Au 24/08/2026 : zéro commit
- [ ] **B-4 — SMTP de production configuré.** Sans lui, « mot de passe oublié » n'envoie rien.
      `ACTION_GERANT.md` entrée 2, procédure dans `ACTION_GERANT_SMTP.md`
- [ ] **B-5 — Identité juridique de l'éditeur fournie.** `CONTROLLER`
      (`app/confidentialite/page.tsx`) et `PUBLISHER` / `HOST`
      (`app/mentions-legales/page.tsx`) sont à `null`. `ACTION_GERANT.md` entrée 1
- [ ] **Compte de review créé sur la production** — procédure complète et script tinker
      vérifié : `APPLE_REVIEW_ACCOUNT_SETUP.md`
- [ ] **H-3 — Contenu de la base de production tranché** : plus aucun profil fictif présenté
      comme un professionnel réel. `ACTION_GERANT.md` entrée 9

### Levés pendant la session — vérifiés dans le code, à ne pas rouvrir

- **B-3 — Filtrage des contenus au dépôt : LIVRÉ.** `backend/app/Services/ContentFilter.php`,
  branché sur les 3 dépôts d'avis (`VisitController:223`, `AppointmentController:584,658`) et
  les 4 dépôts de réalisation (`PostController`). Refuse insultes, termes haineux (y compris
  maquillés) et coordonnées en clair ; 422 avec message français. Ne filtre pas les images
- **B-2 — Portée du blocage : ÉTENDUE et assumée.** Fil, recherche, exploration,
  recommandations **et liste principale** (`HairdresserController:96`) filtrés ; fiche en lien
  direct → bandeau `BlockedProfileNotice` avec déblocage. **Classements non filtrés** — les
  notes de review le disent tel quel
- Cible **iPhone seule** : `TARGETED_DEVICE_FAMILY = "1"` (pas de captures iPad)
- Position demandée **sur `/app/recherche` uniquement**, sur tap explicite
- Textes de permission alignés (`Info.plist`, `sync-ios-chair.sh`, `codemagic.yaml`)
- `PrivacyInfo.xcprivacy` créé **et rattaché à la cible** (`Copy Bundle Resources`)
- Adresse de contact unifiée (`frontend/lib/contact.ts` → `contact@getchair.app`)
- `/contact`, `/mentions-legales`, `/cgu`, `/confidentialite`, `/.well-known` exemptés du
  portail bêta

## 1. Décisions produit à figer

- [ ] **H-1 — Liens vers l'espace professionnel** : cinq liens en `target="_blank"` → Safari.
      Confirmer sur appareil, ou les retirer. `ACTION_GERANT.md` entrée 5
- [ ] **Stripe / CHAIR PLUS** : configuré en production, ou `chair_plus_enabled = false`
- [ ] **Universal links** : activés (poser `APPLE_TEAM_ID` + capability *Associated Domains* +
      nouveau build — `DEEPLINKS_SETUP.md`) ou reportés
- [ ] **Sort des avis à la suppression de compte** : suppression (actuel) ou anonymisation (M-2)
- [ ] **Déclaration de chiffrement** : `ITSAppUsesNonExemptEncryption` dans `Info.plist`, ou
      réponse manuelle à chaque build (`ACTION_GERANT.md` entrée 7)
- [ ] **Délai de préavis d'annulation** : aujourd'hui un client annule jusqu'à l'heure de début.
      À assumer, ou à définir dans les CGU (`ACTION_GERANT.md` entrée 10)

## 2. Compte de review

**→ `APPLE_REVIEW_ACCOUNT_SETUP.md`** — type de compte, données à préparer, script tinker
vérifié colonne par colonne, champs App Store Connect, et les interdits pendant la review
(dont : **jamais `php artisan chair:demo-reset` en production**).

## 3. Build iOS

Sur le Mac, depuis `frontend/`.

- [ ] `npm run ios:chair` — bascule sur CHAIR client, force
      `PRODUCT_BUNDLE_IDENTIFIER = app.getchair.client`, réécrit les textes de permission,
      incrémente le build number, vérifie l'URL `https://www.getchair.app/app`
- [ ] Xcode : `Bundle Identifier` = `app.getchair.client`, `MARKETING_VERSION` = `1.0.0`,
      `CURRENT_PROJECT_VERSION` supérieur à tout build téléversé (L-4),
      `TARGETED_DEVICE_FAMILY = "1"`
- [ ] Relire les trois textes de permission d'`Info.plist` après le sync : usage client, tutoiement
- [ ] `PrivacyInfo.xcprivacy` toujours dans *Copy Bundle Resources* après `cap sync`, et présent
      dans l'`.ipa` (`unzip -l`)
- [ ] Vérifier que le User-Agent embarque `CHAIRClient/1` (le `capacitor.config.json` iOS actuel
      ne porte **pas encore** `appendUserAgent` — il faut un sync depuis `capacitor.config.ts`)
- [ ] Aucune clé de permission inutile (micro, contacts, calendrier, Bluetooth, ATT). **Ne PAS
      lier `AppTrackingTransparency`** ni déclarer `NSUserTrackingUsageDescription`
- [ ] Icône 1024×1024 sans alpha ; capability Push **non** cochée (pas de push dans ce build)
- [ ] Signature App Store valide ; archive et validation Organizer sans avertissement bloquant

## 4. Production web — l'app charge le site en ligne

- [ ] Le déploiement contient les correctifs du §0
- [ ] `NEXT_PUBLIC_BETA_ENABLED=false` en production (sinon `/` est derrière un mot de passe — M-7)
- [ ] `https://www.getchair.app/app` répond sans redirection de host
- [ ] `/confidentialite`, `/cgu`, `/contact`, `/mentions-legales` répondent en navigation privée
- [ ] `https://api.getchair.app/api` répond, TLS valide
- [ ] `php artisan chair:test-mail` passe, puis un « mot de passe oublié » réel de bout en bout
- [ ] Aucun bandeau maintenance/bêta visible dans l'app
- [ ] Ne pas déployer pendant la review, sauf correctif demandé par Apple

## 5. Test sur appareil réel avant upload

Sur iPhone physique, avec le build soumis.

- [ ] Première ouverture : splash → `/app`, **aucune demande de position au lancement**
- [ ] Position : refuser → recherche par ville OK, rien ne bloque ; accepter → tri par distance
- [ ] Réservation complète avec le compte de review, jusqu'à « Aucun paiement dans l'application »
- [ ] **Annuler** le rendez-vous à venir depuis `/app/compte`
- [ ] **Déposer l'avis** sur le rendez-vous passé (l'invitation doit apparaître), puis tester le
      refus du filtre avec une insulte → message d'erreur propre
- [ ] Suppression de compte : parcours complet **sur un compte jetable**
- [ ] Signalement : `⋯` sur fiche, réalisation, fil + « Signaler un avis » → confirmation, puis
      présence dans la file admin
- [ ] Blocage : bloquer → disparaît du fil, de la recherche et de la liste ; fiche en lien direct
      → bandeau « compte bloqué » ; débloquer depuis `/app/regles-communaute`
- [ ] Notifications : bascule d'un des 10 interrupteurs, persistance après relance
- [ ] Lien Instagram/TikTok d'un profil : vérifier qu'il **sort vers Safari** (conditionne le
      questionnaire d'âge, §6.5)
- [ ] « Devenir coiffeur sur CHAIR » : s'ouvre dans Safari, aucun écran d'abonnement payant
      atteignable dans l'app (H-1)
- [ ] Safe areas, cibles ≥ 44 px, aucun écran vide sans message

## 6. App Store Connect — toutes les cases, dans l'ordre de l'interface

### 6.1 App Information

- [ ] **Nom / sous-titre** : propositions chiffrées dans `APP_STORE_CONNECT_METADATA.md` §1-2
- [ ] **Catégorie principale : Style de vie (Lifestyle)** ; pas de catégorie secondaire
      (`APP_STORE_CONNECT_METADATA.md` §6)
- [ ] **Privacy Policy URL** : `https://www.getchair.app/confidentialite` — testée en navigation
      privée (page exemptée du portail bêta, `frontend/proxy.ts`)
- [ ] **Copyright** : `<année> <raison sociale exacte>` (`ACTION_GERANT.md` entrée 1)

### 6.2 Fiche de la version

- [ ] **Description, texte promotionnel, mots-clés** : à coller depuis
      `APP_STORE_CONNECT_METADATA.md` §3-5 (aucun superlatif, aucune fonction absente du build)
- [ ] **Support URL** : `https://www.getchair.app/contact` — testée en navigation privée
- [ ] **Marketing URL** (facultatif) : `https://www.getchair.app` — seulement si
      `NEXT_PUBLIC_BETA_ENABLED=false` (la home `/` n'est pas exemptée du portail)
- [ ] **Captures d'écran — iPhone uniquement** (cible `"1"`, aucune capture iPad demandée).
      Taille obligatoire actuelle : **6,9 pouces** — 1320 × 2868 px (ou 1290 × 2796) en
      portrait ; Apple les redimensionne pour les écrans plus petits, le jeu 6,5" (1242 × 2688 /
      1284 × 2778) reste facultatif. Prises sur le build soumis, écrans proposés dans
      `APP_STORE_CONNECT_METADATA.md` §10
- [ ] **Version** `1.0.0`, alignée sur `MARKETING_VERSION`

### 6.3 App Privacy (questionnaire)

Remplir depuis **`APP_PRIVACY_MAPPING.md` §2**, qui justifie chaque case par un fichier du code.
Résumé des réponses, section par section du questionnaire :

| Section du questionnaire | Réponse à cocher |
|---|---|
| « Do you or your third-party partners use data for **tracking** purposes? » | **No** |
| **Contact Info** | Name, Email Address, Phone Number : *Collected, Linked, No tracking, App Functionality* |
| **Health & Fitness / Financial Info / Contacts / Sensitive Info** | *Not collected* |
| **Location** | Precise Location + Coarse Location : *Collected, Linked, No tracking, App Functionality (+ Product Personalization pour Precise)* |
| **User Content** | Photos or Videos, Customer Support, Other User Content : *Collected, Linked, No tracking, App Functionality* |
| **Browsing History / Search History** | *Not collected* (recherches locales à l'appareil) |
| **Identifiers** | User ID : *Collected, Linked, No tracking, App Functionality* ; Device ID : *Not collected* (pas de push dans ce build) |
| **Purchases** | *Not collected* (aucun paiement dans l'app) |
| **Usage Data** | Product Interaction : *Collected, Linked, No tracking, App Functionality + Product Personalization* |
| **Diagnostics** | *Not collected* (aucun SDK de crash/analytics) |

### 6.4 Compte de review et contact

- [ ] *App Review Information* → **Sign-in required** coché, **User name / Password** du compte
      créé selon `APPLE_REVIEW_ACCOUNT_SETUP.md` — testés une dernière fois juste avant l'envoi
- [ ] **Contact** App Review : nom, téléphone, email d'une personne joignable pendant la review
- [ ] **Notes** : coller la version finale de `APPLE_REVIEW_NOTES.md`, `<>` remplis

### 6.5 Classification par âge

- [ ] Questionnaire rempli honnêtement. **Niveau attendu : 13+ — le 4+ n'est pas défendable** :
      l'app affiche du **contenu généré par les utilisateurs** (avis en texte libre, photos de
      réalisations, biographies) et des **fonctions sociales** (fil, abonnements, likes). Un 4+
      sur une app à UGC social est un rejet quasi certain
- [ ] Contrôles de modération : répondre **oui** pour le signalement, le blocage **et** le
      filtrage au dépôt — les trois existent dans le code (§0) — **à condition qu'ils soient
      déployés en production le jour de la soumission**
- [ ] Violence, sexe, jeux d'argent, alcool/tabac/drogues : **non**
- [ ] « Accès web illimité » : réponse attendue **non** — à confirmer par le test appareil §5
      (liens externes sortant vers Safari). S'ils s'ouvrent dans l'app, la réponse devient oui
      et la classification monte
- [ ] Aligner l'âge minimum des CGU avec la classification retenue

### 6.6 Prix, disponibilité, conformité

- [ ] **Prix : gratuit, sans achat intégré**
- [ ] Disponibilité : France au minimum ; si d'autres pays, vérifier langue et mentions légales
- [ ] **Export Compliance** : HTTPS/TLS standard uniquement — exemption habituelle, mais c'est
      une déclaration légale du gérant (`ACTION_GERANT.md` entrée 7). Poser
      `ITSAppUsesNonExemptEncryption` dans `Info.plist` évite la question à chaque build

## 7. Après envoi

- [ ] Surveiller les messages d'App Review — le délai de réponse compte
- [ ] Ne rien déployer qui modifie le comportement testé
- [ ] En cas de rejet : lire la guideline citée, la retrouver dans `APPLE_RELEASE_AUDIT.md`,
      corriger, répondre factuellement dans Resolution Center
- [ ] Après publication : renseigner `APP_STORE_URL` dans `frontend/lib/appDownload.ts` (vide
      aujourd'hui, ce qui neutralise volontairement les boutons de téléchargement du site)
- [ ] Premier téléversement **TestFlight avant la soumission**, pour récupérer les emails
      automatisés (ITMS-*) pendant qu'ils ne coûtent rien
