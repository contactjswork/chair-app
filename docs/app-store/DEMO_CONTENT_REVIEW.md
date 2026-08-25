# Contenu de démonstration — inventaire et décisions

> Inventaire réalisé le 25/08/2026 sur la base locale (même seed `chair:demo-reset`
> que la production). **Rien n'a été supprimé ni modifié** : la base de production
> appartient au gérant, chaque action ci-dessous est une décision à prendre.
>
> **➡ La frontière démo/réel exacte (chiffres, liste nominative des comptes
> réels, cas frontière) et les trois options de mise au propre sont dans
> `DEMO_DATA_PLAN.md` — c'est le document de décision. Celui-ci reste
> l'inventaire de conformité.**

## 1. État mesuré

| Élément | Constat | Risque reviewer |
|---|---|---|
| 111 comptes (67 coiffeurs, 30 clients, 13 gérants), 108 en `@demo.getchair.app` | Noms réalistes (Enzo Lopez, Lina Klein…), **aucun** « Test/Fake/Demo » dans les noms | Faible — les emails ne sont pas exposés publiquement (PublicScope les masque, vérifié) |
| 3 comptes réels seulement | Julien SCHILLINGER (#24), Koehler Antoine (#54 — ⚠️ email `test999@gmail.com` à corriger avant soumission), admin Julien (#738) | Voir `DEMO_DATA_PLAN.md` §1.1 |
| Avatars | 67/67 coiffeurs ont un avatar (vraies photos Cloudinary) | Aucun |
| 302 réalisations | 302/302 avec image de couverture, 7 avec galerie multiple | Aucun placeholder cassé |
| 224 avis | Frontière propre : 0 avis d'auteur réel sur coiffeur démo, 0 RDV croisé | Aucun orphelin en cas de purge |
| 14 salons, 16 offres d'emploi, 8 locations de fauteuil | Contenu réaliste | Faible |
| Badge « Certifié CHAIR » | Description corrigée par migration (`2026_08_25_090000`) — ne mentionne plus d'abonnement | Réglé |

## 2. Les avis répétitifs — corrigé dans le code, re-seed à décider

Le problème historique (« 224 avis — seulement 9 textes distincts », deux
fiches côte à côte affichant les mêmes avis mot pour mot, risque 2.3.1) est
**réglé côté code** depuis le 25/08/2026 dans
`backend/app/Console/Commands/DemoReset.php` :

- **63 textes** (49 positifs pour les 4-5★, 14 nuancés pour les 3★), longueurs
  variées, ton naturel, cohérence note/texte ;
- les 63 passent `ContentFilter::check()` (vérifié par script : 0 refus) ;
- **moyennes hétérogènes par coiffeur** (≈3.0 à 5.0) via un « tempérament » de
  notation — plus de note moyenne uniforme.

⚠️ La base actuelle contient **toujours** les 9 anciens textes : la correction
ne prend effet qu'au prochain `chair:demo-reset --force`, qui est **destructif**
(purge + re-seed complet). Quand et comment le lancer — et s'il faut plutôt
réduire ou purger la base démo — est la décision documentée dans
`DEMO_DATA_PLAN.md` §2 (options A/B/C) et §4 (procédure et interdits).

## 3. Comptes de démonstration — en attendant la décision

Ils font vivre l'app (découverte, recherche, classements). Les emails
`@demo.getchair.app` ne sont **pas** visibles publiquement. Ne PAS donner un
compte `@demo.getchair.app` à Apple : créer le compte de review dédié (voir
`APPLE_REVIEW_ACCOUNT_SETUP.md`).

## 4. Pendant la fenêtre de review

- **Interdiction de lancer `chair:demo-reset`** (détruirait le compte de review,
  qui n'est ni admin ni nommé Schillinger/Koehler).
- Ne pas modifier les comptes réels (Julien SCHILLINGER, Antoine KOEHLER).

## 5. Ce qui a déjà été vérifié côté code (aucune action)

- `PublicScope` masque email/téléphone/GPS exact sur toutes les sorties publiques.
- Aucun « Lorem », « Coming soon », « example.com », « test@ » rendu à l'utilisateur
  (balayages vagues 2 et 3).
- `isAppPublished()` = false : les écrans « Bientôt sur l'App Store » sont masqués
  en natif et honnêtes sur le web (bascule documentée dans `lib/appDownload.ts`).
