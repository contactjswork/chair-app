# Emails CHAIR

Tout ce que l'application envoie par email : quels emails existent, ce qui les
déclenche exactement dans le code, comment configurer le SMTP, comment tester.

---

## 1. Les emails livrés

Six emails. Chacun correspond à un événement qui existe réellement dans le
code — aucun email « prévu » n'est listé ici.

| Email | Destinataire | Déclencheur réel | Préférence respectée |
|---|---|---|---|
| **Bienvenue client** | Le nouveau client | `AuthController::register()` — inscription avec `role = client` | aucune (toujours envoyé) |
| **Bienvenue coiffeur** | Le nouveau coiffeur | `AuthController::register()` — inscription avec `role = hairdresser` | aucune (toujours envoyé) |
| **Rendez-vous confirmé** | Le client | `AppointmentController::store()` (réservation d'un créneau, confirmée automatiquement) **et** `AppointmentController::updateStatus()` quand le coiffeur passe le RDV en `confirmed` | `booking_confirmed` |
| **Rendez-vous annulé** | Le client | `AppointmentController::updateStatus()` — passage en `cancelled` (seul chemin d'annulation aujourd'hui : c'est le coiffeur qui annule depuis son agenda) | `booking_cancelled` |
| **Demande d'avis** | Le client | `AppointmentController::updateStatus()` — passage en `completed`, au moment où le `review_token` est généré | `review_request` |
| **Réinitialisation de mot de passe** | Le compte concerné | `POST /api/forgot-password` → `AuthController::forgotPassword()` → `Password::sendResetLink()` → `User::sendPasswordResetNotification()` | **aucune — email de sécurité, toujours envoyé** |

### Fichiers

| | Chemin |
|---|---|
| Gabarit commun | `backend/resources/views/emails/layout.blade.php` |
| Bouton / encadré récap | `backend/resources/views/emails/partials/` |
| Vues HTML des emails | `backend/resources/views/emails/*.blade.php` |
| Vues texte brut (alternative `multipart`) | `backend/resources/views/emails/text/` |
| Mailables | `backend/app/Mail/` |
| Envoi (point d'entrée unique) | `backend/app/Services/MailService.php` |
| Diagnostic + envoi de test | `backend/app/Console/Commands/TestMail.php` |
| Variables `.env` documentées | `backend/.env.example` |
| Procédure gérant (SMTP + DNS) | `docs/app-store/ACTION_GERANT_SMTP.md` |

### Le lien du mail « demande d'avis »

C'est l'email le plus important : c'est lui qui alimente les **avis certifiés**.

Le lien pointe vers `{FRONTEND_URL}/app/avis/{review_token}`, où `review_token`
est le jeton généré sur le rendez-vous quand le coiffeur le marque terminé. La
page frontend appelle `POST /api/review-by-token/{token}`. Conséquence : **on ne
peut pas noter un coiffeur sans ce jeton**, donc sans être vraiment passé chez
lui — y compris pour un client qui a réservé sans créer de compte.

---

## 2. Règles de fonctionnement

**Aucun email ne peut faire échouer une action métier.** Tous les envois passent
par `MailService::send()`, qui attrape toute erreur, la log dans
`storage/logs/laravel.log`, et rend la main. Une inscription, une confirmation
de RDV ou une annulation aboutissent même si le serveur SMTP est en panne ou pas
configuré.

**Les préférences sont respectées, sans duplication de logique.**
`MailService::send()` appelle `NotificationService::shouldSend()` — exactement la
même méthode et le même mapping type → préférence que les notifications in-app
et les push. Une préférence désactivée coupe donc les trois canaux d'un coup, et
il n'y a qu'un seul endroit à modifier.

**Un client sans compte reçoit quand même ses emails transactionnels.** Il a
saisi son email lui-même pour réserver ; c'est le seul canal dont on dispose, et
il n'a pas de ligne de préférences. Les emails de RDV et de demande d'avis
partent donc à `appointments.client_email` même sans `client_id`.

**Les emails de sécurité ignorent les préférences.** Même choix produit que les
notifications (voir le commentaire du mapping dans `NotificationService`) : on
n'autorise personne à se couper des alertes de sécurité.

**File d'attente.** Si `QUEUE_CONNECTION` vaut autre chose que `sync`, les emails
sont mis en file (`Mail::queue`) ; sinon ils partent en direct. Aucune
configuration supplémentaire n'est nécessaire aujourd'hui (`QUEUE_CONNECTION=sync`).

**Design.** Gabarit en tables HTML avec styles inline, largeur 600px, compatible
Outlook (pas de flexbox ni de grid). Noir `#0a0a0a`, blanc, gris neutres —
aucune couleur, aucun emoji. Le logo est le mot CHAIR en texte : aucune image
distante, donc rien à débloquer côté destinataire.

**Chaque email a une version texte.** Les messages sont envoyés en
`multipart/alternative` : le HTML (`resources/views/emails/`) et une version
texte brut (`resources/views/emails/text/`). Deux raisons : un email HTML sans
alternative texte est pénalisé par les filtres anti-spam, et certains clients
(montres, lecteurs d'accessibilité, boîtes en mode texte) n'affichent que
celle-ci. Toute modification d'un email doit donc être reportée dans les deux
vues. Les vues texte utilisent `{!! !!}` volontairement : dans un corps
`text/plain`, l'échappement HTML de `{{ }}` afficherait `&#039;` à la place des
apostrophes.

**Le lien de réinitialisation de mot de passe est le seul email dont l'échec
est visible par l'utilisateur.** Partout ailleurs, l'email est un à-côté d'une
action métier qui réussit sans lui. Ici l'email EST l'action :
`AuthController::forgotPassword()` vérifie donc `MailService::isConfigured()`
**avant** d'appeler le broker et répond `503` (« L'envoi d'emails est
momentanément indisponible ») plutôt qu'un `200` « lien envoyé » mensonger.
Cette réponse est strictement identique pour une adresse connue et pour une
adresse inconnue : elle ne permet toujours pas d'énumérer les comptes.

**Les incidents sont journalisés en `ERROR`, avec l'adresse masquée.** Un mailer
non configuré ou un envoi refusé écrit dans `storage/logs/laravel.log` la
raison, la classe du Mailable, le mailer actif et le destinataire masqué
(`b*****r@getchair.app`) : assez pour instruire l'incident, sans écrire de
données personnelles en clair.

---

## 3. Ce qui n'envoie PAS d'email aujourd'hui

À connaître pour ne pas croire qu'un email part alors que non :

- **Inscription d'un gérant de salon** (`role = salon_owner`) — pas d'email. Le
  texte du coiffeur ne conviendrait pas (il parle de profil, de réalisations, de
  QR) ; il faut écrire le sien.
- **Rappels de rendez-vous 24h / 1h** — les préférences existent, aucun envoi
  planifié n'existe (ni email, ni push).
- **Avis après un scan de QR code** (`VisitController::confirmVisit`) — le client
  est déjà dans l'app et laisse son avis dans la foulée. Pas de relance email
  s'il ne va pas au bout.
- **Nouvelle réservation côté coiffeur** — notification in-app et push
  uniquement, pas d'email.
- **Rendez-vous déplacé** (`reschedule`) — notification in-app uniquement.
- **Réponse d'un coiffeur à un avis** — aucun envoi (aucun canal).

---

## 4. Configurer l'envoi (production)

Aujourd'hui le `.env` de production pointe sur `MAIL_HOST=mailhog`, un outil de
développement qui n'existe pas sur le serveur, et `MAIL_FROM_ADDRESS` est vide :
**aucun email ne part, y compris la réinitialisation de mot de passe.**

C'est la seule pièce manquante de la chaîne, et elle ne peut venir que du gérant
du domaine. La procédure complète — où lire chaque valeur dans l'interface
d'Infomaniak et de Brevo, les variables `.env` à remplir avec leur format, les
enregistrements DNS SPF / DKIM / DMARC, ce qui ne doit jamais être commité, et
la commande de vérification — est dans un document dédié :

> **[docs/app-store/ACTION_GERANT_SMTP.md](app-store/ACTION_GERANT_SMTP.md)**

Les variables sont également documentées, avec des valeurs d'exemple neutres,
dans `backend/.env.example`.

Trois points à retenir ici :

- **`FRONTEND_URL` n'est pas un détail.** C'est la base de **tous** les liens
  des emails (réinitialisation, avis certifié, boutons). Absente, les liens
  pointent sur `http://localhost:3000` et sont morts. Valeur attendue :
  `https://www.getchair.app` (www — l'apex redirige en 308).
- **`MAIL_FROM_NAME` doit valoir `CHAIR`.** Par défaut il reprend `APP_NAME`,
  resté à `Laravel` : les destinataires verraient « Laravel » comme expéditeur.
- **Après toute modification du `.env`** : `php artisan config:clear`.

Ces trois points sont vérifiés automatiquement par `php artisan chair:test-mail`
(section 5).

---

## 5. Vérifier et tester

### Une commande pour tout vérifier, sans rien envoyer

```bash
php artisan config:clear
php artisan chair:test-mail
```

Sans argument, la commande fait uniquement un diagnostic :

- elle affiche la configuration **réellement lue par l'application** (le mot de
  passe SMTP n'est jamais affiché, seulement « (renseigné) » ou « (vide) ») ;
- elle s'arrête et explique pourquoi si une variable **bloquante** manque ;
- elle signale ce qui n'est pas bloquant mais **abîme le résultat** :
  `MAIL_FROM_NAME` resté sur la valeur d'exemple, `FRONTEND_URL` absente ou en
  http ;
- si `MAIL_MAILER=smtp`, elle **ouvre une vraie connexion au serveur SMTP** puis
  la referme : host, port, chiffrement et identifiants sont validés sans qu'un
  seul email ne parte ;
- code de sortie `0` si tout est bon, `1` sinon (utilisable en script de
  déploiement).

### Vérifier le rendu dans une vraie boîte mail

```bash
php artisan chair:test-mail julien@exemple.fr
php artisan chair:test-mail julien@exemple.fr --type=review-request
```

Le même diagnostic tourne d'abord, puis un exemplaire de chaque email est
envoyé. Types disponibles : `welcome-client`, `welcome-hairdresser`,
`appointment-confirmed`, `appointment-cancelled`, `review-request`,
`reset-password`. Sans `--type`, les six partent.

Les données sont des données de test explicites (« Coiffeur de test »,
« Client de test ») : la commande ne lit ni n'écrit rien en base et ne touche
aucun compte réel.

### Relire le HTML sans serveur SMTP

Utile en local, ou pour relire un email avant de le mettre en production :

```bash
# dans backend/.env
MAIL_MAILER=log
MAIL_FROM_ADDRESS=bonjour@getchair.app
```

```bash
php artisan config:clear
php artisan chair:test-mail test@exemple.fr
```

Le message complet — en-têtes, partie HTML **et** partie texte — est écrit dans
`backend/storage/logs/laravel.log`. Pensez à remettre `MAIL_MAILER` ensuite.

### Vérifier la réinitialisation de mot de passe de bout en bout

Le vrai test, celui que refera un testeur Apple, se fait depuis l'application :
`/mot-de-passe-oublie` → saisir l'adresse d'un compte → recevoir l'email →
cliquer → choisir un nouveau mot de passe → se connecter avec.

Points de contrôle, tous vérifiés en recette :

| Étape | Comportement attendu |
|---|---|
| Adresse inconnue | `200`, message neutre — impossible de savoir si le compte existe |
| Deuxième demande en moins d'une minute | `200`, **même** message (le throttle du broker ne doit rien révéler) |
| Mailer non configuré | `503` « L'envoi d'emails est momentanément indisponible », **identique** pour une adresse connue ou inconnue, et **aucune ligne `password_resets` créée** |
| Token en base | Haché (bcrypt) — le jeton en clair n'existe que dans l'email |
| Lien reçu | `{FRONTEND_URL}/reinitialiser-mot-de-passe?token=...&email=...`, jamais `localhost` |
| Validité | `config('auth.passwords.users.expire')`, soit **60 minutes** — au-delà, `422` |
| Rejeu du même lien | `422` : usage unique, la ligne `password_resets` est supprimée à la consommation |
| Après reset | Ancien mot de passe refusé (`401`), nouveau accepté, **toutes les sessions API révoquées** |

Pour tester en ligne de commande sans passer par l'écran :

```bash
php artisan tinker
>>> Illuminate\Support\Facades\Password::sendResetLink(['email' => 'une-adresse@du-compte.fr']);
```

Réponse attendue : `passwords.sent`. L'email reçu doit être le gabarit CHAIR
(fond blanc, mot CHAIR en en-tête), pas le gabarit Laravel par défaut.

### Diagnostiquer un email qui ne part pas

```bash
tail -n 200 backend/storage/logs/laravel.log | grep "CHAIR"
```

- `CHAIR mail non envoyé — mailer non configuré` (niveau `ERROR`) : le `.env`
  n'est pas rempli, le champ `reason` dit quelle variable manque.
- `CHAIR mail échoué` (niveau `ERROR`) : le serveur SMTP a refusé l'envoi, le
  champ `error` contient sa réponse.
- `CHAIR mail non envoyé — adresse destinataire invalide` : l'adresse stockée
  n'est pas une adresse valide (typiquement un `client_email` mal saisi).
- `CHAIR — demande de réinitialisation impossible : mailer non configuré` :
  quelqu'un a demandé un lien de réinitialisation et a reçu un `503`.
- **Aucune ligne du tout** : l'email n'a même pas été tenté — c'est très
  probablement la préférence du destinataire qui l'a bloqué
  (`/app/notifications/preferences`).

Le champ `recipient` est volontairement masqué (`b*****r@getchair.app`) :
l'incident reste instruisable sans écrire d'adresse complète dans les logs.

---

## 6. Ce qu'il reste à décider

- **Mentions légales du pied de page.** Il contient aujourd'hui les liens CGU et
  Confidentialité, et un lien « Gérer mes notifications » sur les emails non
  critiques. Si des emails non transactionnels sont envoyés un jour
  (promotions), la loi impose en plus une identification complète de
  l'expéditeur — à compléter à ce moment-là, avec les informations réelles de la
  société.
- **Adresse d'expédition.** À figer une fois pour toutes
  (`bonjour@getchair.app` ? `contact@getchair.app` ?) : elle apparaît dans
  chaque email et changer d'adresse en cours de route abîme la délivrabilité.
  Voir `docs/app-store/ACTION_GERANT_SMTP.md`, section 3.
- **Email de bienvenue gérant de salon** — à écrire (voir section 3).
- **Tutoiement ou vouvoiement dans l'email de réinitialisation ?** C'est le seul
  email envoyé indifféremment à un client (tutoiement partout ailleurs dans
  l'app) et à un professionnel (vouvoiement dans CHAIR PRO). Il est aujourd'hui
  au vouvoiement, y compris quand le destinataire est un client. Trois sorties
  possibles : le laisser tel quel, le réécrire de façon impersonnelle, ou faire
  dépendre le ton du `role` du compte (`User::sendPasswordResetNotification()`
  connaît l'utilisateur, il suffirait de passer un booléen au Mailable). Choix
  de ton, donc décision produit — non tranchée ici.
