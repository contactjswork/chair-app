# ACCOUNT_AUDIT — CHAIR CLIENT

Audit compte / authentification / suppression, en vue de la soumission App Store de
**CHAIR CLIENT** (`app.getchair.client`, WebView Capacitor sur `https://www.getchair.app/app`).

Guidelines couvertes : **5.1.1(v)** (suppression de compte), **4.8** (login tiers),
**5.1.1(i)/(iii)** (confidentialité, minimisation), **1.2** (contact publié).

Tout ce qui suit a été **testé réellement** sur la base locale `chair_app` via l'API
`http://localhost:8000/api` le 2026-08-24. Les comptes de test créés pour l'audit
(`audit-apple-*`) ont été supprimés en fin de session ; le compte `qa-appstore-review@chair-qa.test`
(id 1102) appartient à un autre chantier et n'a pas été touché.

---

## 1. Tableau de conformité

| Guideline | Sujet | Statut | Détail |
|---|---|---|---|
| 5.1.1(v) | Suppression de compte dans l'app | **Conforme** | 3 taps depuis l'accueil, aucun e-mail ni appel requis — §2 |
| 5.1.1(v) | Véracité de ce qui est annoncé | **Corrigé** (était non conforme) | L'écran promettait « toutes tes données dans les 30 jours » ; la réalité est une suppression immédiate + anonymisation — §3 |
| 5.1.1(i)/(iii) | Effacement effectif des données | **Corrigé** (était non conforme) | La fiche publique d'un coiffeur supprimé restait en ligne et en recherche — §4 |
| 4.8 | Sign in with Apple | **Non applicable** | Aucun login tiers dans l'app — §6 |
| 5.1.1(i) | Réinitialisation de mot de passe | **BLOCKER ouvert** | Aucun e-mail ne peut partir : SMTP non configuré — §7 |
| — | Sécurité de l'authentification | **Conforme avec réserves** | Rate limiting OK, révocation OK ; token sans expiration en localStorage — §8 |
| — | Reprise de réservation après auth | **Conforme** | Aucun cul-de-sac, vérifié par lecture du code — §9 |

---

## 2. Chemin de suppression — à recopier dans les Review Notes

**Compte client (CHAIR CLIENT) — 3 taps + une saisie :**

1. Depuis l'accueil de l'app (`/app`), taper **Compte** dans la barre de navigation basse
   (`components/layout/BottomNav.tsx` → `/app/compte`).
2. Faire défiler jusqu'en bas et taper **Supprimer mon compte**
   (`app/app/compte/page.tsx:431` → `/app/compte/supprimer`).
3. Taper le mot **SUPPRIMER** dans le champ de confirmation.
4. Taper **Supprimer définitivement mon compte**.

La suppression est effectuée immédiatement (`DELETE /api/account`), l'écran de
confirmation s'affiche, puis l'app déconnecte et redirige vers l'accueil au bout
de 3 secondes.

**Vérifié :** aucune étape n'exige d'envoyer un e-mail, de téléphoner, de passer par
une page web externe ou de connaître une URL cachée. L'adresse `contact@getchair.app`
figure sur l'écran uniquement comme recours en cas de question (elle sert aussi de
contact publié au sens de la guideline 1.2) — elle n'est jamais nécessaire pour
supprimer.

**Compte pro (CHAIR PRO)** : même écran, atteint depuis `/pro/compte`
(`app/pro/compte/page.tsx:164`). L'écran est déclaré public dans
`app/app/layout.tsx` (`PUBLIC_PREFIXES`) précisément pour rester atteignable des
deux apps.

---

## 3. Ce que fait réellement `DELETE /api/account`

`backend/app/Http/Controllers/Api/AuthController.php::deleteAccount()`, désormais
dans une transaction unique.

**Supprimé définitivement**

| Donnée | Table |
|---|---|
| Avis laissés par la personne | `reviews` (`client_id`) |
| Réservations en tant que client | `appointments` (`client_id`) |
| Notifications | `notifications` |
| Abonnements à des coiffeurs | `follows` (+ recalcul de `followers_count`) |
| Favoris (profils) | `saved_profiles` |
| Inspirations sauvegardées | `saved_posts` |
| Likes | `post_likes` |
| Appareils liés (token push) | `push_subscriptions` |
| Préférences de notification | `notification_preferences` |
| Préférences d'onboarding | `user_preferences` |
| Partages | `share_events` |
| Demandes au support | `support_requests` |
| Stories | `stories` |
| Tous les tokens d'API | `personal_access_tokens` |

**Dissocié sans être détruit** — `profile_views.viewer_user_id` passe à `NULL` : le
compteur d'audience du coiffeur visité reste juste, mais plus rien ne le relie à la
personne partie (minimisation, 5.1.1(iii)).

**Anonymisé** — la ligne `users` est conservée mais vidée : `name` → « Utilisateur
supprimé », `email` → `deleted-{id}-{timestamp}@getchair.invalid`, `password` →
aléatoire 40 caractères, `avatar`/`bio`/`phone`/`city`/`postal_code`/`latitude`/`longitude`
→ `NULL`.

**Pourquoi la ligne n'est pas détruite** : elle porte des clés étrangères vers des
données appartenant à d'autres personnes (avis reçus par un coiffeur, historique de
rendez-vous d'un salon). La détruire effacerait les données de tiers. C'est une
anonymisation irréversible, pas un effacement physique — et c'est maintenant dit
comme tel à l'utilisateur (§5).

**Non touché volontairement** : le salon d'un gérant (`salons`) — il porte l'équipe et
l'historique d'autres comptes. Voir §10, point humain.

### Preuve de test (compte client `audit-apple-delete@test.invalid`, id 1099)

Avant : `appointments 2, reviews 2, notifications 1, follows 1, saved_profiles 1,
saved_posts 1, post_likes 1, profile_views 1, push_subscriptions 1, support_requests 1,
user_preferences 1, notification_preferences 1, personal_access_tokens 1`.

Après `DELETE /api/account` → `{"message":"Compte supprimé."}` : tous à `0`, ligne
`users` anonymisée.

```
POST /api/login  (ancien e-mail + ancien mot de passe) → 401 {"message":"Identifiants invalides"}
GET  /api/me     (ancien token Bearer)                 → 401
```

---

## 4. Constat critique corrigé — la fiche publique d'un coiffeur survivait à sa suppression

**Risque : BLOCKER** (5.1.1(i) et (iii) : l'app doit permettre de révoquer et supprimer
les données ; une fiche publique persistante contredit frontalement l'écran de
suppression).

Testé avec un vrai compte coiffeur (`audit-apple-pro@test.invalid`), supprimé via
l'API, **avant** correctif :

```
GET /api/hairdressers/audit-coiffeur-apple → HTTP 200
{
  "slug": "audit-coiffeur-apple",        ← le nom réel reste dans l'URL publique
  "tagline": "AUDIT tagline perso",
  "work_address": "1 rue Test, Strasbourg",   ← adresse professionnelle
  "instagram_url": "https://instagram.com/audittest",  ← compte social personnel
  "latitude": "48.5798310",              ← GPS exact
  "is_hidden": 0,
  "user": { "name": "Utilisateur supprimé", ... }
}
GET /api/hairdressers?city=Strasbourg → la fiche est toujours dans la liste
```

Autrement dit : `users.name` était bien anonymisé, mais le **nom réel restait dans le
slug de l'URL**, et l'adresse de travail, l'Instagram, le SIRET et le GPS restaient
publics et indexables. Les publications du portfolio restaient elles aussi visibles
dans le fil (`HairdresserController::feed()` ne filtre pas sur `is_hidden`).

**Correctif** — `AuthController::scrubHairdresserProfile()`, appelé depuis
`deleteAccount()` :

- `is_hidden = true`, `hidden_reason`, `hidden_at` — drapeau déjà respecté par
  `HairdresserController::index()` (ligne 114), `show()` (ligne 295) et les classements ;
- `slug` réécrit en `profil-supprime-{id}` ;
- mise à `NULL` de `tagline`, `work_address`, `instagram_url`, `tiktok_url`, `keywords`,
  `banner_image`, `booking_url`, `siret`, `diploma`, `diploma_document_url`,
  `postal_code`, `latitude`, `longitude` ; retrait des mises en avant payantes
  (`is_featured`, `featured_until`, `chair_pick_until`) ;
- `posts.is_published = false` pour toutes ses publications — le fil public ne filtre
  pas sur `is_hidden`, sans ça une photo du portfolio y serait restée.

**Preuve de test après correctif** (compte `audit-apple-pro2@test.invalid`, profil 218) :

```
avant : GET /api/hairdressers/audit-coiffeur-deux        → HTTP 200, présent dans la liste ville
        posts.is_published                               → 1

DELETE /api/account → {"message":"Compte supprimé."}

après : GET /api/hairdressers/audit-coiffeur-deux        → HTTP 404
        GET /api/hairdressers/profil-supprime-218        → HTTP 404
        GET /api/hairdressers?city=Strasbourg            → 0 occurrence
        POST /api/login (anciens identifiants)           → 401
        posts.is_published                               → 0
        hairdresser_profiles : slug=profil-supprime-218, is_hidden=1,
                               tagline/work_address/instagram_url/siret/latitude = NULL
        push_subscriptions, support_requests, user_preferences, post_likes,
        saved_posts, share_events, notification_preferences, profile_views,
        personal_access_tokens → 0
```

### Sous-constat corrigé — compteur d'abonnés faussé

**Risque : LOW.** `followers_count` est un cache entretenu à la main
(`InteractionController` increment/decrement). Le `detach()` de la suppression ne le
décrémentait pas : après le test, le profil 8 affichait `followers_count = 1` pour
`0` abonné réel, définitivement. `deleteAccount()` recalcule maintenant le compteur
pour chaque profil désabonné. Vérifié : `followers_count = 0 / follows réels = 0`
après suppression d'un compte abonné.

---

## 5. Textes de l'écran de suppression — écart corrigé

**Risque : HIGH** (5.1.1(v) : ce qui est annoncé doit correspondre à ce qui est fait ;
un reviewer qui compare l'écran et le comportement réel a un motif de rejet).

`frontend/app/app/compte/supprimer/page.tsx`

| Avant | Problème | Après |
|---|---|---|
| « perte définitive de toutes tes données **dans les 30 jours** » | Aucun délai de grâce n'existe côté serveur : tout est immédiat. Le chiffre était inventé. | « Tout se passe immédiatement, dès que tu confirmes. Rien n'est récupérable ensuite, et tu ne pourras plus te reconnecter avec cette adresse e-mail. » |
| « Ton compte et **toutes tes données** ont été supprimés » (écran de succès) | Faux : la ligne de compte subsiste, anonymisée. | « Tes données ont été supprimées et ton identité effacée. Cette adresse e-mail ne donne plus accès à rien. » |
| Liste de 4 items vagues (« Ton profil et toutes tes informations ») | Ne correspondait pas aux opérations réelles ; ne mentionnait ni les notifications, ni les appareils liés, ni les inspirations. | 5 items alignés un pour un sur `deleteAccount()`, + un 6ᵉ pour les comptes pro : « Ta fiche professionnelle et tes publications sont retirées de CHAIR ». |
| Rien sur ce qui subsiste | Laissait croire à un effacement physique total. | Nouveau bloc explicite : les rendez-vous et avis appartenant à d'autres personnes restent chez elles, sans lien avec l'identité ; le compte devient anonyme et personne ne peut le rouvrir. |
| « Tu peux aussi envoyer une demande à contact@getchair.app » | Pouvait se lire comme un chemin alternatif obligatoire. | « Une question avant de te décider ? Écris-nous à … » (`mailto:`), clairement optionnel. |

**Cul-de-sac corrigé (MEDIUM)** : l'écran est hors garde d'authentification
(`PUBLIC_PREFIXES`) et il est aussi lié depuis le pied de page du site vitrine
(`components/landing/LandingFooter.tsx:40`). Un visiteur **déconnecté** y arrivait,
tapait SUPPRIMER, et récoltait « Une erreur est survenue » (le `DELETE` partait avec
`Bearer null` → 401). Un état dédié affiche désormais « Connecte-toi d'abord » avec un
bouton vers `/connexion?returnTo=/app/compte/supprimer` (cible tactile 44 px).

> Réserve connue, hors périmètre : `resolvePostAuthPath()` dans
> `frontend/contexts/AuthContext.tsx` n'honore `returnTo` que pour `role === 'client'`.
> Un compte pro qui passe par ce bouton atterrira sur `/pro` et devra repasser par
> `/pro/compte`. Non bloquant (le chemin pro normal part de `/pro/compte`), mais à
> corriger par l'agent qui possède `AuthContext.tsx`.

---

## 6. Guideline 4.8 — Sign in with Apple : NON APPLICABLE

Recherche exhaustive, frontend et backend
(`socialite`, `oauth`, `google`, `apple`, `facebook`, `firebase`, `appleid`,
`gapi`, `signinwithapple`, sur `frontend/app`, `frontend/components`, `frontend/lib`,
`frontend/contexts`, `backend/app`, `backend/routes`, `backend/config`,
`backend/composer.json`, `frontend/package.json`) :

**Aucun service de login tiers n'existe dans CHAIR.** Seule occurrence du mot-clé :
un commentaire `// Placeholder — intégrer Firebase/OneSignal ici` dans
`AdminController.php:678`, qui concerne l'envoi de notifications push, pas
l'authentification.

L'authentification est exclusivement e-mail + mot de passe, servie par le backend CHAIR :
`POST /api/register`, `POST /api/login`, `POST /api/forgot-password`,
`POST /api/reset-password`, tokens Laravel Sanctum.

La guideline 4.8 conditionne l'obligation à l'usage d'un service de login tiers, et
prévoit explicitement que l'exigence ne s'applique pas si l'app
« *exclusively uses your company's own account setup and sign-in systems* ». C'est
exactement le cas de CHAIR : **Sign in with Apple n'est pas requis**.

À garder sous la main pour la review : si Google / Facebook / Apple sont ajoutés plus
tard, l'exigence redevient applicable et il faudra proposer une option de connexion
respectueuse de la vie privée équivalente.

---

## 7. BLOCKER OUVERT — le mot de passe oublié n'envoie aucun e-mail

**Risque : BLOCKER.** Un reviewer qui teste « Mot de passe oublié » — un geste très
courant en review — verra « E-mail envoyé » et ne recevra jamais rien.

### Constat, avec preuve

`backend/.env` :

```
MAIL_MAILER=smtp
MAIL_HOST=mailhog        ← serveur de développement local
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=null   ← lue comme vide
```

`MailService::configurationProblem()` détecte les deux problèmes et arrête l'envoi
proprement (choix délibéré et sain : aucune exception ne remonte). Test réel :

```
POST /api/forgot-password {"email":"audit-apple-reset@test.invalid"}
→ 200 {"message":"Si cet email existe, un lien de réinitialisation a été envoyé."}

storage/logs/laravel.log :
[2026-08-24 11:34:57] local.WARNING: CHAIR mail non envoyé — mailer non configuré
{"reason":"MAIL_FROM_ADDRESS n'est pas renseignée (valeur actuelle : vide).",
 "mailable":"App\\Mail\\ResetPasswordMail"}
```

La ligne `password_resets` **est** bien créée : la chaîne est fonctionnelle, seul le
transport manque. Vérifié de bout en bout en injectant le token à la main :

```
POST /api/reset-password (token valide)        → 200 « Mot de passe réinitialisé avec succès. »
POST /api/login (nouveau mot de passe)         → 200 + token
POST /api/login (ancien mot de passe)          → 401
POST /api/reset-password (même token réutilisé) → 422 « Lien invalide ou expiré. »
```

Le token est à usage unique, expire en 60 min (`config/auth.php`), et
`resetPassword()` révoque toutes les sessions existantes (`$user->tokens()->delete()`).
**Le mécanisme est bon ; seule la livraison est absente.**

Même conséquence pour l'e-mail de bienvenue à l'inscription (constaté dans le même log
pour `WelcomeClientMail`).

### Ce qu'il manque, exactement

Renseigner dans `backend/.env` de production, chez un fournisseur SMTP transactionnel
(Postmark, Resend, Brevo, SES… — au choix du gérant) :

```
MAIL_MAILER=smtp
MAIL_HOST=<hôte SMTP du fournisseur>     # ne doit être ni mailhog, ni localhost, ni 127.0.0.1
MAIL_PORT=587
MAIL_USERNAME=<identifiant SMTP>
MAIL_PASSWORD=<mot de passe / clé API SMTP>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=<adresse d'expédition sur un domaine CHAIR, ex. no-reply@getchair.app>
MAIL_FROM_NAME=CHAIR
FRONTEND_URL=https://www.getchair.app     # sert à construire le lien de réinitialisation
```

Plus, côté DNS du domaine d'expédition : SPF, DKIM et DMARC, sans quoi les e-mails
partiront en spam (ce qui, pour un reviewer, revient au même qu'une absence d'envoi).

Vérification une fois configuré : `php artisan chair:test-mail` (la commande affiche le
diagnostic de `MailService::configurationProblem()`), puis un vrai
« mot de passe oublié » de bout en bout depuis l'app.

Le système d'e-mails lui-même est prêt (`backend/app/Mail/`, `MailService`,
`resources/views/emails/`, `docs/EMAILS.md`) — **il ne manque que ces variables**.

### Correctif apporté côté UI en attendant

`frontend/app/mot-de-passe-oublie/page.tsx` ne testait pas `res.ok` : un **429** du
rate limiter (`throttle:4,1` sur la route) ou un 500 affichait quand même
« E-mail envoyé ». Corrigé — le message du throttle est maintenant affiché tel quel, et
une erreur serveur affiche « Impossible d'envoyer le lien pour le moment ». Le succès
reste volontairement neutre (« si cette adresse est associée à un compte ») pour ne pas
révéler l'existence d'un compte. L'écran de succès renvoie désormais vers
`contact@getchair.app` si rien n'arrive.

> Ce correctif ne lève pas le BLOCKER : tant que le SMTP n'est pas configuré, le
> serveur répond 200 et l'UI affiche légitimement un succès. Rien dans l'app ne peut
> compenser l'absence de transport — et faire semblant serait pire.

---

## 8. Sécurité de l'authentification

### Rate limiting — conforme

`backend/routes/api.php` :

| Route | Limite |
|---|---|
| `POST /register` | `throttle:6,1` |
| `POST /login` | `throttle:6,1` |
| `POST /forgot-password` | `throttle:4,1` |
| `POST /reset-password` | `throttle:6,1` |
| `POST /admin/login` | `throttle:6,1` |

Vérifié en pratique : 8 tentatives de login consécutives avec un mauvais mot de passe →
`429 429 429 429 429 429 429 429`, message français avec le délai d'attente.

### Révocation — conforme

- `logout()` supprime le token courant côté serveur (`currentAccessToken()->delete()`).
  Testé : `GET /api/me` → **200** avant, **401** après.
- `deleteAccount()` supprime **tous** les tokens du compte. Testé : ancien token → 401.
- `resetPassword()` supprime tous les tokens : changer son mot de passe déconnecte les
  autres appareils.
- Un compte suspendu (`suspended_at`) est refusé au login avec 403.

### Stockage du token — réserve documentée (MEDIUM)

Le token Sanctum est stocké en `localStorage` sous `chair_token`
(`frontend/lib/auth.ts`), lu par `frontend/lib/api.ts` et envoyé en `Authorization:
Bearer`. Dans une WebView Capacitor qui charge un site distant :

- **Ce qui protège** : la WebView n'a qu'une origine (`https://www.getchair.app`), pas
  d'extensions, pas de fenêtres tierces ; le `localStorage` est isolé dans le bac à
  sable de l'app iOS et n'est lisible ni par une autre app ni par Safari.
- **Ce qui reste exposé** : toute XSS sur `www.getchair.app` exfiltre le token, et ce
  token **n'expire jamais** — `config/sanctum.php` a `'expiration' => null`. Un token
  volé reste valable indéfiniment tant que la personne ne se déconnecte pas.
- **Mitigations recommandées** (pas appliquées, hors périmètre de cette mission) :
  fixer `SANCTUM_TOKEN_EXPIRATION` (par ex. 60 × 24 × 30 minutes) pour que les tokens
  dormants meurent ; poser une CSP stricte sur le domaine ; à terme, migrer le token
  vers le Keychain iOS via un plugin de stockage sécurisé Capacitor. La révocation
  serveur existante (§ ci-dessus) reste le filet en cas d'incident.

### Secrets dans le frontend — conforme

Seules trois variables `NEXT_PUBLIC_*` sont utilisées : `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_MAP_PROVIDER`, `NEXT_PUBLIC_AUTH_BYPASS`. Aucune clé d'API, aucun secret
en dur (recherche `sk_live|sk_test|api_key=…|secret=…` : zéro résultat).

### `NEXT_PUBLIC_AUTH_BYPASS` — à signaler (HIGH, hors périmètre)

`frontend/contexts/AuthContext.tsx` contient un bypass de connexion : quand
`NEXT_PUBLIC_AUTH_BYPASS=true`, l'app se connecte **automatiquement** sur un compte de
démo en dur (`client@gmail.com` / `test_new_coiffeur@test.com`, mot de passe
`chairdemo2026`) selon la section visitée.

État actuel : `frontend/.env.local` → `NEXT_PUBLIC_AUTH_BYPASS=false`, et la variable
est **absente** de `frontend/.env.production`. Le bypass est donc inactif pour la build
de production. Mais deux identifiants de comptes réels sont écrits en clair dans un
fichier livré au navigateur, et un `true` accidentel dans la config de build ferait
entrer n'importe qui sur un compte existant sans mot de passe.

**Recommandation : supprimer purement et simplement ce bloc avant soumission.**
`AuthContext.tsx` est hors de mon périmètre de fichiers — à traiter par l'agent qui le
possède, ou par le gérant.

---

## 9. Reprise de réservation après authentification — validé par lecture

Chemin qu'un reviewer testera très probablement : *fiche coiffeur → réserver → pas de
compte → inscription → reprise de la réservation*.

1. `components/ui/BookingSheet.tsx` — un visiteur non connecté qui atteint l'étape
   `info` voit « Dernière étape », avec **Se connecter** et **Créer un compte**. Les
   deux appellent `rememberBookingIntent()` (sauvegarde de la prestation, de la
   catégorie, de la date et du créneau en `sessionStorage`) et pointent vers
   `/connexion?returnTo=…` / `/inscription?returnTo=…` avec le chemin de la fiche.
2. `app/connexion/page.tsx` et `app/inscription/page.tsx` lisent `returnTo` via
   `safeInternalPath()` (anti open-redirect : une URL absolue ou protocol-relative est
   ignorée) et le propagent l'un vers l'autre — passer de connexion à inscription ne
   perd pas la reprise.
3. `contexts/AuthContext.tsx::resolvePostAuthPath()` renvoie sur `returnTo` en priorité,
   pour un compte `client` (les rôles pro partent vers leur espace, ce qui est correct :
   un parcours de réservation client n'y a pas de sens).
4. `components/ui/BookingResume.tsx`, monté sur la fiche coiffeur, relit l'intention
   (fraîche : 60 min max), la **consomme immédiatement** (`clearBookingIntent()`) et
   rouvre la feuille pré-remplie.

**Aucun cul-de-sac identifié.** Points de robustesse vérifiés : l'intention ne se
rejoue jamais deux fois ; `BookingResume` ne navigue pas, donc aucune boucle de
redirection possible ; `sessionStorage` indisponible (mode privé strict) dégrade
silencieusement vers la fiche coiffeur, sans erreur visible ;
`BookingResume` n'est monté que si `hairdresser.is_independent` — ce qui est cohérent,
un coiffeur en salon n'ouvre pas de `BookingSheet` mais renvoie vers son `booking_url`.

> Remarque hors périmètre : ce `booking_url` externe est un lien sortant vers un
> système de réservation tiers. La prestation de coiffure étant un service physique
> (3.1.3(e)), le paiement hors achat intégré est légitime — mais ce lien relève de
> l'audit paiements (`PAYMENTS_AUDIT.md`), pas de celui-ci.

---

## 10. Reste à faire — côté humain

| # | Sujet | Qui | Bloquant ? |
|---|---|---|---|
| 1 | **Configurer le SMTP de production** (§7) : `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `FRONTEND_URL` + SPF/DKIM/DMARC. Sans ça, « mot de passe oublié » ne marche pas en review. | Gérant | **Oui — BLOCKER** |
| 2 | Vérifier après configuration : `php artisan chair:test-mail`, puis un vrai parcours mot de passe oublié depuis un iPhone. | Gérant | Oui |
| 3 | Retirer le bloc `AUTH_BYPASS` de `frontend/contexts/AuthContext.tsx` (identifiants de démo en clair). Fichier hors de mon périmètre. | Dev / agent AuthContext | Recommandé fort |
| 4 | Décider du sort du **salon** d'un gérant qui supprime son compte : aujourd'hui le salon reste en ligne, avec son `phone` et son `address` — potentiellement les coordonnées personnelles d'un indépendant. Options : transfert à un autre membre de l'équipe, ou fermeture du salon. Nécessite une décision produit, pas seulement technique. | Gérant + dev | Non, mais à trancher avant la V1 publique |
| 5 | Fixer `SANCTUM_TOKEN_EXPIRATION` (aujourd'hui : tokens éternels) et poser une CSP sur `www.getchair.app`. | Dev backend / infra | Non |
| 6 | Corriger `resolvePostAuthPath()` pour honorer `returnTo` aussi pour les rôles pro (§5, réserve). | Agent AuthContext | Non |
| 7 | Confirmer que l'adresse de contact publiée dans l'app (`contact@getchair.app`) est bien relevée et qu'une réponse part sous 24-48 h — la guideline 1.2 exige des « *timely responses to concerns* ». | Gérant | Non, mais vérifié en review |

Aucune information juridique (raison sociale, SIREN, adresse, DPO) n'a été inventée dans
ce document : ce qui manque est listé ci-dessus et dans `LEGAL_MISSING_INFORMATION.md`.

---

## 11. Fichiers modifiés par cet audit

| Fichier | Nature |
|---|---|
| `backend/app/Http/Controllers/Api/AuthController.php` | `deleteAccount()` mis en transaction, nettoyage complet des tables résiduelles, recalcul de `followers_count`, nouvelle méthode privée `scrubHairdresserProfile()` |
| `frontend/app/app/compte/supprimer/page.tsx` | Textes alignés sur le comportement réel, bloc « ce qui subsiste », liste spécifique aux comptes pro, état « connecte-toi d'abord » |
| `frontend/app/mot-de-passe-oublie/page.tsx` | Test de `res.ok` (429 / 5xx ne s'affichent plus comme un succès), recours contact, échappement JSX |
| `docs/app-store/ACCOUNT_AUDIT.md` | Ce document |

`backend/app/Models/User.php` : lu et vérifié (surcharge
`sendPasswordResetNotification()` correcte, `password` et `remember_token` bien dans
`$hidden`) — **aucune modification nécessaire**.

Vérifications passées : `php -l` sur `AuthController.php` (OK) ;
`npx tsc --noEmit` (0 erreur) ; `npx eslint` sur les cinq pages du périmètre
(0 erreur — une erreur `react/no-unescaped-entities` préexistante dans
`mot-de-passe-oublie/page.tsx` a été corrigée au passage). Aucune migration créée.
Toutes les données de test ont été supprimées de la base.
