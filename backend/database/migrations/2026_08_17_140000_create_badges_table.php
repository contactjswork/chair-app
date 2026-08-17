<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Table 'badges' — remplace la constante BadgeService::BADGES (array PHP en
 * dur) par un vrai catalogue administrable. Voir BadgeService pour le
 * moteur qui la consomme.
 *
 * criteria (JSON nullable) : {metric, operator, value} — UNE règle simple
 * évaluée contre App\Services\BadgeService::METRICS (liste blanche fixe de
 * métriques calculables) et App\Services\BadgeService::OPERATORS
 * (>=, >, ==, <=, <). criteria = null pour les badges dont la logique ne
 * rentre pas dans metric/operator/value (combinaison de critères, classement
 * relatif...) — ceux-là restent dans BadgeService::hardcodedUnlocked(), leur
 * slug est listé dans BadgeService::HARDCODED_SLUGS et l'admin ne peut pas
 * leur attacher de criteria (voir AdminBadgeController::update).
 *
 * enabled=false : badge retiré du catalogue actif (plus attribuable), mais
 * PAS supprimé — les lignes hairdresser_badges déjà posées pour ce slug
 * restent lisibles (aucune perte de badge déjà débloqué). visible=false :
 * badge compté dans les points mais pas affiché sur le profil public (ex:
 * badges "démarrage", jamais supprimé non plus, juste discret).
 *
 * order : position d'affichage admin, pas de contrainte fonctionnelle sur
 * l'unicité — laissé en pas de 10 pour permettre l'insertion future sans
 * tout renuméroter.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('category')->nullable();
            $table->string('family')->default('carriere'); // carriere|exceptionnel
            $table->string('rarity')->default('commun');   // commun|rare|epique|legendaire|ultime
            $table->unsignedTinyInteger('tier')->default(1); // 1..5
            $table->unsignedInteger('reward')->default(0);   // points ajoutés au chair_score
            $table->json('criteria')->nullable();
            $table->json('roles')->nullable(); // restreint le badge à un rôle (ex: ['independent']), null = tous
            $table->boolean('visible')->default(true);
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });

        $now = now();
        $order = 0;
        foreach ($this->badgeSeeds() as $slug => $b) {
            $order += 10;
            DB::table('badges')->insert([
                'slug'        => $slug,
                'title'       => $b['name'],
                'description' => $b['desc'],
                'icon'        => null,
                'category'    => $b['category'],
                'family'      => $b['family'],
                'rarity'      => $b['rarity'],
                'tier'        => $b['tier'],
                'reward'      => $b['pts'],
                'criteria'    => isset($b['criteria']) ? json_encode($b['criteria']) : null,
                'roles'       => isset($b['roles']) ? json_encode($b['roles']) : null,
                'visible'     => $b['visible'],
                'enabled'     => true,
                'order'       => $order,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('badges');
    }

    /**
     * Copie exacte des métadonnées de l'ancienne BadgeService::BADGES
     * (mêmes libellés, points, tiers, rareté, visibilité, roles) + criteria
     * ajouté pour les badges à seuil numérique simple. criteria absent =
     * logique dédiée conservée dans BadgeService::hardcodedUnlocked().
     */
    private function badgeSeeds(): array
    {
        return [
            // ── Profil (carrière) — présence/composite, reste en code ──
            'photo_added'   => ['name' => 'Première impression',  'desc' => 'Photo de profil ajoutée',              'category' => 'profil', 'family' => 'carriere', 'pts' => 20,  'tier' => 1, 'rarity' => 'commun', 'visible' => false],
            'banner_added'  => ['name' => 'Vitrine',              'desc' => 'Bannière de profil ajoutée',            'category' => 'profil', 'family' => 'carriere', 'pts' => 15,  'tier' => 1, 'rarity' => 'commun', 'visible' => false],
            'full_profile'  => ['name' => 'Profil complet',       'desc' => 'Toutes les infos remplies',             'category' => 'profil', 'family' => 'carriere', 'pts' => 50,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],

            // ── Démarrage (carrière) — généricisés (seuil >= 1) ──
            'first_specialty'       => ['name' => 'Premier pas métier',     'desc' => 'Au moins une spécialité sélectionnée',   'category' => 'demarrage', 'family' => 'carriere', 'pts' => 10, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'specialties_count', 'operator' => '>=', 'value' => 1]],
            'first_review_received' => ['name' => 'Premier avis',           'desc' => '1er avis client reçu',                   'category' => 'demarrage', 'family' => 'carriere', 'pts' => 15, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'reviews_count', 'operator' => '>=', 'value' => 1]],
            'first_verified_visit'  => ['name' => 'Premier passage prouvé', 'desc' => '1ère visite certifiée par QR',           'category' => 'demarrage', 'family' => 'carriere', 'pts' => 15, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'verified_visits_count', 'operator' => '>=', 'value' => 1]],
            'first_service'         => ['name' => 'Prestation en ligne',    'desc' => '1er service renseigné',                  'category' => 'demarrage', 'family' => 'carriere', 'pts' => 10, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'services_count', 'operator' => '>=', 'value' => 1]],
            'first_appointment'     => ['name' => 'Premier rendez-vous',    'desc' => '1er rendez-vous reçu via CHAIR',         'category' => 'demarrage', 'family' => 'carriere', 'pts' => 15, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'roles' => ['independent'], 'criteria' => ['metric' => 'appointments_count', 'operator' => '>=', 'value' => 1]],
            'first_share'           => ['name' => 'Premier partage',        'desc' => '1er partage de profil ou de réalisation','category' => 'demarrage', 'family' => 'carriere', 'pts' => 10, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'share_count', 'operator' => '>=', 'value' => 1]],

            // ── Réalisations totales (carrière) ──
            'first_post'    => ['name' => 'Première réalisation',      'desc' => '1ère réalisation publiée',                                     'category' => 'contenu', 'family' => 'carriere', 'pts' => 10,  'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'posts_count', 'operator' => '>=', 'value' => 1]],
            'portfolio_10'  => ['name' => 'Portfolio en construction', 'desc' => '10 réalisations publiées, toutes spécialités confondues',      'category' => 'contenu', 'family' => 'carriere', 'pts' => 40,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'posts_count', 'operator' => '>=', 'value' => 10]],
            'portfolio_50'  => ['name' => 'Portfolio conséquent',      'desc' => '50 réalisations publiées, toutes spécialités confondues',      'category' => 'contenu', 'family' => 'carriere', 'pts' => 120, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'posts_count', 'operator' => '>=', 'value' => 50]],
            'portfolio_300' => ['name' => 'Œuvre complète',            'desc' => '300 réalisations publiées — des années de travail documentées','category' => 'contenu', 'family' => 'carriere', 'pts' => 600, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'posts_count', 'operator' => '>=', 'value' => 300]],

            // ── Avis et visites (carrière) ──
            'review_10'         => ['name' => 'Confiance grandissante', 'desc' => '10 avis reçus',  'category' => 'avis', 'family' => 'carriere', 'pts' => 40,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'reviews_count', 'operator' => '>=', 'value' => 10]],
            'review_50'         => ['name' => 'Réputation solide',      'desc' => '50 avis reçus',  'category' => 'avis', 'family' => 'carriere', 'pts' => 120, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'reviews_count', 'operator' => '>=', 'value' => 50]],
            'review_100'        => ['name' => 'Cent voix',              'desc' => '100 avis reçus', 'category' => 'avis', 'family' => 'carriere', 'pts' => 250, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'reviews_count', 'operator' => '>=', 'value' => 100]],
            'review_500'        => ['name' => 'Institution locale',     'desc' => '500 avis reçus', 'category' => 'avis', 'family' => 'carriere', 'pts' => 700, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'reviews_count', 'operator' => '>=', 'value' => 500]],
            'visit_25'          => ['name' => 'Habitué du terrain',     'desc' => '25 visites certifiées par QR',  'category' => 'visites', 'family' => 'carriere', 'pts' => 40,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'verified_visits_count', 'operator' => '>=', 'value' => 25]],
            'visit_100'         => ['name' => 'Terrain conquis',        'desc' => '100 visites certifiées par QR', 'category' => 'visites', 'family' => 'carriere', 'pts' => 150, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'verified_visits_count', 'operator' => '>=', 'value' => 100]],
            'regular_clients_5' => ['name' => 'Clientèle fidèle',       'desc' => '5 clients revenus au moins deux fois', 'category' => 'avis', 'family' => 'carriere', 'pts' => 60, 'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'regular_clients_count', 'operator' => '>=', 'value' => 5]],

            // ── Abonnés (carrière) ──
            'follower_10'    => ['name' => 'Premiers soutiens',    'desc' => '10 abonnés',    'category' => 'communauté', 'family' => 'carriere', 'pts' => 10,   'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 10]],
            'follower_100'   => ['name' => 'Communauté naissante', 'desc' => '100 abonnés',    'category' => 'communauté', 'family' => 'carriere', 'pts' => 30,   'tier' => 1, 'rarity' => 'commun', 'visible' => true, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 100]],
            'follower_500'   => ['name' => 'Voix qui compte',      'desc' => '500 abonnés',    'category' => 'communauté', 'family' => 'carriere', 'pts' => 100,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 500]],
            'follower_1000'  => ['name' => 'Mille fidèles',        'desc' => '1 000 abonnés',  'category' => 'communauté', 'family' => 'carriere', 'pts' => 180,  'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 1000]],
            'follower_2500'  => ['name' => 'Figure locale',        'desc' => '2 500 abonnés',  'category' => 'communauté', 'family' => 'carriere', 'pts' => 300,  'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 2500]],
            'follower_5000'  => ['name' => 'Voix majeure',         'desc' => '5 000 abonnés',  'category' => 'communauté', 'family' => 'carriere', 'pts' => 550,  'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 5000]],
            'follower_15000' => ['name' => 'Icône CHAIR',          'desc' => '15 000 abonnés', 'category' => 'communauté', 'family' => 'carriere', 'pts' => 1000, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'followers_count', 'operator' => '>=', 'value' => 15000]],

            // ── Partages (carrière) ──
            'share_10'   => ['name' => 'Ambassadeur en herbe', 'desc' => '10 partages de profil ou de réalisations',   'category' => 'reseau', 'family' => 'carriere', 'pts' => 30,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'share_count', 'operator' => '>=', 'value' => 10]],
            'share_100'  => ['name' => 'Voix qui porte',       'desc' => '100 partages de profil ou de réalisations',  'category' => 'reseau', 'family' => 'carriere', 'pts' => 120, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'share_count', 'operator' => '>=', 'value' => 100]],
            'share_1000' => ['name' => 'Porte-voix CHAIR',     'desc' => '1 000 partages de profil ou de réalisations','category' => 'reseau', 'family' => 'carriere', 'pts' => 400, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'share_count', 'operator' => '>=', 'value' => 1000]],

            // ── Ancienneté (carrière) ──
            'veteran_3m' => ['name' => 'Installé',        'desc' => '3 mois sur CHAIR', 'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 20,   'tier' => 1, 'rarity' => 'commun', 'visible' => true, 'criteria' => ['metric' => 'account_age_days', 'operator' => '>=', 'value' => 90]],
            'veteran_1y' => ['name' => 'Fidèle',           'desc' => '1 an sur CHAIR',   'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 80,   'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'account_age_days', 'operator' => '>=', 'value' => 365]],
            'veteran_3y' => ['name' => 'Pilier',           'desc' => '3 ans sur CHAIR',  'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 300,  'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'account_age_days', 'operator' => '>=', 'value' => 1095]],
            'veteran_7y' => ['name' => 'Historique CHAIR', 'desc' => '7 ans sur CHAIR',  'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 1000, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'account_age_days', 'operator' => '>=', 'value' => 2555]],

            // ── Activité — streak / discipline (carrière) ──
            'streak_7'         => ['name' => 'Sur un rythme',            'desc' => "7 jours d'activité consécutifs",   'category' => 'streak', 'family' => 'carriere', 'pts' => 50,   'tier' => 1, 'rarity' => 'commun', 'visible' => true, 'criteria' => ['metric' => 'longest_streak', 'operator' => '>=', 'value' => 7]],
            'streak_30'        => ['name' => 'Inarrêtable',              'desc' => "30 jours d'activité consécutifs",  'category' => 'streak', 'family' => 'carriere', 'pts' => 150,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'longest_streak', 'operator' => '>=', 'value' => 30]],
            'streak_100'       => ['name' => 'Légende du quotidien',     'desc' => "100 jours d'activité consécutifs", 'category' => 'streak', 'family' => 'carriere', 'pts' => 400,  'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'longest_streak', 'operator' => '>=', 'value' => 100]],
            'streak_365'       => ['name' => 'Inarrêtable depuis un an', 'desc' => "365 jours d'activité consécutifs, sans interruption", 'category' => 'streak', 'family' => 'carriere', 'pts' => 1200, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'longest_streak', 'operator' => '>=', 'value' => 365]],
            'streak_1000'      => ['name' => 'Millénaire CHAIR',         'desc' => "1 000 jours d'activité consécutifs, sans interruption", 'category' => 'streak', 'family' => 'carriere', 'pts' => 2000, 'tier' => 5, 'rarity' => 'ultime', 'visible' => true, 'criteria' => ['metric' => 'longest_streak', 'operator' => '>=', 'value' => 1000]],
            'weekly_4'         => ['name' => 'Mois parfait',             'desc' => '4 semaines consécutives actives',  'category' => 'streak', 'family' => 'carriere', 'pts' => 100,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'weekly_streak', 'operator' => '>=', 'value' => 4]],
            'perfect_day_1'    => ['name' => 'Journée parfaite',         'desc' => 'Les 3 objectifs du jour complétés une fois',  'category' => 'discipline', 'family' => 'carriere', 'pts' => 20,  'tier' => 1, 'rarity' => 'commun', 'visible' => true, 'criteria' => ['metric' => 'perfect_days_count', 'operator' => '>=', 'value' => 1]],
            'perfect_week_7'   => ['name' => 'Semaine sans faute',       'desc' => '7 journées parfaites cumulées',               'category' => 'discipline', 'family' => 'carriere', 'pts' => 80,  'tier' => 2, 'rarity' => 'rare', 'visible' => true, 'criteria' => ['metric' => 'perfect_days_count', 'operator' => '>=', 'value' => 7]],
            'perfect_month_30' => ['name' => 'Discipline de fer',        'desc' => '30 journées parfaites cumulées',              'category' => 'discipline', 'family' => 'carriere', 'pts' => 200, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'perfect_days_count', 'operator' => '>=', 'value' => 30]],
            'perfect_100'      => ['name' => 'Machine CHAIR',            'desc' => '100 journées parfaites cumulées',             'category' => 'discipline', 'family' => 'carriere', 'pts' => 450, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'perfect_days_count', 'operator' => '>=', 'value' => 100]],
            'pro_active'       => ['name' => 'Professionnel actif',      'desc' => 'Activité régulière sur CHAIR', 'category' => 'streak', 'family' => 'carriere', 'pts' => 50, 'tier' => 2, 'rarity' => 'rare', 'visible' => true],

            // ── Vérification (carrière) — statuts venant d'autres services, reste en code ──
            'verified'          => ['name' => 'Certifié CHAIR',    'desc' => 'Abonné CHAIR+', 'category' => 'vérification', 'family' => 'carriere', 'pts' => 100, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
            'identity_verified' => ['name' => 'Identité vérifiée', 'desc' => 'Identité confirmée par CHAIR',                       'category' => 'vérification', 'family' => 'carriere', 'pts' => 80,  'tier' => 3, 'rarity' => 'epique', 'visible' => true],
            'siret_verified'    => ['name' => 'SIRET vérifié',     'desc' => 'Numéro SIRET salon validé',                          'category' => 'vérification', 'family' => 'carriere', 'pts' => 100, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
            'diploma_added'     => ['name' => 'Diplômé',           'desc' => 'Diplôme officiel de coiffure vérifié par CHAIR (CAP, BP, BM...)', 'category' => 'vérification', 'family' => 'carriere', 'pts' => 70,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
            'formation_badge'   => ['name' => 'Formations suivies','desc' => 'A renseigné au moins une formation professionnelle suivie',       'category' => 'profil',       'family' => 'carriere', 'pts' => 60,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],

            // ── Ambassadeur (carrière) — généricisés (compteur de filleuls) ──
            'ambassador_program' => ['name' => 'Ambassadeur CHAIR', 'desc' => '20 filleuls parrainés sur CHAIR', 'category' => 'ambassadeur', 'family' => 'carriere', 'pts' => 200, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'referral_count', 'operator' => '>=', 'value' => 20]],

            'new_talent' => ['name' => 'Nouveau talent', 'desc' => 'Nouveau sur la plateforme', 'category' => 'spécial', 'family' => 'carriere', 'pts' => 0, 'tier' => 1, 'rarity' => 'commun', 'visible' => true],

            // ── EXCEPTIONNELS — classement relatif/combinaison, reste en code ──
            'top_5_local'         => ['name' => 'Top 5 local',         'desc' => "Classé dans le top 5 d'une spécialité, dans sa ville",             'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 350, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
            'top_10_local'        => ['name' => 'Top 10 local',        'desc' => "Classé dans le top 10 d'une spécialité, dans sa ville",            'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 200, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
            'top_3_local'         => ['name' => 'Podium local',        'desc' => "Classé dans le top 3 d'une spécialité, dans sa ville",             'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 500, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
            // pioneer_chair : seuil numérique simple sur l'ID de profil — généricisé.
            'pioneer_chair'       => ['name' => 'Pionnier CHAIR',      'desc' => 'Parmi les 200 premiers coiffeurs inscrits sur CHAIR',              'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 300, 'tier' => 3, 'rarity' => 'epique', 'visible' => true, 'criteria' => ['metric' => 'profile_id', 'operator' => '<=', 'value' => 200]],
            'top_1_percent'       => ['name' => 'Top 1% CHAIR',        'desc' => 'Parmi le 1% des coiffeurs les mieux classés sur toute la plateforme','category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 600, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
            'national_reference'  => ['name' => 'Référence nationale', 'desc' => 'Top 1% France entière sur au moins une spécialité',                'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 800, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
            // ambassador_national : même compteur que ambassador_program, seuil différent — généricisé.
            'ambassador_national' => ['name' => 'Ambassadeur national','desc' => '100 filleuls parrainés — a fait grandir CHAIR à l\'échelle nationale', 'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 900, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true, 'criteria' => ['metric' => 'referral_count', 'operator' => '>=', 'value' => 100]],

            // ── Badge ultime — combinaison volontaire de critères, reste en code ──
            'legende_ultime' => ['name' => 'Légende ultime CHAIR', 'desc' => 'Référence nationale, top 1% CHAIR, 3 ans d\'ancienneté, activité récente et clientèle distincte prouvée — le sommet absolu', 'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 500, 'tier' => 5, 'rarity' => 'ultime', 'visible' => true],
        ];
    }
};
