# ACTION GÉRANT — Configurer l'envoi d'emails (SMTP)

**Statut : BLOQUANT pour la mise en production et pour la revue Apple.**

Tout le reste de la chaîne email est développé, testé et fonctionnel. Il manque
une seule chose, que seul le gérant du domaine peut fournir : **les identifiants
d'un serveur SMTP**. Tant qu'ils ne sont pas renseignés, aucun email ne part.

Conséquence concrète : un testeur Apple qui clique sur « Mot de passe oublié »
ne reçoit rien. Il ne peut pas récupérer son compte. C'est un motif de rejet, et
c'est aussi un compte client bloqué en production.

Temps nécessaire : environ 30 minutes, plus le délai de propagation DNS
(quelques minutes à quelques heures).

---

## 1. Ce qui se passe aujourd'hui

`backend/.env` contient encore les valeurs de développement livrées avec
Laravel :

```
MAIL_HOST=mailhog          <- outil de développement local, n'existe pas sur le serveur
MAIL_FROM_ADDRESS=null     <- aucune adresse d'expédition
```

L'application détecte cet état et se comporte proprement :

- aucune action métier n'échoue à cause de l'email ;
- l'écran « Mot de passe oublié » répond **« L'envoi d'emails est momentanément
  indisponible »** au lieu d'annoncer faussement un email envoyé ;
- chaque tentative est journalisée dans `backend/storage/logs/laravel.log` avec
  le niveau `ERROR` et la raison exacte.

Mais **personne ne peut réinitialiser son mot de passe.** Ce document corrige ça.

Les six emails concernés (bienvenue client, bienvenue coiffeur, rendez-vous
confirmé, rendez-vous annulé, demande d'avis certifié, réinitialisation de mot
de passe) sont décrits dans `docs/EMAILS.md`.

---

## 2. Choisir le fournisseur

| | **Option A — Infomaniak** | **Option B — Brevo** |
|---|---|---|
| Quand | Le domaine et les boîtes mail sont déjà chez Infomaniak, volume faible | Dès qu'on veut du volume, des statistiques d'ouverture, une meilleure délivrabilité |
| Coût | Inclus dans l'offre mail existante | Offre gratuite plafonnée par jour, puis payant |
| Limite | Quota anti-spam par heure et par jour sur les boîtes mail | Quota selon l'offre, affiché dans l'interface |
| Mise en place | Une adresse email existante suffit | Créer un compte + authentifier le domaine |

**Recommandation technique** (ce n'est pas une décision produit) : démarrer en
**A** pour débloquer la revue Apple, basculer en **B** si le volume monte ou si
les emails arrivent en indésirables. Le passage de A à B ne change que cinq
lignes du `.env`.

---

## 3. Décider l'adresse d'expédition — à faire AVANT tout le reste

Elle apparaît dans chaque email et **changer d'expéditeur en cours de route
abîme durablement la délivrabilité**. À figer une bonne fois.

- Elle doit être sur le domaine `getchair.app` (jamais une adresse gmail /
  outlook : elle serait rejetée ou marquée comme usurpation).
- Elle doit exister réellement, et être relevée : les destinataires y
  répondront, et les rapports de rejet y arrivent.

> **À REMPLIR PAR LE GÉRANT** — adresse d'expédition retenue :
> `_______________@getchair.app`
>
> Le frontend renvoie déjà les utilisateurs vers `contact@getchair.app` en cas
> de problème (page « Mot de passe oublié »). Utiliser la même adresse, ou une
> adresse dédiée type `bonjour@` avec `contact@` en redirection, est cohérent —
> c'est un choix du gérant, pas une décision technique.

---

## 4. Option A — Infomaniak

### 4.1 Créer (ou identifier) l'adresse d'expédition

1. Se connecter au Manager Infomaniak : <https://manager.infomaniak.com>
2. Aller dans le produit **Service Mail** (ou **Mail**), puis sélectionner le
   domaine `getchair.app`.
3. Créer l'adresse retenue à l'étape 3, ou repérer une adresse existante, et
   **noter son mot de passe** (le régénérer si on ne l'a plus).

### 4.2 Relever les paramètres SMTP

Toujours dans le Manager, sur l'adresse concernée, ouvrir la rubrique de
configuration d'un client de messagerie — selon la version de l'interface elle
s'appelle **« Configurer un client de messagerie »**, **« Paramètres IMAP /
SMTP »** ou **« Configuration manuelle »**. Infomaniak y affiche noir sur blanc
les quatre valeurs à recopier.

> **NE RIEN DEVINER : recopier ce que l'écran affiche.**
>
> | Ce qu'Infomaniak affiche | À reporter dans | Valeur relevée |
> |---|---|---|
> | Serveur sortant (SMTP) | `MAIL_HOST` | `________________` |
> | Port SMTP | `MAIL_PORT` | `________________` |
> | Méthode de chiffrement | `MAIL_ENCRYPTION` | `________________` |
> | Nom d'utilisateur | `MAIL_USERNAME` | `________________` |
>
> Repères de lecture : chez Infomaniak le nom d'utilisateur est l'**adresse
> email complète** (`bonjour@getchair.app`), pas un identifiant court. Le port
> proposé est en général `587` avec chiffrement `STARTTLS` (à écrire `tls` dans
> le `.env`) ou `465` avec `SSL` (à écrire `ssl`). Le serveur sortant documenté
> jusqu'ici dans ce dépôt est `mail.infomaniak.com` — **le confirmer sur
> l'écran** avant de l'utiliser, l'interface fait foi.

### 4.3 Remplir `backend/.env`

```env
MAIL_MAILER=smtp
MAIL_HOST=<serveur sortant relevé en 4.2>
MAIL_PORT=<port relevé en 4.2>
MAIL_ENCRYPTION=<tls si STARTTLS, ssl si SSL>
MAIL_USERNAME=<adresse email complète>
MAIL_PASSWORD=<mot de passe de la boîte mail>
MAIL_FROM_ADDRESS=<adresse retenue à l'étape 3>
MAIL_FROM_NAME=CHAIR

FRONTEND_URL=https://www.getchair.app
```

---

## 5. Option B — Brevo

### 5.1 Créer la clé SMTP

1. Se connecter à <https://app.brevo.com>
2. Menu du compte (en haut à droite) → **SMTP & API**.
3. Onglet **SMTP**. Brevo y affiche le **serveur SMTP**, le **port**, et le
   **login** de la clé, puis propose de **générer une nouvelle clé SMTP**.
4. Générer la clé et **la copier immédiatement** : elle n'est affichée qu'une
   fois. C'est elle qui sert de `MAIL_PASSWORD`.

> | Ce que Brevo affiche | À reporter dans | Valeur relevée |
> |---|---|---|
> | SMTP server | `MAIL_HOST` | `________________` |
> | Port | `MAIL_PORT` | `________________` |
> | Login | `MAIL_USERNAME` | `________________` |
> | SMTP key value | `MAIL_PASSWORD` | (à ne noter nulle part d'autre que le `.env`) |
>
> Repère de lecture : le serveur documenté jusqu'ici dans ce dépôt est
> `smtp-relay.brevo.com` sur le port `587` — **le confirmer sur l'écran**.
> Le login Brevo n'est pas forcément l'adresse d'expédition.

### 5.2 Autoriser l'adresse d'expédition

Menu **Expéditeurs, domaines et IPs dédiées** :

- onglet **Expéditeurs** : ajouter l'adresse retenue à l'étape 3 et valider le
  lien de confirmation reçu ;
- onglet **Domaines** : ajouter `getchair.app` et lancer l'authentification —
  Brevo affiche alors les enregistrements DNS de la section 7.

Sans cette étape, Brevo **rejette** les envois.

### 5.3 Remplir `backend/.env`

```env
MAIL_MAILER=smtp
MAIL_HOST=<serveur SMTP relevé en 5.1>
MAIL_PORT=<port relevé en 5.1>
MAIL_ENCRYPTION=tls
MAIL_USERNAME=<login Brevo>
MAIL_PASSWORD=<clé SMTP Brevo>
MAIL_FROM_ADDRESS=<adresse retenue à l'étape 3, validée dans Brevo>
MAIL_FROM_NAME=CHAIR

FRONTEND_URL=https://www.getchair.app
```

---

## 6. Ce qui ne doit JAMAIS être commité

- **`backend/.env`** — il contient les vrais identifiants. Il est déjà ignoré
  par git ; ne jamais le forcer avec `git add -f`.
- **`MAIL_PASSWORD`** (mot de passe de boîte mail ou clé SMTP) — nulle part
  ailleurs que dans le `.env` du serveur : ni dans `.env.example`, ni dans un
  fichier de documentation, ni dans un message, ni dans un ticket, ni dans une
  capture d'écran.
- **`MAIL_USERNAME`** quand c'est un login de service d'envoi.
- Les fichiers de log qui pourraient contenir une réponse SMTP complète :
  `backend/storage/logs/` est ignoré par git, le laisser ignoré.

`backend/.env.example` ne contient que des **cases vides et des formats**. Il
doit le rester.

Si un identifiant a été commité par erreur, le considérer comme compromis :
**le révoquer et le régénérer chez le fournisseur** (changer le mot de passe de
la boîte mail, ou supprimer la clé SMTP dans Brevo et en générer une autre).
Réécrire l'historique git ne suffit pas.

---

## 7. DNS — SPF, DKIM, DMARC (pour ne pas finir en spam)

Sans ces trois enregistrements, les emails partent mais **Gmail et Outlook les
classent en indésirables**, voire les refusent. Pour une réinitialisation de mot
de passe, c'est équivalent à ne rien envoyer.

La zone DNS de `getchair.app` est chez Infomaniak :
**Manager Infomaniak → Domaines → `getchair.app` → Zone DNS**.

### 7.1 SPF — autoriser le serveur à écrire au nom du domaine

Un enregistrement **TXT** à la racine du domaine (nom d'hôte vide ou `@`) :

```
v=spf1 include:<mécanisme fourni par le fournisseur> ~all
```

- Le fournisseur indique le `include:` exact à utiliser (Infomaniak dans sa
  documentation mail, Brevo dans **Domaines → authentifier**). Le recopier tel
  quel.
- **Il ne doit exister qu'UN SEUL enregistrement SPF** sur le domaine. S'il en
  existe déjà un, ne pas en ajouter un second : **fusionner** les `include:`
  dans la même ligne. Deux enregistrements SPF invalident les deux.

> À REMPLIR — mécanisme `include:` fourni par le fournisseur : `________________`

### 7.2 DKIM — signer cryptographiquement les emails

Le fournisseur génère une paire de clés et affiche l'enregistrement à créer :
un **TXT** (ou parfois un **CNAME**) sur un sous-domaine appelé *sélecteur*, de
la forme `<selecteur>._domainkey.getchair.app`.

Le recopier **caractère pour caractère**, sans ajouter d'espace ni couper la
valeur : une clé DKIM tronquée fait échouer la vérification silencieusement.

> À REMPLIR — nom d'hôte : `________________._domainkey`
> À REMPLIR — type (TXT ou CNAME) : `________`
> À REMPLIR — valeur : fournie par le fournisseur, à copier-coller

### 7.3 DMARC — dire aux boîtes mail quoi faire des messages non conformes

Un enregistrement **TXT** sur le nom d'hôte `_dmarc` :

```
v=DMARC1; p=none; rua=mailto:<adresse qui recevra les rapports>
```

- Démarrer avec `p=none` : rien n'est bloqué, on ne fait qu'observer. C'est la
  posture prudente pendant les premières semaines.
- Une fois que SPF et DKIM passent (les rapports le confirment), durcir à
  `p=quarantine` puis éventuellement `p=reject`.
- L'adresse `rua=` doit être une adresse relevée.

> À REMPLIR — adresse de réception des rapports DMARC : `_______________@getchair.app`

### 7.4 Vérifier la propagation

Compter de quelques minutes à quelques heures. Vérification en ligne de commande
depuis n'importe quel poste :

```bash
nslookup -type=TXT getchair.app
nslookup -type=TXT _dmarc.getchair.app
nslookup -type=TXT <selecteur>._domainkey.getchair.app
```

Test de bout en bout recommandé : envoyer un email de test (section 8) vers une
adresse Gmail **et** une adresse Outlook, et vérifier qu'il arrive en boîte de
réception, pas en indésirables.

---

## 8. Vérifier — une seule commande

Sur le serveur, dans `backend/` :

```bash
php artisan config:clear
php artisan chair:test-mail
```

Cette commande, **sans envoyer aucun email** :

- affiche la configuration réellement lue par l'application (le mot de passe
  n'est jamais affiché, seulement « renseigné » ou « vide ») ;
- refuse de continuer et explique pourquoi si une variable bloquante manque ;
- signale ce qui n'est pas bloquant mais abîme le résultat (nom d'expéditeur
  resté sur la valeur d'exemple, `FRONTEND_URL` absente donc liens morts) ;
- **ouvre une vraie connexion au serveur SMTP** pour valider host, port,
  chiffrement et identifiants ;
- sort en code `0` si tout est bon, `1` sinon.

Puis, pour contrôler le rendu dans une vraie boîte mail :

```bash
php artisan chair:test-mail votre-adresse@exemple.fr
```

Un exemplaire de chacun des six emails part vers cette adresse, avec des données
de test explicites (« Coiffeur de test », « Client de test »). Aucune donnée
n'est lue ni écrite en base, aucun compte réel n'est touché.

Un seul type à la fois :

```bash
php artisan chair:test-mail votre-adresse@exemple.fr --type=reset-password
```

Types : `welcome-client`, `welcome-hairdresser`, `appointment-confirmed`,
`appointment-cancelled`, `review-request`, `reset-password`.

### Le test qui compte vraiment pour la revue Apple

Refaire à la main le parcours du testeur :

1. Sur <https://www.getchair.app/connexion>, cliquer sur « Mot de passe oublié ».
2. Saisir l'adresse d'un compte réel.
3. L'email doit arriver **en boîte de réception**, expéditeur `CHAIR`.
4. Le lien doit ouvrir `https://www.getchair.app/reinitialiser-mot-de-passe?...`
   — jamais `localhost`.
5. Choisir un nouveau mot de passe : il doit fonctionner, et l'ancien être
   refusé.

### Si quelque chose ne part pas

```bash
tail -n 200 backend/storage/logs/laravel.log | grep "CHAIR"
```

- `CHAIR mail non envoyé — mailer non configuré` : une variable manque, le
  champ `reason` dit laquelle.
- `CHAIR mail échoué` : le serveur SMTP a refusé, le champ `error` contient sa
  réponse.
- Aucune ligne : l'email n'a pas été tenté — c'est la préférence de
  notification du destinataire qui l'a bloqué (`/app/notifications/preferences`).

Les adresses sont volontairement masquées dans les logs (`b*****r@getchair.app`) :
l'incident reste identifiable sans écrire de données personnelles en clair.

---

## 9. Récapitulatif — les cases à remplir

| Variable `.env` | Format attendu | Où la trouver | Valeur |
|---|---|---|---|
| `MAIL_MAILER` | `smtp` | fixe | `smtp` |
| `MAIL_HOST` | nom d'hôte | interface du fournisseur (§4.2 / §5.1) | `__________` |
| `MAIL_PORT` | `587` ou `465` | idem | `__________` |
| `MAIL_ENCRYPTION` | `tls` ou `ssl` | idem (STARTTLS → `tls`, SSL → `ssl`) | `__________` |
| `MAIL_USERNAME` | adresse complète (A) ou login (B) | idem | `__________` |
| `MAIL_PASSWORD` | mot de passe boîte mail (A) ou clé SMTP (B) | idem — **jamais commité** | `__________` |
| `MAIL_FROM_ADDRESS` | `xxx@getchair.app` | décision §3 | `__________` |
| `MAIL_FROM_NAME` | texte | fixe | `CHAIR` |
| `FRONTEND_URL` | `https://www.getchair.app` | fixe (www, l'apex redirige) | `https://www.getchair.app` |

| Enregistrement DNS | Nom d'hôte | Type | Valeur |
|---|---|---|---|
| SPF | `@` (racine) | TXT | `v=spf1 include:______ ~all` (un seul SPF sur le domaine) |
| DKIM | `______._domainkey` | TXT ou CNAME | fournie par le fournisseur, à copier exactement |
| DMARC | `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:______@getchair.app` |

Après remplissage : `php artisan config:clear` puis `php artisan chair:test-mail`.

---

## 10. Ce que ce document ne décide pas

Volontairement laissés au gérant, parce qu'ils l'engagent :

- le **fournisseur** retenu (A ou B) ;
- l'**adresse d'expédition** définitive ;
- l'adresse de réception des **rapports DMARC** ;
- l'ajout éventuel d'une **identification complète de l'expéditeur** dans le
  pied de page des emails (raison sociale, adresse postale, contact) : elle
  n'est pas obligatoire pour les emails strictement transactionnels envoyés
  aujourd'hui, elle le deviendrait pour tout email promotionnel. Les
  informations juridiques manquantes sont recensées dans
  `docs/app-store/LEGAL_MISSING_INFORMATION.md`.
