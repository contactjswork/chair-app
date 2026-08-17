<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\HairdresserProfile;
use App\Services\NotificationService;
use App\Services\ReferralService;
use App\Services\SpecialtyReputationService;
use App\Services\StreakService;
use Illuminate\Support\Facades\DB;

/**
 * Moteur de badges — catalogue chargé depuis la table 'badges' (voir
 * migration 2026_08_17_140000, modèle App\Models\Badge), plus la même
 * constante que la mission a demandé de garder pour la doc en tête de
 * fichier. Deux façons dont un badge peut être "débloqué" :
 *
 * 1. GÉNÉRIQUE — badges.criteria = {metric, operator, value}. Évalué par
 *    evaluateCriteria() contre self::METRICS (liste blanche fixe de
 *    métriques calculables) et self::OPERATORS (>=, >, ==, <=, <).
 *    L'admin peut créer/modifier ces badges (AdminBadgeController) SANS
 *    toucher au code — c'est tout l'objet de cette table.
 *
 * 2. DÉDIÉE — badges.criteria = null, slug listé dans self::HARDCODED_SLUGS.
 *    La règle vit dans hardcodedUnlocked() ci-dessous : combinaison de
 *    plusieurs critères, classement relatif (top N local, percentile),
 *    statut venant d'un autre service (SIRET, identité, abonnement). PAS
 *    exprimable proprement en metric/operator/value — volontairement laissé
 *    en code, voir le rapport de mission. L'admin peut éditer leurs
 *    métadonnées (titre, description, icône, points, visibilité...) mais
 *    jamais leur logique de déblocage via l'API (AdminBadgeController
 *    refuse d'attacher un criteria à un slug de cette liste).
 */
class BadgeService
{
    // Au-delà de quel id de profil un coiffeur n'est plus "pionnier" —
    // constante figée, pas recalculée dynamiquement (sinon "pionnier"
    // perdrait son sens au fil du temps). Doublon volontaire de la valeur
    // seedée dans badges.criteria pour 'pioneer_chair' (voir migration) —
    // gardée en constante pour rester lisible dans ce fichier, pas relue
    // par le moteur (qui lit uniquement la ligne 'badges').
    const PIONEER_MAX_ID = 200;

    /**
     * Liste blanche FIXE des métriques calculables exposées au moteur
     * générique. Ajouter une métrique ici = ajouter son calcul dans
     * computeMetrics() ci-dessous — jamais d'expression libre/eval, une
     * métrique = une clé de ce tableau, un nombre.
     */
    const METRICS = [
        'posts_count', 'reviews_count', 'verified_visits_count', 'followers_count',
        'share_count', 'referral_count', 'account_age_days', 'longest_streak',
        'weekly_streak', 'perfect_days_count', 'regular_clients_count',
        'services_count', 'specialties_count', 'appointments_count', 'profile_id',
    ];

    /** Opérateurs autorisés dans badges.criteria — rien d'autre n'est évalué. */
    const OPERATORS = ['>=', '>', '==', '<=', '<'];

    /**
     * Slugs dont le déblocage reste écrit en dur dans hardcodedUnlocked()
     * (combinaison de critères ou classement relatif — voir docblock de
     * classe). AdminBadgeController s'appuie sur cette liste pour refuser
     * qu'un admin attache un criteria à l'un de ces slugs (le moteur
     * générique l'ignorerait silencieusement, mieux vaut un 422 explicite).
     */
    const HARDCODED_SLUGS = [
        'photo_added', 'banner_added', 'full_profile', 'formation_badge',
        'pro_active', 'verified', 'new_talent', 'identity_verified',
        'siret_verified', 'diploma_added',
        'top_5_local', 'top_10_local', 'top_3_local', 'top_1_percent',
        'national_reference', 'legende_ultime',
    ];

    /** Cache statique (durée de la requête) du catalogue actif, pour éviter une requête par badge évalué. */
    private static ?\Illuminate\Support\Collection $catalogCache = null;

    /** Cache statique (durée de la requête) des métriques déjà calculées par profil. */
    private static array $metricsCache = [];

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
    /**
     * Point d'entrée unique. Dispatch vers le moteur générique (criteria en
     * base) ou vers hardcodedUnlocked() (16 slugs listés dans
     * HARDCODED_SLUGS) selon ce que dit la ligne 'badges' de ce slug.
     */
    public static function isBadgeUnlocked(HairdresserProfile $profile, string $code): bool
    {
        $badge = self::badgeRow($code);

        if ($badge && $badge->criteria) {
            return self::evaluateCriteria(self::computeMetrics($profile), $badge->criteria);
        }

        return self::hardcodedUnlocked($profile, $code);
    }

    /**
     * Les 16 badges dont la règle ne rentre PAS dans metric/operator/value
     * (voir HARDCODED_SLUGS et le rapport de mission) : combinaison de
     * plusieurs critères, classement relatif, ou statut lu depuis un autre
     * domaine (abonnement, vérification identité/SIRET/diplôme). Codes
     * inchangés depuis l'ancienne const BADGES — seule la métadonnée
     * (titre, points, rareté...) a bougé vers la table 'badges'.
     */
    private static function hardcodedUnlocked(HairdresserProfile $profile, string $code): bool
    {
        switch ($code) {
            case 'photo_added':    return !empty($profile->user->avatar ?? null);
            case 'banner_added':   return !empty($profile->banner_image);
            case 'full_profile':   return self::profileScore($profile) >= 80;
            case 'formation_badge':
                return DB::table('hairdresser_training_badges')
                    ->where('hairdresser_profile_id', $profile->id)
                    ->exists();

            case 'verified': return $profile->hasChairPlus();
            case 'new_talent': {
                $posts = (int) ($profile->posts_count ?? 0);
                $days = $profile->created_at ? now()->diffInDays($profile->created_at) : 999;
                return $days <= 90 && $posts >= 1;
            }
            case 'identity_verified': return (bool) $profile->identity_verified;
            case 'siret_verified':
                return DB::table('salons')
                    ->where('id', $profile->salon_id)
                    ->where('verification_status', 'verified')
                    ->exists();
            case 'diploma_added':
                return $profile->diploma_status === 'verified';
            case 'pro_active':
                return (int) ($profile->posts_count ?? 0) >= 3 && ($profile->visits_count ?? 0) >= 5;

            // ── Exceptionnels — classement relatif ──
            case 'top_10_local':
                return SpecialtyReputationService::hasTop10Local($profile);
            case 'top_5_local':
                return SpecialtyReputationService::hasTopNLocal($profile, 5);
            case 'top_3_local':
                return SpecialtyReputationService::hasTopNLocal($profile, 3);
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
            // (voir migration de seed). Anti-fraude : ≥30 clients distincts
            // sur toute la carrière, pas seulement dans la spécialité de
            // référence.
            case 'legende_ultime': {
                if (!SpecialtyReputationService::isNationalReference($profile)) return false;
                if (!self::isBadgeUnlocked($profile, 'top_1_percent')) return false;
                if (!self::isBadgeUnlocked($profile, 'veteran_3y')) return false;

                $lastActivity = self::lastActivityAt($profile);
                if (!$lastActivity || now()->diffInDays($lastActivity) > 90) return false;

                return self::countDistinctClients($profile) >= 30;
            }
        }
        return false;
    }

    // ── Moteur générique ─────────────────────────────────────────────────────

    /** Ligne 'badges' pour ce slug (via le catalogue actif en cache), ou null si désactivé/inconnu. */
    private static function badgeRow(string $code): ?Badge
    {
        return self::allBadgeRows()->firstWhere('slug', $code);
    }

    private static function allBadgeRows(): \Illuminate\Support\Collection
    {
        if (self::$catalogCache === null) {
            self::$catalogCache = Badge::where('enabled', true)->orderBy('order')->orderBy('id')->get();
        }
        return self::$catalogCache;
    }

    /** À appeler après toute écriture sur la table badges (voir AdminBadgeController). */
    public static function clearCatalogCache(): void
    {
        self::$catalogCache = null;
    }

    /**
     * Évalue UNE règle {metric, operator, value} contre les métriques déjà
     * calculées. Whitelist stricte (self::METRICS / self::OPERATORS) — une
     * règle malformée ou une métrique/opérateur hors liste blanche ne
     * débloque JAMAIS rien, elle n'est pas interprétée comme du code.
     */
    private static function evaluateCriteria(array $metrics, $criteria): bool
    {
        if (!is_array($criteria)) return false;

        $metric   = $criteria['metric'] ?? null;
        $operator = $criteria['operator'] ?? null;
        $value    = $criteria['value'] ?? null;

        if (!in_array($metric, self::METRICS, true)) return false;
        if (!in_array($operator, self::OPERATORS, true)) return false;
        if (!is_numeric($value)) return false;
        if (!array_key_exists($metric, $metrics)) return false;

        $current = $metrics[$metric];

        switch ($operator) {
            case '>=': return $current >= $value;
            case '>':  return $current > $value;
            case '==': return $current == $value;
            case '<=': return $current <= $value;
            case '<':  return $current < $value;
        }
        return false;
    }

    /**
     * Calcule la liste blanche METRICS pour ce profil — une seule fois par
     * profil et par requête (cache statique, voir syncCounters() qui
     * l'invalide). Les compteurs déjà persistés sur le profil (posts,
     * followers, avis, visites) sont lus tels quels, jamais recalculés ici
     * (voir syncCounters() pour ça) ; le reste vient d'une requête ciblée.
     */
    private static function computeMetrics(HairdresserProfile $profile): array
    {
        if (isset(self::$metricsCache[$profile->id])) {
            return self::$metricsCache[$profile->id];
        }

        $profile->loadMissing('specialties');
        $streak = StreakService::get($profile->id);

        $metrics = [
            'posts_count'            => (int) ($profile->posts_count ?? 0),
            'reviews_count'          => (int) ($profile->reviews_count ?? 0),
            'verified_visits_count'  => (int) ($profile->verified_visits_count ?? 0),
            'followers_count'        => (int) ($profile->followers_count ?? 0),
            'share_count'            => self::shareCount($profile),
            'referral_count'         => $profile->user ? ReferralService::referralCount($profile->user) : 0,
            'account_age_days'       => $profile->created_at ? now()->diffInDays($profile->created_at) : 0,
            'longest_streak'         => (int) ($streak['longest_streak'] ?? 0),
            'weekly_streak'          => (int) ($streak['weekly_streak'] ?? 0),
            'perfect_days_count'     => (int) ($streak['perfect_days_count'] ?? 0),
            'regular_clients_count'  => self::countRegularClients($profile),
            'services_count'         => DB::table('services')->where('hairdresser_id', $profile->id)->count(),
            'specialties_count'      => $profile->specialties->count(),
            'appointments_count'     => DB::table('appointments')->where('hairdresser_id', $profile->id)->count(),
            'profile_id'             => (int) $profile->id,
        ];

        self::$metricsCache[$profile->id] = $metrics;
        return $metrics;
    }

    private static function shareCount(HairdresserProfile $profile): int
    {
        if (!$profile->user) return 0;
        return DB::table('share_events')
            ->where('user_id', $profile->user->id)
            ->whereIn('action_type', ['share_profile', 'share_post'])
            ->count();
    }

    // ── Catalogue filtré par rôle — un badge agenda/RDV n'a aucun sens pour
    //    un salarié qui ne prend pas de réservation CHAIR, il ne doit même
    //    pas apparaître verrouillé dans sa collection (section 12 du brief).
    public static function catalogFor(HairdresserProfile $profile): array
    {
        $role = $profile->is_independent ? 'independent' : 'salaried';
        return self::allBadgeRows()
            ->filter(fn(Badge $b) => empty($b->roles) || in_array($role, $b->roles, true))
            ->map(fn(Badge $b) => self::toArrayShape($b))
            ->values()
            ->all();
    }

    /**
     * Forme le même tableau associatif qu'avant (mêmes clés que l'ancienne
     * const BADGES) — contrat public inchangé pour tous les appelants
     * existants (frontend ApiChairBadge, AdminUserController, etc.).
     */
    private static function toArrayShape(Badge $b): array
    {
        return [
            'code'     => $b->slug,
            'name'     => $b->title,
            'desc'     => $b->description,
            'category' => $b->category,
            'family'   => $b->family,
            'pts'      => (int) $b->reward,
            'tier'     => (int) $b->tier,
            'rarity'   => $b->rarity,
            'visible'  => (bool) $b->visible,
            'roles'    => $b->roles ?? [],
        ];
    }

    // ── Codes attribués manuellement par un admin (AdminUserController::assignBadge)
    //    — force un badge visible même si isBadgeUnlocked() est faux (ex: badge
    //    exceptionnel décidé éditorialement). Voir migration 2026_08_17_130004.
    private static function manuallyAwardedCodes(HairdresserProfile $profile): array
    {
        return DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->where('is_admin_override', true)
            ->pluck('badge_code')
            ->all();
    }

    /** Débloqué "réellement" (condition calculée) OU forcé par un admin. */
    private static function isEffectivelyUnlocked(HairdresserProfile $profile, string $code, array $manualCodes): bool
    {
        return self::isBadgeUnlocked($profile, $code) || in_array($code, $manualCodes, true);
    }

    // ── Tous les badges débloqués ────────────────────────────────────────────
    public static function getUnlockedBadges(HairdresserProfile $profile): array
    {
        // S'assurer que user est chargé
        $profile->loadMissing('user');

        // Dates réelles de déblocage (persistées par persistNewlyUnlocked, ou
        // par AdminUserController::assignBadge pour une attribution manuelle) —
        // affichées sur la page badges, jamais recalculées/inventées.
        $unlockedAt = DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->pluck('unlocked_at', 'badge_code');
        $manualCodes = self::manuallyAwardedCodes($profile);

        $unlocked = [];
        foreach (self::catalogFor($profile) as $badge) {
            if (self::isEffectivelyUnlocked($profile, $badge['code'], $manualCodes)) {
                $badge['unlocked_at'] = $unlockedAt->get($badge['code']);
                $badge['admin_awarded'] = in_array($badge['code'], $manualCodes, true);
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
        $manualCodes = self::manuallyAwardedCodes($profile);

        return array_map(function ($badge) use ($profile, $unlockedAt, $manualCodes) {
            $unlocked = self::isEffectivelyUnlocked($profile, $badge['code'], $manualCodes);
            $badge['unlocked']      = $unlocked;
            $badge['unlocked_at']   = $unlocked ? $unlockedAt->get($badge['code']) : null;
            $badge['admin_awarded'] = in_array($badge['code'], $manualCodes, true);
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

    /**
     * Tous les slugs de badge valides — pour valider une attribution admin
     * (AdminUserController::assignBadge). Volontairement TOUS les badges,
     * y compris enabled=false : un admin doit pouvoir forcer manuellement
     * un badge temporairement retiré du catalogue actif.
     */
    public static function allBadgeCodes(): array
    {
        return Badge::pluck('slug')->all();
    }

    /**
     * Attribution manuelle par un admin (AdminUserController::assignBadge).
     * Idempotent : ré-attribuer un badge déjà présent ne change que
     * awarded_by_admin_id, jamais unlocked_at (date réelle conservée).
     */
    public static function adminAssign(HairdresserProfile $profile, string $code, int $adminUserId): void
    {
        $existing = DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->where('badge_code', $code)
            ->first();

        if ($existing) {
            DB::table('hairdresser_badges')->where('id', $existing->id)->update([
                'is_admin_override'   => true,
                'awarded_by_admin_id' => $adminUserId,
            ]);
            return;
        }

        DB::table('hairdresser_badges')->insert([
            'hairdresser_profile_id' => $profile->id,
            'badge_code'             => $code,
            'is_admin_override'      => true,
            'awarded_by_admin_id'    => $adminUserId,
            'unlocked_at'            => now(),
        ]);
    }

    /**
     * Retire un badge (annule une attribution manuelle, ou masque ponctuellement
     * un badge organique). Si la condition calculée par isBadgeUnlocked() reste
     * vraie (badge gagné légitimement par de vraies données), il réapparaîtra
     * au prochain BadgeService::refresh() — un badge organique n'est jamais
     * "faussé" pour rester retiré, seule une attribution manuelle est réversible
     * de façon permanente. Documenté comme tel côté admin (voir rapport).
     */
    public static function adminRemove(HairdresserProfile $profile, string $code): void
    {
        DB::table('hairdresser_badges')
            ->where('hairdresser_profile_id', $profile->id)
            ->where('badge_code', $code)
            ->delete();
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
        // Correction manuelle admin (AdminUserController::adjustPoints) — voir
        // migration 2026_08_17_130001. Additive, jamais écrasée par un
        // refresh() ultérieur puisque persistée dans sa propre colonne.
        $pts += (int) ($profile->chair_score_adjustment ?? 0);

        // chair_score est unsignedInteger — un retrait de points ne doit
        // jamais faire passer le total sous zéro.
        return max(0, $pts);
    }

    private static function careerPoints(HairdresserProfile $profile): int
    {
        // Plus de filtre par catégorie : les badges "métier" (avis/visites/
        // réalisations par spécialité) ne sont plus dans le catalogue du tout
        // depuis la V2 — ils vivent dans hairdresser_specialty_progress (voir
        // SpecialtyReputationService). Tout ce qui reste ici est carrière ou
        // exceptionnel, donc compte intégralement. catalogFor() (pas
        // allBadgeRows()) pour rester cohérent avec ce qui est réellement
        // affichable pour ce rôle — un badge restreint par 'roles' ne doit
        // jamais compter dans les points d'un profil qui ne peut pas le voir.
        $manualCodes = self::manuallyAwardedCodes($profile);

        $pts = 0;
        foreach (self::catalogFor($profile) as $badge) {
            if ($badge['pts'] > 0 && self::isEffectivelyUnlocked($profile, $badge['code'], $manualCodes)) {
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
        // Les métriques du moteur générique (computeMetrics) dépendent des
        // compteurs mis à jour ci-dessous — invalide le cache pour que le
        // prochain isBadgeUnlocked() de ce profil relise des valeurs fraîches
        // (protection contre un double syncCounters()+lecture dans la même requête).
        unset(self::$metricsCache[$profile->id]);

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
        $points += (int) ($profile->chair_score_adjustment ?? 0);
        $points = max(0, $points);
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
        $metrics = self::computeMetrics($profile);

        // Dérivé DIRECTEMENT de badges.criteria (metric/operator/'>=' uniquement
        // — une cible "au moins X" est la seule qui a un sens en barre de
        // progression). Contrairement à l'ancienne version, un badge généré
        // par un admin apparaît ici automatiquement, sans toucher au code.
        $candidates = [];
        foreach (self::getFullCatalog($profile) as $badge) {
            if ($badge['unlocked']) continue;

            $row = self::badgeRow($badge['code']);
            if (!$row || !$row->criteria) continue; // pas de logique dédiée/relative dans une barre de progression
            $criteria = $row->criteria;
            if (($criteria['operator'] ?? null) !== '>=') continue;
            $metric = $criteria['metric'] ?? null;
            if (!isset($metrics[$metric])) continue;

            $current = $metrics[$metric];
            $target  = $criteria['value'];
            if ($current >= $target) continue;

            $candidates[] = [
                'type'    => 'badge',
                'code'    => $badge['code'],
                'name'    => $badge['name'],
                'tier'    => $badge['tier'],
                'rarity'  => $badge['rarity'],
                'current' => $current,
                'target'  => $target,
                'pct'     => $target > 0 ? (int) round(($current / $target) * 100) : 0,
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
