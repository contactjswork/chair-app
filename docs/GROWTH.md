# Programme ambassadeur CHAIR — V1

Livré le 2026-07-11. Premier chantier du plan croissance (voir aussi la
réflexion stratégique complète : ambassadeurs, CHAIR+, CHAIR BUSINESS,
location de fauteuil, commission marketplace — discutée mais pas encore
documentée en dur, cette page ne couvre que ce qui est réellement construit).

## Pourquoi celui-ci en premier

Le moteur de croissance de CHAIR est asymétrique : un coiffeur a un intérêt
direct et permanent à partager CHAIR (sa réputation, ses clients, son revenu
en dépendent), un client n'a presque aucune raison spontanée d'inviter un ami
à trouver *un autre* coiffeur. Le programme ambassadeur **coiffeur** est donc
le moteur principal ; le programme **client** est un amplificateur
secondaire. Les deux existent dans le même système, mais ne pas s'attendre à
ce qu'ils performent pareil.

## Architecture — réutilise l'existant, pas de système parallèle

- Le mécanisme de lien + QR (déjà construit pour les avis certifiés via
  `QrTokenService`) inspire directement `ReferralService` et `ShareSheet`.
- Les récompenses badge passent par le catalogue `BadgeService::BADGES`
  existant (`ambassador_program`, `ambassador_national`, déjà stubbés lors de
  la refonte badges V2, désormais réellement débloquables).
- Le boost local réutilise la colonne `is_featured` déjà lue dans
  `HairdresserController` (5 endroits) — pas touché, juste rendu temporaire
  via un accessor Eloquent (`featured_until`).
- Les mois CHAIR+ sont **banqués** (`hairdresser_profiles.chair_plus_until`)
  avant même que CHAIR+ (l'abonnement payant) existe — rien ne les consomme
  encore, c'est une infrastructure prête pour le prochain chantier.

## Modèle de données

```
users.referral_code        (string unique, généré à la demande)
users.referred_by_user_id  (FK nullable → users, posé une seule fois, à l'inscription)

share_events (id, user_id, action_type, target_type, target_id, channel, created_at)
referral_rewards (id, user_id, reason, points, chair_plus_days, boost_days, badge_code, created_at)

hairdresser_profiles.featured_until    (timestamp nullable — boost temporaire)
hairdresser_profiles.chair_plus_until  (timestamp nullable — CHAIR+ banqué)
```

## Barème des actions (`ReferralService::ACTIONS`)

| Action | Points | Garde-fou anti-spam |
|---|---|---|
| Partage profil/réalisation | 5 | 3/jour max |
| Post réseaux sociaux avec lien | 30 | 1/jour max |
| Invitation coiffeur → inscrit | 80 + 3j de boost | — (limité par les vraies inscriptions) |
| Invitation salon → inscrit | 150 + 7j de boost | — |
| Invitation client → inscrit | 40 | — |
| Premier avis laissé | 10 | une seule fois |
| Premier favori ajouté | 5 | une seule fois |

Chaque action est loguée dans `share_events` (statistiques) ; la récompense
n'est accordée que si les garde-fous le permettent — l'événement est quand
même enregistré pour ne pas perdre la donnée si un plafond change plus tard.

## Paliers filleuls (`ReferralService::MILESTONES`)

Décision fondatrice (brief initial de l'associé) — ne pas modifier sans
repasser par Julien :

| Filleuls | Récompense |
|---|---|
| 5 | 1 mois de CHAIR+ banqué |
| 20 | Badge "Ambassadeur CHAIR" (carrière, +200 pts) |
| 50 | 30 jours de mise en avant locale |
| 100 | Badge "Ambassadeur national" (exceptionnel, +900 pts) — accès anticipé pas encore câblé (pas de feature à gater aujourd'hui) |

Un "filleul" = un compte créé avec le `referral_code` de ce coiffeur en
paramètre `ref` à l'inscription, peu importe son rôle (client, coiffeur,
gérant). Compté une seule fois, jamais rétroactif si le code change (il ne
change jamais après génération).

## Parcours

- **Partage à la demande** : `/pro/parrainage` (code, lien, QR, stats, progression des paliers) — accessible depuis la sidebar et une carte sur la home cockpit.
- **Onboarding coiffeur** (`/onboarding`) : écran de partage après la dernière étape, jamais bloquant ("Passer pour l'instant").
- **Onboarding client** (`/app/onboarding`) : bouton "Inviter un ami" sur l'écran final "Bienvenue sur CHAIR".
- **Attribution** : `?ref=CODE` dans l'URL → capturé en `localStorage` (`lib/referral.ts`) dès la première visite, survit à la navigation, envoyé automatiquement à l'inscription (`AuthContext.register()`), effacé une fois utilisé.

## Ce qui n'est pas fait (V2)

- Partage depuis les réalisations individuelles (`/pro/portfolio`) — `ShareSheet` est prêt, juste pas encore branché à cet écran précis.
- Délai de carence avant crédit d'une invitation (actuellement crédité immédiatement à l'inscription du filleul) — accepté comme compromis "simple d'abord", à durcir si de l'abus est constaté.
- Accès anticipé (palier 100) — pas de feature à gater aujourd'hui, le badge existe mais rien ne consomme le flag.
- Notifications push "vous avez gagné X points" — le hook `onRewarded` existe côté `ShareSheet`, juste un toast local pour l'instant, pas de notification serveur.
