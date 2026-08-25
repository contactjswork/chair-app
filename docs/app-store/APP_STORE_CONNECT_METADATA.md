# CHAIR (client) — Métadonnées App Store Connect

Propositions de fiche pour **CHAIR**, bundle `app.getchair.client`, langue principale **français (France)**.
Écrit le 24 août 2026, à partir de ce que l'app fait **réellement** aujourd'hui (voir la cartographie dans `APPLE_RELEASE_AUDIT.md` §1).

**Deux règles appliquées partout dans ce document :**
1. Aucun superlatif invérifiable — pas de « n° 1 », pas de « meilleurs coiffeurs », pas de « la référence ». Guideline 2.3 : la fiche doit décrire l'app telle qu'elle est.
2. Aucune fonction annoncée qui n'existe pas dans le build. Chaque phrase de la description ci-dessous correspond à un écran existant.

> ⚠️ La métadonnée web actuelle (`frontend/app/layout.tsx`) affiche « Découvrez les **meilleurs** coiffeurs près de chez vous ». C'est un claim non démontrable ; ne pas le reprendre dans la fiche App Store, et le corriger côté site quand quelqu'un touchera ce fichier.

---

## 1. Nom de l'app — 30 caractères maximum

| Proposition | Caractères | Commentaire |
|---|---|---|
| **`CHAIR : coiffeurs et salons`** | 27 | **Recommandé.** La marque d'abord, puis deux mots qui portent la recherche. Descriptif, aucun claim |
| `CHAIR — Trouver un coiffeur` | 27 | Alternative orientée intention |
| `CHAIR` | 5 | Le plus propre, mais on perd tout signal de recherche dans le nom |

Le nom doit être identique à `CFBundleDisplayName` dans l'esprit (« CHAIR » s'affiche sous l'icône, c'est déjà le cas).

## 2. Sous-titre — 30 caractères maximum

| Proposition | Caractères |
|---|---|
| **`Coiffeurs près de chez toi`** | 26 — **recommandé**, cohérent avec le tutoiement de l'app |
| `Trouve et réserve ton coiffeur` | 30 (limite exacte) |
| `Réserver chez un coiffeur` | 25 |

Ne pas répéter dans le sous-titre les mots déjà présents dans le nom : Apple indexe les deux champs.

## 3. Texte promotionnel — 170 caractères maximum

Modifiable sans nouvelle soumission ; c'est le champ à faire vivre.

> Découvre les coiffeurs près de chez toi : portfolios, avis certifiés, disponibilités. Réserve en quelques secondes, paie sur place le jour du rendez-vous.

(154 caractères.)

## 4. Description

```
CHAIR t'aide à trouver un coiffeur qui correspond à ce que tu cherches, puis
à réserver ton créneau.

TROUVER
Cherche par ville ou autour de toi, sur une carte ou en liste. Filtre par
spécialité. Chaque profil montre le travail du coiffeur en photos, ses
prestations avec les prix et les durées, et ses avis.

DES AVIS CERTIFIÉS
Un avis ne peut être déposé qu'après un rendez-vous réellement effectué,
confirmé sur place par QR code ou par un lien à usage unique. Personne ne
peut noter un coiffeur chez qui il n'est jamais allé.

RÉSERVER
Choisis une prestation, une date, un créneau libre. Tu reçois la
confirmation dans l'app et retrouves tous tes rendez-vous dans ton compte.
Le paiement se fait au salon, le jour du rendez-vous : CHAIR ne demande
jamais de carte bancaire.

GARDER CE QUI TE PLAÎT
Enregistre des coiffeurs en favoris, mets de côté les réalisations qui
t'inspirent, abonne-toi aux professionnels dont tu veux suivre le travail.

TON COMPTE
Navigation libre sans compte : recherche, profils, avis, classements. Un
compte est nécessaire pour réserver, déposer un avis et garder tes favoris.
Réglages de notification détaillés, et suppression du compte directement
dans l'app.

CHAIR est gratuit pour les clients.

Les coiffeurs et les salons ont leur propre application, CHAIR PRO.

Conditions d'utilisation : https://www.getchair.app/cgu
Politique de confidentialité : https://www.getchair.app/confidentialite
```

**Ce qui a été volontairement écarté de la description**, faute d'existence ou de vérifiabilité :
- toute mention de notifications push (aucun SDK push dans l'app aujourd'hui) ;
- toute mention d'annulation de rendez-vous depuis l'app (la fonction n'existe pas côté client) ;
- toute mention du signalement et du blocage : ces fonctions existent dans le working tree mais ne sont pas encore déployées. Une ligne peut être ajoutée le jour où elles sont en production, par exemple « Signale un contenu ou bloque un compte depuis le menu ⋯ » ;
- tout chiffre (nombre de coiffeurs, de villes, d'avis) : chaque chiffre publié devient une affirmation à tenir.

## 5. Mots-clés — 100 caractères maximum, séparés par des virgules sans espace

> `coiffeur,coiffure,salon,barbier,coupe,couleur,balayage,rendez-vous,avis,coiffeuse,proche,quartier`

(97 caractères.)

Règles appliquées : pas de nom de concurrent (Planity, Treatwell… — motif de rejet et de litige), pas de répétition du nom ni du sous-titre, singulier uniquement (Apple gère les pluriels), pas d'espace après les virgules pour ne pas gaspiller de caractères.

## 6. Catégories

| Champ | Valeur proposée | Raison |
|---|---|---|
| Catégorie principale | **Style de vie** (Lifestyle) | C'est la catégorie des apps de découverte et de réservation de services de beauté sur l'App Store. Il n'existe pas de catégorie « Beauté » sur iOS (c'est une catégorie Google Play) |
| Catégorie secondaire | **aucune** — recommandé | « Réseaux sociaux » décrirait le fil et les abonnements, mais placerait l'app dans une catégorie plus scrutée sur la modération alors que les fonctions sociales sont périphériques. À reconsidérer si le fil devient central |

## 7. Classification par âge

**Recommandation : 13+. Le niveau 4+ n'est pas défendable.**

Pourquoi 4+ est exclu : l'app affiche du contenu produit par des utilisateurs et non par l'éditeur — avis en texte libre écrits par des clients, photos de réalisations, biographies, et liens Instagram/TikTok saisis par les professionnels qui envoient vers des plateformes tierces. Apple demande de déclarer la présence de contenu généré par les utilisateurs ; un 4+ sur une app à UGC est un rejet quasi certain, et un changement de classification imposé au mieux.

Réponses proposées au questionnaire (à répondre honnêtement, sans minimiser) :

| Question du questionnaire | Réponse | Justification factuelle |
|---|---|---|
| Contenu généré par les utilisateurs | **Oui** | Avis clients (texte libre, 10 à 1000 caractères), photos et biographies des professionnels, liens sortants saisis par eux |
| Contrôles de modération in-app (signalement, blocage, filtrage) | **Répondre selon ce qui est déployé le jour de la soumission** | Signalement et blocage ont été livrés dans le working tree pendant l'audit (`ReportSheet.tsx`, `BlockConfirmSheet.tsx`, `/app/regles-communaute`) mais **ne sont pas déployés** ; le filtrage avant publication n'existe pas (audit B-3). Répondre « oui » sur une fonction absente de la production serait une déclaration fausse à Apple |
| Fonctions sociales (profils, abonnements, fil) | **Oui** | Fil de réalisations, abonnements à des professionnels, likes |
| Violence, contenu sexuel, nudité, thèmes crus | **Non** | Aucun contenu de ce type n'est attendu ni autorisé par les CGU |
| Jeux d'argent, concours | **Non** | Les points et classements ne donnent droit à aucun gain |
| Alcool, tabac, drogues | **Non** | — |
| Accès web illimité (navigateur intégré) | **À vérifier sur appareil, réponse attendue : Non** | Les liens externes (Instagram, TikTok, site de réservation d'un salon) sont posés en `target="_blank"` et doivent quitter l'app vers Safari. **Si un test sur iPhone montre qu'ils s'ouvrent dans la WebView de l'app, la réponse devient Oui et la classification monte à 18+.** À tester avant de remplir le questionnaire |
| Contrôles parentaux / restriction d'âge à l'inscription | **Non** | Aucune vérification d'âge aujourd'hui |

À aligner avec les CGU : si l'âge minimum d'utilisation retenu diffère de 13 ans, les CGU doivent le dire et la classification suivre.

## 8. Étiquettes de confidentialité (App Privacy)

À remplir dans App Store Connect en s'appuyant sur ce que le code collecte réellement, pas sur ce que la politique de confidentialité affirme aujourd'hui (elle contient des inexactitudes, voir audit H-5).

| Donnée | Collectée ? | Liée à l'utilisateur | Usage | Source |
|---|---|---|---|---|
| Nom | Oui | Oui | Fonctionnalité de l'app | inscription |
| Adresse email | Oui | Oui | Fonctionnalité de l'app | inscription |
| Numéro de téléphone | Oui, facultatif | Oui | Fonctionnalité de l'app | inscription |
| Position précise | Oui, sur autorisation | Oui | Fonctionnalité de l'app | `@capacitor/geolocation`, stockée sur le compte via `PUT /user/location` |
| Ville / code postal | Oui | Oui | Fonctionnalité de l'app | inscription et profil |
| Photos | Oui | Oui | Fonctionnalité de l'app | photo de profil uniquement |
| Contenu utilisateur (avis) | Oui | Oui | Fonctionnalité de l'app | dépôt d'avis |
| Historique d'achats | Non | — | — | aucun paiement dans l'app |
| Identifiants publicitaires, données de suivi | Non | — | — | aucun SDK publicitaire ni analytique tiers dans le frontend |
| Identifiant d'appareil pour le push | **Non aujourd'hui** | — | — | aucun SDK push dans l'app client ; à basculer sur « Oui » le jour où le push est activé |

Le suivi (App Tracking Transparency) est à déclarer **non** : aucun SDK de suivi n'est présent, et aucune donnée n'est partagée à des fins publicitaires. En conséquence, `NSUserTrackingUsageDescription` n'a pas à être ajoutée dans `Info.plist`.

## 9. Autres champs de la fiche

| Champ | Valeur |
|---|---|
| URL marketing | `https://www.getchair.app` — vérifier qu'elle est publique (voir audit M-7 : le portail bêta n'exempte pas `/`) |
| URL d'assistance | `https://www.getchair.app/contact` — **même vérification, cette page n'est pas dans la liste d'exemptions du portail bêta** |
| URL de politique de confidentialité | `https://www.getchair.app/confidentialite` — page exemptée, accessible |
| Copyright | `<année> <raison sociale exacte de l'éditeur>` — voir `LEGAL_MISSING_INFORMATION.md` |
| Coordonnées App Review | nom, prénom, téléphone et email d'une personne joignable pendant la review |
| Version | `1.0.0` (aligné sur `MARKETING_VERSION`) |
| Contenu tarifé | Gratuit, sans achat intégré |

## 10. Captures d'écran

Tailles obligatoires : iPhone 6,9" et 6,5". **Et iPad 13"** tant que `TARGETED_DEVICE_FAMILY` vaut `"1,2"` (voir audit M-6 : passer l'app en iPhone seul supprime cette obligation).

Écrans à montrer, dans cet ordre — chacun doit être une capture réelle du build soumis, sans maquette trompeuse (guideline 2.3.3) :
1. Accueil / découverte
2. Recherche avec la carte
3. Un profil de coiffeur (portfolio et prestations)
4. Les avis d'un coiffeur
5. La feuille de réservation, avec la mention « paiement sur place » visible
6. Le compte, avec un rendez-vous à venir

Les textes ajoutés sur les captures doivent rester descriptifs. Aucun chiffre, aucun superlatif, aucune fonction absente du build.
