<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * chair:demo-reset — remet la base en état de démo propre (demande Julien,
 * 2026-08-20) : supprime TOUS les comptes et leurs données SAUF les comptes
 * nommés (SCHILLINGER / KOEHLER) et les comptes admin (sans eux, plus
 * d'accès au backoffice), puis seed un jeu de démo dense et réaliste :
 * coiffeurs indépendants + salons + salariés (Strasbourg/Haguenau en
 * priorité puis toute la France), posts avec photos (URLs média recyclées
 * depuis les données existantes — vraies photos de coiffure déjà hébergées
 * sur le Cloudinary du compte), services, horaires, avis, abonnements,
 * offres d'emploi, locations de fauteuil.
 *
 * DESTRUCTIF : exige --force. Sans --force, affiche seulement ce qui serait
 * gardé/supprimé (dry-run).
 */
class DemoReset extends Command
{
    protected $signature = 'chair:demo-reset {--force : Exécute réellement (sinon dry-run)}';
    protected $description = 'Purge tous les comptes (sauf SCHILLINGER/KOEHLER/admins) et seed une démo dense';

    /** Mot de passe commun de tous les comptes de démo créés. */
    private const DEMO_PASSWORD = 'chairdemo2026';

    private const CITIES = [
        // [city, cp, dept, region, lat, lng, poids]
        ['Strasbourg', '67000', 'Bas-Rhin', 'Grand Est', 48.5734, 7.7521, 12],
        ['Haguenau', '67500', 'Bas-Rhin', 'Grand Est', 48.8156, 7.7905, 9],
        ['Colmar', '68000', 'Haut-Rhin', 'Grand Est', 48.0778, 7.3556, 2],
        ['Mulhouse', '68100', 'Haut-Rhin', 'Grand Est', 47.7508, 7.3359, 2],
        ['Metz', '57000', 'Moselle', 'Grand Est', 49.1193, 6.1757, 2],
        ['Nancy', '54000', 'Meurthe-et-Moselle', 'Grand Est', 48.6921, 6.1844, 2],
        ['Paris', '75011', 'Paris', 'Île-de-France', 48.8566, 2.3522, 3],
        ['Lyon', '69002', 'Rhône', 'Auvergne-Rhône-Alpes', 45.7640, 4.8357, 3],
        ['Marseille', '13006', 'Bouches-du-Rhône', "Provence-Alpes-Côte d'Azur", 43.2965, 5.3698, 2],
        ['Bordeaux', '33000', 'Gironde', 'Nouvelle-Aquitaine', 44.8378, -0.5792, 2],
        ['Nantes', '44000', 'Loire-Atlantique', 'Pays de la Loire', 47.2184, -1.5536, 2],
        ['Lille', '59000', 'Nord', 'Hauts-de-France', 50.6292, 3.0573, 2],
        ['Toulouse', '31000', 'Haute-Garonne', 'Occitanie', 43.6047, 1.4442, 2],
        ['Nice', '06000', 'Alpes-Maritimes', "Provence-Alpes-Côte d'Azur", 43.7102, 7.2620, 2],
        ['Montpellier', '34000', 'Hérault', 'Occitanie', 43.6108, 3.8767, 1],
        ['Rennes', '35000', 'Ille-et-Vilaine', 'Bretagne', 48.1173, -1.6778, 1],
        ['Reims', '51100', 'Marne', 'Grand Est', 49.2583, 4.0317, 1],
        ['Dijon', '21000', "Côte-d'Or", 'Bourgogne-Franche-Comté', 47.3220, 5.0415, 1],
    ];

    private const FIRST_NAMES = [
        'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Enzo', 'Manon', 'Théo', 'Camille',
        'Maxime', 'Sarah', 'Antoine', 'Inès', 'Alexandre', 'Jade', 'Romain', 'Louise', 'Thomas', 'Zoé',
        'Nicolas', 'Clara', 'Julien', 'Eva', 'Kevin', 'Nina', 'Mehdi', 'Yasmine', 'Karim', 'Sofia',
        'Dylan', 'Amel', 'Bastien', 'Margaux', 'Florian', 'Océane', 'Adrien', 'Elisa', 'Samir', 'Lina',
    ];

    private const LAST_NAMES = [
        'Martin', 'Bernard', 'Muller', 'Schmitt', 'Klein', 'Weber', 'Meyer', 'Wagner', 'Fischer', 'Roth',
        'Dubois', 'Moreau', 'Laurent', 'Garcia', 'Roux', 'Fournier', 'Morel', 'Girard', 'Lambert', 'Mercier',
        'Benali', 'Nguyen', 'Costa', 'Silva', 'Lopez', 'Fernandez', 'Baumann', 'Zimmermann', 'Hoffmann', 'Keller',
    ];

    private const SALON_NAMES = [
        "L'Atelier du Cheveu", 'Studio Krome', 'Maison Balzac', 'Le Barbier du Coin', 'Hair Factory',
        'Salon Élégance', "L'Instant Coiffure", 'Racines Studio', 'Le 8 Coiffure', 'Aura Hair Lab',
        'La Fabrique à Boucles', 'Contraste Coiffure',
    ];

    private const TAGLINES = [
        'Le détail qui change tout.',
        'Votre style, ma signature.',
        'Des coupes pensées pour vous.',
        'Passion coiffure depuis toujours.',
        'Chaque cheveu compte.',
        "L'art de sublimer votre nature.",
        'Précision, écoute, résultat.',
        'Le geste juste, à chaque fois.',
    ];

    private const POST_DESCRIPTIONS = [
        'Transformation du jour — un vrai plaisir à réaliser.',
        'Résultat après 2h de travail minutieux.',
        'Avant / après dont je suis particulièrement fier(e).',
        'Nouvelle technique testée et approuvée.',
        'Un grand merci à ma cliente pour sa confiance.',
        'Le naturel avant tout.',
        'Réalisé ce matin au salon.',
        'On adore ce rendu lumineux.',
    ];

    private const REVIEW_COMMENTS = [
        'Très satisfaite du résultat, je recommande vivement !',
        'Accueil parfait et coupe impeccable.',
        'Enfin quelqu\'un qui comprend ce que je veux. Merci !',
        'Super moment, résultat au top.',
        'Travail soigné, à l\'écoute. J\'y retourne.',
        'Le meilleur salon où je sois allé.',
        'Très pro, très sympa. Rien à redire.',
        'Résultat conforme à mes attentes, merci encore.',
        'Petit bémol sur l\'attente mais le résultat est là.',
    ];

    private const SERVICES_BY_SPECIALTY = [
        // slug-fragment => [ [nom, prix, durée], ... ]
        'homme'    => [['Coupe homme classique', 22, 30], ['Dégradé américain', 28, 45], ['Coupe + barbe', 38, 60]],
        'barbe'    => [['Taille de barbe', 15, 30], ['Rasage traditionnel', 25, 45]],
        'femme'    => [['Coupe femme + brushing', 45, 60], ['Coupe transformation', 65, 90]],
        'balayage' => [['Balayage complet', 90, 120], ['Patine + soin', 40, 45]],
        'couleur'  => [['Coloration complète', 60, 90], ['Racines + patine', 50, 60]],
        'boucle'   => [['Coupe sur cheveux bouclés', 50, 60], ['Soin hydratant boucles', 35, 45]],
        'afro'     => [['Braids', 70, 120], ['Soin + coiffage locks', 45, 60]],
        'lissage'  => [['Lissage brésilien', 120, 120], ['Brushing lissant', 35, 45]],
        'extension' => [['Pose d\'extensions', 150, 120], ['Entretien extensions', 60, 60]],
        'evenement' => [['Chignon mariage', 75, 90], ['Coiffure de soirée', 55, 60]],
        'default'  => [['Prestation signature', 40, 60], ['Soin profond', 30, 45]],
    ];

    public function handle(): int
    {
        $force = (bool) $this->option('force');

        // ── 1. Comptes à préserver ─────────────────────────────────────────
        $keepUsers = DB::table('users')
            ->whereNotNull('admin_role_id')
            ->orWhere('name', 'like', '%schillinger%')
            ->orWhere('name', 'like', '%koehler%')
            ->get(['id', 'name', 'email', 'role']);

        $keepUserIds = $keepUsers->pluck('id')->all();

        $this->info('Comptes préservés (' . count($keepUserIds) . ') :');
        foreach ($keepUsers as $u) {
            $this->line("  - #{$u->id} {$u->name} <{$u->email}> ({$u->role})");
        }

        $deleteCount = DB::table('users')->whereNotIn('id', $keepUserIds)->count();
        $this->info("Comptes qui seront SUPPRIMÉS : {$deleteCount}");

        if (!$force) {
            $this->warn('Dry-run — rien n\'a été modifié. Relancer avec --force pour exécuter.');
            return self::SUCCESS;
        }

        // ── 2. Pool de médias (recyclés pour le seed) — avant la purge ─────
        $mediaPool = collect()
            ->merge(DB::table('posts')->whereNotNull('cover_image')->pluck('cover_image'))
            ->merge(DB::table('post_images')->pluck('url'))
            ->merge(DB::table('users')->whereNotNull('avatar')->pluck('avatar'))
            ->merge(DB::table('hairdresser_profiles')->whereNotNull('banner_image')->pluck('banner_image'))
            ->merge(DB::table('salons')->whereNotNull('cover_image')->pluck('cover_image'))
            ->filter(fn ($u) => is_string($u) && str_starts_with($u, 'http'))
            ->unique()->values();

        $this->info('Pool médias recyclables : ' . $mediaPool->count() . ' URLs.');
        if ($mediaPool->isEmpty()) {
            $this->error('Aucune URL média à recycler — abandon (le seed produirait des cartes vides).');
            return self::FAILURE;
        }

        $avatars = $mediaPool->shuffle()->values();
        $pick = function () use ($avatars) {
            static $i = 0;
            return $avatars[$i++ % $avatars->count()];
        };

        // ── 3. Purge ───────────────────────────────────────────────────────
        $keepProfileIds = DB::table('hairdresser_profiles')->whereIn('user_id', $keepUserIds)->pluck('id')->all();
        $keepSalonIds   = DB::table('salons')->whereIn('owner_id', $keepUserIds)->pluck('id')->all();

        $delUserIds    = DB::table('users')->whereNotIn('id', $keepUserIds)->pluck('id')->all();
        $delProfileIds = DB::table('hairdresser_profiles')->whereNotIn('user_id', $keepUserIds)->pluck('id')->all();
        $delSalonIds   = DB::table('salons')->whereNotIn('owner_id', $keepUserIds)->pluck('id')->all();
        $delPostIds    = DB::table('posts')->whereIn('hairdresser_id', $delProfileIds)->pluck('id')->all();
        $delOfferIds   = DB::table('job_offers')->whereIn('salon_id', $delSalonIds)->pluck('id')->all();
        $delRentalIds  = DB::table('chair_rentals')->whereIn('salon_id', $delSalonIds)->pluck('id')->all();
        $delStoryIds   = DB::table('stories')->whereIn('user_id', $delUserIds)->pluck('id')->all();

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $purge = function (string $table, \Closure $query) {
            $n = $query(DB::table($table))->delete();
            $this->line("  purge {$table}: {$n}");
        };

        $chunkIn = function ($q, string $col, array $ids) {
            return empty($ids) ? $q->whereRaw('0=1') : $q->whereIn($col, $ids);
        };

        $this->info('Purge en cours…');

        $purge('post_images',  fn ($q) => $chunkIn($q, 'post_id', $delPostIds));
        $purge('post_tags',    fn ($q) => $chunkIn($q, 'post_id', $delPostIds));
        DB::table('post_likes')->whereIn('user_id', $delUserIds)->delete();
        $purge('post_likes',   fn ($q) => $chunkIn($q, 'post_id', $delPostIds));
        $purge('posts',        fn ($q) => $chunkIn($q, 'id', $delPostIds));

        $purge('services',           fn ($q) => $chunkIn($q, 'hairdresser_id', $delProfileIds));
        $purge('service_categories', fn ($q) => $chunkIn($q, 'hairdresser_id', $delProfileIds));

        foreach (['hairdresser_schedules', 'hairdresser_unavailabilities', 'hairdresser_specialties',
                  'hairdresser_specialty_progress', 'hairdresser_streaks'] as $t) {
            $purge($t, fn ($q) => $chunkIn($q, 'hairdresser_id', $delProfileIds));
        }
        foreach (['hairdresser_badges', 'hairdresser_training_badges'] as $t) {
            $purge($t, fn ($q) => $chunkIn($q, 'hairdresser_profile_id', $delProfileIds));
        }

        $purge('appointments', fn ($q) => $q->where(fn ($w) => $w->whereIn('hairdresser_id', $delProfileIds)->orWhereIn('client_id', $delUserIds)));
        $purge('reviews',      fn ($q) => $q->where(fn ($w) => $w->whereIn('hairdresser_id', $delProfileIds)->orWhereIn('client_id', $delUserIds)));
        $purge('follows',      fn ($q) => $q->where(fn ($w) => $w->whereIn('follower_id', $delUserIds)->orWhereIn('hairdresser_id', $delProfileIds)));
        $purge('saved_posts',  fn ($q) => $q->where(fn ($w) => $w->whereIn('user_id', $delUserIds)->orWhereIn('post_id', $delPostIds)));
        $purge('saved_profiles', fn ($q) => $q->where(fn ($w) => $w->whereIn('user_id', $delUserIds)->orWhereIn('hairdresser_id', $delProfileIds)));

        $purge('story_views', fn ($q) => $q->where(fn ($w) => $w->whereIn('user_id', $delUserIds)->orWhereIn('story_id', $delStoryIds)));
        $purge('stories',     fn ($q) => $chunkIn($q, 'user_id', $delUserIds));

        foreach (['notifications', 'notification_preferences', 'personal_access_tokens',
                  'push_subscriptions', 'user_preferences', 'support_requests', 'referral_rewards'] as $t) {
            if (Schema::hasColumn($t, 'user_id')) {
                $purge($t, fn ($q) => $chunkIn($q, 'user_id', $delUserIds));
            }
        }

        $purge('verified_visits', fn ($q) => $chunkIn($q, 'hairdresser_id', $delProfileIds));
        $purge('qr_tokens',       fn ($q) => $chunkIn($q, 'hairdresser_id', $delProfileIds));
        $purge('profile_views',   fn ($q) => Schema::hasColumn('profile_views', 'hairdresser_profile_id')
            ? $chunkIn($q, 'hairdresser_profile_id', $delProfileIds)
            : $chunkIn($q, 'hairdresser_id', $delProfileIds));
        if (Schema::hasColumn('share_events', 'user_id')) {
            $purge('share_events', fn ($q) => $chunkIn($q, 'user_id', $delUserIds));
        }

        $purge('subscriptions', fn ($q) => $q->where(fn ($w) => $w->whereIn('hairdresser_profile_id', $delProfileIds)->orWhereIn('salon_id', $delSalonIds)));

        $purge('job_applications', fn ($q) => $q->where(fn ($w) => $chunkIn($w, 'job_offer_id', $delOfferIds)));
        $purge('job_offers',       fn ($q) => $chunkIn($q, 'id', $delOfferIds));

        $purge('chair_rental_request_messages', fn ($q) => $q->whereIn('chair_rental_request_id', DB::table('chair_rental_requests')->whereIn('chair_rental_id', $delRentalIds)->pluck('id')->all()));
        $purge('chair_rental_requests', fn ($q) => $q->where(fn ($w) => $w->whereIn('chair_rental_id', $delRentalIds)->orWhereIn('hairdresser_id', $delProfileIds)));
        $purge('chair_rentals',  fn ($q) => $chunkIn($q, 'id', $delRentalIds));

        $purge('salon_join_requests', fn ($q) => $q->where(fn ($w) => $w->whereIn('salon_id', $delSalonIds)->orWhereIn('hairdresser_id', $delProfileIds)));
        $purge('salon_invitations',   fn ($q) => $q->where(fn ($w) => $chunkIn($w, 'salon_id', $delSalonIds)));
        $purge('reports', fn ($q) => $q); // modération : repart de zéro avec la démo

        $purge('salons',               fn ($q) => $chunkIn($q, 'id', $delSalonIds));
        $purge('hairdresser_profiles', fn ($q) => $chunkIn($q, 'id', $delProfileIds));
        $purge('users',                fn ($q) => $chunkIn($q, 'id', $delUserIds));

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Coiffeurs salariés GARDÉS rattachés à un salon supprimé → détacher.
        DB::table('hairdresser_profiles')->whereIn('salon_id', $delSalonIds)->update(['salon_id' => null]);

        // ── 4. Seed ────────────────────────────────────────────────────────
        $this->info('Seed en cours…');
        $now = now();

        $specialties = DB::table('specialties')->where('is_active', true)->get(['id', 'name', 'slug', 'category']);
        if ($specialties->isEmpty()) {
            $this->error('Aucune spécialité active — seed interrompu.');
            return self::FAILURE;
        }

        $cityList = [];
        foreach (self::CITIES as $c) {
            for ($i = 0; $i < $c[6]; $i++) $cityList[] = $c;
        }

        $usedNames = []; $usedSlugs = [];
        $mkName = function () use (&$usedNames) {
            do {
                $n = self::FIRST_NAMES[array_rand(self::FIRST_NAMES)] . ' ' . self::LAST_NAMES[array_rand(self::LAST_NAMES)];
            } while (isset($usedNames[$n]));
            $usedNames[$n] = true;
            return $n;
        };
        $mkSlug = function (string $name) use (&$usedSlugs) {
            $base = Str::slug($name); $slug = $base; $i = 2;
            while (isset($usedSlugs[$slug]) || DB::table('hairdresser_profiles')->where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $usedSlugs[$slug] = true;
            return $slug;
        };
        $jitter = fn (float $v) => $v + (mt_rand(-80, 80) / 10000); // ±~0.8km

        $password = Hash::make(self::DEMO_PASSWORD);
        $mkUser = function (string $name, string $role, array $city) use ($password, $now, $pick) {
            return DB::table('users')->insertGetId([
                'name' => $name,
                'email' => Str::slug($name) . '.' . Str::lower(Str::random(4)) . '@demo.getchair.app',
                'email_verified_at' => $now,
                'password' => $password,
                'role' => $role,
                'avatar' => $pick(),
                'city' => $city[0],
                'postal_code' => $city[1],
                'referral_code' => Str::upper(Str::random(8)),
                'created_at' => $now->copy()->subDays(mt_rand(30, 400)),
                'updated_at' => $now,
            ]);
        };

        // Clients (pour avis / abonnés / likes réels)
        $clientIds = [];
        for ($i = 0; $i < 30; $i++) {
            $clientIds[] = $mkUser($mkName(), 'client', $cityList[array_rand($cityList)]);
        }
        $this->line('  30 clients démo');

        // Salons + gérants + salariés — villes VARIÉES (la liste pondérée
        // commence par 12× Strasbourg : itérée séquentiellement, elle mettait
        // tous les salons au même endroit). Priorité Alsace puis grandes villes.
        $salonCityNames = ['Strasbourg', 'Haguenau', 'Strasbourg', 'Paris', 'Lyon', 'Haguenau',
                           'Marseille', 'Bordeaux', 'Lille', 'Nantes', 'Toulouse', 'Nice'];
        $cityByName = [];
        foreach (self::CITIES as $c) $cityByName[$c[0]] = $c;

        $salonIds = []; $employedProfileIds = [];
        $allNewProfileIds = [];
        foreach (self::SALON_NAMES as $idx => $salonName) {
            $city = $cityByName[$salonCityNames[$idx % count($salonCityNames)]];
            $owner = $mkUser($mkName(), 'salon_owner', $city);
            $slugBase = Str::slug($salonName); $slug = $slugBase; $k = 2;
            while (DB::table('salons')->where('slug', $slug)->exists()) $slug = $slugBase . '-' . $k++;
            $salonId = DB::table('salons')->insertGetId([
                'owner_id' => $owner,
                'name' => $salonName,
                'slug' => $slug,
                'description' => "Salon " . $salonName . " à " . $city[0] . " — une équipe passionnée au service de votre style.",
                'address' => mt_rand(1, 60) . ' rue ' . ['des Vignes', 'de la Gare', 'du Marché', 'des Tanneurs', 'Nationale', 'du Général Leclerc'][array_rand(['a','b','c','d','e','f'])],
                'city' => $city[0], 'postal_code' => $city[1], 'department' => $city[2], 'region' => $city[3],
                'latitude' => $jitter($city[4]), 'longitude' => $jitter($city[5]),
                'cover_image' => $pick(),
                'is_verified' => $idx % 2 === 0,
                'verification_status' => $idx % 2 === 0 ? 'verified' : 'unverified',
                'created_at' => $now->copy()->subDays(mt_rand(60, 500)), 'updated_at' => $now,
            ]);
            $salonIds[] = ['id' => $salonId, 'city' => $city];
        }
        $this->line('  ' . count($salonIds) . ' salons');

        // Coiffeurs : 48 indés + 18 salariés
        $mkHairdresser = function (array $city, bool $independent, ?int $salonId) use ($mkUser, $mkSlug, $mkName, $pick, $now, $specialties, $jitter, &$allNewProfileIds) {
            $name = $mkName();
            $userId = $mkUser($name, 'hairdresser', $city);
            $specs = $specialties->shuffle()->take(mt_rand(1, 3));
            $profileId = DB::table('hairdresser_profiles')->insertGetId([
                'user_id' => $userId,
                'salon_id' => $salonId,
                'slug' => $mkSlug($name),
                'banner_image' => $pick(),
                'tagline' => self::TAGLINES[array_rand(self::TAGLINES)],
                'years_experience' => mt_rand(2, 22),
                'city' => $city[0], 'postal_code' => $city[1], 'department' => $city[2], 'region' => $city[3],
                'latitude' => $jitter($city[4]), 'longitude' => $jitter($city[5]),
                'is_independent' => $independent,
                'work_availability' => 'employed',
                'is_verified' => mt_rand(0, 3) === 0,
                'created_at' => $now->copy()->subDays(mt_rand(30, 400)), 'updated_at' => $now,
            ]);
            foreach ($specs as $s) {
                DB::table('hairdresser_specialties')->insert(['hairdresser_id' => $profileId, 'specialty_id' => $s->id]);
            }
            DB::table('users')->where('id', $userId)->update(['bio' => 'Coiffeur' . (str_contains($name, 'a ') ? 'se' : '') . ' passionné(e) — ' . $specs->pluck('name')->join(', ') . '. ' . mt_rand(2, 22) . " ans d'expérience."]);
            $allNewProfileIds[] = $profileId;
            return [$profileId, $userId, $specs];
        };

        $seedServices = function (int $profileId, $specs, bool $independent) use ($now) {
            foreach ($specs as $s) {
                $catId = DB::table('service_categories')->insertGetId([
                    'hairdresser_id' => $profileId, 'name' => $s->name, 'display_order' => 0,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
                $key = 'default';
                foreach (array_keys(self::SERVICES_BY_SPECIALTY) as $frag) {
                    if ($frag !== 'default' && str_contains(Str::lower($s->slug . ' ' . $s->name), $frag)) { $key = $frag; break; }
                }
                foreach (self::SERVICES_BY_SPECIALTY[$key] as $svc) {
                    DB::table('services')->insert([
                        'hairdresser_id' => $profileId, 'category_id' => $catId, 'specialty_id' => $s->id,
                        'name' => $svc[0],
                        'price' => $independent ? $svc[1] : null,
                        'duration_minutes' => $independent ? $svc[2] : null,
                        'is_active' => true,
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }
        };

        $seedSchedule = function (int $profileId) use ($now) {
            foreach ([2, 3, 4, 5, 6] as $day) { // mar-sam
                DB::table('hairdresser_schedules')->insert([
                    'hairdresser_id' => $profileId, 'day_of_week' => $day,
                    'start_time' => '09:00', 'end_time' => $day === 6 ? '17:00' : '18:30',
                    'is_open' => true, 'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        };

        $seedPosts = function (int $profileId, $specs) use ($now, $pick) {
            $n = mt_rand(3, 6);
            $ids = [];
            for ($i = 0; $i < $n; $i++) {
                $s = $specs[array_rand($specs->all())];
                $gender = Str::lower($s->category ?? '') === 'homme' ? 'homme' : 'femme';
                $ids[] = DB::table('posts')->insertGetId([
                    'hairdresser_id' => $profileId,
                    'specialty_id' => $s->id,
                    'type' => 'result',
                    'description' => self::POST_DESCRIPTIONS[array_rand(self::POST_DESCRIPTIONS)],
                    'gender' => $gender,
                    'is_published' => true,
                    'views_count' => mt_rand(15, 900),
                    'likes_count' => 0,
                    'cover_image' => $pick(),
                    'created_at' => $now->copy()->subDays(mt_rand(1, 200)),
                    'updated_at' => $now,
                ]);
            }
            return $ids;
        };

        $seedSocial = function (int $profileId, array $postIds, $specs) use ($clientIds, $now) {
            // Abonnés réels
            $followers = collect($clientIds)->shuffle()->take(mt_rand(2, 18));
            foreach ($followers as $cid) {
                DB::table('follows')->insert(['follower_id' => $cid, 'hairdresser_id' => $profileId, 'created_at' => $now]);
            }
            // Likes réels
            foreach ($postIds as $pid) {
                $likers = collect($clientIds)->shuffle()->take(mt_rand(0, 12));
                foreach ($likers as $cid) {
                    DB::table('post_likes')->insert(['user_id' => $cid, 'post_id' => $pid, 'created_at' => $now]);
                }
                DB::table('posts')->where('id', $pid)->update(['likes_count' => $likers->count()]);
            }
            // Avis réels
            $nReviews = mt_rand(0, 8);
            $reviewers = collect($clientIds)->shuffle()->take($nReviews);
            foreach ($reviewers as $cid) {
                $s = $specs[array_rand($specs->all())];
                DB::table('reviews')->insert([
                    'hairdresser_id' => $profileId, 'client_id' => $cid,
                    'rating' => mt_rand(0, 6) === 0 ? mt_rand(3, 4) : mt_rand(4, 5),
                    'status' => 'approved',
                    'comment' => self::REVIEW_COMMENTS[array_rand(self::REVIEW_COMMENTS)],
                    'is_certified' => mt_rand(0, 1) === 1,
                    'specialty_id' => $s->id,
                    'created_at' => $now->copy()->subDays(mt_rand(1, 250)), 'updated_at' => $now,
                ]);
            }
            // Compteurs dénormalisés = réalité des lignes
            $agg = DB::table('reviews')->where('hairdresser_id', $profileId)
                ->selectRaw('COUNT(*) c, COALESCE(AVG(rating),0) a')->first();
            DB::table('hairdresser_profiles')->where('id', $profileId)->update([
                'followers_count' => $followers->count(),
                'posts_count' => count($postIds),
                'reviews_count' => (int) $agg->c,
                'avg_rating' => round((float) $agg->a, 2),
            ]);
        };

        $indieCount = 0;
        for ($i = 0; $i < 48; $i++) {
            $city = $cityList[$i % count($cityList)];
            [$pid, , $specs] = $mkHairdresser($city, true, null);
            $seedServices($pid, $specs, true);
            $seedSchedule($pid);
            $postIds = $seedPosts($pid, $specs);
            $seedSocial($pid, $postIds, $specs);
            $indieCount++;
        }
        $this->line("  {$indieCount} coiffeurs indépendants");

        $employeeCount = 0;
        foreach ($salonIds as $k => $salon) {
            $n = 1 + ($k % 2); // 1 à 2 salariés par salon
            for ($j = 0; $j < $n; $j++) {
                [$pid, , $specs] = $mkHairdresser($salon['city'], false, $salon['id']);
                $seedServices($pid, $specs, false);
                $postIds = $seedPosts($pid, $specs);
                $seedSocial($pid, $postIds, $specs);
                $employedProfileIds[] = $pid;
                $employeeCount++;
            }
        }
        $this->line("  {$employeeCount} coiffeurs salariés");

        // Offres d'emploi
        $jobTitles = [
            ['Coiffeur / Coiffeuse polyvalent(e)', 'hairdresser', 'cdi'],
            ['Coloriste expérimenté(e)', 'colorist', 'cdi'],
            ['Barbier confirmé', 'barber', 'cdi'],
            ['Coiffeur(se) en alternance', 'apprentice', 'alternance'],
            ['Styliste visagiste', 'stylist', 'cdd'],
            ['Coiffeur freelance week-end', 'hairdresser', 'freelance'],
        ];
        $offers = 0;
        foreach ($salonIds as $k => $salon) {
            $nOffres = $k % 3 === 2 ? 2 : 1;
            for ($j = 0; $j < $nOffres && $offers < 15; $j++) {
                $t = $jobTitles[($k + $j) % count($jobTitles)];
                DB::table('job_offers')->insert([
                    'salon_id' => $salon['id'],
                    'title' => $t[0], 'job_type' => $t[1], 'contract_type' => $t[2],
                    'level' => ['cap2', 'bp1', 'bp2', null][($k + $j) % 4],
                    'description' => "Nous recherchons un(e) professionnel(le) motivé(e) pour rejoindre notre équipe à " . $salon['city'][0] . ". Clientèle fidèle, ambiance conviviale, matériel fourni.",
                    'city' => $salon['city'][0], 'status' => 'open',
                    'created_at' => $now->copy()->subDays(mt_rand(1, 40)), 'updated_at' => $now,
                ]);
                $offers++;
            }
        }
        $this->line("  {$offers} offres d'emploi");

        // Locations de fauteuil
        $rentTitles = [
            ['chair', 'Fauteuil lumineux en centre-ville'],
            ['barber_post', 'Poste barbier tout équipé'],
            ['private_cabin', 'Cabine privée pour indépendant(e)'],
            ['coloring_corner', 'Espace couleur avec bac dédié'],
            ['independent_post', 'Poste indépendant, clientèle de passage'],
        ];
        $rentals = 0;
        foreach ($salonIds as $k => $salon) {
            if ($k % 3 === 1) continue; // pas tous les salons
            $t = $rentTitles[$k % count($rentTitles)];
            $slugBase = Str::slug($t[1]); $slug = $slugBase . '-' . $salon['id'];
            $day = mt_rand(25, 45);
            DB::table('chair_rentals')->insert([
                'salon_id' => $salon['id'],
                'space_type' => $t[0],
                'title' => $t[1],
                'slug' => $slug,
                'city' => $salon['city'][0],
                'latitude' => $jitter($salon['city'][4]), 'longitude' => $jitter($salon['city'][5]),
                'description' => "Emplacement idéal à " . $salon['city'][0] . " — rejoignez un salon dynamique avec une clientèle établie. Idéal pour développer votre propre activité.",
                'price_per_day' => $day,
                'price_per_week' => $day * 5 - 15,
                'price_per_month' => $day * 18,
                'deposit_amount' => 200,
                'available_days' => json_encode([2, 3, 4, 5, 6]),
                'equipment' => json_encode(collect(['mirror', 'premium_chair', 'sink', 'wifi', 'card_terminal', 'city_center', 'parking'])->shuffle()->take(mt_rand(3, 6))->values()->all()),
                'photos' => json_encode([$pick(), $pick()]),
                'insurance_required' => $k % 2 === 0,
                'status' => 'available',
                'published_at' => $now,
                'created_at' => $now->copy()->subDays(mt_rand(1, 30)), 'updated_at' => $now,
            ]);
            $rentals++;
        }
        $this->line("  {$rentals} locations de fauteuil");

        // ── 5. Resynchroniser les compteurs des profils GARDÉS ────────────
        foreach ($keepProfileIds as $pid) {
            $agg = DB::table('reviews')->where('hairdresser_id', $pid)->selectRaw('COUNT(*) c, COALESCE(AVG(rating),0) a')->first();
            DB::table('hairdresser_profiles')->where('id', $pid)->update([
                'followers_count' => DB::table('follows')->where('hairdresser_id', $pid)->count(),
                'posts_count' => DB::table('posts')->where('hairdresser_id', $pid)->count(),
                'reviews_count' => (int) $agg->c,
                'avg_rating' => round((float) $agg->a, 2),
            ]);
        }

        $this->newLine();
        $this->info('Terminé. Récap :');
        foreach (['users', 'hairdresser_profiles', 'salons', 'posts', 'reviews', 'follows', 'job_offers', 'chair_rentals', 'services'] as $t) {
            $this->line("  {$t}: " . DB::table($t)->count());
        }
        $this->warn('Mot de passe de TOUS les comptes démo : ' . self::DEMO_PASSWORD);
        $this->warn('Pense à lancer ensuite : php artisan chair:backfill-badges');

        return self::SUCCESS;
    }
}
