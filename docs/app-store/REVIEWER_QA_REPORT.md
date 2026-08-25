# CHAIR CLIENT — Rapport de review App Store (simulation reviewer hostile)

**Date du test** : 24 août 2026
**Cible** : CHAIR CLIENT — bundle `app.getchair.client`, WebView Capacitor `server.url = https://www.getchair.app/app`
**Méthode** : parcours réel dans le navigateur piloté, viewports 375×812 / 320×568 / 1366×1024, localStorage vidé, compte de test créé puis supprimé, vérifications en base et en `curl`.
**Posture** : reviewer qui découvre l'app et cherche un motif de refus.

> Toutes les citations de règles proviennent de `developer.apple.com/app-store/review/guidelines` (vérifiées le jour du test).

---

## 0. Synthèse

| Gravité | Nombre |
|---|---|
| BLOCKER | 3 (dont **1 corrigé pendant le test**) |
| HIGH | 5 |
| MEDIUM | 9 |
| LOW | 9 |

**Ce qui passerait la review sans discussion** : la réservation de bout en bout (y compris reprise après inscription), la suppression de compte, la mention « aucun paiement dans l'application », les fonctions signaler/bloquer, le comportement en cas de refus de géolocalisation.

**Ce qui ferait refuser l'app aujourd'hui** : l'app se décrit elle-même comme non terminée (« Bientôt sur l'App Store », « L'application est en cours de déploiement ») sur des écrans atteignables en 3 taps depuis l'app ; les CGU déclarent la réservation non disponible alors qu'elle marche ; l'aide de l'app documente une annulation de rendez-vous qui n'existe ni en UI ni en API.

**Avertissement de fraîcheur** : plusieurs fichiers de mon périmètre de test ont été modifiés par des agents parallèles **pendant** la session (géolocalisation, bandeau de stockage local, signalement/blocage, politique de confidentialité, `Info.plist`). Les constats datés le précisent. Un re-test complet est nécessaire après stabilisation.

---

## 1. BLOCKERS

### B1 — L'app affiche « Bientôt sur l'App Store » et « L'application est en cours de déploiement » à l'intérieur d'elle-même
**Guideline** : 2.1 App Completeness · 4.2 « Your app should include features, content, and UI that elevate it beyond a repackaged website. »
**Gravité** : BLOCKER

**Reproduction (dans l'app iOS, 3 taps)**
1. Ouvrir n'importe quel lien profond mort — ex. `/app/coiffeur/ce-slug-nexiste-pas`. La page 404 s'affiche.
2. Taper « Retour à l'accueil ». Le seul lien de cette page pointe vers `/` — **le site vitrine**, pas `/app`.
3. Sur `/`, taper « Télécharger l'application » (`/download`).

**Ce que voit le reviewer sur `/download`, dans l'app** :
> « CHAIR est une application mobile — L'expérience complète … se vit sur l'app. Téléchargez-la pour continuer. »
> « **Bientôt sur l'App Store et Google Play** »
> « **L'application est en cours de déploiement.** »
> « Me prévenir de la sortie »

**Fichiers** :
- `frontend/app/not-found.tsx:16` — unique lien de sortie de la page 404 : `href="/"` (vérifié : c'est le seul `<a>` de la page).
- `frontend/components/ui/AppDownload.tsx:58` — « L'application est en cours de déploiement. »
- `frontend/app/download/page.tsx` — aucun garde natif.
- `frontend/app/page.tsx`, `frontend/app/contact/page.tsx` — aucun garde natif non plus.

**Vérifié** : `grep -n "isNativeApp\|Capacitor" frontend/app/download/page.tsx frontend/app/page.tsx frontend/app/contact/page.tsx` ne renvoie **rien**. `AppBanner` et `CookieBanner` sont, eux, correctement gardés par `isNativeApp()` — ces trois pages ne le sont pas.

**Pourquoi c'est bloquant** : un reviewer qui lit « en cours de déploiement » dans l'app conclut que la build n'est pas terminée. C'est le motif de rejet 2.1 le plus courant. S'y ajoute 4.2 : le pied de page marketing atteint depuis l'app propose « Télécharger CHAIR », « Utiliser la version web », « Découvrir CHAIR PRO », et la 404 éjecte vers la vitrine sans barre d'onglets ni retour.

**Correctif attendu** : faire pointer la 404 de `/app/*` vers `/app` ; garder `/download` et les CTA « Télécharger » derrière `isNativeApp()` ; supprimer « en cours de déploiement » partout.

---

### B2 — Les CGU déclarent la réservation « en cours de déploiement » alors qu'elle fonctionne
**Guideline** : 2.1 App Completeness · 5.1.1(i) (documents publiés dans l'app doivent être exacts)
**Gravité** : BLOCKER

**Reproduction** : Compte → Conditions d'utilisation → §3 et §7.

- `frontend/app/cgu/page.tsx:81` : « Réserver des rendez-vous **(fonctionnalité en cours de déploiement)** »
- `frontend/app/cgu/page.tsx:141` : « La fonctionnalité de réservation en ligne **est en cours de déploiement. Lorsqu'elle sera disponible :** »

**Contradiction prouvée** : j'ai réservé un vrai rendez-vous pendant ce test (Lina Silva, « Coiffure de soirée », mercredi 26 août, 14:30) — confirmé en base (`appointments` id 133, `status = confirmed`).

**Aggravant** : les CGU §7 disent aussi « Achats in-app : … les achats sont traités via l'App Store d'Apple », alors que la politique de confidentialité §5 indique Stripe pour les abonnements CHAIR PRO. Les deux documents de l'app se contredisent sur le mode de paiement — sujet exactement couvert par 3.1.1. À corriger avant soumission même si le CLIENT ne vend rien.

---

### B3 — La localisation était demandée au lancement, en contradiction avec la politique de confidentialité — **CORRIGÉ PENDANT LE TEST**
**Guideline** : 5.1.1(i) « …must identify what data… », 5.1.2 Data Use and Sharing · HIG (permission demandée en contexte)
**Gravité** : BLOCKER à 11h00 → **résolu à 12h15** par un agent parallèle. Conservé ici pour traçabilité et parce qu'il doit être re-testé sur device.

**Ce que disait la politique** (`/confidentialite` §4, version 1.1 du 24/08/2026) :
> « La position GPS n'est demandée que sur l'écran de recherche, au moment où la distance sert réellement à classer les résultats — **jamais au lancement de l'application**. »
> « La demande système n'apparaît **qu'après une action explicite de ta part** (bouton « Autoriser la localisation » ou « Utiliser ma position »). »

**Ce que faisait le code** — `frontend/components/ui/GeoPermissionModal.tsx:34-48` (version observée à 11h00) :
```
useEffect(() => {
  if (!hasGeoBeenAsked()) {
    const timer = setTimeout(() => {
      markGeoAsked();
      if (isNativeApp()) {
        // App native : la popup système iOS suffit…
        requestAndStore();      // ← déclenche l'alerte iOS SANS action utilisateur
      } else {
        setVisible(true);
      }
    }, 1500);
```
`GeoPermissionModal` est monté dans `AppShell` (`frontend/components/layout/AppShell.tsx:38`), donc **sur la home `/app`**, pas sur l'écran de recherche. Dans l'app native, 1 500 ms après l'arrivée sur la home, l'alerte système iOS « CHAIR souhaite utiliser votre position » s'affiche sans que l'utilisateur ait rien fait.

**Pourquoi c'est bloquant** : le reviewer voit l'alerte au lancement, ouvre la politique de confidentialité liée dans l'app, y lit « jamais au lancement ». C'est une déclaration de confidentialité démentie par le comportement observable — motif 5.1.1/5.1.2 direct, et le plus difficile à défendre en appel.

**Correctif observé à 12h15** (`frontend/components/ui/GeoPermissionModal.tsx`, réécrit) — **vérifié en relisant le fichier** :
```
const GEO_RELEVANT_PATH = '/app/recherche';
const SOFT_ASK_DELAY_MS = 1_800;
…
useEffect(() => {
  if (pathname !== GEO_RELEVANT_PATH) return;            // ① plus jamais sur la home
  if (hasGeoBeenAsked() || getStoredLocation()) return;
  getGeoPermissionState().then((state) => {
    if (state === 'granted' || state === 'denied') { markGeoAsked(); return; }  // ② pas d'écran inutile
    timer = setTimeout(() => { markGeoAsked(); setVisible(true); }, SOFT_ASK_DELAY_MS);
  });
}, [pathname]);
…
async function allow() { setVisible(false); await requestAndStore(); }   // ③ alerte iOS sur tap explicite
```
La branche `if (isNativeApp()) requestAndStore()` a disparu : l'alerte système n'est plus déclenchée que par le tap sur « Autoriser », sur l'écran de recherche uniquement. **Le comportement correspond désormais au texte de `/confidentialite` §4.**

La copie de la modale a également été corrigée : l'ancien titre « **CHAIR souhaite accéder à votre position** » (qui imitait le libellé de l'alerte système iOS) et la mention de marques tierces « **comme Airbnb ou Uber** » ont été remplacés par « Trouver les coiffeurs autour de toi » / « Avec ta position, la recherche classe les coiffeurs du plus proche au plus loin. » Deux risques annexes levés au passage.

**Reste à faire** : re-tester sur device réel après build, et confirmer qu'aucun autre point d'entrée n'appelle `requestBrowserGeolocation()` au montage.

---

## 2. HIGH

### H1 — L'aide de l'app décrit une annulation de réservation qui n'existe pas
**Guideline** : 2.1 App Completeness
**Gravité** : HIGH

**Reproduction** : Compte → Aide & Support → « Comment annuler une réservation ? »
> « Rends-toi dans Compte → Mes réservations, sélectionne le rendez-vous et appuie sur **Annuler**. »

**Constat** : sur `/app/compte`, la carte de réservation ne propose que « Voir le profil du coiffeur ». Relevé programmatique des boutons de la page : `["Déconnexion", "Se déconnecter"]`, et `/Annuler/.test(document.body.innerText) === false`.

**Confirmé côté API** : `backend/routes/api.php` — le groupe client (l. 323-324) n'expose que `GET /my-appointments` et `POST /appointments/{id}/review`. `PUT /appointments/{id}/status` est dans le groupe **coiffeur** (l. 317-319). **Un client ne peut pas annuler, ni par l'UI ni par l'API.**

Un reviewer qui réserve puis suit l'aide de l'app pour annuler ne trouve rien. Ajouter le bouton, ou retirer la promesse de la FAQ.

---

### H2 — Cible iPad déclarée (`TARGETED_DEVICE_FAMILY = "1,2"`) sans aucun design iPad
**Guideline** : 2.4.1 · 4.0 Design · 4.2
**Gravité** : HIGH

`frontend/ios/App/App.xcodeproj/project.pbxproj:312,333` → `TARGETED_DEVICE_FAMILY = "1,2"`, et `Info.plist` autorise les **4 orientations** sur iPad.

**Testé à 1366×1024** : l'app bascule sur la mise en page **desktop du site vitrine** — barre de navigation haute « Découvrir / Rechercher / Favoris / Connexion / S'inscrire », pied de page web, et non l'UI d'app mobile. C'est littéralement la formulation de 4.2.

Conséquences : le reviewer testera sur iPad ; App Store Connect exigera en plus des captures iPad 13".

**Correctif** : passer à `TARGETED_DEVICE_FAMILY = "1"` (iPhone uniquement) sauf si l'iPad est un objectif produit assumé, auquel cas il faut une vraie mise en page iPad.

---

### H3 — Placeholders « À préciser » visibles dans la politique de confidentialité, renvoyant à des mentions légales inexistantes
**Guideline** : 5.1.1(i) · 2.1
**Gravité** : HIGH

`/confidentialite` §5, tableau des sous-traitants :
| Destinataire | Localisation |
|---|---|
| Hébergeur de l'application et de la base | **À préciser — voir mentions légales** |
| Prestataire d'envoi d'emails | **À préciser — voir mentions légales** |

Deux problèmes cumulés :
1. Texte de remplissage visible par l'utilisateur (2 occurrences confirmées par extraction du DOM).
2. Le renvoi « voir mentions légales » pointe vers une page qui **n'existe pas** — aucune route `/mentions-legales` dans `frontend/app/`.

5.1.1(i) impose d'identifier « the third parties with whom you share user data ». Deux sous-traitants majeurs (hébergeur, e-mail) restent non nommés.

---

### H4 — Aucune identité juridique de l'éditeur nulle part dans l'app
**Guideline** : 5.1.1(i) · 1.2 « Published contact information »
**Gravité** : HIGH — **à fournir par le gérant, je n'invente rien**

`/confidentialite` §1 « Responsable du traitement » ne contient que : `CHAIR` + `hello@getchair.app`.
`/cgu` §1 ne contient que : `getchair.app`, `hello@getchair.app`.

Manquent, et sont exigés (RGPD art. 13, LCEN art. 6-III, et 5.1.1(i)) :
- raison sociale exacte et forme juridique
- SIREN/SIRET
- adresse du siège
- directeur de la publication
- contact DPO (ou mention explicite qu'il n'y en a pas)
- identité et pays de l'hébergeur

Un e-mail seul ne suffit pas pour l'App Privacy Policy Apple ni pour le droit français.

---

### H5 — Trois adresses de contact différentes selon l'écran
**Guideline** : 1.2 « Published contact information so users can easily reach you »
**Gravité** : HIGH (fiabilité perçue) — **arbitrage à faire par le gérant**

| Écran | Adresse |
|---|---|
| `/cgu` §1 et §12, `/confidentialite` §1/§8/§9/§10, feuille de signalement, règles de communauté §3/§6/§10 | `hello@getchair.app` |
| `/app/aide` « Nous contacter », `/app/compte/supprimer`, `/contact`, pied de page desktop | `contact@getchair.app` |
| `/app/aide` « Disponibilité » | « Réponse sous 72h » vs `/contact` « sous 24h en semaine » vs `/cgu` §12 « sous 72 heures ouvrées » |

Il faut une adresse et un délai uniques, et ils doivent correspondre à ce qui sera saisi dans App Store Connect.

---

## 3. MEDIUM

### M1 — Bandeau de stockage local recouvre entièrement le CTA de l'onboarding (web uniquement)
**Gravité** : MEDIUM — **ne concerne pas l'app native**

**Reproduction (mobile web, 375×812 et 320×568)** : vider localStorage, ouvrir `/app`. Le carrousel d'onboarding (`z-[100]`) s'affiche sous le bandeau de stockage local (`z-[9998]`).

Mesure programmatique à 375×812 — bouton « Suivant », rect y 733,5 → 788 : `document.elementFromPoint(187, y)` renvoie le bandeau pour **chacun** des 18 points testés de haut en bas. Le CTA est inatteignable à 100 % tant que le bandeau n'est pas fermé. Idem à 320×568 (« J'ai compris » recouvre « Suivant », et « Politique de confidentialité » recouvre les 4 pastilles de slide).

**Pourquoi ce n'est pas un blocker** : `frontend/components/ui/CookieBanner.tsx:53` — `return !isNativeApp() && !hasStoredAcknowledgement();`. **Vérifié en direct** : après `window.Capacitor = { isNativePlatform: () => true }` + dispatch de l'événement de consentement, le bandeau disparaît et « Suivant » redevient cliquable (`elementFromPoint` renvoie bien le bouton). Le reviewer App Store ne verra pas ce défaut.

Reste à corriger pour le web (getchair.app en Safari mobile), où le premier tap d'un nouveau visiteur ne fait rien.

### M2 — Le bouton « Recentrer sur ma position » ne fait rien et ne dit rien quand la localisation est refusée
**Gravité** : MEDIUM

`frontend/app/app/recherche/page.tsx:248-260` :
```
const ok = await requestGeo();
setLocatingMe(false);
if (ok) { … }
// aucun else : pas de message, pas de toast
```
**Testé** : géolocalisation stubbée en refus permanent, tap sur le bouton (aria-label « Recentrer sur ma position ») → aucun retour visuel, aucun texte d'erreur dans le DOM (`document.body.innerText.match(/indisponible|autoris|refus|erreur/i) === null`). Bouton mort du point de vue de l'utilisateur.

### M3 — Même silence après « Autoriser la localisation » refusé dans la modale maison
**Gravité** : MEDIUM — **toujours vrai après le correctif de B3**

`GeoPermissionModal.tsx` : `async function allow() { setVisible(false); await requestAndStore(); }`, et `requestAndStore()` avale l'erreur (`catch {}` commenté « Refus système ou position indisponible : silencieux et sans conséquence »). **Testé** : la modale se ferme, rien ne se passe, aucune position enregistrée, aucun message. L'utilisateur qui a tapé « Autoriser » puis refusé l'alerte iOS ne sait pas ce qui s'est passé.

### M4 — Le refus de localisation n'est pas rattrapable depuis l'app
**Gravité** : MEDIUM — **partiellement adressé par le correctif de B3**

Une fois `chair_geo_asked = '1'` posé, la modale ne revient jamais. Le nouveau code lit l'état réel de l'autorisation (`getGeoPermissionState()`) et ne réinsiste pas si elle est `denied` — c'est le bon comportement HIG. Reste qu'il n'existe nulle part dans `/app` d'écran expliquant « la localisation est désactivée, tu peux l'activer dans Réglages » : l'utilisateur qui change d'avis n'a aucune indication.

**Atténuation réelle et vérifiée** : l'app reste **entièrement utilisable**. Refus simulé → `/app/recherche` affiche « Toute la France », **81 résultats**, carte chargée, filtres et recherche par ville opérationnels, aucun message d'erreur, aucune boucle de demande. C'est conforme à ce que promet la politique de confidentialité §4. Bon point pour la review.

### M5 — Le sélecteur de ville de la home est masqué aux visiteurs sans compte
**Gravité** : MEDIUM

`frontend/components/ui/LocationBar.tsx:25` → `if (!user) return null;`
Un visiteur qui a refusé la localisation n'a **aucun moyen** de définir une ville depuis la home ; tout le filtrage géo de `/app` reste non paramétrable. Le contournement existe (`/app/recherche` → champ « Ville ou code postal », accessible sans compte, vérifié) mais rien ne l'indique sur la home.

### M6 — Le signalement est impossible sans compte, et la feuille n'offre pas de lien de connexion
**Guideline** : 1.2 « A mechanism to report offensive content »
**Gravité** : MEDIUM

**Testé déconnecté** : `/app/realisation/595` → « Signaler ou bloquer » → « Signaler cette réalisation ». La feuille s'ouvre, affiche les 6 motifs, et : « Connecte-toi pour envoyer un signalement. Tu peux aussi nous écrire à hello@getchair.app. » Le bouton « Envoyer le signalement » reste `disabled = true` même après sélection d'un motif — pas de bouton mort, bon comportement.

**Défaut** : aucun bouton « Se connecter » dans la feuille. L'utilisateur doit la fermer et trouver la connexion seul. Ajouter un CTA direct.

Le repli e-mail rend la conformité 1.2 défendable, mais un reviewer sans compte ne pourra pas exercer la fonction.

### M7 — Aucune option signaler/bloquer sur les fiches salon
**Guideline** : 1.2
**Gravité** : MEDIUM

**Testé** : `/app/salon/hair-factory` — boutons présents : `["Retour", "Déconnexion"]`. Aucun « … », aucun signalement.
Or les salons publient une description libre (« Salon Hair Factory à Lyon — une équipe passionnée… ») et une bannière : c'est bien de l'UGC. Les règles de communauté §6 affirment pourtant : « Chaque réalisation, chaque avis et chaque fiche coiffeur porte un bouton « … » ». Les salons sont le trou dans la couverture.

*(Couverture vérifiée OK par ailleurs : réalisation, fiche coiffeur, avis — voir §5.)*

### M8 — La CHAIR PRO est entièrement atteignable depuis l'app CLIENT
**Guideline** : 4.2 · 3.1.1(a) (risque conditionnel)
**Gravité** : MEDIUM

Chemins vérifiés depuis l'app CLIENT :
- `/app/compte` → « Devenir coiffeur sur CHAIR — *Sur l'app CHAIR PRO, séparée* » → `/pro/inscription`
- home `/app` → bloc « Vous êtes coiffeur ? » → « Créer mon profil gratuit » → `/pro/inscription`
- `/contact` (pied de page) → « Découvrir CHAIR PRO » / « Connexion CHAIR PRO »

`/pro/inscription` s'ouvre **dans la même WebView** (même host, autorisé par `allowNavigation`) et affiche l'onboarding complet de l'autre produit, bannière comprise (« Ouvrir dans l'app CHAIR PRO »).

**Bon point vérifié** : `/pro/chair-plus` redirige un compte `role = client` vers `/app`, et redirige vers `/pro/connexion` un visiteur déconnecté. Aucun tarif, aucun CTA d'achat, aucun lien Stripe atteignable depuis la session cliente (`innerText.match(/€/)` = null sur les deux essais). **3.1.1(a) n'est donc pas déclenché aujourd'hui.**

**Risque résiduel** : un reviewer peut créer un compte coiffeur depuis l'app CLIENT et arriver, de là, sur un paywall d'abonnement pro. Si ce paywall expose un paiement Stripe, la France étant concernée par 3.1.1(a) (« apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase »), l'app CLIENT devient le chemin d'accès à un achat hors IAP. **À faire vérifier par l'agent CHAIR PRO.**

### M9 — Après suppression du compte, l'app affiche « Ta session a expiré, reconnecte-toi pour continuer »
**Guideline** : 5.1.1(v)
**Gravité** : MEDIUM

**Testé de bout en bout** : après confirmation, l'écran « Compte supprimé » s'affiche correctement, puis redirection automatique vers `/connexion` — qui affiche « Content de te revoir. **Ta session a expiré, reconnecte-toi pour continuer.** »

Le message est faux et anxiogène : l'utilisateur vient de supprimer son compte, on lui dit que sa session a expiré et on l'invite à se reconnecter. Un reviewer peut y lire un échec de la suppression. Message dédié attendu (« Ton compte a été supprimé. »).

---

## 4. LOW

### L1 — `GET /api/mapkit-token` renvoie 501 à chaque ouverture de carte
`curl http://localhost:8000/api/mapkit-token` → `HTTP 501 {"message":"MapKit non configuré."}`. Neuf 501 relevés dans la console pendant le test. Le script `https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js` est chargé quand même, puis l'app se rabat sur Leaflet/CARTO — la carte **fonctionne** (81 marqueurs, tuiles `basemaps.cartocdn.com` en 200). À vérifier avant prod : si MapKit reste non configuré, ne pas charger le script et ne pas appeler l'endpoint. Cohérence à revoir avec `/confidentialite` §5 qui liste Apple MapKit JS comme destinataire de données.

### L2 — `GET /api/stories/feed` renvoie 401 (×2) sur la home d'un visiteur déconnecté
`StoriesBar` appelle un endpoint authentifié sans jeton. Deux erreurs 401 dans la console dès l'ouverture de `/app`. Invisible pour l'utilisateur, mais visible dans l'inspecteur Safari du reviewer.

### L3 — Warning React `Each child in a list should have a unique "key" prop` dans `PublicProfileTabs`
Relevé 2 fois sur `/app/coiffeur/[slug]` (« It was passed a child from HairdresserProfilePage »).

### L4 — Tutoiement / vouvoiement mélangés (violation de la DA CHAIR)
Le brief impose le tutoiement côté client. Relevés :
- Onboarding : « Trouve le coiffeur qui te correspond », « ton style » → **tu**
- Home `/app` : « Le bon coiffeur, selon **votre** style », « **Créez** un compte gratuit » → **vous**
- `/app/favoris` : « **Vos** favoris **vous** attendent — **Connectez-vous** » → **vous**
- `/app/classements` : « **Découvrez** les professionnels… » → **vous**
- Inscription : titre « **Ton** adresse e-mail ? » mais placeholder « **vous**@email.fr »
- Confirmation de signalement : « **votre** signalement a été transmis », « **Nous** examinons » — alors que la même feuille disait « **Ton** signalement est confidentiel »
- `LocationBar` : « **Votre** ville », « près de chez **vous** »

### L5 — Compteurs sous-évalués sur la home
Bloc final : « **10+** coiffeurs · **24+** réalisations · Avis certifiés ». Ces valeurs viennent de `featuredHD.length` et `trendingPosts.length` (`frontend/app/app/page.tsx:175-176`), donc des limites de section, pas de la base — qui contient 69 coiffeurs et 12 salons (« 81 résultats » sur `/app/recherche`). Chiffre trompeur à la baisse.

### L6 — Coquilles et typographie
- Règles de communauté §7 : « l'option **Bloquerretire** immédiatement » (espace manquant)
- Étape de confirmation : « Tu régleras les **55€** » vs « **55 €** » partout ailleurs (espace insécable manquant avant €)

### L7 — `Info.plist` : `UIRequiredDeviceCapabilities = armv7`, et `ITSAppUsesNonExemptEncryption` absent
`frontend/ios/App/App/Info.plist`. `armv7` est un reliquat de template (les apps sont arm64 depuis iOS 11). L'absence de `ITSAppUsesNonExemptEncryption` déclenchera la question de conformité export à chaque upload. Ni l'un ni l'autre ne bloque la review, mais ce sont deux frictions évitables.

### L8 — Sélecteur de genre avec glyphes Unicode plutôt que des icônes Lucide
`/app/compte/modifier` → « GENRE » : `♀ Femme`, `♂ Homme`, `⊛ Non-binaire`, `· Je préfère ne pas dire`. La DA CHAIR impose « aucun emoji dans l'UI, icônes Lucide ».

### L9 — Redirection brutale vers `/connexion` sur `/app/inspirations` et `/app/objectifs`
Testé déconnecté : ces deux routes éjectent vers `/connexion` sans explication, alors que `/app/favoris` et `/app/notifications` affichent un écran d'invitation soigné (« Vos favoris vous attendent », « Reste informé »). Incohérence de traitement. Faible impact : ces routes ne sont pas dans la barre d'onglets.

---

## 5. Ce qui est CONFORME (vérifié, à ne pas casser)

### 5.1 — Réservation complète sans compte au départ — **PASSE**
Parcours joué intégralement à 375×812, `localStorage` vide, sans compte :
1. `/app/coiffeur/lina-silva` → « Réserver un rendez-vous »
2. Étape 1/6 Catégorie → « Coiffage & Événementiel »
3. Étape 2/6 Prestation → « Coiffure de soirée · 60 min · 55 € »
4. Étape 3/6 Date → calendrier, jours disponibles réellement activés (25→29 août ; les autres `disabled`)
5. Étape 4/6 Créneau → 18 créneaux de 09:00 à 17:30, choix 14:30
6. Étape 5/6 « **Connexion requise** » → « Ta sélection est gardée en mémoire, tu reprendras exactement où tu en étais »
7. « Créer un compte » → `/inscription?returnTo=%2Fapp%2Fcoiffeur%2Flina-silva`, intent persisté :
   `{"hairdresserSlug":"lina-silva","serviceId":373,"categoryId":185,"date":"2026-08-26","time":"14:30",...}`
8. Assistant d'inscription en 5 écrans (nom → ville avec autocomplétion → e-mail → téléphone facultatif → mot de passe), CGU + Politique de confidentialité liées sur le dernier écran
9. Retour sur la fiche → **la feuille se rouvre automatiquement à « Étape 3 sur 4 · Coordonnées »**, prestation, date et créneau restaurés. Reproduit 2 fois de suite. Aucun dead end.
10. Confirmation → « Rendez-vous confirmé », rendez-vous réellement créé (`appointments` id 133, `confirmed`)

`frontend/lib/bookingIntent.ts` + `frontend/components/ui/BookingResume.tsx` gèrent aussi proprement le créneau parti entre-temps (message doux, retour à l'étape date). C'est du très bon travail — c'est le parcours que le reviewer testera en priorité.

### 5.2 — Paiement hors application — **PASSE, et bien fait**
**Guideline 3.1.3(e)** : les biens et services physiques consommés hors de l'app se paient hors achat intégré. Écran de confirmation :
> « Prix de la prestation — **À régler sur place, au salon** — 55 € »
> « **Aucun paiement dans l'application** — Tu régleras les 55€ directement à ton coiffeur, le jour du rendez-vous. Aucune carte n'est demandée maintenant, rien ne sera débité. »

Écran de succès : « Paiement — Sur place, au salon. Aucun montant n'a été débité. »
Aucun champ carte, aucun SDK de paiement, aucun lien d'achat externe dans toute l'app CLIENT (`grep` Stripe/PremiumLockCard : `PremiumLockCard` (`href="/pro/chair-plus"`) n'est utilisé nulle part sous `/app`, seul `PremiumBadge` l'est, dans `/app/classements`). Formulation à conserver telle quelle : elle désamorce la question 3.1.1 avant qu'elle soit posée.

### 5.3 — Suppression de compte — **PASSE**
**Guideline 5.1.1(v)** : « If your app supports account creation, you must also offer account deletion within the app. »

Chemin : lancement → onglet **Compte** (1 tap) → « **Supprimer mon compte** » en bas de page (2 taps) → saisie « SUPPRIMER » → confirmation. **2 taps pour trouver l'écran**, pas de menu caché, pas de renvoi vers un e-mail ou un site web.

L'écran énumère honnêtement les effets, dit « Tout se passe immédiatement », et distingue ce qui subsiste (historique appartenant au professionnel, anonymisé).

Vérifié en base après suppression réelle du compte de test (id 1102) :
| Contrôle | Résultat |
|---|---|
| `name` | `Utilisateur supprimé` |
| `email` | `deleted-1102-1787571663@getchair.invalid` |
| `personal_access_tokens` | **0** |
| `appointments` (client) | **0** |
| `follows` | **0** |
| ancien e-mail encore utilisable | **0 compte** |
| `GET /api/me` avec l'ancien jeton | **401** |
| `POST /api/login` avec l'ancien e-mail | **401 « Identifiants invalides »** |

localStorage (`chair_token`, `chair_user`) purgé. Reconnexion impossible. Conformité pleine (seul bémol : le message de redirection, cf. M9).

### 5.4 — Signaler / bloquer — **PASSE** (livré pendant le test par l'agent parallèle)
**Guideline 1.2** : filtrage, mécanisme de signalement + réponse rapide, blocage des utilisateurs abusifs, contact publié.

| Exigence 1.2 | État | Preuve |
|---|---|---|
| Filtrage / règles publiées | OK | `/app/regles-communaute` — 10 sections de contenu réel (droit à l'image, mineurs, PI, sanctions, LCEN). Aucun lorem. |
| Mécanisme de signalement | OK | Bouton « … » sur réalisation, fiche coiffeur (« Signaler ou bloquer Lina Silva ») et avis (« Signaler un avis », avec sélecteur de l'avis visé). 6 motifs + détails 0/1000. |
| Signalement effectivement enregistré | OK | Envoi réel → 1 ligne dans `reports` : `type=post, content_id=595, reported_user_id=1079, reporter_id=…, reason=Harcèlement`. Alimente la file admin existante `/admin/moderation?tab=signalements`. |
| Délai de traitement annoncé | OK | « examiné sous 72 heures », cohérent CGU §4 / règles §6 / feuille de signalement. |
| Blocage | OK | « Bloquer Camille Klein » → feuille explicative honnête → 1 ligne dans `user_blocks`. |
| Déblocage | OK | `/app/regles-communaute` §9 « Comptes que tu as bloqués » — liste + bouton « Débloquer » fonctionnel. |
| Contact publié | OK mais incohérent | voir H5. |

Restrictions : pas de signalement sans compte (M6), pas de signalement sur fiche salon (M7).

### 5.5 — Protection contre le double tap — **PASSE (3/3)**
Trois taps consécutifs immédiats sur chaque action critique, puis vérification en base :

| Action | Résultat |
|---|---|
| « Confirmer le rendez-vous » | **1** rendez-vous (`appointments` id 133) — 2 réponses `409 Conflict` côté serveur en plus du garde client |
| « S'abonner » | **1** ligne `follows` |
| « Envoyer le signalement » | **1** ligne `reports` |
| « Bloquer ce compte » | **1** ligne `user_blocks` |

Le bouton d'envoi de signalement est correctement `disabled` tant qu'aucun motif n'est choisi, et tant que l'utilisateur n'est pas connecté. Aucun double effet constaté.

### 5.6 — Découverte sans compte — **PASSE**
`/app` sans compte : ~2 990 px de contenu réel (Pour vous, raccourcis spécialité, Coup de cœur ×10, Classement top 5 avec notes et nombre d'avis, Réalisations ×9, Nouveaux talents ×6). Aucun écran blanc, aucun spinner infini, aucun mur de compte prématuré. Recherche, carte, fiches coiffeur, fiches salon, réalisations, feed, classements et recrutement sont tous consultables sans compte.

Pas de connexion tierce (Google/Facebook/Apple) dans l'app : **4.8 ne s'applique pas** — l'app « exclusively uses your company's own account setup and sign-in systems ».

### 5.7 — Permissions iOS — cohérentes avec l'usage réel
`Info.plist` déclare 3 chaînes, toutes en français explicite, et toutes justifiées :
- `NSLocationWhenInUseUsageDescription` → `@capacitor/geolocation`, usage foreground uniquement, confirmé par le code.
- `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` → justifiées par `<input type="file" accept="image/*">` sur `/app/compte/modifier` (vérifié dans le DOM), que WKWebView présente avec « Prendre une photo / Photothèque ».

Aucune permission déclarée sans usage. Pas de push (pas d'`aps-environment`, pas de plugin push), cohérent avec `/confidentialite` §12 « Cette version de l'application n'envoie pas de notifications push système ».

### 5.8 — Bandeaux web correctement neutralisés dans l'app native
- `AppBanner` (« Ouvrir dans l'app CHAIR ») — `components/ui/AppBanner.tsx:17` : `if (isNativeApp()) return false;`
- `CookieBanner` — `components/ui/CookieBanner.tsx:53` : `!isNativeApp() && !hasStoredAcknowledgement()`
Testé en simulant `window.Capacitor.isNativePlatform() === true` : le bandeau disparaît et le CTA sous-jacent redevient cliquable. Le reviewer ne verra ni l'un ni l'autre. (Ce garde manque en revanche sur `/`, `/download` et `/contact` — cf. B1.)

### 5.9 — Autres contrôles passés
- **404** : page propre, en français, sans jargon technique (mais mauvais lien de sortie, cf. B1).
- **Pas de message technique en anglais** exposé : aucun `500`, `SQLSTATE`, `AxiosError` ou `undefined` visible pendant tout le parcours.
- **Pas de placeholder** dans la surface CLIENT : `grep -rniE "lorem|TODO|FIXME|coming soon|test@|example\.com|XXXX"` sur `app/app`, `app/cgu`, `app/confidentialite`, `app/download`, `app/contact`, `components/ui`, `components/search` → 3 résultats seulement, tous « en cours de déploiement » (cf. B1/B2).
- **Débordement horizontal** : `document.documentElement.scrollWidth === window.innerWidth` à 375, 320 et 1366 px. Aucun scroll horizontal.
- **Cibles tactiles de la barre d'onglets** : 75×60 px, conformes.
- **CTA « Réserver un rendez-vous »** : rect y 688→734 avec barre d'onglets à y 752 — pas de recouvrement, `elementFromPoint` renvoie bien le bouton.
- **Page contact** : formulaire réellement branché (`api.post('/contact')` → `POST /api/contact`, `backend/routes/api.php:196`), pas un formulaire mort.
- **Liens légaux** : `/cgu` et `/confidentialite` s'affichent intégralement, contenu réel, lien retour « ← Profil » vers `/app/compte`. Aucun 404.

---

## 6. À fournir / arbitrer par le gérant (rien n'a été inventé)

1. **Identité juridique complète** : raison sociale, forme, SIREN/SIRET, adresse du siège, directeur de la publication. À insérer dans `/cgu` §1 et `/confidentialite` §1, et à créer en page `/mentions-legales` (aujourd'hui référencée mais inexistante). *(H3, H4)*
2. **Hébergeur** : nom, pays, coordonnées — remplace « À préciser » dans `/confidentialite` §5. *(H3)*
3. **Prestataire d'envoi d'e-mails** : nom et localisation — remplace le second « À préciser ». *(H3)*
4. **DPO** : contact, ou décision explicite de ne pas en désigner.
5. **Adresse de contact unique** : trancher entre `hello@` et `contact@`, et aligner le délai de réponse annoncé (24 h vs 72 h vs 72 h ouvrées) partout, y compris dans App Store Connect. *(H5)*
6. **iPad** : décider si CHAIR CLIENT cible l'iPad. Si non → `TARGETED_DEVICE_FAMILY = "1"`. Si oui → prévoir une vraie mise en page iPad et les captures 13". *(H2)*
7. **MapKit JS** : sera-t-il configuré en production ? Si non, retirer Apple MapKit du tableau des sous-traitants de `/confidentialite` §5 et cesser de charger le script. *(L1)*
8. **Paiement CHAIR PRO** : confirmer avec l'agent CHAIR PRO qu'aucun paiement Stripe n'est atteignable depuis une session initiée dans l'app CLIENT, et aligner les CGU §7 (qui annoncent l'App Store) avec la réalité (Stripe). *(B2, M8)*
9. **Âge minimum** : les CGU §2 ouvrent l'accès aux mineurs avec autorisation parentale. Vérifier la cohérence avec la classification d'âge déclarée dans App Store Connect.
10. **Politique d'annulation client** : décider si le client peut annuler. Si oui → ouvrir une route API client et ajouter le bouton. Si non → retirer la promesse de la FAQ de l'app. *(H1)*

---

## 7. Ordre de correction recommandé

1. **B1** — retirer « en cours de déploiement » / « Bientôt sur l'App Store » de tout ce qui est atteignable depuis l'app ; 404 de `/app/*` → `/app` ; garder `/download` derrière `isNativeApp()`.
2. **B2** — réécrire CGU §3 et §7 (la réservation existe) et trancher la question du paiement des abonnements pro.
3. ~~**B3** — géolocalisation~~ **fait pendant le test** ; à re-tester sur device.
4. **H1** — annulation de réservation : l'implémenter ou retirer la promesse.
5. **H2** — `TARGETED_DEVICE_FAMILY = "1"`.
6. **H3 / H4 / H5** — mentions légales, sous-traitants nommés, adresse de contact unique (dépend du gérant).
7. **M1 → M9**, puis les LOW.

---

## 8. Traçabilité du test

- **Périmètre** : lecture seule + création de ce fichier. **Aucun fichier de code modifié**, aucun commit, aucun push.
- **Serveur dev** : le port 3000 n'écoutait pas au démarrage de la mission ; `npm run dev` lancé en arrière-plan depuis `frontend/` pour permettre le test. À arrêter si besoin.
- **Comptes de test** : `qa-appstore-review@chair-qa.test` (id 1102) et `qa-appstore-review2@chair-qa.test` (id 1105), créés via `php artisan tinker`, jetons nommés `reviewer-qa`.
- **Nettoyage effectué et vérifié** :
  `{"users_left":0,"tokens_left":0,"reports_left":0,"blocks_left":0,"appts_left":0,"qa_emails":0}`
  — comptes, jetons `reviewer-qa`, rendez-vous (dont id 133), abonnements, signalement (id 4) et blocage (id 2) supprimés. `localStorage` et `sessionStorage` du navigateur vidés.
- **Note** : `frontend/components/ui/CookieBanner.tsx`, la fonctionnalité signaler/bloquer et `/app/regles-communaute` ont été livrés par un agent parallèle **pendant** ce test. Les constats les concernant portent sur l'état à 12h00 le 24/08/2026 et méritent un re-test après stabilisation.
