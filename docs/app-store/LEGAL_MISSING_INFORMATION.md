# CHAIR (client) — Informations que seul le gérant peut fournir

Écrit le 24 août 2026. Ce document liste ce qui **manque** pour soumettre l'app, et que personne d'autre que Julien ne peut fournir : identité juridique, engagements contractuels, adresses réelles.

**Rien n'est pré-rempli ici, et rien ne doit l'être par un agent ou par déduction.** Une raison sociale, un SIREN, une adresse ou un nom de DPO inventés dans des mentions légales ou dans App Store Connect constituent une fausse déclaration — vis-à-vis d'Apple (guideline 5.6, Developer Code of Conduct) comme vis-à-vis de la loi française.

Format : une case par information, avec l'endroit exact où elle devra être posée une fois connue.

---

## 1. Identité de l'éditeur

Aujourd'hui, `frontend/app/confidentialite/page.tsx` §1 indique comme responsable du traitement : « CHAIR », plus une adresse email. Ce n'est pas une identification.

- [ ] **Raison sociale exacte** (dénomination telle qu'inscrite au registre)
- [ ] **Forme juridique** (SAS, SASU, SARL, micro-entreprise, association…)
- [ ] **Capital social**, si société
- [ ] **SIREN** (9 chiffres) et **SIRET** du siège (14 chiffres)
- [ ] **Numéro de TVA intracommunautaire**, si assujetti
- [ ] **Adresse du siège social** (complète : voie, code postal, ville, pays)
- [ ] **RCS** : ville d'immatriculation et numéro
- [ ] **Nom du représentant légal**

→ à publier dans : mentions légales (page à créer, voir §6), politique de confidentialité §1, CGU, champ « Copyright » d'App Store Connect, et fiche éditeur du compte Apple Developer.

## 2. Directeur de la publication et hébergement

- [ ] **Directeur de la publication** (nom et prénom de la personne physique)
- [ ] **Hébergeur du site et de l'API** : dénomination, adresse postale, téléphone

La politique de confidentialité mentionne aujourd'hui un « Hébergeur serveurs » situé dans l'Union européenne, sans le nommer. La loi française impose de nommer l'hébergeur ; le RGPD impose d'identifier les sous-traitants.

## 3. Contact et protection des données

- [ ] **Une seule adresse email de contact public**, réellement relevée. Deux adresses coexistent dans le code : `contact@getchair.app` (`/app/aide`, `/app/compte/supprimer`) et `hello@getchair.app` (`/cgu`, `/confidentialite`). Il en faut une, partout
- [ ] **Adresse email dédiée à l'exercice des droits RGPD** (accès, rectification, effacement, opposition, portabilité) — peut être la même
- [ ] **DPO désigné ?** oui / non. Si oui : nom et coordonnées. Si non : le confirmer par écrit ici, la désignation n'étant obligatoire que dans certains cas
- [ ] **Adresse email ou formulaire de signalement d'abus**, avec un délai de traitement réellement tenable. La politique annonce actuellement « 72h ouvrées maximum » : à confirmer ou à corriger. Apple exige, pour les apps à contenu utilisateur, un traitement rapide des signalements (guideline 1.2) — le délai affiché devient un engagement
- [ ] **Personne joignable pendant la review Apple** : nom, prénom, téléphone, email (champ « App Review Contact » d'App Store Connect)

## 4. Engagements contractuels sur les rendez-vous

L'app permet de réserver une prestation payée au salon. Aujourd'hui, aucune règle n'est écrite nulle part et l'app n'offre aucune annulation côté client — la FAQ en décrit pourtant une (voir `APPLE_RELEASE_AUDIT.md`, H-2).

- [ ] **Qui est le vendeur de la prestation ?** Le coiffeur ou le salon, CHAIR n'étant qu'un intermédiaire de mise en relation — à écrire noir sur blanc dans les CGU
- [ ] **Politique d'annulation réelle** : délai à partir duquel un client peut annuler, canal (dans l'app ? par téléphone au salon ?), conséquences d'un rendez-vous non honoré
- [ ] **Politique de remboursement** : sans objet tant qu'aucun paiement ne passe par CHAIR ; à confirmer explicitement pour pouvoir l'écrire
- [ ] **Le professionnel peut-il annuler ?** Dans quelles conditions, avec quelle information du client
- [ ] **Traitement des litiges client ↔ coiffeur** : rôle exact de CHAIR
- [ ] **Médiateur de la consommation** : la médiation est obligatoire pour un professionnel vendant à des consommateurs en France. CHAIR étant intermédiaire, le point doit être tranché avec un conseil, et le médiateur nommé dans les CGU le cas échéant

## 5. Modération et contenu utilisateur

À décider avant de pouvoir répondre au questionnaire d'âge et aux notes de review sans mentir.

- [ ] **Qui traite les signalements**, et sous quel délai réel
- [ ] **Règles de contenu publiées** (ce qui est interdit dans un avis ou une photo) — à ajouter aux CGU
- [ ] **Procédure de recours** pour un professionnel dont un contenu est masqué ou supprimé
- [ ] **Âge minimum d'utilisation** retenu, à faire figurer dans les CGU et à aligner avec la classification par âge App Store
- [ ] **Sort des avis en cas de suppression de compte** : aujourd'hui le backend les supprime, ce qui efface aussi l'historique de notation des coiffeurs concernés (`AuthController::deleteAccount`). Une anonymisation serait plus juste pour les professionnels — décision du gérant, à refléter ensuite dans les CGU et la politique de confidentialité

## 6. Pages et URL publiques

- [ ] **Page de mentions légales** : elle **n'existe pas** dans le projet (aucune route `/mentions-legales`, aucun lien nulle part). Obligatoire en France pour un site et une app grand public
- [ ] **URL de politique de confidentialité publique et stable** pour App Store Connect. Proposition : `https://www.getchair.app/confidentialite` (la page existe et reste accessible même quand le portail bêta est actif)
- [ ] **URL d'assistance publique** pour App Store Connect. Proposition : `https://www.getchair.app/contact` — ⚠️ cette page **n'est pas** dans la liste d'exemptions du portail bêta (`frontend/proxy.ts`) : si `NEXT_PUBLIC_BETA_ENABLED` vaut `true` en production, elle sera derrière un mot de passe et donc inaccessible au reviewer
- [ ] **URL marketing** : `https://www.getchair.app` — même vérification
- [ ] **Confirmer que `NEXT_PUBLIC_BETA_ENABLED` vaut `false` en production** au moment de la soumission

## 7. Sous-traitants à confirmer et à publier

La politique de confidentialité doit nommer tous les tiers qui reçoivent des données. Les appels réseau ci-dessous existent dans le code ; il manque, pour chacun, la confirmation du gérant et les mentions contractuelles.

- [ ] **Hébergeur** du site et de l'API — nom, pays, base de transfert éventuelle
- [ ] **Cloudinary** — images (avatars, portfolios). Aujourd'hui présenté comme « optionnel » dans la politique alors que 109 avatars sur 109 y sont hébergés en base locale
- [ ] **OneSignal** — notifications push. Configuré côté serveur, inactif côté app client. À publier le jour de l'activation
- [ ] **Apple** — MapKit JS : `cdn.apple-mapkit.com` est appelé à chaque affichage de carte
- [ ] **CartoCDN** — tuiles de carte de repli
- [ ] **api-adresse.data.gouv.fr** — géocodage des villes et adresses
- [ ] **api.annuaire-entreprises.data.gouv.fr** — vérification SIRET (parcours professionnel)
- [ ] **Stripe** — abonnements CHAIR PLUS (espace professionnel ; à mentionner si la politique couvre les deux apps)
- [ ] **Fournisseur d'envoi d'emails** (transactionnels : bienvenue, réinitialisation de mot de passe, invitations à laisser un avis)
- [ ] **Remplacer la mention « Privacy Shield »** dans la politique §5 : ce cadre est invalidé depuis 2020. Indiquer le mécanisme de transfert réellement applicable
- [ ] **Retirer « achats in-app »** de la ligne Apple : l'app client n'en contient aucun
- [ ] **Retirer ou corriger la ligne « Identifiant appareil — Notifications push »** tant qu'aucun SDK push n'est présent dans l'app client

## 8. Comptes et accès Apple

- [ ] **Compte Apple Developer Program** actif (organisation, avec numéro D-U-N-S, ou individuel — à trancher : un compte individuel affiche le nom de la personne physique comme éditeur sur la fiche)
- [ ] **Nom d'éditeur affiché sur l'App Store**, cohérent avec la raison sociale
- [ ] **Accord Paid Applications** : sans objet si l'app reste gratuite et sans achat intégré
- [ ] **Identifiants du compte de review** créé sur la production (procédure dans `APPLE_REVIEW_CHECKLIST.md` §2)

## 9. Décisions produit qui conditionnent la conformité

Ces points ne sont pas des informations à fournir mais des arbitrages que seul le gérant peut rendre. Ils sont documentés en détail dans `APPLE_RELEASE_AUDIT.md`.

- [ ] **Filtrage des contenus avant publication** (audit B-3) — signalement et blocage ont été livrés dans le working tree pendant l'audit ; le filtrage reste le dernier point dur de la guideline 1.2
- [ ] **Déploiement en production** de tout ce qui a été corrigé — l'app iOS charge le site en ligne, donc rien de ce qui reste dans le working tree n'existe pour App Review
- [ ] **Liens de l'app client vers l'espace professionnel** (audit H-1) : les retirer, ou traiter CHAIR PLUS via StoreKit sur iOS
- [ ] **Contenu de la base de production** (audit H-3) : les profils de démonstration doivent-ils rester visibles publiquement ? Rappel : `php artisan chair:demo-reset` est destructif et ne doit jamais être lancé en production
- [ ] **Cible iPad** (audit M-6) : iPhone seul pour la v1, ou expérience iPad assumée avec captures dédiées
- [ ] **Notifications push** : les activer avant la soumission (elles renforcent l'argument 4.2 et le serveur est prêt) ou attendre une version ultérieure
