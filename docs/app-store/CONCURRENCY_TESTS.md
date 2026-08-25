# Tests de concurrence, filtre par champ et throttling — preuves d'exécution

Exécutés le 25/08/2026 en local (MySQL réel, API Laravel sur `php artisan serve`).
Points couverts : 12 (QA modération), 13 (filtre par champ), 25 (annulation),
43 (double réservation), 44 (courses concurrentes), 45 (throttling).

**Méthode de concurrence** : le serveur PHP intégré de Windows étant
mono-processus (`PHP_CLI_SERVER_WORKERS` y est sans effet), chaque test de
course lance DEUX instances `php artisan serve` (ports 8000 et 8001) et envoie
les deux requêtes en parallèle, une par instance — deux vrais processus PHP,
deux connexions MySQL simultanées. Les données de test (comptes QA, tokens,
RDV, signalements, blocages, notifications) ont toutes été nettoyées après
exécution, compteurs de popularité compris.

---

## 1. Filtre de contenu par champ (point 13)

Le filtre (`app/Services/ContentFilter.php`) a deux volets : insultes/haine et
coordonnées en clair. Où il est branché, vérifié dans le code :

| Contenu | Endpoint | Volet appliqué |
|---|---|---|
| Avis (3 dépôts) | `POST /appointments/{id}/review`, `POST /review-by-token/{token}`, dépôt via visite (`VisitController`) | insultes + coordonnées (`check()`) |
| Légende de réalisation (4 dépôts) | `PostController` store/update (×2 modes) | insultes + coordonnées (`check()`) |
| **Bio / tagline pro** | `PUT /profile` (`ProfileController::update`) | **insultes UNIQUEMENT** (`checkOffensiveOnly()`, message vouvoyé) |
| Champs structurés (`work_address`, `instagram_url`, `booking_url`, `city`…) | `PUT /profile` | **aucun filtre** — validations dédiées (`url`, `starts_with:https://`, `max`) |

Justification de l'asymétrie : un coiffeur met légitimement son téléphone ou
son Instagram dans sa bio (outil de travail) ; le volet « coordonnées » ne vaut
que pour les contenus où un utilisateur s'adresse aux autres (avis, légendes).
Une adresse postale déclencherait par nature le motif « contact ».

Preuves HTTP (`PUT /profile`, token pro réel) :

| Test | Corps | Attendu | Obtenu |
|---|---|---|---|
| Bio avec téléphone + e-mail + lien Instagram | `"Réservations au 06 12 34 56 78 ou par mail pro@salon-test.fr — retrouve-moi sur www.instagram.com/juliencoiffure"` | 200 | **200** |
| Bio avec insulte pluriel maquillée | `"Je ne travaille pas avec les c.o-n*n4rds"` | 422 | **422** `{"message":"Ce texte contient des termes…","field":"bio"}` |
| Tagline avec insulte en clair | `"La meilleure salope de coupe"` | 422 | **422** (`field: tagline`, message vouvoyé) |
| Adresse de travail normale | `"12 rue de la République, 67500 Haguenau"` | 200 | **200** |
| Vocabulaire coiffure (anti faux positif) | `"Queue de cheval, bordures nettes"` | 200 | **200** |

### Bug trouvé et corrigé pendant ces tests

Le **pluriel maquillé** échappait au filtre : `c.o-n*n4rds` → normalisé en
`c o n nards`, et le fragment « nards » (5 lettres) dépassait la borne de
recollage de 4 lettres. Constaté en HTTP réel : la bio passait en 200.
Correctif dans `ContentFilter::normalize()` : le fragment recollé tolère un
« s » final au-delà de la borne (`[a-z]{2,4}s?`). Seul « s » — pas « e », qui
recollerait des mots français banals (« cette », « notre ») après des lettres
épelées. Re-testé : 422. Batterie de non-régression (tinker, 15 cas insultes
maquillées / pluriels épelés / textes légitimes / coordonnées) : 15/15.

---

## 2. QA modération bout en bout (point 12)

Un signalement par type via `POST /reports` (token client QA), puis lecture
par la vraie requête admin :

| Étape | Résultat |
|---|---|
| `POST /reports {type:"post", content_id:436, reason:"inappropriate"}` | **201**, `report_id: 5` |
| `POST /reports {type:"review", content_id:384, reason:"harassment"}` | **201**, `report_id: 6` |
| `POST /reports {type:"profile", content_id:8, reason:"misleading"}` | **201**, `report_id: 7` (normalisé `type:"user"`, `reported_user_id` résolu côté serveur = 24) |
| `GET /admin/reports` (compte admin Sanctum réel) | **200**, les 3 en tête de file, motifs en français (« Contenu inapproprié », « Harcèlement », « Contenu trompeur »), auteurs résolus |
| `POST /admin/reports/5/ignore` | **200** `{"ok":true}` |
| `GET /admin/reports` après traitement | le n° 5 a disparu de la file (total 2) |
| État en base du n° 5 | `resolution: "ignored"`, `resolved_at` posé, `resolved_by: 738` |

---

## 3. Double réservation simultanée (point 43)

`POST /appointments` × 2 en parallèle (2 processus serveur), même coiffeur,
même service, même créneau (`2026-09-02 16:00`) :

| Requête | Réponse |
|---|---|
| A (port 8000) | **201** — rendez-vous créé |
| B (port 8001) | **409** — `"Ce créneau vient d'être pris. Veuillez en choisir un autre."` |
| Lignes en base pour ce créneau | **1** |

Mécanisme : `DB::transaction` + `lockForUpdate()` sur les RDV du jour, puis
re-validation `SlotGuard` sous verrou (`AppointmentController::store`). Le même
test exécuté sur une seule instance (requêtes sérialisées) donne le même
résultat 201/409.

## 4. Courses concurrentes (point 44)

Chaque cas : deux requêtes strictement parallèles, une par processus serveur.

| Cas | Réponses | État final | Verdict |
|---|---|---|---|
| Double annulation du même RDV | A : **200** `status: cancelled` · B : **422** `"Ce rendez-vous est déjà annulé."` | statut `cancelled`, **1 seule** notification coiffeur | ✅ une seule effective (UPDATE conditionné au statut lu) |
| Double blocage du même compte | A : **201** · B : **201** (idempotent annoncé) | **1 seule** ligne `user_blocks` | ✅ contrainte unique + rattrapage `QueryException` 23000 |
| Double signalement du même contenu | **201** + **409** `"Vous avez déjà signalé ce contenu."` (même `report_id`) | **1 seule** ligne `reports` | ✅ sérialisé par `GET_LOCK` MySQL nommé par triplet (signaleur, type, contenu) |
| Double suppression de compte (`DELETE /account` × 2) | **200** + **200**, aucun 500 | ligne user anonymisée (`Utilisateur supprimé`, e-mail `deleted-…@getchair.invalid`), 0 token restant | ✅ idempotent, état cohérent |

## 5. Annulation client bout en bout (point 25)

Flux complet en curl, token client QA :

1. `POST /appointments` (authentifié) → **201**, `status: confirmed` ;
2. `GET /my-appointments` → le RDV apparaît avec son statut ;
3. `PUT /appointments/{id}/cancel` → **200**, `status: cancelled` ;
4. Re-réservation du même créneau par un autre client → **201** (créneau
   libéré sans écriture supplémentaire : `SlotGuard` ne compte que
   `pending`/`confirmed`) ;
5. Notification coiffeur en base : `appointment_cancelled` — « QA Client Un a
   annulé le 3 septembre à 10h00. Le créneau est libéré. » — **exactement 1**.

Double-tap couvert au § 4 (une seule annulation effective, une seule
notification).

## 6. Throttling des routes client (point 45)

Limites en place (`routes/api.php`), évaluées contre un usage reviewer normal :

| Route | Limite | Évaluation |
|---|---|---|
| `POST /login`, `/register`, `/reset-password` | 6/min | 3-4 erreurs de mot de passe + réussite passent ; brute force bloqué. OK |
| `POST /forgot-password` | 4/min | un humain en envoie 1-2 ; OK |
| `POST /contact` | 5/min | OK |
| `POST /appointments` | 15/min | plusieurs essais de créneaux passent ; OK |
| `PUT /appointments/{id}/cancel` | 20/min | OK |
| `POST /review-by-token/{token}` | 10/min | OK |
| `POST /reports` | 15/h | un reviewer testant 2-3 signalements passe largement ; anti-noyade de la file admin. OK |
| `POST /users/{id}/block` | 30/h (déblocage non throttlé) | OK |
| Géo (`/geo/*`), MapKit token | 30/min | OK |
| `GET /referral-info/{code}` | 20/min | OK |
| `GET /verify-siret` | 10/min | OK |
| Global `throttle:api` | 60/min | navigation normale très en-dessous. OK |

**Aucune limite abaissée ni relevée** : la plus stricte (forgot-password 4/min)
reste au-dessus de tout usage légitime, et toutes les actions de consultation
sont sous le seul plafond global 60/min.

Réponse 429 vérifiée en réel (21ᵉ requête sur `/referral-info` en 1 min) :

```
HTTP/1.1 429 Too Many Requests
Retry-After: 51
{"message":"Trop de requêtes — merci de patienter 52 secondes avant de réessayer."}
```

Message français avec compte à rebours, rendu par `app/Exceptions/Handler.php`
(`TooManyRequestsHttpException`). Condition : la requête doit annoncer
`Accept: application/json` — c'est le cas de tous les appels du frontend
(`lib/api.ts`).

---

## Notes de maintenance

- Pour rejouer un test de course en local Windows : lancer deux serveurs
  (`php artisan serve --port=8000` et `--port=8001`) et envoyer une requête
  sur chaque port avec `curl … & curl … & wait`. Un seul serveur sérialise les
  requêtes et ne teste plus le verrou.
- En production (FPM/Apache multi-processus), ces verrous sont sollicités en
  permanence — les garanties reposent sur MySQL (`lockForUpdate`, contrainte
  unique `user_blocks_pair_unique`, `GET_LOCK`), pas sur le serveur HTTP.
- Les corps d'erreur 4xx en local contiennent `exception`/`file` parce que
  `APP_DEBUG=true` : en production (`APP_DEBUG=false`), seul `message` sort.
