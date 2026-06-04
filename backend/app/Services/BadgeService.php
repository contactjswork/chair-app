<?php

namespace App\Services;

use App\Models\HairdresserProfile;

class BadgeService
{
    // ── Définition de tous les badges ────────────────────────────────────────
    // pts    : points ajoutés au score CHAIR quand débloqué
    // tier   : 1=bronze, 2=argent, 3=or, 4=diamant
    // visible: true = affiché sur le profil public
    const BADGES = [
        // ── Profil ──
        ['code' => 'photo_added',   'name' => 'Première impression',  'desc' => 'Photo de profil ajoutée',              'category' => 'profil',       'pts' => 20,  'tier' => 1, 'visible' => false],
        ['code' => 'banner_added',  'name' => 'Vitrine',              'desc' => 'Bannière de profil ajoutée',            'category' => 'profil',       'pts' => 15,  'tier' => 1, 'visible' => false],
        ['code' => 'full_profile',  'name' => 'Profil complet',       'desc' => 'Toutes les infos remplies',             'category' => 'profil',       'pts' => 50,  'tier' => 2, 'visible' => true],
        // ── Contenu ──
        ['code' => 'first_post',    'name' => 'Première réalisation', 'desc' => '1ère réalisation publiée',              'category' => 'contenu',      'pts' => 30,  'tier' => 1, 'visible' => false],
        ['code' => 'portfolio_5',   'name' => 'Photographe',          'desc' => '5 réalisations publiées',               'category' => 'contenu',      'pts' => 50,  'tier' => 2, 'visible' => true],
        ['code' => 'portfolio_20',  'name' => 'Portfolio Pro',        'desc' => '20 réalisations publiées',              'category' => 'contenu',      'pts' => 100, 'tier' => 3, 'visible' => true],
        ['code' => 'portfolio_50',  'name' => 'Artiste CHAIR',        'desc' => '50 réalisations publiées',              'category' => 'contenu',      'pts' => 200, 'tier' => 4, 'visible' => true],
        // ── Communauté ──
        ['code' => 'first_follower','name' => 'Premiers fans',        'desc' => 'Premier abonné gagné',                  'category' => 'communauté',   'pts' => 15,  'tier' => 1, 'visible' => false],
        ['code' => 'popular_30',    'name' => 'Populaire',            'desc' => '30 abonnés',                            'category' => 'communauté',   'pts' => 60,  'tier' => 2, 'visible' => true],
        ['code' => 'influencer_100','name' => 'Influenceur',          'desc' => '100 abonnés',                           'category' => 'communauté',   'pts' => 120, 'tier' => 3, 'visible' => true],
        ['code' => 'star_500',      'name' => 'Star CHAIR',           'desc' => '500 abonnés',                           'category' => 'communauté',   'pts' => 300, 'tier' => 4, 'visible' => true],
        // ── Avis ──
        ['code' => 'first_review',  'name' => 'Voix des clients',     'desc' => 'Premier avis reçu',                     'category' => 'avis',         'pts' => 25,  'tier' => 1, 'visible' => false],
        ['code' => 'well_rated',    'name' => 'Bien noté',            'desc' => 'Note ≥ 4.5 avec 5+ avis',              'category' => 'avis',         'pts' => 80,  'tier' => 2, 'visible' => true],
        ['code' => 'excellent',     'name' => 'Excellent',            'desc' => 'Note ≥ 4.8 avec 10+ avis',             'category' => 'avis',         'pts' => 150, 'tier' => 3, 'visible' => true],
        ['code' => 'perfect',       'name' => 'Perfectionniste',      'desc' => 'Note 5.0 avec 5+ avis',                 'category' => 'avis',         'pts' => 250, 'tier' => 4, 'visible' => true],
        // ── Réservations ──
        ['code' => 'first_booking', 'name' => 'Premier client',       'desc' => '1er rendez-vous terminé',               'category' => 'réservations', 'pts' => 50,  'tier' => 1, 'visible' => false],
        ['code' => 'pro_10',        'name' => 'Pro confirmé',         'desc' => '10 rendez-vous réalisés',               'category' => 'réservations', 'pts' => 100, 'tier' => 2, 'visible' => true],
        ['code' => 'expert_50',     'name' => 'Expert',               'desc' => '50 rendez-vous réalisés',               'category' => 'réservations', 'pts' => 250, 'tier' => 3, 'visible' => true],
        ['code' => 'master_100',    'name' => 'Maestro',              'desc' => '100 rendez-vous réalisés',              'category' => 'réservations', 'pts' => 500, 'tier' => 4, 'visible' => true],
        // ── Visites vérifiées (QR) ──
        ['code' => 'visit_10',      'name' => 'Actif certifié',       'desc' => '10 visites vérifiées par QR CHAIR',     'category' => 'visites',      'pts' => 30,  'tier' => 1, 'visible' => true],
        ['code' => 'visit_50',      'name' => 'Pro certifié',         'desc' => '50 visites vérifiées par QR CHAIR',     'category' => 'visites',      'pts' => 80,  'tier' => 2, 'visible' => true],
        ['code' => 'visit_250',     'name' => 'Expert certifié',      'desc' => '250 visites vérifiées par QR CHAIR',    'category' => 'visites',      'pts' => 200, 'tier' => 3, 'visible' => true],
        ['code' => 'visit_1000',    'name' => 'Maestro certifié',     'desc' => '1000 visites vérifiées par QR CHAIR',   'category' => 'visites',      'pts' => 500, 'tier' => 4, 'visible' => true],
        // ── Spécial ──
        ['code' => 'verified',      'name' => 'Certifié CHAIR',       'desc' => 'Profil vérifié par CHAIR',              'category' => 'spécial',      'pts' => 100, 'tier' => 3, 'visible' => true],
        ['code' => 'new_talent',    'name' => 'Nouveau talent',       'desc' => 'Nouveau sur la plateforme',             'category' => 'spécial',      'pts' => 0,   'tier' => 1, 'visible' => true],
        ['code' => 'top_10',        'name' => 'Top 10%',              'desc' => 'Parmi les meilleurs coiffeurs CHAIR',   'category' => 'spécial',      'pts' => 150, 'tier' => 4, 'visible' => true],
    ];

    // ── Niveaux ──────────────────────────────────────────────────────────────
    const LEVELS = [
        ['level' => 0, 'name' => 'Débutant',      'min' => 0,    'max' => 99,   'color' => 'neutral'],
        ['level' => 1, 'name' => 'Actif',          'min' => 100,  'max' => 249,  'color' => 'bronze'],
        ['level' => 2, 'name' => 'Confirmé',       'min' => 250,  'max' => 499,  'color' => 'silver'],
        ['level' => 3, 'name' => 'Expert',         'min' => 500,  'max' => 999,  'color' => 'gold'],
        ['level' => 4, 'name' => 'Elite',          'min' => 1000, 'max' => 2499, 'color' => 'purple'],
        ['level' => 5, 'name' => 'Légende CHAIR',  'min' => 2500, 'max' => null, 'color' => 'diamond'],
    ];

    // ── Vérification d'un badge ──────────────────────────────────────────────
    public static function isBadgeUnlocked(HairdresserProfile $profile, string $code): bool
    {
        $posts     = (int) ($profile->posts_count ?? 0);
        $followers = (int) ($profile->followers_count ?? 0);
        $reviews   = (int) ($profile->reviews_count ?? 0);
        $rating    = (float) ($profile->avg_rating ?? 0);
        $visits    = (int) ($profile->visits_count ?? 0);

        $verified = (int) ($profile->verified_visits_count ?? 0);

        switch ($code) {
            // Profil
            case 'photo_added':    return !empty($profile->user->avatar ?? null);
            case 'banner_added':   return !empty($profile->banner_image);
            case 'full_profile':   return self::profileScore($profile) >= 80;
            // Contenu
            case 'first_post':    return $posts >= 1;
            case 'portfolio_5':   return $posts >= 5;
            case 'portfolio_20':  return $posts >= 20;
            case 'portfolio_50':  return $posts >= 50;
            // Communauté
            case 'first_follower': return $followers >= 1;
            case 'popular_30':     return $followers >= 30;
            case 'influencer_100': return $followers >= 100;
            case 'star_500':       return $followers >= 500;
            // Avis
            case 'first_review':  return $reviews >= 1;
            case 'well_rated':    return $reviews >= 5 && $rating >= 4.5;
            case 'excellent':     return $reviews >= 10 && $rating >= 4.8;
            case 'perfect':       return $reviews >= 5 && $rating >= 4.95;
            // Réservations
            case 'first_booking': return $visits >= 1;
            case 'pro_10':        return $visits >= 10;
            case 'expert_50':     return $visits >= 50;
            case 'master_100':    return $visits >= 100;
            // Visites vérifiées
            case 'visit_10':   return $verified >= 10;
            case 'visit_50':   return $verified >= 50;
            case 'visit_250':  return $verified >= 250;
            case 'visit_1000': return $verified >= 1000;
            // Spécial
            case 'verified':      return (bool) $profile->is_verified;
            case 'new_talent':
                $days = $profile->created_at ? now()->diffInDays($profile->created_at) : 999;
                return $days <= 90 && $posts >= 1;
            case 'top_10':
                // Placeholder — à implémenter avec scoring global
                $score = (float)($profile->avg_rating ?? 0) * min($reviews, 50) * 3
                       + min($followers, 500) * 0.2
                       + min($visits, 300) * 0.5;
                return $score >= 300;
        }
        return false;
    }

    // ── Tous les badges débloqués ────────────────────────────────────────────
    public static function getUnlockedBadges(HairdresserProfile $profile): array
    {
        // S'assurer que user est chargé
        $profile->loadMissing('user');

        $unlocked = [];
        foreach (self::BADGES as $badge) {
            if (self::isBadgeUnlocked($profile, $badge['code'])) {
                $unlocked[] = $badge;
            }
        }
        return $unlocked;
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
    public static function computePoints(HairdresserProfile $profile): int
    {
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
