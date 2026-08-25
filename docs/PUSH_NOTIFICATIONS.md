# Notifications push CHAIR

Ce document couvre quatre choses :

1. **Le catalogue des textes** — tous les titres et messages, par type et par destinataire.
2. **La configuration du fournisseur push** — ⚠️ la section OneSignal est OBSOLÈTE (voir l'encart en tête de section 3).
3. **Le test** — comment envoyer une vraie notification depuis le terminal.
4. **Le côté app (Capacitor)** — enregistrement du token, opt-in, deep link, premier plan. Voir la section 7.

> **Source unique des textes : `backend/app/Services/NotificationCopy.php`.**
> Ce document est une lecture ; le code fait foi. Pour modifier un texte, on modifie
> le catalogue, pas un contrôleur.

---

## 1. Comment ça marche aujourd'hui

```
Contrôleur / Service
      │
      ├── NotificationService::sendTyped($userId, $type, $vars, $audience, $data)
      │        └── NotificationCopy::resolve()  ← les textes viennent d'ici
      │
      └── NotificationService::send($userId, $type, $title, $message, $data)
               ├── shouldSend()      → respecte les préférences du destinataire
               ├── sendInternal()    → ligne dans la table `notifications` (cloche in-app)
               └── sendPush()        → push OneSignal (no-op si non configuré)
```

Deux points importants :

- `send()` reste inchangé. Les ~28 appels existants passent leur titre et leur message
  en dur et se comportent exactement comme avant. **Rien n'a été réécrit.**
- `sendTyped()` est la méthode à utiliser pour **tout nouvel envoi**. Elle résout le
  texte via le catalogue puis délègue à `send()`.

Exemple :

```php
NotificationService::sendTyped(
    $clientId,
    'appointment_confirmed',
    ['coiffeur' => $hairdresserName, 'date' => $dateLabel, 'heure' => $time],
    NotificationCopy::AUDIENCE_CLIENT,
    ['appointment_id' => $appointment->id]
);
```

### Règles d'écriture des textes

| Règle | Détail |
|---|---|
| Titre | 40 caractères maximum (au-delà, iOS coupe sur l'écran verrouillé) |
| Message | 120 caractères maximum, variables comprises |
| Ton | Tutoiement, phrases courtes, concret. Jamais de majuscules criardes |
| Vocabulaire | « réalisation » (jamais « post »), « avis certifié », « niveau CHAIR », « CHAIR+ » |
| Emoji | Zéro dans les titres. Un seul maximum par message, et seulement s'il ajoute quelque chose |
| Chiffres | Aucune valeur inventée : une donnée ne s'affiche que si l'appelant la passe en variable |

Les longueurs sont garanties à l'exécution : les valeurs de variables sont tronquées à
30 caractères, et le rendu final est borné à 40 / 120 caractères.

### Variables disponibles

`{client}` `{coiffeur}` `{salon}` `{service}` `{date}` `{heure}` `{badge}` `{note}`
`{annonce}` `{offre}`

**Si une variable attendue manque à l'appel**, le catalogue bascule automatiquement sur
le message de repli (colonne « Repli » ci-dessous) — jamais de texte à trou du type
« Ton rendez-vous avec  est confirmé ».

### Destinataires

| Audience | Qui |
|---|---|
| `client` | l'utilisateur de l'app CHAIR |
| `pro` | le coiffeur, dans CHAIR PRO |
| `salon` | le gérant du salon, dans CHAIR PRO |

Un même type peut avoir deux textes : un rendez-vous annulé ne se dit pas pareil au
client et au coiffeur.

---

## 2. Le catalogue complet

Textes livrés au 20/08/2026. Régénérable à tout moment avec
`php artisan chair:test-push --list`.

### Rendez-vous

| Type | Destinataire | Titre | Message | Repli (variable manquante) |
|---|---|---|---|---|
| `appointment_created` | pro | Nouvelle réservation | {client} a réservé {service}, le {date} à {heure}. À confirmer. | Une nouvelle réservation attend ta confirmation. |
| `appointment_confirmed` | client | Rendez-vous confirmé | C'est confirmé avec {coiffeur} : {date} à {heure}. ✂️ | Ton rendez-vous est confirmé. Les détails sont dans ton app. |
| `appointment_confirmed` | pro | Rendez-vous confirmé | C'est confirmé : {client}, {service}, le {date} à {heure}. | Un rendez-vous vient d'être confirmé dans ton agenda. |
| `appointment_cancelled` | client | Rendez-vous annulé | Ton rendez-vous du {date} à {heure} avec {coiffeur} est annulé. | Ton rendez-vous est annulé. Reprends un créneau quand tu veux. |
| `appointment_cancelled` | pro | Rendez-vous annulé | {client} a annulé le {date} à {heure}. Le créneau est libéré. | Un rendez-vous vient d'être annulé. Ton créneau est libéré. |
| `appointment_rescheduled` | client | Rendez-vous déplacé | Nouveau créneau avec {coiffeur} : {date} à {heure}. Ça te va ? | Ton rendez-vous a été déplacé. Vérifie le nouveau créneau. |
| `appointment_rescheduled` | pro | Rendez-vous déplacé | Le rendez-vous de {client} passe au {date} à {heure}. Agenda à jour. | Un rendez-vous a été déplacé. Ton agenda est à jour. |
| `appointment_reminder_24h` ⏳ | client | Rendez-vous demain | Demain {heure} chez {coiffeur}. Préviens en cas d'imprévu. | Tu as un rendez-vous demain. Préviens ton coiffeur en cas d'imprévu. |
| `appointment_reminder_24h` ⏳ | pro | Ton agenda de demain | Demain {heure} : {client} pour {service}. Ton agenda t'attend. | Tu as des rendez-vous demain. Jette un œil à ton agenda. |
| `appointment_reminder_1h` ⏳ | client | C'est dans une heure | {coiffeur} t'attend à {heure}. | Ton rendez-vous est dans une heure. |
| `appointment_reminder_1h` ⏳ | pro | Prochain client dans 1h | {client} arrive à {heure} pour {service}. | Ton prochain rendez-vous est dans une heure. |

### Avis certifiés

| Type | Destinataire | Titre | Message | Repli |
|---|---|---|---|---|
| `review_request` | client | Ton avis compte | Ton avis certifié sur {coiffeur} fait la différence. 30 secondes suffisent. | Ton rendez-vous est terminé. Laisse un avis certifié, 30 secondes suffisent. |
| `review_received` | pro | Nouvel avis certifié | {client} t'a mis {note}/5. Va lire son avis. | Tu viens de recevoir un nouvel avis certifié. Va le lire. |
| `review_reply` ⏳ | client | Réponse à ton avis | {coiffeur} a répondu à ton avis certifié. Va voir. | Ton avis certifié a reçu une réponse. Va la lire. |

### Réputation et social

| Type | Destinataire | Titre | Message | Repli |
|---|---|---|---|---|
| `badge_unlocked` | pro | Nouveau badge débloqué | {badge} est à toi. Ton niveau CHAIR avance. | Tu viens de débloquer un badge. Ton niveau CHAIR avance. |
| `new_follower` | pro | Nouvel abonné | {client} suit ton profil. Publie une réalisation pour lui donner envie. | Quelqu'un suit ton profil. Publie une réalisation pour lui donner envie. |
| `new_post` ⏳ | client | Nouvelle réalisation | {coiffeur} vient de publier. Va voir le résultat. | Un coiffeur que tu suis vient de publier une réalisation. |
| `followed_post` ⏳ | client | Nouvelle réalisation | {coiffeur} vient de publier. Va voir le résultat. | Un coiffeur que tu suis vient de publier une réalisation. |
| `new_hairdresser_nearby` ⏳ | client | Un coiffeur près de chez toi | {coiffeur} vient d'arriver sur CHAIR. Va voir ses réalisations. | Un nouveau coiffeur est arrivé près de chez toi. Va voir son profil. |
| `promotion` ⏳ | client | Une offre pour toi | {coiffeur} propose {offre}. À voir sur son profil. | Une offre t'attend dans l'app. À voir avant qu'elle se termine. |
| `promotions` ⏳ | client | Une offre pour toi | {coiffeur} propose {offre}. À voir sur son profil. | Une offre t'attend dans l'app. À voir avant qu'elle se termine. |

`followed_post` et `promotions` sont les alias historiques de `new_post` et `promotion`
(ce sont les clés utilisées par la table des préférences). Mêmes textes.

### Salon — rattachement, invitations, équipe

| Type | Destinataire | Titre | Message | Repli |
|---|---|---|---|---|
| `join_request` | salon | Demande de rattachement | {coiffeur} veut rejoindre {salon}. Réponds depuis ton équipe. | Un coiffeur veut rejoindre ton salon. Réponds depuis ton équipe. |
| `join_accepted` | pro | Demande acceptée | Tu fais partie de l'équipe {salon}. Ton profil est à jour. | Ta demande est acceptée. Ton profil est à jour. |
| `join_declined` | pro | Demande non retenue | {salon} n'a pas donné suite. D'autres salons cherchent des coiffeurs. | Ta demande n'a pas été retenue. D'autres salons cherchent des coiffeurs. |
| `removed_from_salon` | pro | Retiré de l'équipe | Tu ne fais plus partie de l'équipe {salon}. Ton profil CHAIR reste actif. | Tu as été retiré d'une équipe. Ton profil CHAIR reste actif. |
| `salon_invitation` | pro | Invitation d'un salon | {salon} t'invite à rejoindre son équipe. À toi de voir. | Un salon t'invite à rejoindre son équipe. À toi de voir. |
| `salon_invitation_cancelled` | pro | Invitation annulée | {salon} a retiré son invitation. | Une invitation de salon a été retirée. |
| `invitation_accepted` | salon | Invitation acceptée | {coiffeur} rejoint ton équipe. Son profil apparaît sur ta page salon. | Un coiffeur a accepté ton invitation et rejoint ton équipe. |
| `invitation_declined` | salon | Invitation déclinée | {coiffeur} n'a pas donné suite à ton invitation. | Ton invitation n'a pas été acceptée. |

### Recrutement

| Type | Destinataire | Titre | Message | Repli |
|---|---|---|---|---|
| `new_application` | salon | Nouvelle candidature | {coiffeur} a postulé pour {offre}. Son profil t'attend. | Tu as reçu une nouvelle candidature. Le profil t'attend. |
| `application_interview` | pro | Entretien à venir | {salon} veut te rencontrer au sujet de {offre}. | Un salon veut te rencontrer. Il te recontacte directement. |
| `application_accepted` | pro | Candidature retenue | Ta candidature pour {offre} est retenue. {salon} te recontacte. | Ta candidature est retenue. Le salon te recontacte. |
| `application_declined` | pro | Candidature non retenue | Ta candidature pour {offre} n'a pas été retenue. D'autres offres sont ouvertes. | Ta candidature n'a pas été retenue. D'autres offres sont ouvertes. |

### Location de fauteuil

| Type | Destinataire | Titre | Message | Repli |
|---|---|---|---|---|
| `rental_request` | salon | Demande de fauteuil | {coiffeur} veut louer {annonce}. À toi de répondre. | Un coiffeur veut louer ton fauteuil. À toi de répondre. |
| `rental_accepted` | pro | Fauteuil accepté | Ta demande pour {annonce} est acceptée. Prends contact avec le salon. | Ta demande de fauteuil est acceptée. Prends contact avec le salon. |
| `rental_declined` | pro | Demande non retenue | Ta demande pour {annonce} n'a pas été retenue. D'autres fauteuils sont libres. | Ta demande n'a pas été retenue. D'autres fauteuils sont libres. |
| `rental_cancelled` | salon | Demande annulée | Une demande pour {annonce} a été annulée. Le fauteuil reste libre. | Une demande de fauteuil a été annulée. Le fauteuil reste libre. |
| `rental_message` | pro | Nouveau message | Le salon t'a répondu au sujet de {annonce}. | Tu as un nouveau message au sujet d'un fauteuil. |
| `rental_message` | salon | Nouveau message | Un coiffeur t'a répondu au sujet de {annonce}. | Tu as un nouveau message au sujet d'un fauteuil. |

> ⏳ = texte écrit et prêt, mais **aucun envoi n'est encore branché** dans le code pour
> ce type. Le jour où l'envoi existe, il n'y a plus de texte à écrire.

### Note importante sur les textes actuellement envoyés

Le catalogue ci-dessus est la référence, mais **les ~28 appels existants continuent
d'envoyer leurs propres textes en dur** (rédigés au vouvoiement, ex. « Votre rendez-vous
avec X est confirmé »). C'était le choix de non-régression : on ne touche pas à
28 appelants dans le même lot.

**À décider par Julien :** migrer ces appels vers `sendTyped()` pour que les textes du
catalogue soient réellement ceux qui partent. Tant que ce n'est pas fait, seuls les
nouveaux envois et la commande de test utilisent le catalogue.

---

## 3. Configurer OneSignal — ⚠️ SECTION OBSOLÈTE

> **OneSignal a été entièrement retiré du projet en juillet 2026 et ne doit pas
> revenir.** Cette section est conservée uniquement comme trace historique : ne
> suivre AUCUNE de ses étapes. La cible actuelle est un envoi direct APNs/FCM
> depuis le backend (voir le travail backend en cours) et l'enregistrement des
> appareils via le plugin `@capacitor/push-notifications` côté app (section 7).
> Les sous-sections encore valables ont été reprises en section 7 (clé APNs `.p8`,
> deux apps = deux bundle IDs).

### 3.0 État actuel — ce qui manque

| Élément | État |
|---|---|
| Backend : appel de l'API OneSignal | Fait (`NotificationService::sendPush`) |
| Backend : clés dans le `.env` | **Manquant** — `ONESIGNAL_APP_ID` et `ONESIGNAL_REST_API_KEY` sont vides |
| Compte OneSignal | **À créer** |
| SDK OneSignal dans l'app mobile | **Non intégré** — aucune dépendance OneSignal dans `frontend/package.json` |

Autrement dit : même avec les clés dans le `.env`, **aucun push n'arrivera sur un
téléphone tant que le SDK n'est pas intégré côté app**. Les deux chantiers sont
indépendants ; celui-ci ne couvre que le backend et les textes.

### 3.1 Créer le compte et l'app

1. Aller sur [onesignal.com](https://onesignal.com) → **Sign up** (le plan gratuit
   couvre largement le lancement).
2. Créer une organisation « CHAIR ».
3. **New App/Website** → nom : `CHAIR` → créer.

**Attention — il faut deux apps OneSignal**, parce qu'il y a deux applications avec deux
identifiants distincts :

| App | Bundle ID iOS / package Android |
|---|---|
| CHAIR (client) | `app.getchair.client` |
| CHAIR PRO | `app.getchair.pro` |

Une app OneSignal = un bundle iOS + un package Android. Il faut donc créer
`CHAIR` **et** `CHAIR PRO` séparément.

> **Limite connue du backend :** `config/services.php` ne prévoit aujourd'hui qu'**un
> seul** couple `app_id` / `rest_api_key`. Pour envoyer vers les deux apps, il faudra
> ajouter une seconde paire de variables (ex. `ONESIGNAL_PRO_APP_ID`) et choisir l'app
> cible selon le rôle du destinataire. À traiter au moment de l'intégration mobile.
> En attendant, mettre les clés de l'app à tester.

### 3.2 Plateforme iOS (APNs)

Il faut une **clé d'authentification APNs** (fichier `.p8`), pas un certificat.

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers &
   Profiles** → **Keys** → **+**.
2. Nom : `CHAIR Push`. Cocher **Apple Push Notifications service (APNs)**. Continuer,
   puis **Register**.
3. **Download** le fichier `.p8`. ⚠️ **Téléchargeable une seule fois** — le sauvegarder
   dans le gestionnaire de mots de passe, pas dans le dépôt git.
4. Noter au passage :
   - **Key ID** (affiché sur la page de la clé, ex. `ABC123DEFG`)
   - **Team ID** (en haut à droite du compte développeur, ou dans Membership)
   - **Bundle ID** : `app.getchair.client` (et `app.getchair.pro` pour l'autre app)
5. Dans OneSignal : **Settings → Push & In-App → Apple iOS (APNs) → Activate**, choisir
   « Upload .p8 Auth Key », téléverser le fichier et saisir Key ID, Team ID, Bundle ID.

### 3.3 Plateforme Android (FCM)

1. [console.firebase.google.com](https://console.firebase.google.com) → créer un projet
   `CHAIR` (Analytics facultatif).
2. Ajouter une app Android avec le package `app.getchair.client`.
3. **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** →
   télécharge un fichier **JSON**.
4. Dans OneSignal : **Settings → Push & In-App → Google Android (FCM) → Activate**,
   téléverser ce JSON de compte de service.

> OneSignal utilise l'API FCM v1 (compte de service JSON). L'ancienne « Server Key »
> Firebase est obsolète et n'est plus acceptée.

### 3.4 Récupérer App ID et REST API Key

Dans OneSignal : **Settings → Keys & IDs**.

- **OneSignal App ID** — un UUID, ex. `1a2b3c4d-....`. Non secret.
- **REST API Key** — **secrète**. Jamais dans le dépôt git, jamais côté app mobile.

### 3.5 Renseigner le `.env`

Dans `backend/.env` (les clés sont déjà listées dans `.env.example`) :

```env
ONESIGNAL_APP_ID=1a2b3c4d-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_REST_API_KEY=votre_rest_api_key
```

Puis vider le cache de config :

```bash
php artisan config:clear
```

En production, ajouter ces deux variables aux variables d'environnement de l'hébergeur
(pas de `.env` commité).

> **Si OneSignal fournit une clé au nouveau format** (clés d'organisation / « App API
> Key »), l'en-tête d'authentification attendu est `Authorization: Key <clé>` et non
> `Authorization: Basic <clé>` utilisé aujourd'hui dans `sendPush()`. Si le test renvoie
> une erreur 401/403, c'est la première chose à vérifier — le correctif est d'une ligne
> dans `NotificationService::sendPush()`.

### 3.6 Côté app mobile (à faire lors de l'intégration)

Le backend cible l'**External User ID** OneSignal, qu'il fait égal à notre `user_id`.
L'app doit donc, juste après connexion, appeler :

```js
OneSignal.login(String(user.id));
```

et `OneSignal.logout()` à la déconnexion. Sans cet appel, OneSignal ne sait pas à quel
appareil correspond l'utilisateur : l'API répondra « All included players are not
subscribed » et rien n'arrivera.

---

## 4. Tester

### Prévisualiser tous les textes (aucun envoi)

```bash
php artisan chair:test-push --list
```

### Prévisualiser un texte précis

```bash
php artisan chair:test-push 42 --type=review_request --dry
```

`--dry` n'écrit rien en base et n'envoie rien.

### Envoyer une vraie notification

```bash
php artisan chair:test-push 42                                    # review_request par défaut
php artisan chair:test-push 42 --type=badge_unlocked
php artisan chair:test-push 42 --type=appointment_cancelled --audience=pro
```

Les variables sont remplies avec un jeu d'exemple (Camille, Sarah, Studio Nord, 12 mars,
14h30…), donc le rendu est représentatif sans toucher à des données réelles.

Ce que la commande affiche :

| Message | Signification |
|---|---|
| `Notification interne créée (notifications #N)` | La ligne est en base, la cloche in-app l'affichera |
| `Push envoyé à OneSignal` | La requête est partie ; si rien n'arrive, voir 3.6 |
| `Push NON configuré (notif interne créée quand même)` | Les clés manquent dans le `.env` — c'est l'état actuel |
| `Rien n'a été envoyé : les préférences…` | Le destinataire a désactivé ce type dans ses réglages |

### Vérifier en base

```sql
SELECT id, type, title, message, created_at
FROM notifications
WHERE user_id = 42
ORDER BY id DESC LIMIT 5;
```

---

## 5. Préférences utilisateur

`NotificationService::shouldSend()` respecte la table `notification_preferences`.
Trois règles, déjà en place :

- Un type **absent** du mapping `TYPE_TO_PREFERENCE` est **toujours** envoyé
  (transactionnel pro, badges, salon, location) — aucune des 10 préférences ne le couvre,
  on ne bloque jamais silencieusement.
- Les notifications de **sécurité** sont volontairement non mappées : toujours envoyées.
- Les types **futurs** (rappels, réponse à un avis, réalisation d'un coiffeur suivi) sont
  déjà mappés : le respect des préférences sera automatique le jour de l'envoi.

---

## 6. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `backend/app/Services/NotificationCopy.php` | **Source unique des textes** |
| `backend/app/Services/NotificationService.php` | Envoi (interne + push), préférences, `sendTyped()` |
| `backend/app/Console/Commands/TestPush.php` | Commande `chair:test-push` |
| `backend/config/services.php` | Clés `services.onesignal.*` |
| `backend/.env.example` | `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` |

---

## 7. Côté app (Capacitor) — livré le 25/08/2026

### 7.1 Architecture

Le plugin `@capacitor/push-notifications` (v8, dans `frontend/package.json`) est
la seule brique native. Tout le reste est du code web, servi à distance :

| Fichier | Rôle |
|---|---|
| `frontend/lib/push.ts` | **Module central.** Permission, enregistrement, désenregistrement, listeners (toast premier plan + deep link au tap). Toute évolution push passe par lui. |
| `frontend/lib/api.ts` (`export const push`) | Les deux appels API : `POST /push/register`, `DELETE /push/register`. |
| `frontend/components/ui/PushOptInCard.tsx` | Carte d'opt-in contextualisée + `PushBootstrap` (montage des listeners). |
| `frontend/components/layout/AppShell.tsx` | Monte `PushBootstrap` une fois par session d'app. |
| `frontend/app/app/compte/page.tsx` | Affiche la carte d'opt-in. |
| `frontend/components/ui/BookingSheet.tsx` | Affiche la carte d'opt-in sur l'écran de succès de réservation (le meilleur moment). |
| `frontend/app/app/notifications/preferences/page.tsx` | État du canal push : bandeau si refusé dans les Réglages iOS, bouton de (ré)activation sinon. |
| `frontend/capacitor.*.config.ts` (les 3) | `plugins.PushNotifications.presentationOptions: ['badge']`. |

**Disponibilité du plugin — règle absolue.** Les binaires chargent le site
distant (`server.url`) : le code web est toujours à jour, mais le plugin natif
n'existe que dans les binaires compilés APRÈS son ajout. Tout le code passe par
`Capacitor.isPluginAvailable('PushNotifications')` :

- **web** : aucune carte, aucun appel plugin, `getPushPermissionState()` renvoie `'unavailable'` ;
- **binaires TestFlight actuels** (sans le plugin) : identique au web — rien ne s'affiche, rien ne casse ;
- **binaires du prochain build** : tout est actif.

### 7.2 Contrat API avec le backend

```
POST   /api/push/register    (auth)  { token, platform: 'ios', app?: 'client'|'pro' }
DELETE /api/push/register    (auth)  { token }   ← ne retire que CET appareil (idempotent)
```

Implémenté des deux côtés : `frontend/lib/api.ts` (`push.register/unregister`)
et `backend/app/Http/Controllers/Api/PushTokenController.php` (upsert par token
dans `push_subscriptions`). `app` identifie le binaire — un token APNs n'est
valable que pour le bundle qui l'a obtenu, le backend en déduit le topic
d'envoi (`ApnsService::topicForApp`). Seul `platform: 'ios'` est accepté
aujourd'hui (envoi APNs uniquement) ; Android rejoindra le contrat avec FCM.
Le token est ré-envoyé à chaque démarrage d'app où la permission est accordée
(`syncRegistrationIfGranted`) : les tokens APNs tournent, et `last_used_at`
permet de purger les morts.

### 7.3 Contrat deep link : `data.url`

Le payload push contient une clé **`url`** dans ses données custom (APNs : au
niveau racine du payload à côté de `aps` — c'est ce que fait
`backend/app/Services/PushService.php`) — un **chemin interne relatif**
(`/app/rendez-vous`, `/pro/agenda`). Capacitor l'expose en
`notification.data.url`. Au tap sur la notification, `lib/push.ts` la valide
via `safeInternalPath()` (rejet de toute URL absolue ou protocol-relative) puis
navigue. Une `url` absente ou invalide = ouverture simple de l'app, sans
navigation. C'est le SEUL contrat de deep link push ; le backend n'envoie
jamais autre chose qu'un chemin interne.

### 7.4 Premier plan : pourquoi `presentationOptions: ['badge']`

Quand l'app est ouverte, iOS n'affiche PAS la bannière système (ni son) — c'est
le **toast interne** de `lib/push.ts` qui présente la notification (fond noir,
titre + message, tap = deep link, auto-dismiss 5 s). Sans ce choix, l'utilisateur
verrait bannière système + toast en double. En arrière-plan, la bannière système
normale s'affiche : `presentationOptions` ne concerne que le premier plan.

### 7.5 UX d'opt-in — jamais de popup à la première seconde

La popup système iOS ne peut être montrée qu'UNE fois. La carte `PushOptInCard`
explique la valeur avant de la déclencher, et ne s'affiche que si : natif +
plugin présent + permission `'prompt'` + pas écartée (croix → localStorage
`chair_push_optin_dismissed`, on ne harcèle pas). Emplacements : écran de succès
de réservation et page `/app/compte`. La page de préférences de notifications
reste l'endroit permanent pour (ré)activer, y compris après un dismiss.

Refus dans les Réglages iOS : bandeau d'explication texte, sans bouton — il
n'existe pas de moyen documenté par Capacitor d'ouvrir les Réglages sans plugin
supplémentaire (`app-settings:` via App.openUrl n'est ni documenté ni fiable).

Logout : `unregister()` (DELETE du token de l'appareil) est appelé AVANT
`POST /logout` — après la révocation du jeton API, l'appel prendrait un 401.

### 7.6 Ce qui ne sera actif qu'au PROCHAIN build TestFlight

- Le plugin natif lui-même (le pod est ajouté par `npx cap sync ios`, déjà dans
  le pipeline Codemagic — rien à faire).
- Donc : carte d'opt-in, popup de permission, enregistrement du token, toast
  premier plan, deep link au tap. Sur les binaires actuels : rien de visible.

### 7.7 À configurer par Julien (hors code)

| Quoi | Où |
|---|---|
| Capability **Push Notifications** sur les DEUX App IDs (`app.getchair.client`, `app.getchair.pro`) | developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → chaque App ID → cocher Push Notifications. Sans ça, le profil de provisioning généré par Codemagic n'embarquera pas l'entitlement `aps-environment` et `register()` échouera. |
| Entitlement `aps-environment` dans le projet Xcode | À ajouter au moment du build push (fichier `.entitlements` ou étape Codemagic) — il n'existe pas encore dans `frontend/ios/App`. À coordonner avec la configuration de signature. |
| Clé APNs `.p8` (une seule pour tout le compte) | developer.apple.com → Keys → + → cocher APNs. Téléchargeable UNE fois : gestionnaire de mots de passe, jamais dans git. Noter Key ID + Team ID. À fournir au backend (variables d'env). |
| FCM (Android, plus tard) | console.firebase.google.com — hors périmètre TestFlight iOS. |

### 7.8 Protocole de test sur iPhone réel

Le plugin n'est pas simulable : ni le simulateur iOS (pas de vrais tokens APNs
fiables pour ce flux), ni le web. Sur un build TestFlight :

> **Sandbox vs production APNs :** un build **TestFlight utilise l'environnement
> APNs de PRODUCTION** (comme l'App Store). L'environnement *sandbox* ne
> concerne que les builds de développement signés en debug depuis Xcode. Le
> backend doit donc viser `api.push.apple.com` (production) pour tester via
> TestFlight — un token de build TestFlight envoyé au sandbox renvoie
> `BadDeviceToken`.

1. **Opt-in** : installer le build, se connecter, réserver un RDV (ou ouvrir
   `/app/compte`) → la carte apparaît → « Activer les notifications » → popup
   système → Autoriser. Vérifier en base : `SELECT * FROM push_subscriptions
   WHERE user_id = …` (token présent, platform `ios`, provider `apns`).
2. **Refus** : sur un autre appareil (ou après réinitialisation des réglages de
   confidentialité), refuser la popup → la carte disparaît → la page de
   préférences affiche le bandeau « désactivées dans les réglages ».
3. **Arrière-plan** : envoyer une push (commande backend de test) app fermée →
   bannière système → tap → l'app s'ouvre sur `data.url`.
4. **Premier plan** : app ouverte → envoyer une push → toast interne noir en
   haut d'écran, PAS de bannière système → tap sur le toast → navigation.
5. **Logout** : se déconnecter → la ligne `push_subscriptions` de l'appareil a
   disparu → une push envoyée à ce user n'arrive plus sur cet appareil.
6. **Resync** : se reconnecter, tuer l'app, la rouvrir →
   `syncRegistrationIfGranted` ré-enregistre le token sans aucune popup.
7. **Préférences** : couper un interrupteur (ex. « Confirmation de RDV ») →
   la push de ce type ne part plus (refus côté backend, `shouldSend`).

### 7.9 Tests possibles sans device (faits au 25/08/2026)

- `npx tsc --noEmit` : 0 erreur.
- ESLint sur tous les fichiers touchés : 0 nouvelle erreur vs baseline HEAD.
- Web : plugin absent → `getPushPermissionState()` = `'unavailable'`, aucune
  carte rendue, aucun appel réseau push, aucun crash (garde
  `isPushAvailable()` en tête de chaque fonction de `lib/push.ts`).
- États de la carte simulables dans un navigateur : forcer
  `localStorage.chair_push_optin_dismissed = '1'` pour vérifier le non-retour
  de la carte (le reste des états exige le plugin, donc un device).
