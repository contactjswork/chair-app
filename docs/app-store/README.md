# CHAIR CLIENT — dossier de soumission App Store

Point d'entrée du dossier. Tout ce qui concerne la soumission de **CHAIR** (app cliente,
bundle `app.getchair.client`) vit dans ce répertoire.

**Dernière vérification du dossier contre le code : 24 août 2026, fin de session.**
État de la branche `main` à ce moment : 69 fichiers modifiés, 20 non suivis, **zéro commit**.
Toutes les corrections listées ici sont dans le working tree ; aucune n'est déployée. L'app iOS
ne contient aucun code : elle affiche `https://www.getchair.app/app`. Ce qu'Apple testera est ce
qui est **en production** le jour de la review, pas ce qui est dans ce dépôt.

> Le code a continué d'évoluer pendant la mise à jour de ce dossier. Chaque affirmation des
> documents révisés (`README`, `APPLE_RELEASE_AUDIT`, `APPLE_REVIEW_CHECKLIST`,
> `APPLE_REVIEW_NOTES`, `APP_PRIVACY_MAPPING`, `ACTION_GERANT`, `ETAT_FINAL`) a été re-vérifiée
> en ouvrant le fichier concerné. Les audits de détail listés plus bas datent, eux, du **début**
> de la session : en cas de contradiction, **c'est `APPLE_RELEASE_AUDIT.md` qui fait foi**.

---

## Par où commencer

**Commencer par [JULIEN_APP_STORE_SETUP.md](JULIEN_APP_STORE_SETUP.md)** : le guide
pas-à-pas opérationnel — où aller, quoi cliquer, quoi copier, où le coller, comment
vérifier — pour les 8 étapes qui restent (juridique, SMTP, DNS, Team ID, clé APNs,
compte de review, fiche App Store Connect, déploiement + build). Les documents
ci-dessous en sont l'arrière-plan : le guide y renvoie quand le détail compte.

| Ordre | Document | Pour qui | Pourquoi |
|---|---|---|---|
| 0 | **[JULIEN_APP_STORE_SETUP.md](JULIEN_APP_STORE_SETUP.md)** | Julien | LE guide pas-à-pas : chaque action clic par clic, dans l'ordre des dépendances, avec la vérification de chaque étape |
| 1 | **[ACTION_GERANT.md](ACTION_GERANT.md)** | Julien | Tout ce que personne d'autre ne peut fournir : identité juridique, SMTP, Apple, compte de review. Rien ne part tant que ce document n'est pas soldé |
| 2 | **[ETAT_FINAL.md](ETAT_FINAL.md)** | Julien | Le décompte des bloquants restants et la conclusion READY / NOT READY |
| 3 | **[APPLE_RELEASE_AUDIT.md](APPLE_RELEASE_AUDIT.md)** | Julien + dev | La matrice guideline par guideline, l'état réel de chacune, et ce qui reste |
| 4 | **[APPLE_REVIEW_CHECKLIST.md](APPLE_REVIEW_CHECKLIST.md)** | Celui qui builde et téléverse | La marche à suivre, dans l'ordre, du compte de review à l'envoi |
| 5 | **[APPLE_REVIEW_NOTES.md](APPLE_REVIEW_NOTES.md)** | Celui qui remplit App Store Connect | Le texte anglais à coller dans « App Review Information → Notes » |
| 6 | **[APP_STORE_CONNECT_METADATA.md](APP_STORE_CONNECT_METADATA.md)** | Celui qui remplit App Store Connect | Nom, sous-titre, description, mots-clés, catégories, classification d'âge, captures |
| 7 | **[APP_PRIVACY_MAPPING.md](APP_PRIVACY_MAPPING.md)** | Celui qui remplit App Store Connect | Chaque case du questionnaire App Privacy, justifiée par un fichier du code |

## Les audits de détail

Ces documents ne se lisent pas d'un bout à l'autre : on y va quand la matrice de
`APPLE_RELEASE_AUDIT.md` renvoie vers un constat précis.

Ils ont été écrits **au début** de la session et n'ont pas été révisés depuis : leurs numéros de
ligne et certains de leurs statuts sont dépassés. Leur valeur est la démonstration détaillée, pas
l'état courant.

| Document | Contenu |
|---|---|
| [ACCOUNT_AUDIT.md](ACCOUNT_AUDIT.md) | Cycle de vie du compte : inscription, connexion, mot de passe oublié, suppression. Contient le constat SMTP (§7), aujourd'hui bloquant |
| [IOS_TECHNICAL_AUDIT.md](IOS_TECHNICAL_AUDIT.md) | Projet Xcode, Capacitor, `Info.plist`, ATS, iPad, universal links, argument 4.2 |
| [PAYMENTS_AUDIT.md](PAYMENTS_AUDIT.md) | Ce qui s'achète et comment. Démonstration, sources Capacitor à l'appui, de ce qui reste dans l'app et de ce qui part dans Safari |
| [PERMISSIONS_AUDIT.md](PERMISSIONS_AUDIT.md) | Les trois permissions iOS déclarées, leur usage réel, ce qui n'est pas déclaré et ne doit pas l'être (ATT) |
| [REVIEWER_QA_REPORT.md](REVIEWER_QA_REPORT.md) | Parcours complet fait en posture de reviewer hostile, avec les écrans réellement atteints |
| [LEGAL_MISSING_INFORMATION.md](LEGAL_MISSING_INFORMATION.md) | Inventaire brut des informations juridiques manquantes. `ACTION_GERANT.md` en est la version actionnable — commencer par celle-là |

## Procédures détaillées

Chacune traite un sujet en profondeur. `ACTION_GERANT.md` les **référence** sans les dupliquer.

| Document | Contenu | Renvoyé depuis |
|---|---|---|
| [ACTION_GERANT_SMTP.md](ACTION_GERANT_SMTP.md) | Configuration de l'envoi d'emails : choix du fournisseur, pas-à-pas Infomaniak et Brevo, SPF/DKIM/DMARC, commande de vérification | `ACTION_GERANT.md` entrée 2 |
| [CHAIR_PLUS_OPTIONS.md](CHAIR_PLUS_OPTIONS.md) | La règle 3.1.1(a), ce qui a été corrigé, et les options d'arbitrage avec coût, délai et risque. Ne tranche rien | `ACTION_GERANT.md` entrée 5 |
| [DEEPLINKS_SETUP.md](DEEPLINKS_SETUP.md) | Universal Links iOS : socle web posé, `APPLE_TEAM_ID` à fournir, capability *Associated Domains* et nouveau build à faire | `ACTION_GERANT.md` entrée 6, audit H-4 et L-3 |

---

## État d'avancement en un coup d'œil

Détail et preuves dans `ETAT_FINAL.md`.

| | Sujet | État au 24/08/2026, fin de session |
|---|---|---|
| OK | Signalement de contenu (1.2) | Livré — `POST /reports`, menu `⋯` sur profil / fil / réalisation, et « Signaler un avis » sur les avis |
| OK | Règles de communauté publiées | `/app/regles-communaute`, avec la liste des comptes bloqués et le déblocage |
| OK | Suppression de compte (5.1.1(v)) | Livrée, textes alignés sur ce que fait vraiment le backend |
| OK | Annulation de rendez-vous (2.1) | Livrée — `PUT /appointments/{id}/cancel`, bouton dans `/app/compte` |
| OK | Géolocalisation contextualisée (5.1.1(iv)) | Demande sur `/app/recherche` uniquement, sur geste explicite |
| OK | Textes de permission iOS (5.1.2) | Alignés dans `Info.plist`, `sync-ios-chair.sh` et `codemagic.yaml` |
| OK | Privacy manifest (ITMS-91053) | `PrivacyInfo.xcprivacy` créé **et** rattaché à la cible Xcode |
| OK | iPad (2.5.1 / 4.0) | `TARGETED_DEVICE_FAMILY = "1"` — iPhone seul |
| OK | FAQ et CGU rendues exactes (2.1) | Plus d'annulation fantôme, plus d'« en cours de déploiement » |
| OK | Coordonnées publiées (1.2) | `frontend/lib/contact.ts` — source unique ; page `/mentions-legales` créée |
| OK | URL publiques (portail bêta) | `/contact` et `/mentions-legales` exemptés ; seule `/` ne l'est pas |
| OK | Politique de confidentialité (5.1.1(i)) | Réécrite — **sauf l'identité de l'éditeur** |
| ~ | Blocage d'un compte (1.2) | Fil, recherche, exploration, recommandations filtrés. **Fiche publique et classements non** — audit B-2 |
| ~ | Chemin vers CHAIR PLUS (3.1.1(a)) | Les cinq liens `/pro` sont en `target="_blank"` → Safari. **À confirmer sur appareil** |
| ~ | Minimum Functionality (4.2) | Aucune capacité native ajoutée — risque réel, non levable par un document |
| NON | Filtrage des contenus au dépôt (1.2) | Absent — aucun filtre lexical côté serveur |
| NON | Envoi d'emails en production | SMTP non configuré → « mot de passe oublié » silencieux |
| NON | Identité juridique de l'éditeur | `CONTROLLER`, `PUBLISHER`, `HOST` : tous les champs à `null` |
| NON | Contenu de la base de production | Non tranché — profils de démonstration |
| NON | Compte de review Apple | Non créé |
| NON | Déploiement en production | Rien n'est commité, rien n'est déployé |

**Conclusion actuelle : NOT READY — 6 bloquants ouverts, dont 4 qui attendent le gérant.**
Argumentée dans `ETAT_FINAL.md`.

---

## Trois choses à ne pas perdre de vue

1. **L'app charge la production.** Corriger un fichier ici ne change rien à ce qu'Apple voit.
   Le déploiement est une étape à part entière, pas une formalité.
2. **`php artisan chair:demo-reset` est destructif.** Il supprime tous les comptes sauf les
   comptes nommés et les admins. Il ne doit jamais être lancé en production, et surtout pas
   pendant une review.
3. **Rien de juridique n'est inventé dans ce dossier.** Là où une raison sociale, un
   hébergeur ou un identifiant manquent, la case est vide et attend le gérant. Une valeur
   inventée dans des mentions légales ou dans App Store Connect est une fausse déclaration.

## Documents ajoutés en vague 3 (25/08/2026)

| Document | Contenu |
|---|---|
| `APPLE_REVIEW_ACCOUNT_SETUP.md` | Créer le compte de review sur la production (script tinker prêt) |
| `REVIEWER_QA_FINAL.md` | Passe reviewer complète en navigateur — parcours intégral vérifié |
| `CONCURRENCY_TESTS.md` | Preuves : double booking, races, throttles (méthode bi-processus) |
| `TIMEZONE_TESTS.md` | Preuves timezone/DST — heures murales Europe/Paris de bout en bout |
| `SERVER_URL_STRATEGY.md` | Architecture site distant : analyse, page d'erreur locale, stratégie de version |
| `DEMO_CONTENT_REVIEW.md` | Inventaire du contenu de démo — décisions gérant (avis répétitifs !) |

Ordre de lecture recommandé pour le gérant : `JULIEN_APP_STORE_SETUP.md` (le
pas-à-pas, à dérouler dans l'ordre) → `ACTION_GERANT.md` → `ETAT_FINAL.md`
(verdict + addenda) → `APPLE_REVIEW_ACCOUNT_SETUP.md` →
`APPLE_REVIEW_CHECKLIST.md` au moment de soumettre.
