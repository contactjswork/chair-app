# Compte de review Apple — guide de création

Le compte que le reviewer d'Apple utilisera pour tester CHAIR. **Toute la procédure se fait sur
la production** (`api.getchair.app`) : l'app iOS charge `https://www.getchair.app/app`, un compte
créé en local n'existe pas pour Apple.

**Chaque colonne du script ci-dessous a été vérifiée le 24 août 2026 contre le schéma réel**
(migrations + `$fillable` des modèles). Si une migration ultérieure change ces tables, re-vérifier
avant de coller.

---

## 1. Ce qu'il faut créer

| Élément | Valeur |
|---|---|
| Type de compte | **Client** (`role = 'client'`) — le reviewer teste l'app cliente, pas l'espace pro |
| Email | Une adresse dédiée, par exemple `appreview@getchair.app` — **jamais** en `@demo.getchair.app` (voir §5) |
| Mot de passe | Unique, **différent de `chairdemo2026`**, 12 caractères minimum, communiqué uniquement dans App Store Connect |
| Ville | Une ville où la production contient des coiffeurs visibles avec des prestations actives (le script suppose Strasbourg — adapter) |

### Données à préparer sur le compte

Le but : que chaque écran que le reviewer ouvre ait du contenu, et que chaque fonction décrite
dans les notes de review soit testable.

- **3 favoris** — remplit l'onglet favoris du compte
- **1 abonnement** — alimente le fil (`/app/feed`)
- **1 rendez-vous à venir** (`status = 'confirmed'`) — visible dans `/app/compte`, permet de
  tester l'**annulation** (`PUT /appointments/{id}/cancel`)
- **1 rendez-vous passé** (`status = 'completed'`, **sans avis déposé**) — déclenche l'invitation
  à noter (`ReviewPromptTrigger`) et permet au reviewer de **déposer un avis** lui-même
  (`AppointmentController::submitReview` exige : statut `completed`, `client_id` du compte,
  aucun avis existant sur ce rendez-vous)

> Contrainte de schéma à respecter : `reviews` porte un index unique
> (`hairdresser_id`, `client_id`). Un même compte ne peut donc noter chaque coiffeur qu'une
> fois — le rendez-vous passé « avec avis possible » doit viser un coiffeur que le compte n'a
> **pas encore** noté. Le script ci-dessous répartit les rendez-vous sur deux coiffeurs
> différents pour ne jamais buter dessus.

## 2. Script tinker — prêt à coller

À lancer **sur le serveur de production**, après un backup de la base :

```bash
# 1. Sauvegarde préalable — non négociable, la suite écrit en base
mysqldump -u <user> -p <base> > backup-avant-compte-review-$(date +%F).sql

# 2. Ouvrir tinker
cd <racine backend> && php artisan tinker
```

```php
// --- à coller dans tinker, en remplaçant les deux <> ---
use App\Models\User;
use App\Models\HairdresserProfile;
use App\Models\Appointment;
use Illuminate\Support\Facades\DB;

$email = 'appreview@getchair.app';                 // adresse dédiée, HORS @demo.getchair.app
$plain = '<mot de passe unique, 12+ caracteres>';  // à reporter tel quel dans App Store Connect

// users : name, email, password, role, city, latitude, longitude — tous dans $fillable
// (User.php:20-23) ; role enum('client','hairdresser','salon_owner','admin').
// Coordonnées = centroïde de Strasbourg, cohérent avec ce que ferait l'inscription.
$user = User::create([
    'name'      => 'App Review',
    'email'     => $email,
    'password'  => bcrypt($plain),
    'role'      => 'client',
    'city'      => 'Strasbourg',
    'latitude'  => 48.5734,
    'longitude' => 7.7521,
]);

// Trois coiffeurs réels, visibles, avec prestations actives — de préférence dans la ville
// du compte. Si la production n'en a pas 3 à Strasbourg : choisir les slugs à la main.
$pros = HairdresserProfile::whereNotNull('slug')->where('city', 'Strasbourg')->take(3)->get();
if ($pros->count() < 3) { throw new Exception('Moins de 3 profils visibles : choisir les slugs a la main.'); }

// 3 favoris — saved_profiles(user_id, hairdresser_id, created_at), PK composite, pas d'id
foreach ($pros as $p) {
    DB::table('saved_profiles')->insert([
        'user_id' => $user->id, 'hairdresser_id' => $p->id, 'created_at' => now(),
    ]);
}

// 1 abonnement — follows(follower_id, hairdresser_id, created_at), PK composite
DB::table('follows')->insert([
    'follower_id' => $user->id, 'hairdresser_id' => $pros[0]->id, 'created_at' => now(),
]);
// Le compteur affiché sur la fiche du pro :
$pros[0]->increment('followers_count');

// 1 rendez-vous À VENIR (confirmed) chez le coiffeur n°1 — testable en annulation
$svc1 = $pros[0]->services()->where('is_active', 1)->first();
if (!$svc1) { throw new Exception('Le coiffeur 1 n\'a aucune prestation active.'); }
Appointment::create([
    'hairdresser_id'   => $pros[0]->id,
    'client_id'        => $user->id,
    'client_name'      => $user->name,
    'client_email'     => $user->email,
    'service_id'       => $svc1->id,
    'service'          => $svc1->name,
    'desired_date'     => now()->addDays(10)->toDateString(),
    'desired_slot'     => 'Matin',
    'appointment_date' => now()->addDays(10)->toDateString(),
    'appointment_time' => '10:00',
    'duration_minutes' => $svc1->duration_minutes,
    'price'            => $svc1->price,
    'status'           => 'confirmed',
]);

// 1 rendez-vous PASSÉ (completed, SANS avis) chez le coiffeur n°2 —
// le reviewer verra l'invitation à noter et pourra déposer un avis lui-même.
$svc2 = $pros[1]->services()->where('is_active', 1)->first();
if (!$svc2) { throw new Exception('Le coiffeur 2 n\'a aucune prestation active.'); }
Appointment::create([
    'hairdresser_id'   => $pros[1]->id,
    'client_id'        => $user->id,
    'client_name'      => $user->name,
    'client_email'     => $user->email,
    'service_id'       => $svc2->id,
    'service'          => $svc2->name,
    'desired_date'     => now()->subDays(20)->toDateString(),
    'desired_slot'     => 'Apres-midi',
    'appointment_date' => now()->subDays(20)->toDateString(),
    'appointment_time' => '15:00',
    'duration_minutes' => $svc2->duration_minutes,
    'price'            => $svc2->price,
    'status'           => 'completed',
]);

echo 'Compte de review cree : #' . $user->id . ' / ' . $user->email . PHP_EOL;
```

Colonnes vérifiées contre :
`create_users_table` (role enum, city, phone) · `add_geo_to_users_table` (latitude/longitude) ·
`create_saved_profiles_table` et `create_follows_table` (PK composites, `created_at` seul
timestamp) · `create_appointments_table` + `extend_appointments_for_booking` (service_id,
appointment_date/time, duration_minutes, price ; status enum
`pending|confirmed|declined|completed|cancelled`) · `Appointment::$fillable` et
`User::$fillable`. La connexion ne dépend pas de `email_verified_at`
(`AuthController::login` fait un simple `Auth::attempt`).

## 3. Vérifier depuis un appareil, avec ce compte

- [ ] Connexion sur `https://www.getchair.app/app` depuis un iPhone (Safari suffit)
- [ ] `/app/compte` montre : le rendez-vous à venir (bouton « Annuler ce rendez-vous »), le
      rendez-vous passé, les 3 favoris
- [ ] L'invitation à laisser un avis sur le rendez-vous passé apparaît — **ne pas** déposer
      l'avis (c'est le contenu que le reviewer doit pouvoir créer)
- [ ] Le fil (`/app/feed`) montre les publications du coiffeur suivi
- [ ] La recherche sur la ville du compte renvoie des coiffeurs réservables
- [ ] Aucune donnée personnelle réelle sur les écrans que le reviewer verra

## 4. À poser dans App Store Connect

App Store Connect → *App Review Information* :

| Champ | Valeur |
|---|---|
| **Sign-in required** | Coché |
| **User name** | l'email du compte (`appreview@getchair.app`) |
| **Password** | le mot de passe créé — nulle part ailleurs (ni Git, ni ce dossier) |

Et dans les notes de review (`APPLE_REVIEW_NOTES.md`), bloc `DEMO ACCOUNT`, à la place des `<>`.
Tester la connexion une dernière fois **juste avant l'envoi**.

## 5. Règles pendant la review

- **Créer le compte sur la PRODUCTION**, pas en local — l'app ne charge que la production.
- **Ne JAMAIS lancer `php artisan chair:demo-reset` en production**, et surtout pas pendant la
  review : la commande supprime tous les comptes hors comptes nommés et admins — elle effacerait
  le compte d'Apple en pleine session. C'est aussi pour cela que l'email doit être **hors**
  `@demo.getchair.app` et le mot de passe différent de `chairdemo2026`.
- Ne pas supprimer ni modifier le compte tant que la review n'est pas terminée.
- Ne pas déployer de changement qui vide ou re-crée les données pendant la review.
- Après publication : décider du sort du compte et des données créées (le rendez-vous de test
  chez un vrai professionnel se supprime ou s'annule proprement).
