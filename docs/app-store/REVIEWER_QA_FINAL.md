# REVIEWER QA FINAL — CHAIR CLIENT

Passe reviewer complète du 25/08/2026, réalisée en conditions réelles (navigateur mobile 375×812 puis 320×568, storage vidé, API locale réelle). Complète `REVIEWER_QA_REPORT.md` (vagues 1–2). Aucun commit — tout est dans le working tree.

## 1. Parcours reviewer intégral — OK de bout en bout

Chaque étape testée en cliquant, storage vidé au départ :

| Étape | Résultat |
|---|---|
| `/app` premier lancement | Carrousel onboarding (skippable), bandeau cookies (web uniquement), home riche sans compte. Aucune demande de géoloc au lancement. |
| Refus géoloc | Demandée uniquement au tap sur « Recentrer sur ma position » dans `/app/recherche`. Refus → message visible « Position indisponible… cherche par ville » (corrigé, voir §6). Recherche par ville fonctionne. |
| Recherche | 81 résultats + carte, filtres, onglets Coiffeurs/Salons — tout accessible sans compte. |
| Fiche coiffeur | Portfolio, services, avis, badges. CTA réservation visible. |
| Réservation sans compte | Stepper Catégorie → Prestation → Date → Créneau, puis mur d'auth clair : « Dernière étape — Connecte-toi ou crée un compte gratuit », avec la promesse « Ta sélection est gardée en mémoire ». |
| Création de compte | Inscription multi-étapes (nom, ville, email, tél optionnel, mot de passe) avec `?returnTo=` transmis. |
| REPRISE de la réservation | Après inscription : retour exact sur la fiche, sheet rouverte, prestation + date conservées, re-choix du créneau, coordonnées préremplies (nom + email du compte). |
| Confirmation | Récap avec « Aucun paiement dans l'application… à régler sur place » (conforme 3.1.1), écran « Rendez-vous confirmé ». |
| Compte | Réservation visible dans « Mes réservations », statut Confirmé. Annulation client testée : sheet d'explication → statut « Annulé » sans rechargement, créneau libéré côté serveur (vérifié en base). |
| Notifications | Badge 1, notification « Réservation confirmée », « Tout marquer lu » OK. |
| Signalement | Menu « … » → Signaler ce profil → motif → envoi → « Signalement envoyé… sous 72 heures » (conforme UGC 1.2). |
| Blocage | Bloquer → confirmation → au rechargement, bandeau « Tu as bloqué… » + « Débloquer ce compte ». |
| Suppression de compte | Page dédiée, liste exacte de ce qui est effacé, garde-fou « tape SUPPRIMER », écran final, token purgé. Vérifié en base : utilisateur anonymisé, réservations supprimées. |
| Reconnexion après suppression | Échoue avec « Identifiants invalides » (français, sans fuite d'info). |

## 2. UX déconnecté (point 51) — OK après corrections

Sans compte : home, recherche, feed, classements, fiche coiffeur, fiche salon, réalisation, aide, règles de communauté entièrement consultables. Actions protégées : toutes expliquent pourquoi (mur BookingSheet, modale « Rejoins la communauté » du feed, états vides de favoris/notifications/compte).

**Corrigé** : `/app/inspirations` redirigeait sèchement vers `/connexion` sans un mot → affiche désormais un état expliqué (« Connecte-toi pour retrouver… ») avec connexion/inscription + returnTo. Testé en réel.

## 3. Auth return centralisé (point 52) — OK après corrections

Testé déconnecté, chaque flux en réel :

- **S'abonner / Sauvegarder** (fiche coiffeur, `ProfileActions`) : partait vers `/connexion` nu → **corrigé**, part vers `/connexion?returnTo=/app/coiffeur/{slug}` (vérifié en cliquant).
- **J'aime** (`LikeButton`, fiche réalisation) : idem → **corrigé**, `returnTo=/app/realisation/{id}` (vérifié).
- **Feed (like/save)** : la modale explicative existait mais ses liens perdaient le contexte → **corrigé**, `SignupPromptModal` ajoute `?returnTo=` du chemin courant (vérifié : `/connexion?returnTo=%2Fapp%2Ffeed`).
- **Signaler / Bloquer** déconnecté : les sheets expliquent déjà (« Connecte-toi pour envoyer un signalement… ») — pas de redirection aveugle, OK.
- Pages gardées `/app/objectifs`, `/app/onboarding`, `/app/compte/modifier` : redirection avec `returnTo` ajouté. Liens de connexion de `/app/favoris`, `/app/notifications`, `/app/compte` : `returnTo` ajouté.
- `safeInternalPath` + `canRoleVisit` déjà en place côté connexion/inscription (anti open-redirect vérifié dans le code).

## 4. Pas de login loop (point 53) — OK

Token invalide posé en localStorage + navigation `/app/compte` : UNE seule redirection vers `/connexion?expired=1`, bandeau « Ta session a expiré, reconnecte-toi pour continuer », token nettoyé. Reconnexion → retour automatique sur `/app/compte` (via `chair_redirect`). Aucune boucle observée (history propre).

## 5. Erreurs en français (point 46) — OK après corrections

`lib/api.ts` traduit désormais tous les restes techniques anglais de Laravel (`humanizeErrorMessage`) et le réseau coupé :

- **Réseau coupé** (fetch intercepté) : « Connexion impossible. Vérifie ta connexion internet et réessaie. » (avant : `Failed to fetch`). Testé en réel sur le login.
- **429** (7 tentatives de login) : « Trop de requêtes — merci de patienter 20 secondes avant de réessayer. » (message backend, déjà français).
- **404 API** (token d'avis invalide) : « Ce contenu n'existe plus ou a été retiré. » (avant : `No query results for model [App\Models\Appointment].`). Testé en réel sur `/app/avis/{token}`.
- **401/403/5xx** : messages français dédiés ; les messages métier français du backend passent inchangés ; 422 → premier message de validation (français, vérifié).
- `requestMultipart` aligné (mêmes traductions + gestion 422).

## 6. Boutons (point 47) — OK

Exercés en réel : CTA réservation + stepper complet (anti double-tap via états `submitting`), annulation RDV (anti double-tap), s'abonner/abonné (compteur live), sauvegarder, like, signaler (bouton désactivé sans motif, spinner d'envoi), bloquer, marquer lu, connexion/inscription (disabled pendant chargement), suppression de compte (garde-fou SUPPRIMER), scan token invalide (erreur propre), avis token invalide (erreur propre après correction §5).

**Corrigé** : « Recentrer sur ma position » dans `/app/recherche` ne donnait AUCUN retour quand la géoloc est refusée (bouton muet) → message temporaire « Position indisponible. Autorise la localisation dans les réglages, ou cherche par ville. » Testé en réel.

## 7. Clavier (point 40) — OK

À 375×812 et 320×568 : connexion, mot de passe oublié, contact = CTA dans le flux scrollable, pas de fixed recouvrant. Inscription : CTA « Continuer » en barre fixe bas — vérifié à hauteur clavier simulée (320×308) : le champ peut être scrollé entièrement au-dessus de la barre (padding suffisant), pas de blocage. Aucun scroll horizontal à 320px (home, fiche coiffeur, connexion, contact).

## 8. 404 (point 33) — OK

Toutes les routes atteignables depuis les pages client répondent 200 (vérif systématique) : `/app`, recherche, feed, favoris, compte (+modifier/+supprimer), notifications (+préférences), objectifs, classements, aide, règles, inspirations, onboarding, coiffeur/{slug}, salon/{slug}, realisation/{id}, cgu, confidentialité, mentions légales, connexion, inscription, mot-de-passe-oublié, contact, download. `/realisation/{id}` (lien historique) redirige 308 vers `/app/realisation/{id}`.

## Défauts corrigés (fichiers touchés)

- `frontend/lib/api.ts` — traduction française de toutes les erreurs techniques + réseau coupé (§5).
- `frontend/components/ui/ProfileActions.tsx`, `LikeButton.tsx`, `SignupPromptModal.tsx` — returnTo sur toutes les actions protégées (§3).
- `frontend/app/app/inspirations/page.tsx` — état déconnecté expliqué (§2).
- `frontend/app/app/recherche/page.tsx` — retour visible sur refus de géoloc (§6).
- `frontend/app/app/objectifs`, `onboarding`, `compte`, `compte/modifier`, `favoris`, `notifications` — returnTo + tutoiement (`/app/compte`, `/app/favoris` étaient en vouvoiement).
- `frontend/app/app/avis/[token]/page.tsx` — tutoiement (était en vouvoiement).
- `frontend/components/ui/ReportSheet.tsx` — « votre signalement » → « ton signalement » (cohérence tutoiement).

Vérifs : `npx tsc --noEmit` = 0 erreur ; eslint sur chaque fichier modifié = aucune erreur nouvelle vs `git show HEAD:` ; tous les flux corrigés retestés en navigateur réel ; données et comptes de test purgés de la base (compte QA supprimé via le flux réel, notifications/report/block résiduels nettoyés).

## Constats restants (non bloquants, hors périmètre de cette passe)

1. **Purge de compte incomplète côté backend** (mineur, RGPD) : après suppression, la ligne `user_blocks` du supprimé et son signalement dans `reports` subsistent, et les notifications envoyées AUX AUTRES gardent son prénom dans le texte (« Camille Reviewer a réservé… »). La fiche `/app/compte/supprimer` promet « plus aucun lien avec ton identité ». → `AuthController::deleteAccount` / `NotificationService` (backend, autre périmètre).
2. **Mix tutoiement/vouvoiement résiduel** : notifications backend (« votre profil », « Votre rendez-vous ») et CTA home (« selon votre style », `HomeCTASection`) restent en vouvoiement côté client.
3. **Fichier orphelin** : `frontend/components/ui/__baseline_booking.tsx` (copie de travail d'une vague précédente, non importée) traîne dans le working tree — à supprimer par son auteur.
4. **Léger** : badge « 1 » sur l'onglet Compte visible même déconnecté (incitation d'onboarding ? à confirmer comme voulu).

## ACTION GÉRANT

- **Prod uniquement** : vérifier `APP_DEBUG=false` et `APP_ENV=production` dans le `.env` du serveur de production (en local, `APP_DEBUG=true` fait fuiter les stack traces Laravel sur les erreurs API — jamais acceptable en prod). Où : `backend/.env` du serveur de prod, puis `php artisan config:cache`.
- Les points juridiques (PUBLISHER/HOST/MEDIATOR/CONTROLLER à null) restent tels que documentés dans `LEGAL_MISSING_INFORMATION.md` — rien de nouveau dans cette passe.
