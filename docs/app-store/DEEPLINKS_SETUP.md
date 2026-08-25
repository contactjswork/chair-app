# Universal Links iOS — ce qui est fait, ce qui reste à faire

**État au moment de la rédaction : les liens CHAIR partagés ouvrent Safari, jamais l'application.**
Le socle web est désormais posé et testé. Le reste dépend d'une information que
seul le gérant possède (l'Apple Team ID) et d'un nouveau build TestFlight.

---

## 1. Ce qu'est un Universal Link, en une phrase

Quand quelqu'un envoie `https://www.getchair.app/app/coiffeur/lea-martin` par SMS
et que le destinataire a l'app CHAIR installée, iOS ouvre **l'app** au lieu de
Safari — à condition que le domaine publie un fichier
`https://www.getchair.app/.well-known/apple-app-site-association` (dit « AASA »)
qui déclare quelle app a le droit de revendiquer quels chemins.

Aujourd'hui ce fichier n'existe pas encore en production : chaque lien partagé
fait sortir l'utilisateur de l'app, ce qui casse le parcours de parrainage, les
liens d'avis et le partage de réalisations.

---

## 2. Ce qui vient d'être fait (côté web, déjà en place dans le dépôt)

`frontend/app/.well-known/apple-app-site-association/route.ts` sert le fichier
AASA **dynamiquement** :

| Situation | Réponse HTTP | Content-Type |
|---|---|---|
| `APPLE_TEAM_ID` absente | `404 Not Found` | `text/plain` |
| `APPLE_TEAM_ID` malformée (ex. `TODO_TEAM_ID`) | `404 Not Found` | `text/plain` |
| `APPLE_TEAM_ID` valide (10 caractères A-Z0-9) | `200 OK` + JSON | `application/json` |

**Pourquoi un 404 et pas un fichier avec un identifiant provisoire ?** Apple ne
lit pas ce fichier depuis l'iPhone : il passe par son propre CDN, qui le met en
cache **plusieurs jours**. Un fichier contenant un Team ID inventé resterait
donc en cache et casserait les Universal Links longtemps après correction —
strictement pire que l'absence de fichier, qu'iOS interprète simplement comme
« ce domaine ne revendique aucune app ». D'où la validation stricte du format
avant publication.

Le JSON revendique **deux familles de chemins**, et les deux sont
indispensables :

1. les routes actuelles `/app` et `/app/*` ;
2. les routes historiques que `frontend/next.config.ts` redirige en permanent
   vers `/app/*` : `/feed`, `/rechercher`, `/mes-inspirations`, `/favoris`,
   `/classements`, `/notifications`, `/onboarding-client`, `/recrutement`,
   `/compte`, `/compte/*`, `/coiffeur`, `/coiffeur/*`, `/salon`, `/salon/*`,
   `/realisation/*`, `/avis/*`, `/scan/*`.

> **iOS ne suit PAS les redirections pour décider d'ouvrir l'app.** Il compare
> l'URL telle qu'elle a été cliquée à la liste ci-dessus. Un vieux lien
> `getchair.app/realisation/42` encore vivant dans une conversation WhatsApp
> partirait dans Safari s'il n'était pas listé explicitement, alors même que le
> serveur le redirige vers `/app/realisation/42`.

Une seconde entrée revendique `/pro`, `/pro/*`, `/dashboard`, `/dashboard/*`
pour l'app CHAIR PRO — un domaine ne peut servir qu'**un seul** fichier AASA,
donc les deux applications doivent y figurer ensemble.

Ne sont **volontairement pas** revendiqués : la home vitrine `/`, `/cgu`,
`/confidentialite`, `/contact`, `/download`, `/connexion`, `/inscription`,
`/parrainage`. Ce sont des pages de conversion ou des pages communes aux deux
apps : elles doivent rester ouvrables dans un navigateur par quelqu'un qui n'a
pas encore installé l'application. **Si le gérant souhaite qu'un lien de
parrainage `getchair.app/parrainage/CODE` ouvre directement l'app pour ceux qui
l'ont déjà, c'est un arbitrage produit** — il suffira d'ajouter `/parrainage/*`
à la liste `CLIENT_PATHS` du fichier de route.

---

## 3. ACTION GÉRANT REQUISE

### 3.1 Récupérer l'Apple Team ID

C'est un identifiant de **10 caractères alphanumériques majuscules**
(exemple de forme : `A1B2C3D4E5`). Deux endroits pour le lire :

- **https://developer.apple.com/account** → menu **Membership** (ou
  « Membership details ») → ligne **Team ID**.
- **https://appstoreconnect.apple.com** → **Users and Access** → onglet
  **Integrations** / **Keys** : le Team ID est affiché en haut de la liste des
  clés.

C'est aussi le préfixe affiché devant le Bundle ID dans Xcode
(`Signing & Capabilities` → `Provisioning Profile` → App ID
`TEAMID.app.getchair.client`).

> À ne pas confondre avec l'App ID Prefix d'un autre compte, ni avec l'Issuer ID
> des clés API App Store Connect (celui-ci est un UUID avec des tirets).

### 3.2 Poser la variable chez l'hébergeur

Sur la plateforme qui exécute `next build` / `next start` pour
`www.getchair.app`, ajouter dans les variables d'environnement du service :

```
APPLE_TEAM_ID=<les 10 caractères relevés à l'étape 3.1>
```

Puis **redéployer / redémarrer** le service Next (une variable
d'environnement n'est pas relue à chaud).

Variables optionnelles, à ne renseigner **que** si les identifiants
d'application changent un jour (les valeurs par défaut correspondent déjà aux
fichiers `frontend/capacitor.chair.config.ts` et `capacitor.pro.config.ts`) :

```
APPLE_CLIENT_BUNDLE_ID=app.getchair.client
APPLE_PRO_BUNDLE_ID=app.getchair.pro
```

### 3.3 Vérifier que ça répond

```bash
curl -i https://www.getchair.app/.well-known/apple-app-site-association
```

Attendu : `HTTP/2 200`, `content-type: application/json`, et un JSON dont les
`appIDs` commencent par le vrai Team ID. Trois pièges classiques :

- **Une redirection est fatale.** L'URL doit répondre 200 directement sur
  `www.getchair.app` (le host déclaré dans les Associated Domains). L'apex
  `getchair.app` redirige vers `www` : c'est bien `www` qui doit servir le
  fichier.
- **Pas d'extension de fichier.** L'URL se termine par
  `apple-app-site-association`, jamais `.json`.
- **Aucune authentification devant.** Le CDN d'Apple n'a ni cookie ni compte.

### 3.4 Point de vigilance : le mur de mot de passe bêta

`frontend/proxy.ts` (le middleware Next) redirige tout chemin non listé vers
`/beta` quand `NEXT_PUBLIC_BETA_ENABLED=true`. **`/.well-known/` n'y figure
pas.** Aujourd'hui la variable vaut `false` en production
(`frontend/.env.production`), donc le fichier passe. Mais si le mur bêta est
réactivé un jour, l'AASA répondra une redirection vers `/beta` — Apple mettra
cet échec en cache et les Universal Links casseront.

> Ce fichier est hors du périmètre de la présente intervention et n'a pas été
> modifié. La correction tient en une ligne, à ajouter dans la liste
> « Toujours laisser passer » de `frontend/proxy.ts` :
>
> ```ts
> pathname.startsWith('/.well-known') ||
> ```

---

## 4. Ce qui reste à faire côté natif — **exige un nouveau build TestFlight**

Les trois étapes ci-dessous touchent le projet Xcode et le code JavaScript
embarqué. **Aucune ne peut être livrée par une simple mise à jour du site :**
il faut recompiler l'app, la renvoyer sur TestFlight, puis la resoumettre.

Tant qu'elles ne sont pas faites, le fichier AASA publié à l'étape 3 ne change
rien de visible — il est inerte mais inoffensif.

### 4.1 Capability « Associated Domains » (Xcode + Apple Developer)

1. Sur https://developer.apple.com/account → **Certificates, Identifiers &
   Profiles** → **Identifiers** → sélectionner `app.getchair.client`, cocher
   **Associated Domains**, enregistrer. Idem pour `app.getchair.pro`.
   Les provisioning profiles doivent ensuite être **régénérés** (ils portent la
   liste des capabilities).
2. Dans Xcode, cible **App** → onglet **Signing & Capabilities** → **+
   Capability** → **Associated Domains** → ajouter l'entrée :

   ```
   applinks:www.getchair.app
   ```

   Ajouter aussi, si l'on veut le remplissage automatique du mot de passe CHAIR
   par le trousseau iOS (le fichier AASA déclare déjà la section
   `webcredentials`, sans effet tant que l'entitlement manque) :

   ```
   webcredentials:www.getchair.app
   ```

   Xcode crée alors un fichier `App.entitlements` et le référence dans le
   projet. **Cette manipulation doit être faite dans Xcode**, pas à la main :
   éditer `project.pbxproj` au texte est le meilleur moyen de corrompre le
   projet.
3. Ne PAS ajouter `applinks:getchair.app` (apex) : il redirige vers `www` et
   ne sert pas l'AASA.

### 4.2 Router le lien à l'intérieur de l'app (plugin `@capacitor/app`)

Sans cette étape, ouvrir un Universal Link lance bien l'app… mais sur son écran
de démarrage, pas sur le contenu du lien — ce qui ressemble à un bug.

Le seul plugin natif actuellement installé est `@capacitor/geolocation`. Il faut
ajouter :

```bash
cd frontend
npm install @capacitor/app
npm run cap:chair:sync   # puis npm run cap:pro:sync pour l'app PRO
```

Puis, dans un composant client monté au démarrage, écouter `appUrlOpen` et
router **en interne** (surtout pas `window.location = url`, qui rechargerait
toute la WebView) :

```ts
// Exemple d'intention — à intégrer proprement à l'arborescence de composants.
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

App.addListener('appUrlOpen', ({ url }) => {
  const { pathname, search } = new URL(url);
  // Rejouer côté client la redirection historique que le serveur ferait,
  // sinon /realisation/42 provoque un aller-retour réseau inutile.
  router.push(pathname + search);
});
```

Points d'attention pour l'implémentation :

- l'app CLIENT charge `https://www.getchair.app/app` : un lien vers `/pro/...`
  reçu par l'app CLIENT ne doit **pas** être routé en interne ;
- ne router que des chemins internes (mêmes garde-fous que `safeInternalPath`
  dans `frontend/lib/auth.ts`) — une URL absolue reçue de l'extérieur ne doit
  jamais devenir une navigation arbitraire ;
- l'écouteur doit être retiré au démontage.

### 4.3 Vérification sur appareil réel

Le simulateur iOS ne reproduit pas fidèlement la résolution des Universal
Links. Sur un iPhone avec le build TestFlight installé :

1. s'envoyer `https://www.getchair.app/app/coiffeur/<slug>` par **Messages** ou
   **Notes** (un lien tapé dans la barre d'adresse de Safari ne déclenche
   **jamais** un Universal Link — c'est le piège n°1 des faux négatifs) ;
2. appuyer sur le lien : CHAIR doit s'ouvrir directement sur la fiche ;
3. si Safari s'ouvre, faire glisser la page vers le bas : une bannière
   « Ouvrir dans CHAIR » apparaît si l'association est reconnue mais que
   l'utilisateur avait choisi Safari précédemment (ce choix est mémorisé par
   iOS) ;
4. réinstaller l'app force iOS à retélécharger l'AASA — c'est le moyen le plus
   simple de tester une correction, le cache d'Apple pouvant sinon retarder la
   prise en compte de plusieurs jours.

---

## 5. Récapitulatif

| Étape | Qui | Nouveau build requis ? | État |
|---|---|---|---|
| Route AASA dynamique + 404 tant que le Team ID manque | dev | non | **fait** |
| En-têtes de sécurité HTTP | dev | non | **fait** |
| `APPLE_TEAM_ID` chez l'hébergeur | gérant | non | **à faire** |
| Laisser passer `/.well-known` dans `proxy.ts` si le mur bêta est réactivé | dev | non | **à faire (hors périmètre)** |
| Capability Associated Domains (`applinks:www.getchair.app`) | gérant + dev, dans Xcode | **oui** | **à faire** |
| Plugin `@capacitor/app` + routage `appUrlOpen` | dev | **oui** | **à faire** |
| Test sur iPhone réel via Messages | gérant | — | **à faire** |
