<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Services\NotificationService;
use App\Services\ReferralService;
use App\Services\SpecialtyReputationService;
use App\Services\StreakService;
use Illuminate\Support\Facades\DB;

class BadgeService
{
    // Au-delà de quel id de profil un coiffeur n'est plus "pionnier" —
    // constante figée, pas recalculée dynamiquement (sinon "pionnier"
    // perdrait son sens au fil du temps).
    const PIONEER_MAX_ID = 200;

    // ── Définition des badges CARRIÈRE et EXCEPTIONNELS ──────────────────────
    // Les badges MÉTIER (par spécialité : Spécialiste/Expert/Référence locale/
    // Référence régionale) ne sont PAS ici — ils sont dérivés dynamiquement de
    // hairdresser_specialty_progress (voir SpecialtyReputationService), pas
    // stockés dans un catalogue statique puisque leur nom dépend de la
    // spécialité (10 possibles). Voir docs/REPUTATION_ARCHITECTURE.md.
    //
    // pts    : points ajoutés au score CHAIR quand débloqué
    // tier   : 1=bronze (accessible), 2=argent (motivant), 3=or (difficile), 4=légendaire (badge noir), 5=ultime (combinaison de critères, quasi impossible)
    // rarity : reflet produit du tier — 'commun'|'rare'|'epique'|'legendaire'|'ultime'
    // family : 'carriere' | 'exceptionnel'
    // visible: true = affiché sur le profil public
    // roles  : restreint l'affichage du badge à un rôle (absent = tous) — ex.
    //          un badge agenda/RDV n'a aucun sens pour un salarié qui ne prend
    //          pas de réservation CHAIR (voir section 12 du brief masterclass).
    const BADGES = [
        // ── Profil (carrière) ──
        ['code' => 'photo_added',   'name' => 'Première impression',  'desc' => 'Photo de profil ajoutée',              'category' => 'profil', 'family' => 'carriere', 'pts' => 20,  'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'banner_added',  'name' => 'Vitrine',              'desc' => 'Bannière de profil ajoutée',            'category' => 'profil', 'family' => 'carriere', 'pts' => 15,  'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'full_profile',  'name' => 'Profil complet',       'desc' => 'Toutes les infos remplies',             'category' => 'profil', 'family' => 'carriere', 'pts' => 50,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],

        // ── Démarrage (carrière) — premières actions, accessibles dès les
        //    premiers jours pour prouver que "mon compte prend déjà de la valeur" ──
        ['code' => 'first_specialty',      'name' => 'Premier pas métier',       'desc' => 'Au moins une spécialité sélectionnée',              'category' => 'demarrage', 'family' => 'carriere', 'pts' => 10, 'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'first_review_received','name' => 'Premier avis',             'desc' => '1er avis client reçu',                              'category' => 'demarrage', 'family' => 'carriere', 'pts' => 15, 'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'first_verified_visit', 'name' => 'Premier passage prouvé',   'desc' => '1ère visite certifiée par QR',                      'category' => 'demarrage', 'family' => 'carriere', 'pts' => 15, 'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'first_service',        'name' => 'Prestation en ligne',      'desc' => '1er service renseigné',                             'category' => 'demarrage', 'family' => 'carriere', 'pts' => 10, 'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'first_appointment',    'name' => 'Premier rendez-vous',      'desc' => '1er rendez-vous reçu via CHAIR',                    'category' => 'demarrage', 'family' => 'carriere', 'pts' => 15, 'tier' => 1, 'rarity' => 'commun', 'visible' => false, 'roles' => ['independent']],
        ['code' => 'first_share',          'name' => 'Premier partage',          'desc' => '1er partage de profil ou de réalisation',           'category' => 'demarrage', 'family' => 'carriere', 'pts' => 10, 'tier' => 1, 'rarity' => 'commun', 'visible' => false],

        // ── Réalisations totales (carrière — toutes spécialités confondues,
        //    distinct du niveau MÉTIER par spécialité) ──
        ['code' => 'first_post',    'name' => 'Première réalisation', 'desc' => '1ère réalisation publiée',                          'category' => 'contenu', 'family' => 'carriere', 'pts' => 10,  'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'portfolio_10',  'name' => 'Portfolio en construction', 'desc' => '10 réalisations publiées, toutes spécialités confondues', 'category' => 'contenu', 'family' => 'carriere', 'pts' => 40,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'portfolio_50',  'name' => 'Portfolio conséquent', 'desc' => '50 réalisations publiées, toutes spécialités confondues',      'category' => 'contenu', 'family' => 'carriere', 'pts' => 120, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'portfolio_300', 'name' => 'Œuvre complète',       'desc' => '300 réalisations publiées — des années de travail documentées','category' => 'contenu', 'family' => 'carriere', 'pts' => 600, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],

        // ── Avis et visites (carrière, globaux — complètent les paliers par
        //    spécialité qui vivent dans hairdresser_specialty_progress) ──
        ['code' => 'review_10',  'name' => 'Confiance grandissante', 'desc' => '10 avis reçus',  'category' => 'avis', 'family' => 'carriere', 'pts' => 40,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'review_50',  'name' => 'Réputation solide',      'desc' => '50 avis reçus',  'category' => 'avis', 'family' => 'carriere', 'pts' => 120, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'review_100', 'name' => 'Cent voix',              'desc' => '100 avis reçus', 'category' => 'avis', 'family' => 'carriere', 'pts' => 250, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'review_500', 'name' => 'Institution locale',     'desc' => '500 avis reçus', 'category' => 'avis', 'family' => 'carriere', 'pts' => 700, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'visit_25',   'name' => 'Habitué du terrain',     'desc' => '25 visites certifiées par QR',  'category' => 'visites', 'family' => 'carriere', 'pts' => 40,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'visit_100',  'name' => 'Terrain conquis',        'desc' => '100 visites certifiées par QR', 'category' => 'visites', 'family' => 'carriere', 'pts' => 150, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'regular_clients_5', 'name' => 'Clientèle fidèle', 'desc' => '5 clients revenus au moins deux fois', 'category' => 'avis', 'family' => 'carriere', 'pts' => 60, 'tier' => 2, 'rarity' => 'rare', 'visible' => true],

        // ── Abonnés (carrière) — paliers volontairement difficiles pour
        //    rester motivants même après plusieurs années sur CHAIR ──
        ['code' => 'follower_10',    'name' => 'Premiers soutiens',    'desc' => '10 abonnés',    'category' => 'communauté', 'family' => 'carriere', 'pts' => 10,   'tier' => 1, 'rarity' => 'commun', 'visible' => false],
        ['code' => 'follower_100',   'name' => 'Communauté naissante', 'desc' => '100 abonnés',    'category' => 'communauté', 'family' => 'carriere', 'pts' => 30,   'tier' => 1, 'rarity' => 'commun', 'visible' => true],
        ['code' => 'follower_500',   'name' => 'Voix qui compte',      'desc' => '500 abonnés',    'category' => 'communauté', 'family' => 'carriere', 'pts' => 100,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'follower_1000',  'name' => 'Mille fidèles',        'desc' => '1 000 abonnés',  'category' => 'communauté', 'family' => 'carriere', 'pts' => 180,  'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'follower_2500',  'name' => 'Figure locale',        'desc' => '2 500 abonnés',  'category' => 'communauté', 'family' => 'carriere', 'pts' => 300,  'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'follower_5000',  'name' => 'Voix majeure',         'desc' => '5 000 abonnés',  'category' => 'communauté', 'family' => 'carriere', 'pts' => 550,  'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'follower_15000', 'name' => 'Icône CHAIR',          'desc' => '15 000 abonnés', 'category' => 'communauté', 'family' => 'carriere', 'pts' => 1000, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],

        // ── Partages (carrière) — réutilise share_events (voir ReferralService),
        //    lecture seule ici, aucune règle de récompense/parrainage modifiée ──
        ['code' => 'share_10',   'name' => 'Ambassadeur en herbe', 'desc' => '10 partages de profil ou de réalisations',  'category' => 'reseau', 'family' => 'carriere', 'pts' => 30,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'share_100',  'name' => 'Voix qui porte',       'desc' => '100 partages de profil ou de réalisations', 'category' => 'reseau', 'family' => 'carriere', 'pts' => 120, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'share_1000', 'name' => 'Porte-voix CHAIR',     'desc' => '1 000 partages de profil ou de réalisations','category' => 'reseau', 'family' => 'carriere', 'pts' => 400, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],

        // ── Ancienneté (carrière) ──
        ['code' => 'veteran_3m', 'name' => 'Installé',          'desc' => '3 mois sur CHAIR', 'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 20,   'tier' => 1, 'rarity' => 'commun', 'visible' => true],
        ['code' => 'veteran_1y', 'name' => 'Fidèle',             'desc' => '1 an sur CHAIR',   'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 80,   'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'veteran_3y', 'name' => 'Pilier',             'desc' => '3 ans sur CHAIR',  'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 300,  'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'veteran_7y', 'name' => 'Historique CHAIR',   'desc' => '7 ans sur CHAIR',  'category' => 'ancienneté', 'family' => 'carriere', 'pts' => 1000, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],

        // ── Activité — streak + journées parfaites (carrière) ──
        ['code' => 'streak_7',   'name' => 'Sur un rythme',         'desc' => "7 jours d'activité consécutifs",   'category' => 'streak', 'family' => 'carriere', 'pts' => 50,   'tier' => 1, 'rarity' => 'commun', 'visible' => true],
        ['code' => 'streak_30',  'name' => 'Inarrêtable',           'desc' => "30 jours d'activité consécutifs",  'category' => 'streak', 'family' => 'carriere', 'pts' => 150,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'streak_100', 'name' => 'Légende du quotidien',  'desc' => "100 jours d'activité consécutifs", 'category' => 'streak', 'family' => 'carriere', 'pts' => 400,  'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'streak_365', 'name' => 'Inarrêtable depuis un an', 'desc' => "365 jours d'activité consécutifs, sans interruption", 'category' => 'streak', 'family' => 'carriere', 'pts' => 1200, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'streak_1000','name' => 'Millénaire CHAIR',      'desc' => "1 000 jours d'activité consécutifs, sans interruption", 'category' => 'streak', 'family' => 'carriere', 'pts' => 2000, 'tier' => 5, 'rarity' => 'ultime', 'visible' => true],
        ['code' => 'weekly_4',   'name' => 'Mois parfait',          'desc' => '4 semaines consécutives actives',  'category' => 'streak', 'family' => 'carriere', 'pts' => 100,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'perfect_day_1',   'name' => 'Journée parfaite',   'desc' => 'Les 3 objectifs du jour complétés une fois',  'category' => 'discipline', 'family' => 'carriere', 'pts' => 20,  'tier' => 1, 'rarity' => 'commun', 'visible' => true],
        ['code' => 'perfect_week_7',  'name' => 'Semaine sans faute', 'desc' => '7 journées parfaites cumulées',               'category' => 'discipline', 'family' => 'carriere', 'pts' => 80,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'perfect_month_30','name' => 'Discipline de fer',  'desc' => '30 journées parfaites cumulées',              'category' => 'discipline', 'family' => 'carriere', 'pts' => 200, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'perfect_100',     'name' => 'Machine CHAIR',      'desc' => '100 journées parfaites cumulées',             'category' => 'discipline', 'family' => 'carriere', 'pts' => 450, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'pro_active', 'name' => 'Professionnel actif', 'desc' => 'Activité régulière sur CHAIR', 'category' => 'streak', 'family' => 'carriere', 'pts' => 50, 'tier' => 2, 'rarity' => 'rare', 'visible' => true],

        // ── Vérification (carrière) — décisions de vérification différées
        //    avec l'associé (indépendant vs salon), logique inchangée ──
        ['code' => 'verified',          'name' => 'Certifié CHAIR',    'desc' => 'Abonné CHAIR+', 'category' => 'vérification', 'family' => 'carriere', 'pts' => 100, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'identity_verified', 'name' => 'Identité vérifiée', 'desc' => 'Identité confirmée par CHAIR',                       'category' => 'vérification', 'family' => 'carriere', 'pts' => 80,  'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'siret_verified',    'name' => 'SIRET vérifié',     'desc' => 'Numéro SIRET salon validé',                          'category' => 'vérification', 'family' => 'carriere', 'pts' => 100, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'diploma_added',     'name' => 'Diplômé',           'desc' => 'Diplôme officiel de coiffure vérifié par CHAIR (CAP, BP, BM...)', 'category' => 'vérification', 'family' => 'carriere', 'pts' => 70,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],
        ['code' => 'formation_badge',   'name' => 'Formations suivies','desc' => 'A renseigné au moins une formation professionnelle suivie',       'category' => 'profil',       'family' => 'carriere', 'pts' => 60,  'tier' => 2, 'rarity' => 'rare', 'visible' => true],

        // ── Ambassadeur (carrière — le programme lui-même n'existe pas
        //    encore, badge verrouillé par construction, voir docs) ──
        ['code' => 'ambassador_program', 'name' => 'Ambassadeur CHAIR', 'desc' => '20 filleuls parrainés sur CHAIR', 'category' => 'ambassadeur', 'family' => 'carriere', 'pts' => 200, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],

        ['code' => 'new_talent', 'name' => 'Nouveau talent', 'desc' => 'Nouveau sur la plateforme', 'category' => 'spécial', 'family' => 'carriere', 'pts' => 0, 'tier' => 1, 'rarity' => 'commun', 'visible' => true],

        // ── EXCEPTIONNELS — badge noir, palier ultime ────────────────────────
        ['code' => 'top_5_local',        'name' => 'Top 5 local',         'desc' => "Classé dans le top 5 d'une spécialité, dans sa ville",             'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 350, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'top_10_local',       'name' => 'Top 10 local',        'desc' => "Classé dans le top 10 d'une spécialité, dans sa ville",            'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 200, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'top_3_local',        'name' => 'Podium local',        'desc' => "Classé dans le top 3 d'une spécialité, dans sa ville",             'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 500, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'pioneer_chair',      'name' => 'Pionnier CHAIR',      'desc' => 'Parmi les 200 premiers coiffeurs inscrits sur CHAIR',              'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 300, 'tier' => 3, 'rarity' => 'epique', 'visible' => true],
        ['code' => 'top_1_percent',      'name' => 'Top 1% CHAIR',        'desc' => 'Parmi le 1% des coiffeurs les mieux classés sur toute la plateforme','category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 600, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'national_reference', 'name' => 'Référence nationale', 'desc' => 'Top 1% France entière sur au moins une spécialité',                'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 800, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],
        ['code' => 'ambassador_national','name' => 'Ambassadeur national','desc' => '100 filleuls parrainés — a fait grandir CHAIR à l\'échelle nationale', 'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 900, 'tier' => 4, 'rarity' => 'legendaire', 'visible' => true],

        // ── Badge ultime — le "badge noir" absolu. Combinaison volontaire de
        //    critères (jamais un seul chiffre) : référence nationale sur au
        //    moins une spécialité + top 1% CHAIR toutes disciplines + ancienneté
        //    prouvée (≥3 ans) + activité récente + volume de clients distincts
        //    suffisant pour exclure tout coup de chance ou fraude isolée. Doit
        //    rester rare même dans 5 ou 10 ans (Julien, brief masterclass badges).
        ['code' => 'legende_ultime', 'name' => 'Légende ultime CHAIR', 'desc' => 'Référence nationale, top 1% CHAIR, 3 ans d\'ancienneté, activité récente et clientèle distincte prouvée — le sommet absolu', 'category' => 'exceptionnel', 'family' => 'exceptionnel', 'pts' => 500, 'tier' => 5, 'rarity' => 'ultime', 'visible' => true],
    ];

    // ── Niveaux ──────────────────────────────────────────────────────────────
    // Courbe volontairement asymétrique : les 2 premiers paliers restent
    // rapides/gratifiants (inchangés) pour accrocher un nouveau coiffeur dès
    // les premières semaines, mais l'écart se creuse fortement ensuite —
    // "Légende CHAIR" doit rester un vrai objectif pluriannuel, jamais
    // atteignable par quelques mois d'activité même très intense (Julien,
    // 2026-07-23 : "il ne faut pas que les gens finissent ça trop vite").
    const LEVELS = [
        ['level' => 0, 'name' => 'Débutant',      'min' => 0,    'max' => 99,   'color' => 'neutral'],
        ['level' => 1, 'name' => 'Actif',          'min' => 100,  'max' => 249,  'color' => 'bronze'],
        ['level' => 2, 'name' => 'Confirmé',       'min' => 250,  'max' => 599,  'color' => 'silver'],
        ['level' => 3, 'name' => 'Expert',         'min' => 600,  'max' => 1499, 'color' => 'gold'],
        ['level' => 4, 'name' => 'Elite',          'min' => 1500, 'max' => 3999, 'color' => 'purple'],
        ['level' => 5, 'name' => 'Légende CHAIR',  'min' => 4000, 'max' => null, 'color' => 'diamond'],
    ];

    // ── Vérification d'un badge ──────────────────────────────────────────────
    public static function isBadgeUnlocked(HairdresserProfile $profile, string $code): bool
    {
        $posts     = (int) ($profile->posts_count ?? 0);
        $followers = (int) ($profile->followers_count ?? 0);

        switch ($code) {
            // Profil
            case 'photo_added':    return !empty($profile->user->avatar ?? null);
            case 'banner_added':   return !empty($profile->banner_image);
            case 'full_profile':   return self::profileScore($profile) >= 80;
            case 'formation_badge':
                return DB::table('hairdresser_training_badges')
                    ->where('hairdresser_profile_id', $profile->id)
                    ->exists();

            // Démarrage — premières actions, dès les premiers jours
            case 'first_specialty':
                $profile->loadMissing('specialties');
                return $profile->specialties->count() >= 1;
            case 'first_review_received': return ($profile->reviews_count ?? 0) >= 1;
            case 'first_verified_visit':  return ($profile->verified_visits_count ?? 0) >= 1;
            case 'first_service':
                return DB::table('services')->where('hairdresser_id', $profile->id)->exists();
            case 'first_appointment':
                return $profile->is_independent
                    && DB::table('appointments')->where('hairdresser_id', $profile->id)->exists();
            case 'first_share':
                return $profile->user && DB::table('share_events')
                    ->where('user_id', $profile->user->id)
                    ->whereIn('action_type', ['share_profile', 'share_post'])
                    ->exists();

            // Réalisations totales (carrière, toutes spécialités confondues)
            case 'first_post':    return $posts >= 1;
            case 'portfolio_10':  return $posts >= 10;
            case 'portfolio_50':  return $posts >= 50;
            case 'portfolio_300': return $posts >= 300;

            // Avis et visites (carrière, globaux)
            case 'review_10':  return ($profile->reviews_count ?? 0) >= 10;
            case 'review_50':  return ($profile->reviews_count ?? 0) >= 50;
            case 'review_100': return ($profile->reviews_count ?? 0) >= 100;
            case 'review_500': return ($profile->reviews_count ?? 0) >= 500;
            case 'visit_25':   return ($profile->verified_visits_count ?? 0) >= 25;
            case 'visit_100':  return ($profile->verified_visits_count ?? 0) >= 100;
            case 'regular_clients_5':
                return self::countRegularClients($profile) >= 5;

            // Abonnés
            case 'follower_10':    return $followers >= 10;
            case 'follower_100':   return $followers >= 100;
            case 'follower_500':   return $followers >= 500;
            case 'follower_1000':  return $followers >= 1000;
            case 'follower_2500':  return $followers >= 2500;
            case 'follower_5000':  return $followers >= 5000;
            case 'follower_15000': return $followers >= 15000;

            // Partages — lecture seule de share_events (ReferralService reste
            // seul maître des règles de récompense/parrainage, non modifié ici)
            case 'share_10':
            case 'share_100':
            case 'share_1000': {
                if (!$profile->user) return false;
                $shares = DB::table('share_events')
                    ->where('user_id', $profile->user->id)
                    ->whereIn('action_type', ['share_profile', 'share_post'])
                    ->count();
                if ($code === 'share_10')   return $shares >= 10;
                if ($code === 'share_100')  return $shares >= 100;
                if ($code === 'share_1000') return $shares >= 1000;
            }

            // Ancienneté
            case 'veteran_3m':
            case 'veteran_1y':
            case 'veteran_3y':
            case 'veteran_7y': {
                $days = $profile->created_at ? now()->diffInDays($profile->created_at) : 0;
                if ($code === 'veteran_3m') return $days >= 90;
                if ($code === 'veteran_1y') return $days >= 365;
                if ($code === 'veteran_3y') return $days >= 1095;
                if ($code === 'veteran_7y') return $days >= 2555;
            }

            // Spécial / vérification
            case 'verified':      return $profile->hasChairPlus();
            case 'new_talent':
                $days = $profile->created_at ? now()->diffInDays($profile->created_at) : 999;
                return $days <= 90 && $posts >= 1;
            case 'identity_verified': return (bool) $profile->identity_verified;
            case 'siret_verified':
                return DB::table('salons')
                    ->where('id', $profile->salon_id)
                    ->where('verification_status', 'verified')
                    ->exists();
            case 'diploma_added':
                return $profile->diploma_status === 'verified';
            case 'pro_active':
                return $posts >= 3 && ($profile->visits_count ?? 0) >= 5;

            // Ambassadeur — voir docs/GROWTH.md. 20 filleuls (palier fondateur,
            // ne pas modifier sans repasser par Julien) pour le badge carrière,
            // 100 pour l'exceptionnel national (même palier que l'accès anticipé).
            case 'ambassador_program':
                return $profile->user && ReferralService::referralCount($profile->user) >= 20;
            case 'ambassador_national':
                return $profile->user && ReferralService::referralCount($profile->user) >= 100;

            // ── Exceptionnels ──
            case 'top_10_local':
                return SpecialtyReputationService::hasTop10Local($profile);
            case 'top_5_local':
                return SpecialtyReputationService::hasTopNLocal($profile, 5);
            case 'top_3_local':
                return SpecialtyReputationService::hasTopNLocal($profile, 3);
            case 'pioneer_chair':
                return $profile->id <= self::PIONEER_MAX_ID;
            case 'top_1_percent': {
                // Vrai percentile (1%, pas 10%) — comparé au chair_score déjà
                // persisté des autres coiffeurs actifs, deux COUNT indexés.
                $totalActive = DB::table('hairdresser_profiles')->where('posts_count', '>', 0)->count();
                if ($totalActive < 50) return false; // échantillon trop petit pour qu'un "top 1%" ait un sens
                $betterCount = DB::table('hairdresser_profiles')
                    ->where('posts_count', '>', 0)
                    ->where('chair_score', '>', $profile->chair_score ?? 0)
                    ->count();
                return ($betterCount / $totalActive) <= 0.01;
            }
            case 'national_reference':
                return SpecialtyReputationService::isNationalReference($profile);

            // Badge ultime — combinaison volontaire, jamais un seul chiffre
            // (voir commentaire du catalogue). Anti-fraude : ≥30 clients
            // distincts sur toute la carrière, pas seulement dans la
            // spécialité de référence.
            case 'legende_ultime': {
                if (!SpecialtyReputationService::isNationalReference($profile)) return false;
                if (!self::isBadgeUnlocked($profile, 'top_1_percent')) return false;
                if (!self::isBadgeUnlocked($profile, 'veteran_3y')) return false;

                $lastActivity = self::lastActivityAt($profile);
                if (!$lastActivity || now()->diffInDays($lastActivity) > 90) return false;

                return self::countDistinctClients($profile) >= 30;
            }

            // Streak
            case 'streak_7':
            case 'streak_30':
            case 'streak_100':
            case 'streak_365':
            case 'streak_1000':
            case 'weekly_4': {
                $streak = StreakService::get($profile->id);
                if ($code === 'streak_7')   return $streak['longest_streak'] >= 7;
                if ($code === 'streak_30')  return $streak['longest_streak'] >= 30;
                if ($code === 'streak_100') return $streak['longest_streak'] >= 100;
                if ($code === 'streak_365') return $streak['longest_streak'] >= 365;
                if ($code === 'streak_1000')return $streak['longest_streak'] >= 1000;
                if ($code === 'weekly_4')   return $streak['weekly_streak'] >= 4;
            }
            // Discipline (journées parfaites)
            case 'perfect_day_1':
            case 'perfect_week_7':
            case 'perfect_month_30':
            case 'perfect_100': {
                $perfectDays = StreakService::get($profile->id)['perfect_days_count'];
                if ($code === 'perfect_day_1')   return $perfectDays >= 1;
                if ($code === 'perfect_week_7')  return $perfectDays >= 7;
                if ($code === 'perfect_month_30')return $perfectDays >= 30;
                if ($code === 'perfect_100')     return $perfectDays >= 100;
            }
        }
        return false;
    }

    // ── Catalogue filtré par rôle — un badge agenda/RDV n'a aucun sens pour
    //    un salarié qui ne prend pas de réservation CHAIR, il ne doit même
    //    pas apparaître verrouillé dans sa collection (section 12 du brief).
    public static function catalogFor(HairdresserProfile $profile): array
    {
        $role = $profile->is_independent ? 'independent' : 'salaried';
        return array_values(array_filter(
            self::BADGES,
            fn($b) => empty($b['roles']) || in_array($role, $b['roles'], true)
        ));
    }

    // ── Tous les badges débloqués ────────────────────────────────────────────
    public static function getUnlockedBadges(HairdresserProfile $profile): array
    {
        // S'assurer que user est chargé
        $profile->loadMissing('user');

        // Dates réelles de déblocage (persistées par persistNewlyUnlocked) —
        // affichées sur la page badges, jamais recalculées/inventées.
        $unlockedAt = DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->pluck('unlocked_at', 'badge_code');

        $unlocked = [];
        foreach (self::catalogFor($profile) as $badge) {
            if (self::isBadgeUnlocked($profile, $badge['code'])) {
                $badge['unlocked_at'] = $unlockedAt->get($badge['code']);
                $unlocked[] = $badge;
            }
        }
        return $unlocked;
    }

    // ── Catalogue complet (débloqués ET verrouillés) — usage privé uniquement
    //    (page /pro/badges du coiffeur connecté). Ne JAMAIS exposer ceci sur le
    //    profil public : chair_badges_all (getUnlockedBadges) reste le seul
    //    champ public, volontairement limité aux badges réellement obtenus.
    public static function getFullCatalog(HairdresserProfile $profile): array
    {
        $profile->loadMissing('user');
        $unlockedAt = DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->pluck('unlocked_at', 'badge_code');

        return array_map(function ($badge) use ($profile, $unlockedAt) {
            $unlocked = self::isBadgeUnlocked($profile, $badge['code']);
            $badge['unlocked']    = $unlocked;
            $badge['unlocked_at'] = $unlocked ? $unlockedAt->get($badge['code']) : null;
            return $badge;
        }, self::catalogFor($profile));
    }

    // ── Badges visibles sur le profil public ─────────────────────────────────
    public static function getVisibleBadges(HairdresserProfile $profile): array
    {
        return array_values(array_filter(
            self::getUnlockedBadges($profile),
            fn($b) => $b['visible']
        ));
    }

    // ── Points totaux ────────────────────────────────────────────────────────
    // chair_score = points "carrière" (badges hors catégories spécialité) +
    // agrégat pondéré des scores de spécialité (voir SpecialtyReputationService
    // et docs/REPUTATION_ARCHITECTURE.md). Rafraîchit d'abord les lignes de
    // progression par spécialité pour que l'agrégat et le badge
    // specialty_reference reflètent l'état réel avant d'être lus.
    public static function computePoints(HairdresserProfile $profile): int
    {
        SpecialtyReputationService::refreshAll($profile);

        $pts = self::careerPoints($profile);
        $pts += SpecialtyReputationService::weightedAggregate($profile);

        return $pts;
    }

    private static function careerPoints(HairdresserProfile $profile): int
    {
        // Plus de filtre par catégorie : les badges "métier" (avis/visites/
        // réalisations par spécialité) ne sont plus dans self::BADGES du tout
        // depuis la V2 — ils vivent dans hairdresser_specialty_progress (voir
        // SpecialtyReputationService). Tout ce qui reste ici est carrière ou
        // exceptionnel, donc compte intégralement.
        $pts = 0;
        foreach (self::BADGES as $badge) {
            if ($badge['pts'] > 0 && self::isBadgeUnlocked($profile, $badge['code'])) {
                $pts += $badge['pts'];
            }
        }
        return $pts;
    }

    // ── Niveau ───────────────────────────────────────────────────────────────
    public static function getLevel(int $points): array
    {
        $current = self::LEVELS[0];
        $next    = self::LEVELS[1] ?? null;

        foreach (self::LEVELS as $i => $level) {
            if ($points >= $level['min']) {
                $current = $level;
                $next    = self::LEVELS[$i + 1] ?? null;
            }
        }

        $progress = $next
            ? min(100, (int) round(($points - $current['min']) / ($next['min'] - $current['min']) * 100))
            : 100;

        return [
            'level'    => $current['level'],
            'name'     => $current['name'],
            'color'    => $current['color'],
            'points'   => $points,
            'progress' => $progress,
            'next'     => $next ? ['name' => $next['name'], 'min' => $next['min']] : null,
        ];
    }

    // ── Gamification légère pour les listes (accueil / recherche / résultats) ──
    // Contrairement à show(), pas de recalcul des badges (trop coûteux pour une
    // page de résultats) — chair_level vient du chair_score déjà persisté par
    // refresh(), le streak d'une seule requête batchée sur les items affichés.
    // Utilisé par HairdresserController::index() et SearchController::search()
    // pour que l'anneau de niveau + la flamme de streak soient visibles partout,
    // pas seulement sur le profil individuel.
    public static function attachGamification(iterable $items): void
    {
        $ids = collect($items)->pluck('id');
        if ($ids->isEmpty()) return;

        $today   = now()->toDateString();
        $streaks = DB::table('hairdresser_streaks')
            ->whereIn('hairdresser_id', $ids)
            ->get()
            ->keyBy('hairdresser_id');

        foreach ($items as $h) {
            $h->chair_level = self::getLevel((int) ($h->chair_score ?? 0));
            $row = $streaks->get($h->id);
            $h->chair_streak = [
                'current_streak'  => $row->current_streak ?? 0,
                'is_active_today' => $row ? $row->last_activity_date === $today : false,
            ];
        }
    }

    // ── Recalcul des compteurs depuis la DB réelle ───────────────────────────
    // Appelé avant chaque lecture de badges pour garantir la cohérence.
    public static function syncCounters(HairdresserProfile $profile): void
    {
        $id = $profile->id;

        $postsCount = DB::table('posts')
            ->where('hairdresser_id', $id)
            ->where('is_published', true)
            ->count();

        $followersCount = DB::table('follows')
            ->where('hairdresser_id', $id)
            ->count();

        $reviews = DB::table('reviews')
            ->where('hairdresser_id', $id)
            ->selectRaw('COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg')
            ->first();

        $visitsCount = DB::table('appointments')
            ->where('hairdresser_id', $id)
            ->where('status', 'completed')
            ->count();

        $verifiedCount = DB::table('verified_visits')
            ->where('hairdresser_id', $id)
            ->count();

        $profile->posts_count        = $postsCount;
        $profile->followers_count    = $followersCount;
        $profile->reviews_count      = (int) $reviews->cnt;
        $profile->avg_rating         = round((float) $reviews->avg, 2);
        $profile->visits_count       = $visitsCount;
        $profile->verified_visits_count = $verifiedCount;

        // Persist silently (no events, no timestamps update)
        DB::table('hairdresser_profiles')->where('id', $id)->update([
            'posts_count'          => $postsCount,
            'followers_count'      => $followersCount,
            'reviews_count'        => (int) $reviews->cnt,
            'avg_rating'           => round((float) $reviews->avg, 2),
            'visits_count'         => $visitsCount,
            'verified_visits_count'=> $verifiedCount,
        ]);
    }

    // ── Rafraîchissement complet ─────────────────────────────────────────────
    // Point d'entrée unique appelé après toute action qui peut débloquer un
    // badge (post publié, avis reçu, RDV terminé...). Persiste les badges
    // nouvellement débloqués + le score/niveau, et notifie le coiffeur des
    // nouveaux déblocages. Retourne les badges nouvellement débloqués.
    public static function refresh(HairdresserProfile $profile): array
    {
        self::syncCounters($profile);
        // Doit tourner avant getUnlockedBadges() : le badge specialty_reference
        // lit hairdresser_specialty_progress, qui doit déjà être à jour.
        SpecialtyReputationService::refreshAll($profile);

        $unlocked = self::getUnlockedBadges($profile);
        $newlyUnlocked = self::persistNewlyUnlocked($profile, $unlocked);

        $points = self::careerPoints($profile) + SpecialtyReputationService::weightedAggregate($profile);
        $level = self::getLevel($points);

        DB::table('hairdresser_profiles')->where('id', $profile->id)->update([
            'chair_score' => $points,
            'chair_level' => $level['level'],
        ]);

        $profile->loadMissing('user');
        foreach ($newlyUnlocked as $badge) {
            NotificationService::send(
                $profile->user->id,
                'badge_unlocked',
                'Nouveau badge débloqué : ' . $badge['name'],
                $badge['desc'],
                ['code' => $badge['code'], 'tier' => $badge['tier']]
            );
        }

        return $newlyUnlocked;
    }

    // ── Persiste les badges tout juste débloqués, retourne les nouveaux ──────
    private static function persistNewlyUnlocked(HairdresserProfile $profile, array $unlocked): array
    {
        $alreadyKnown = DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->pluck('badge_code')
            ->all();

        $new = array_values(array_filter(
            $unlocked,
            fn($b) => !in_array($b['code'], $alreadyKnown, true)
        ));

        foreach ($new as $badge) {
            DB::table('hairdresser_badges')->insertOrIgnore([
                'hairdresser_profile_id' => $profile->id,
                'badge_code'             => $badge['code'],
                'unlocked_at'            => now(),
            ]);
        }

        return $new;
    }

    // ── Clients distincts revenus au moins deux fois (avis OU RDV terminés) ──
    private static function countRegularClients(HairdresserProfile $profile): int
    {
        $fromReviews = DB::table('reviews')
            ->where('hairdresser_id', $profile->id)
            ->whereNotNull('client_id')
            ->select('client_id')
            ->selectRaw('COUNT(*) as cnt')
            ->groupBy('client_id')
            ->havingRaw('COUNT(*) >= 2')
            ->pluck('client_id');

        $fromAppointments = DB::table('appointments')
            ->where('hairdresser_id', $profile->id)
            ->where('status', 'completed')
            ->whereNotNull('client_id')
            ->select('client_id')
            ->selectRaw('COUNT(*) as cnt')
            ->groupBy('client_id')
            ->havingRaw('COUNT(*) >= 2')
            ->pluck('client_id');

        return $fromReviews->merge($fromAppointments)->unique()->count();
    }

    // ── Clients distincts sur toute la carrière — anti-fraude du badge ultime ──
    private static function countDistinctClients(HairdresserProfile $profile): int
    {
        $fromReviews = DB::table('reviews')
            ->where('hairdresser_id', $profile->id)
            ->whereNotNull('client_id')
            ->distinct()
            ->pluck('client_id');

        $fromVisits = DB::table('verified_visits')
            ->where('hairdresser_id', $profile->id)
            ->whereNotNull('client_user_id')
            ->distinct()
            ->pluck('client_user_id');

        return $fromReviews->merge($fromVisits)->unique()->count();
    }

    // ── Dernière activité toutes spécialités confondues (post/avis/visite) ──
    private static function lastActivityAt(HairdresserProfile $profile): ?\Illuminate\Support\Carbon
    {
        $dates = array_filter([
            DB::table('posts')->where('hairdresser_id', $profile->id)->where('is_published', true)->max('created_at'),
            DB::table('reviews')->where('hairdresser_id', $profile->id)->max('created_at'),
            DB::table('verified_visits')->where('hairdresser_id', $profile->id)->max('scanned_at'),
        ]);
        if (empty($dates)) return null;
        return \Illuminate\Support\Carbon::parse(max($dates));
    }

    // ── Algorithme de proximité — "Défis en cours" ───────────────────────────
    // Unifie deux sources (badges carrière à seuil numérique + prochain palier
    // de spécialité) dans un seul classement par proximité, pour la carte
    // dominante "Prochain badge" et la section "Défis en cours" de la page
    // /pro/badges. Ne retourne jamais un badge déjà débloqué, jamais un badge
    // dont la condition n'est pas un simple compteur à incrémenter (rang,
    // vérification, combinaison) — ceux-là restent dans la collection mais ne
    // sont pas de bons "prochains objectifs" chiffrés.
    public static function nextBadges(HairdresserProfile $profile, int $limit = 5): array
    {
        $profile->loadMissing('specialties');

        $posts       = (int) ($profile->posts_count ?? 0);
        $followers   = (int) ($profile->followers_count ?? 0);
        $reviews     = (int) ($profile->reviews_count ?? 0);
        $visits      = (int) ($profile->verified_visits_count ?? 0);
        $streak      = StreakService::get($profile->id)['longest_streak'] ?? 0;
        $shares      = $profile->user
            ? DB::table('share_events')->where('user_id', $profile->user->id)->whereIn('action_type', ['share_profile', 'share_post'])->count()
            : 0;
        $accountDays = $profile->created_at ? now()->diffInDays($profile->created_at) : 0;

        // [current, target] pour chaque badge à condition numérique simple —
        // seule source de vérité pour la barre de progression affichée.
        $numeric = [
            'portfolio_10' => [$posts, 10], 'portfolio_50' => [$posts, 50], 'portfolio_300' => [$posts, 300],
            'follower_10' => [$followers, 10], 'follower_100' => [$followers, 100], 'follower_500' => [$followers, 500],
            'follower_1000' => [$followers, 1000], 'follower_2500' => [$followers, 2500], 'follower_5000' => [$followers, 5000], 'follower_15000' => [$followers, 15000],
            'review_10' => [$reviews, 10], 'review_50' => [$reviews, 50], 'review_100' => [$reviews, 100], 'review_500' => [$reviews, 500],
            'visit_25' => [$visits, 25], 'visit_100' => [$visits, 100],
            'share_10' => [$shares, 10], 'share_100' => [$shares, 100], 'share_1000' => [$shares, 1000],
            'streak_7' => [$streak, 7], 'streak_30' => [$streak, 30], 'streak_100' => [$streak, 100], 'streak_365' => [$streak, 365], 'streak_1000' => [$streak, 1000],
            'veteran_3m' => [$accountDays, 90], 'veteran_1y' => [$accountDays, 365], 'veteran_3y' => [$accountDays, 1095], 'veteran_7y' => [$accountDays, 2555],
        ];

        $candidates = [];
        foreach (self::getFullCatalog($profile) as $badge) {
            if ($badge['unlocked'] || !isset($numeric[$badge['code']])) continue;
            [$current, $target] = $numeric[$badge['code']];
            if ($current >= $target) continue; // condition annexe encore non remplie malgré le seuil (rare, ex. rôle)
            $candidates[] = [
                'type'    => 'badge',
                'code'    => $badge['code'],
                'name'    => $badge['name'],
                'tier'    => $badge['tier'],
                'rarity'  => $badge['rarity'],
                'current' => $current,
                'target'  => $target,
                'pct'     => (int) round(($current / $target) * 100),
            ];
        }

        // Prochain palier de spécialité — même logique que la carte "Expertise
        // métier", ré-exposée ici pour rivaliser à égalité avec les badges
        // carrière dans un seul classement de proximité.
        foreach (SpecialtyReputationService::forProfile($profile) as $row) {
            $step = SpecialtyReputationService::nextStepFor($profile, $row);
            if (!$step) continue;
            $candidates[] = [
                'type'           => 'specialty',
                'specialty_id'   => $step['specialty_id'],
                'specialty_name' => $step['specialty_name'],
                'name'           => $step['next_level_name'],
                'label'          => "Ajoutez {$step['missing']} {$step['label']}" . ($step['missing'] > 1 ? 's' : '') . " en {$step['specialty_name']} pour progresser vers {$step['next_level_name']}",
                // Heuristique de tri interne (jamais affichée telle quelle à
                // l'utilisateur) : moins il manque, plus c'est proche.
                'pct'            => max(10, 100 - $step['missing'] * 15),
            ];
        }

        usort($candidates, fn($a, $b) => $b['pct'] <=> $a['pct']);

        return array_slice($candidates, 0, $limit);
    }

    // ── Score de complétion profil (0-100) ───────────────────────────────────
    private static function profileScore(HairdresserProfile $profile): int
    {
        $score = 0;
        if (!empty($profile->user->avatar ?? null)) $score += 20;
        if (!empty($profile->banner_image))          $score += 15;
        if (!empty($profile->tagline))               $score += 10;
        if (!empty($profile->city))                  $score += 5;
        $specsCount = $profile->relationLoaded('specialties')
            ? $profile->specialties->count()
            : 0;
        if ($specsCount >= 2) $score += 20;
        if (($profile->posts_count ?? 0) >= 3) $score += 30;
        return $score;
    }
}
