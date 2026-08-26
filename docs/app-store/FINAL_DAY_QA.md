# QA finale — veille de soumission (26 août 2026)

Passe de QA exécutée en local (front `localhost:3000`, API `localhost:8000`, MySQL local),
**après** les changements du jour des autres agents (BottomNav, BookingSheet, LikeButton,
CancelAppointmentSheet, createMapAdapter, NotificationService, PostController, push, iOS).
Tous les fichiers modifiés du jour datent d'avant les tests : ce qui a été testé est bien
l'état final de l'arbre. Viewport mobile 375×812.

## 1. Parcours reviewer express (le chemin qu'Apple suivra)

| # | Étape | Résultat |
|---|-------|----------|
| 1 | `/app` storage vidé → onboarding (4 écrans) | OK |
| 2 | Bandeau stockage local « J'ai compris » | OK |
| 3 | « Passer » → home sans compte | OK |
| 4 | Recherche : carte s'affiche (repli Leaflet, `mapkit-token` = 501 en local, comportement prévu) + 81 résultats + clusters | OK |
| 5 | Fiche coiffeur (Sofia Garcia) : portfolio, services, avis, badges | OK |
| 6 | Réservation sans compte : prestation → date → créneau → gate « Créer un compte » avec promesse de reprise | OK |
| 7 | Inscription 5 étapes (nom, ville, e-mail, téléphone *optionnel*, mot de passe), CGU/confidentialité liées | OK |
| 8 | Reprise : BookingSheet rouvert à l'étape Coordonnées, prestation + date + créneau conservés, champs préremplis | OK |
| 9 | Confirmation : récap complet, « Aucun paiement dans l'application », rendez-vous créé (`status=confirmed` en base) | OK |
| 10 | Notifications : `appointment_created` → coiffeur, `appointment_confirmed` → client (NotificationService) | OK |
| 11 | Compte : réservation visible « Confirmé » | OK |
| 12 | Annulation : sheet de confirmation claire → statut « Annulé » + notification `appointment_cancelled` → coiffeur | OK |
| 13 | Signalement d'un post (motifs, confidentialité, confirmation) | OK |
| 14 | Blocage d'un compte : confirmé, posts retirés du fil après rechargement | OK |
| 15 | Suppression de compte : page dédiée, saisie « SUPPRIMER », données anonymisées, token purgé, redirection `/connexion` | OK |
| 16 | Reconnexion avec les identifiants supprimés : « Identifiants invalides » | OK |

## 2. Régressions du jour (fichiers touchés par les autres agents)

| Zone | Test | Résultat |
|------|------|----------|
| BottomNav | Accueil / Rechercher / Créations / Favoris / Compte naviguent | OK |
| createMapAdapter | Carte recherche : repli Leaflet + tuiles + clusters (MapKit indisponible en local, 501 attendu) | OK |
| BookingSheet | Réservation complète aboutit (voir parcours ci-dessus) | OK |
| CancelAppointmentSheet | Annulation aboutit, statut et notification corrects | OK |
| LikeButton | Like 12→13 (`POST /api/posts/{id}/like` 200), unlike 13→12 | OK |
| NotificationService | 3 notifications créées aux bons destinataires sur le cycle réservation/annulation | OK |
| PostController | Publication d'un post image par le pro de démo (id 1078) via API : 201, upload Cloudinary OK — puis suppression (post + média + streak nettoyés) | OK |
| Migrations du jour (reminder_flags, social_push_logs) | `migrate` → `rollback` → `migrate` propres ; `php -l` OK sur les 6 fichiers backend modifiés | OK |

## 3. Pages légales

| Page | Résultat |
|------|----------|
| `/mentions-legales` | OK — identité Koehler complète (SARL, capital, RCS, TVA, adresse, directeur de publication, téléphone), deux hébergeurs cités |
| `/confidentialite` | OK — responsable de traitement renseigné (SARL Koehler), aucun placeholder |
| `/cgu` | OK — s'affiche, aucun placeholder |
| `/app/regles-communaute` | OK — accessible connecté (gate onboarding sur `/app/*` pour un visiteur vierge, normal) |

Aucun « À COMPLÉTER » visible sur aucune page (les mentions restantes sont des commentaires de code).

## 4. Vérifications techniques finales

| Vérification | Résultat |
|--------------|----------|
| `npx tsc --noEmit` | 0 erreur |
| ESLint vs baseline `git show HEAD:` | 0 nouvelle erreur (les 4 erreurs `react-hooks/set-state-in-effect` de compte/page.tsx et BookingSheet.tsx existent déjà dans HEAD) |
| `php -l` fichiers backend modifiés | 0 erreur |
| Migrations migrate/rollback/migrate | OK |
| `npx next build` | OK (exit 0, avec `NEXT_PUBLIC_API_URL` HTTPS — voir note) |

Note build : `next build` avec l'environnement local échoue **volontairement** (garde-fou de
`next.config.ts` : `NEXT_PUBLIC_API_URL` doit être en HTTPS en production, ATS iOS). Le build a
donc été validé avec `NEXT_PUBLIC_API_URL=https://api.getchair.app/api`, comme en prod.

## 5. Observations non bloquantes

- **Hero home déconnecté en vouvoiement** (« selon votre style », « Créez un compte ») et champs
  BookingSheet (« Votre nom ») alors que la DA client est au tutoiement. Incohérence mineure, pas un blocage.
- **`navigator.vibrate` bloqué en console web** (lib/haptics.ts du jour) : erreur console bénigne dans
  un navigateur de bureau sans interaction ; sans effet dans la WebView Capacitor.
- **Signalement : promesse « sous 72 heures »** — Apple (guideline 1.2, apps UGC) attend un traitement
  rapide des signalements ; certains reviewers citent 24 h. Décision produit à confirmer par un humain,
  pas modifiée par la QA.
- **Médiateur de la consommation absent** des mentions légales (bloc masqué tant que `null`). Obligation
  française (L.612-1 code conso), pas un critère App Store. À compléter dès l'adhésion à un organisme.
- **`/api/stories/feed` appelé déconnecté → 401** en console : bruit sans impact utilisateur.

## 6. Données de test créées puis nettoyées

- Compte client `qa-appstore-20260826@example.com` (id 1121) : supprimé via le parcours puis purgé en base
  (user, rendez-vous 164, notifications, signalement, blocage, tokens).
- Post de test du pro de démo (id 688) : supprimé via l'API (média Cloudinary supprimé par le contrôleur),
  ligne `hairdresser_streaks` créée par la publication supprimée, `posts_count` revenu à 5.
- Token tinker `qa-final-day` : révoqué.
- Base locale : `users` sans compte QA résiduel, aucune notification résiduelle.

## 7. Contexte d'environnement (à savoir pour rejouer)

Au démarrage de la passe, MySQL (XAMPP), l'API et le front étaient éteints — démarrés pour la QA
(`mysqld`, `php artisan serve`, `npx next dev -p 3000`). Les deux migrations du jour sont appliquées
en base locale.

## Verdict

**GO pour le build du soir.**

Le parcours reviewer complet passe de bout en bout sur l'état final de l'arbre (changements du jour
inclus), aucune régression détectée sur les zones modifiées, les pages légales sont complètes,
`tsc` est à zéro, ESLint n'a aucune nouvelle erreur, les migrations du jour sont réversibles et le
build de production compile. Les cinq observations de la section 5 sont non bloquantes ; les deux
qui méritent une décision humaine (délai de 72 h du signalement, médiateur de la consommation)
n'empêchent pas la soumission.
