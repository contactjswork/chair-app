<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\HairdresserSpecialtyProgress;
use App\Models\SpecialtyRankSnapshot;
use App\Services\GeoLookupService;
use Illuminate\Support\Facades\DB;

/**
 * Réputation par spécialité — voir docs/REPUTATION_ARCHITECTURE.md.
 *
 * Chaque spécialité choisie par un coiffeur a son propre score, calculé à
 * partir des réalisations, avis et visites QR RATTACHÉS à cette spécialité
 * (pas des compteurs globaux du profil). Le score carrière (chair_score) est
 * la somme des points "personal branding" (profil, communauté, streak,
 * discipline, vérification) + une agrégation PONDÉRÉE des scores de
 * spécialité — jamais une simple somme brute, pour qu'un coiffeur moyen dans
 * 8 spécialités ne dépasse jamais un expert très fort dans une seule.
 */
class SpecialtyReputationService
{
    // Poids décroissant appliqué aux spécialités triées par score décroissant.
    // Rang 1 (spécialité principale) compte plein pot, les suivantes de moins
    // en moins — la profondeur dans une spécialité compte plus que la largeur.
    const RANK_WEIGHTS = [1.00, 0.55, 0.32, 0.18, 0.10, 0.06, 0.04, 0.03, 0.02, 0.02];

    // Plafond : l'agrégat pondéré ne peut jamais dépasser un multiple du score
    // de la spécialité principale — garde-fou explicite en plus de la série de
    // poids (qui converge déjà naturellement autour de ~2.2x).
    const AGGREGATE_CAP_MULTIPLIER = 2.3;

    // Paliers "réalisations" (posts rattachés à la spécialité) — mêmes seuils
    // que les badges globaux existants (portfolio_5/20/50), appliqués ici par
    // spécialité plutôt qu'au profil entier.
    const CONTENT_TIERS = [
        ['min' => 1,  'pts' => 10],
        ['min' => 5,  'pts' => 30],
        ['min' => 20, 'pts' => 70],
        ['min' => 50, 'pts' => 150],
    ];

    // Paliers "avis" — nombre d'avis + note moyenne minimum, dans la spécialité.
    const REVIEW_TIERS = [
        ['minCount' => 1,  'minAvg' => 0,    'pts' => 20],
        ['minCount' => 5,  'minAvg' => 4.5,  'pts' => 70],
        ['minCount' => 10, 'minAvg' => 4.8,  'pts' => 130],
        ['minCount' => 5,  'minAvg' => 4.95, 'pts' => 220],
    ];

    // Paliers "visites vérifiées QR" dans la spécialité.
    const VISIT_TIERS = [
        ['min' => 10,   'pts' => 25],
        ['min' => 50,   'pts' => 70],
        ['min' => 250,  'pts' => 180],
        ['min' => 1000, 'pts' => 400],
    ];

    // Niveaux d'une spécialité — refonte du 31/08/2026 (décision Julien) :
    // CINQ paliers avec des mots qu'un coiffeur emploie vraiment, et c'est
    // LA SEULE échelle de niveau de toute l'app (le « niveau CHAIR » global
    // a été supprimé — il affichait « Expert » à côté d'un « Novice » de
    // spécialité, deux échelles pour la même tête).
    //
    // 0-2 = seuil de points seul. 3 (Maître) et 4 (Référence) combinent
    // TOUJOURS seuil de points ET critère relatif (voir levelFor()) — jamais
    // l'un sans l'autre, pour qu'un score élevé obtenu dans une ville sans
    // concurrence ne suffise pas, et qu'une bonne position relative sur un
    // échantillon trop petit ne suffise pas non plus.
    // rarity : reflet produit du niveau, utilisé par l'UI (pas de logique métier).
    const LEVELS = [
        ['level' => 0, 'name' => 'Nouveau',   'min' => 0,   'color' => 'neutral', 'rarity' => 'commun'],
        ['level' => 1, 'name' => 'Confirmé',  'min' => 60,  'color' => 'bronze',  'rarity' => 'commun'],
        ['level' => 2, 'name' => 'Expert',    'min' => 250, 'color' => 'gold',    'rarity' => 'rare'],
        ['level' => 3, 'name' => 'Maître',    'min' => 500, 'color' => 'purple',  'rarity' => 'legendaire'],
        ['level' => 4, 'name' => 'Référence', 'min' => 650, 'color' => 'diamond', 'rarity' => 'ultime'],
    ];

    // Niveau 3 "Maître" : seuil de points ET top 1% dans sa ville.
    const LOCAL_REFERENCE_MIN_SCORE = 500;
    const MIN_SAMPLE_LOCAL = 15;

    // Niveau 4 "Référence". Combine délibérément les 4 critères : seuil
    // absolu élevé, position relative (top 1% RÉGIONAL — échantillon plus
    // large et donc plus dur que le local), activité récente DANS la
    // spécialité, et un signal anti-fraude (plusieurs clients distincts,
    // pas un seul compte qui spamme des avis pour gonfler le score).
    const REGIONAL_REFERENCE_MIN_SCORE = 650;
    const MIN_SAMPLE_REGIONAL = 30;
    const REGIONAL_RECENCY_DAYS = 90;
    const REGIONAL_MIN_DISTINCT_REVIEWERS = 5;

    // « Top 1% France » — n'est plus un niveau à part : c'est une MENTION
    // d'élite posée sur le palier Référence (is_national_reference), avec
    // les mêmes 4 critères à l'échelle du pays.
    const NATIONAL_REFERENCE_MIN_SCORE = 700;
    const MIN_SAMPLE_NATIONAL = 50;
    const NATIONAL_RECENCY_DAYS = 90;
    const NATIONAL_MIN_DISTINCT_REVIEWERS = 8;

    /**
     * Recalcule et persiste le score/niveau de chaque spécialité du coiffeur.
     * Retourne les lignes à jour (collection de HairdresserSpecialtyProgress).
     */
    public static function refreshAll(HairdresserProfile $profile)
    {
        $profile->loadMissing('specialties');
        $results = collect();

        foreach ($profile->specialties as $specialty) {
            $results->push(self::refreshOne($profile, $specialty->id));
        }

        // Nettoie les lignes de spécialités que le coiffeur ne coche plus.
        HairdresserSpecialtyProgress::where('hairdresser_id', $profile->id)
            ->whereNotIn('specialty_id', $profile->specialties->pluck('id'))
            ->delete();

        return $results;
    }

    private static function refreshOne(HairdresserProfile $profile, int $specialtyId): HairdresserSpecialtyProgress
    {
        // Une réalisation compte pour une spécialité si c'est sa spécialité
        // principale OU si elle y est taguée en secondaire (post_tags) — ex.
        // "Dégradé américain" tagué Coupe Homme + Barbe compte dans les deux.
        $postsCount = DB::table('posts')
            ->where('posts.hairdresser_id', $profile->id)
            ->where('posts.is_published', true)
            ->where(function ($q) use ($specialtyId) {
                $q->where('posts.specialty_id', $specialtyId)
                  ->orWhereIn('posts.id', function ($sub) use ($specialtyId) {
                      $sub->select('post_id')->from('post_tags')->where('specialty_id', $specialtyId);
                  });
            })
            ->count();

        $reviewStats = DB::table('reviews')
            ->where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)
            ->selectRaw('COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg')
            ->first();

        // "Visite prouvée" dans cette spécialité = RDV réservé et honoré via
        // CHAIR OU visite vérifiée par QR — les deux anciennes catégories
        // globales "réservations" et "visites" se rejoignent ici en une seule
        // dimension par spécialité (toutes deux prouvent un passage réel).
        $qrVisitsCount = DB::table('verified_visits')
            ->where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)
            ->count();

        $appointmentVisitsCount = DB::table('appointments')
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->where('appointments.hairdresser_id', $profile->id)
            ->where('appointments.status', 'completed')
            ->where('services.specialty_id', $specialtyId)
            ->count();

        $visitsCount = $qrVisitsCount + $appointmentVisitsCount;

        $reviewsCount = (int) $reviewStats->cnt;
        $avgRating    = round((float) $reviewStats->avg, 2);

        $score = self::tierPoints(self::CONTENT_TIERS, $postsCount)
            + self::reviewTierPoints($reviewsCount, $avgRating)
            + self::tierPoints(self::VISIT_TIERS, $visitsCount);

        $row = HairdresserSpecialtyProgress::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'specialty_id' => $specialtyId],
            [
                'score'         => $score,
                'posts_count'   => $postsCount,
                'reviews_count' => $reviewsCount,
                'avg_rating'    => $avgRating,
                'visits_count'  => $visitsCount,
            ]
        );

        self::refreshReferenceStatus($row);
        $row->update(['level' => self::levelFor($profile, $row)['level']]);

        return $row;
    }

    /**
     * "Top 1%" LOCAL (ville) — critère relatif volontairement dur, combiné à
     * un seuil de points (voir LEVELS). S'auto-ajuste avec la croissance de
     * la plateforme, contrairement à un seuil de points fixe qui
     * s'assouplirait mécaniquement avec le temps.
     */
    private static function refreshReferenceStatus(HairdresserSpecialtyProgress $row): void
    {
        $profile = HairdresserProfile::find($row->hairdresser_id);
        if (!$profile) return;

        if ($row->score < self::LOCAL_REFERENCE_MIN_SCORE) {
            if ($row->is_reference) $row->update(['is_reference' => false]);
            return;
        }

        // Même logique que rankedRows() : pas de filtre posts_count, un score
        // de spécialité > 0 (déjà garanti par la jointure ci-dessous) suffit à
        // prouver une activité réelle — sinon les salariés sans réalisation
        // publiée seraient structurellement exclus du "top 1%".
        $peersQuery = DB::table('hairdresser_specialty_progress as hsp')
            ->join('hairdresser_profiles as hp', 'hp.id', '=', 'hsp.hairdresser_id')
            ->where('hsp.specialty_id', $row->specialty_id)
            ->where('hsp.score', '>', 0);

        if ($profile->city) {
            $peersQuery->where('hp.city', 'LIKE', '%' . $profile->city . '%');
        }

        $total = (clone $peersQuery)->count();

        if ($total < self::MIN_SAMPLE_LOCAL) {
            if ($row->is_reference) $row->update(['is_reference' => false]);
            return;
        }

        $better = (clone $peersQuery)->where('hsp.score', '>', $row->score)->count();
        $isReference = ($better / $total) <= 0.01;

        if ($isReference !== (bool) $row->is_reference) {
            $row->update(['is_reference' => $isReference]);
        }
    }

    /**
     * Niveau 5 "Référence régionale" (badge noir) — combine les 4 critères
     * demandés. Le seuil de score élevé sert de garde-fou d'entrée bon marché
     * avant de lancer les requêtes plus coûteuses (percentile régional).
     */
    public static function isRegionalReference(HairdresserProfile $profile, int $specialtyId): bool
    {
        $row = HairdresserSpecialtyProgress::where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)->first();
        if (!$row || $row->score < self::REGIONAL_REFERENCE_MIN_SCORE) return false;

        // Activité récente DANS cette spécialité (pas juste globale sur le profil).
        $lastActivity = self::lastActivityBySpecialty(collect([$profile->id]), $specialtyId)->get($profile->id);
        if (!$lastActivity || now()->diffInDays($lastActivity) > self::REGIONAL_RECENCY_DAYS) return false;

        // Anti-fraude : plusieurs clients distincts, pas un seul compte qui
        // spamme des avis pour gonfler artificiellement le score.
        $distinctReviewers = DB::table('reviews')
            ->where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)
            ->whereNotNull('client_id')
            ->distinct()
            ->count('client_id');
        if ($distinctReviewers < self::REGIONAL_MIN_DISTINCT_REVIEWERS) return false;

        $region = $profile->region ?: GeoLookupService::regionName($profile->postal_code);
        if (!$region) return false;

        $rows = self::rankedRows($specialtyId, 'region', $region);
        if ($rows->count() < self::MIN_SAMPLE_REGIONAL) return false;

        $index = $rows->search(fn($r) => $r->hairdresser_id === $profile->id);
        if ($index === false) return false;

        return ($index / $rows->count()) <= 0.01;
    }

    /**
     * Niveau 6 "Référence nationale" d'UNE spécialité précise — même logique
     * que isRegionalReference() mais à l'échelle du pays entier, avec un
     * échantillon minimum et un nombre de clients distincts plus élevés.
     */
    public static function isNationalReferenceForSpecialty(HairdresserProfile $profile, int $specialtyId): bool
    {
        $row = HairdresserSpecialtyProgress::where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)->first();
        if (!$row || $row->score < self::NATIONAL_REFERENCE_MIN_SCORE) return false;

        $lastActivity = self::lastActivityBySpecialty(collect([$profile->id]), $specialtyId)->get($profile->id);
        if (!$lastActivity || now()->diffInDays($lastActivity) > self::NATIONAL_RECENCY_DAYS) return false;

        $distinctReviewers = DB::table('reviews')
            ->where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)
            ->whereNotNull('client_id')
            ->distinct()
            ->count('client_id');
        if ($distinctReviewers < self::NATIONAL_MIN_DISTINCT_REVIEWERS) return false;

        $rows = self::rankedRows($specialtyId, 'country', null);
        if ($rows->count() < self::MIN_SAMPLE_NATIONAL) return false;

        $index = $rows->search(fn($r) => $r->hairdresser_id === $profile->id);
        if ($index === false) return false;

        return ($index / $rows->count()) <= 0.01;
    }

    /**
     * "Référence nationale" (badge exceptionnel carrière, pas un niveau de
     * spécialité) — top 1% France entière sur au moins une spécialité.
     */
    public static function isNationalReference(HairdresserProfile $profile): bool
    {
        $profile->loadMissing('specialties');
        foreach ($profile->specialties as $specialty) {
            $row = HairdresserSpecialtyProgress::where('hairdresser_id', $profile->id)
                ->where('specialty_id', $specialty->id)->first();
            if (!$row || $row->score <= 0) continue;

            $rows = self::rankedRows($specialty->id, 'country', null);
            if ($rows->count() < self::MIN_SAMPLE_NATIONAL) continue;

            $index = $rows->search(fn($r) => $r->hairdresser_id === $profile->id);
            if ($index !== false && ($index / $rows->count()) <= 0.01) return true;
        }
        return false;
    }

    /**
     * Niveau affiché d'une spécialité — combine score ET critère relatif pour
     * les niveaux 4/5, jamais l'un sans l'autre.
     */
    public static function levelFor(HairdresserProfile $profile, HairdresserSpecialtyProgress $row): array
    {
        // Régional OU national → Référence (le national ajoute la mention
        // « Top 1% France » via is_national_reference, pas un palier de plus).
        if ($row->score >= self::REGIONAL_REFERENCE_MIN_SCORE
            && (self::isRegionalReference($profile, $row->specialty_id)
                || ($row->score >= self::NATIONAL_REFERENCE_MIN_SCORE && self::isNationalReferenceForSpecialty($profile, $row->specialty_id)))) {
            return self::LEVELS[4];
        }
        if ($row->score >= self::LOCAL_REFERENCE_MIN_SCORE && $row->is_reference) {
            return self::LEVELS[3];
        }
        return self::scoreLevelCap($row->score);
    }

    /** Niveaux 0-2 seulement — pas de critère relatif requis. */
    private static function scoreLevelCap(int $score): array
    {
        $current = self::LEVELS[0];
        foreach (array_slice(self::LEVELS, 0, 3) as $level) {
            if ($score >= $level['min']) $current = $level;
        }
        return $current;
    }

    /**
     * Score global carrière = somme pondérée des scores de spécialité.
     * PAS une simple somme brute : la spécialité la plus forte compte plein
     * pot, les suivantes de moins en moins (RANK_WEIGHTS), avec un plafond
     * dur pour empêcher un profil "moyen partout" de dépasser un profil
     * "excellent dans un seul domaine".
     */
    public static function weightedAggregate(HairdresserProfile $profile): int
    {
        $scores = HairdresserSpecialtyProgress::where('hairdresser_id', $profile->id)
            ->orderByDesc('score')
            ->pluck('score')
            ->all();

        if (empty($scores)) return 0;

        // end() exige une variable passée par référence — une constante de
        // classe (self::RANK_WEIGHTS) n'en est pas une, PHP 8 lève une Error
        // fatale ("cannot be passed by reference") dès qu'un coiffeur a plus
        // de spécialités notées que RANK_WEIGHTS n'a de paliers (10) — cassait
        // /profile et le profil public de tout coiffeur dans ce cas.
        $lastWeight = self::RANK_WEIGHTS[count(self::RANK_WEIGHTS) - 1];
        $sum = 0.0;
        foreach ($scores as $i => $score) {
            $weight = self::RANK_WEIGHTS[$i] ?? $lastWeight;
            $sum += $score * $weight;
        }

        $cap = $scores[0] * self::AGGREGATE_CAP_MULTIPLIER;

        return (int) round(min($sum, $cap));
    }

    /**
     * "Ajoutez 2 réalisations Coupe Homme pour progresser vers Expert" — le
     * levier le plus proche pour passer au niveau suivant de cette
     * spécialité. Retourne null si aucun levier actionnable (niveau max, ou
     * seul un critère relatif/qualitatif manque, pas quelque chose à "ajouter").
     */
    public static function nextStepFor(HairdresserProfile $profile, HairdresserSpecialtyProgress $row): ?array
    {
        $level = self::levelFor($profile, $row);
        $levelIndex = array_search($level['level'], array_column(self::LEVELS, 'level'), true);
        $next = self::LEVELS[$levelIndex + 1] ?? null;
        if (!$next || $next['min'] === null) return null;

        $candidates = [];

        $contentGap = self::gapToNextTier(self::CONTENT_TIERS, $row->posts_count);
        if ($contentGap) $candidates[] = ['type' => 'content', 'missing' => $contentGap, 'label' => 'réalisation'];

        $visitGap = self::gapToNextTier(self::VISIT_TIERS, $row->visits_count);
        if ($visitGap) $candidates[] = ['type' => 'visits', 'missing' => $visitGap, 'label' => 'visite vérifiée'];

        $reviewGap = self::gapToNextReviewTier($row->reviews_count, (float) $row->avg_rating);
        if ($reviewGap) $candidates[] = ['type' => 'reviews', 'missing' => $reviewGap, 'label' => 'avis'];

        if (empty($candidates)) return null;

        usort($candidates, fn($a, $b) => $a['missing'] <=> $b['missing']);
        $best = $candidates[0];

        return [
            'specialty_id'      => $row->specialty_id,
            'specialty_name'    => $row->specialty->name ?? null,
            'next_level_name'   => $next['name'],
            'next_level_min'    => $next['min'],
            // Levier le plus proche — pour un CTA unique ("prochaine action").
            'type'            => $best['type'],
            'missing'         => $best['missing'],
            'label'           => $best['label'],
            // TOUS les leviers manquants — pour "il manque : 2 réalisations
            // ET 1 avis" (ex. cockpit "prochain badge"), même donnée, vue complète.
            'gaps'            => $candidates,
        ];
    }

    private static function gapToNextTier(array $tiers, int $count): ?int
    {
        foreach ($tiers as $tier) {
            if ($count < $tier['min']) return $tier['min'] - $count;
        }
        return null;
    }

    private static function gapToNextReviewTier(int $count, float $avg): ?int
    {
        foreach (self::REVIEW_TIERS as $tier) {
            if ($count < $tier['minCount'] && $avg >= $tier['minAvg']) {
                return $tier['minCount'] - $count;
            }
        }
        return null;
    }

    public static function hasAnyReference(HairdresserProfile $profile): bool
    {
        return HairdresserSpecialtyProgress::where('hairdresser_id', $profile->id)
            ->where('is_reference', true)
            ->exists();
    }

    /** Badge exceptionnel "Top 10 local" — classé ≤10 dans SA ville, sur au moins une spécialité. */
    public static function hasTop10Local(HairdresserProfile $profile): bool
    {
        return self::hasTopNLocal($profile, 10);
    }

    /** Généralisation — classé ≤N dans SA ville, sur au moins une spécialité (badges Top 5 / Top 3). */
    public static function hasTopNLocal(HairdresserProfile $profile, int $n): bool
    {
        $profile->loadMissing('specialties');
        foreach ($profile->specialties as $specialty) {
            $rank = self::rankFor($profile, $specialty->id, 'city', $profile->city);
            if ($rank && $rank['rank'] <= $n && $rank['total'] >= self::MIN_SAMPLE_LOCAL) return true;
        }
        return false;
    }

    /** Toutes les lignes de progression du coiffeur, avec la spécialité chargée. */
    public static function forProfile(HairdresserProfile $profile)
    {
        return HairdresserSpecialtyProgress::with('specialty')
            ->where('hairdresser_id', $profile->id)
            ->orderByDesc('score')
            ->get();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static function tierPoints(array $tiers, int $count): int
    {
        $pts = 0;
        foreach ($tiers as $tier) {
            if ($count >= $tier['min']) $pts = $tier['pts'];
        }
        return $pts;
    }

    private static function reviewTierPoints(int $count, float $avg): int
    {
        $pts = 0;
        foreach (self::REVIEW_TIERS as $tier) {
            if ($count >= $tier['minCount'] && $avg >= $tier['minAvg']) {
                $pts = max($pts, $tier['pts']);
            }
        }
        return $pts;
    }

    public static function levelForScore(int $score): array
    {
        $current = self::LEVELS[0];
        foreach (self::LEVELS as $level) {
            if ($level['min'] !== null && $score >= $level['min']) {
                $current = $level;
            }
        }
        return $current;
    }

    // ── Classements par spécialité (voir docs/REPUTATION_ARCHITECTURE.md) ────

    // Au-delà de 6 mois sans la moindre activité dans la spécialité, le score
    // pèse moins dans le classement (un score gelé ne doit pas rester #1
    // indéfiniment) ; au-delà d'un an, le coiffeur sort complètement du
    // classement de cette spécialité — l'inactivité prolongée est un signal
    // aussi fort qu'un mauvais score.
    const RECENCY_DECAY_DAYS = 180;
    const RECENCY_CUTOFF_DAYS = 365;

    /**
     * Classement complet (rangs + scores ajustés par l'activité récente),
     * filtré géographiquement. Retourne les lignes BRUTES triées — la
     * décoration pour l'API publique se fait dans leaderboard()/rankFor().
     */
    private static function rankedRows(int $specialtyId, string $geo, ?string $geoValue, ?float $lat = null, ?float $lng = null, ?float $radiusKm = null)
    {
        // Pas de filtre sur hp.posts_count : un salarié sans aucune réalisation
        // publiée mais avec de vrais avis/visites vérifiés dans la spécialité
        // (hsp.score > 0, déjà une preuve d'activité réelle) doit pouvoir être
        // classé — sinon le classement spécialité pénalise injustement les
        // salariés, alors que c'est exactement le public qu'il doit aussi servir.
        $rows = DB::table('hairdresser_specialty_progress as hsp')
            ->join('hairdresser_profiles as hp', 'hp.id', '=', 'hsp.hairdresser_id')
            ->join('users as u', 'u.id', '=', 'hp.user_id')
            ->where('hsp.specialty_id', $specialtyId)
            ->where('hsp.score', '>', 0)
            ->select([
                'hsp.hairdresser_id', 'hsp.score', 'hsp.level', 'hsp.is_reference',
                'hp.slug', 'hp.city', 'hp.postal_code', 'hp.department', 'hp.region', 'hp.is_verified',
                'hp.latitude', 'hp.longitude',
                'u.name', 'u.avatar',
            ])
            ->get();

        if ($geo === 'radius' && $lat !== null && $lng !== null && $radiusKm !== null) {
            $rows = self::filterByRadius($rows, $lat, $lng, $radiusKm);
        } elseif ($geo !== 'country' && $geoValue) {
            $rows = self::filterByGeo($rows, $geo, $geoValue);
        }

        if ($rows->isEmpty()) return collect();

        $ids = $rows->pluck('hairdresser_id');
        $lastActivity = self::lastActivityBySpecialty($ids, $specialtyId);

        return $rows->map(function ($row) use ($lastActivity) {
            $last = $lastActivity->get($row->hairdresser_id);
            $daysSince = $last ? now()->diffInDays($last) : 99999;

            if ($daysSince > self::RECENCY_CUTOFF_DAYS) return null; // exclu, inactif >1 an
            $decay = $daysSince > self::RECENCY_DECAY_DAYS ? 0.7 : 1.0;

            $row->adjusted_score = (int) round($row->score * $decay);
            return $row;
        })
        ->filter()
        ->sortByDesc('adjusted_score')
        ->values();
    }

    /**
     * Classement LOCALISÉ sur la position réelle du compte (lat/lng du
     * profil client, jamais le GPS appareil) — rayon en km, plus permissif
     * que le filtre ville/département exact (matching textuel) qui ratait
     * les coiffeurs juste de l'autre côté d'une frontière administrative.
     */
    private static function filterByRadius($rows, float $lat, float $lng, float $radiusKm)
    {
        return $rows->filter(function ($r) use ($lat, $lng, $radiusKm) {
            if ($r->latitude === null || $r->longitude === null) return false;
            return self::haversineKm($lat, $lng, (float) $r->latitude, (float) $r->longitude) <= $radiusKm;
        })->values();
    }

    private static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        return \App\Services\Geo::haversineKm($lat1, $lng1, $lat2, $lng2);
    }

    private static function filterByGeo($rows, string $geo, string $value)
    {
        if ($geo === 'city') {
            $needle = mb_strtolower($value);
            return $rows->filter(fn($r) => $r->city && str_contains(mb_strtolower($r->city), $needle))->values();
        }

        if ($geo === 'department') {
            $needle = mb_strtolower(trim($value));
            $codes  = GeoLookupService::departmentCodesFor($value);
            return $rows->filter(fn($r) => self::matchesDepartment($r, $needle, $codes))->values();
        }

        if ($geo === 'region') {
            $needle = mb_strtolower(trim($value));
            $codes  = GeoLookupService::departmentCodesForRegion($value);
            return $rows->filter(fn($r) => self::matchesRegion($r, $needle, $codes))->values();
        }

        if ($geo === 'auto') {
            // Un seul champ libre côté client — on devine le niveau plutôt que de
            // lui faire choisir "ville/département/région" : nom de département ou
            // de région (correspondance exacte, sans ambiguïté) en priorité, sinon
            // recherche ville (sous-chaîne, plus permissive).
            $needle = mb_strtolower(trim($value));
            $deptCodes = GeoLookupService::departmentCodesFor($value);
            if (!empty($deptCodes)) {
                return $rows->filter(fn($r) => self::matchesDepartment($r, $needle, $deptCodes))->values();
            }
            $regionCodes = GeoLookupService::departmentCodesForRegion($value);
            if (!empty($regionCodes)) {
                return $rows->filter(fn($r) => self::matchesRegion($r, $needle, $regionCodes))->values();
            }
            return $rows->filter(fn($r) => $r->city && str_contains(mb_strtolower($r->city), $needle))->values();
        }

        return $rows;
    }

    /**
     * Une valeur department/region stockée (choisie via le sélecteur en
     * cascade à l'inscription, voir GeoController) est exacte et prime sur
     * la dérivation par code postal — repli uniquement pour les profils
     * plus anciens qui n'ont que le code postal.
     */
    private static function matchesDepartment($row, string $needle, array $codes): bool
    {
        if (!empty($row->department)) return mb_strtolower($row->department) === $needle;
        if (empty($codes)) return false;
        return in_array(GeoLookupService::departmentCodeFromPostal($row->postal_code), $codes, true);
    }

    private static function matchesRegion($row, string $needle, array $codes): bool
    {
        if (!empty($row->region)) return mb_strtolower($row->region) === $needle;
        if (empty($codes)) return false;
        return in_array(GeoLookupService::departmentCodeFromPostal($row->postal_code), $codes, true);
    }

    /** Dernière activité (post/avis/visite) de chaque coiffeur DANS cette spécialité. */
    private static function lastActivityBySpecialty($hairdresserIds, int $specialtyId)
    {
        $posts = DB::table('posts')
            ->whereIn('hairdresser_id', $hairdresserIds)
            ->where('is_published', true)
            ->where(function ($q) use ($specialtyId) {
                $q->where('specialty_id', $specialtyId)
                  ->orWhereIn('id', function ($sub) use ($specialtyId) {
                      $sub->select('post_id')->from('post_tags')->where('specialty_id', $specialtyId);
                  });
            })
            ->selectRaw('hairdresser_id, MAX(created_at) as last_at')
            ->groupBy('hairdresser_id')
            ->pluck('last_at', 'hairdresser_id');

        $reviews = DB::table('reviews')
            ->whereIn('hairdresser_id', $hairdresserIds)
            ->where('specialty_id', $specialtyId)
            ->selectRaw('hairdresser_id, MAX(created_at) as last_at')
            ->groupBy('hairdresser_id')
            ->pluck('last_at', 'hairdresser_id');

        $visits = DB::table('verified_visits')
            ->whereIn('hairdresser_id', $hairdresserIds)
            ->where('specialty_id', $specialtyId)
            ->selectRaw('hairdresser_id, MAX(scanned_at) as last_at')
            ->groupBy('hairdresser_id')
            ->pluck('last_at', 'hairdresser_id');

        $merged = collect();
        foreach ($hairdresserIds as $id) {
            $dates = array_filter([$posts->get($id), $reviews->get($id), $visits->get($id)]);
            if (!empty($dates)) $merged->put($id, collect($dates)->max());
        }
        return $merged;
    }

    /**
     * Classement décoré pour l'API publique — GET /leaderboard?specialty_id=...
     */
    public static function leaderboard(int $specialtyId, string $geo = 'country', ?string $geoValue = null, int $limit = 30, ?float $lat = null, ?float $lng = null, ?float $radiusKm = null): array
    {
        $rows = self::rankedRows($specialtyId, $geo, $geoValue, $lat, $lng, $radiusKm)->take($limit);

        // Le palier Référence (régional, critère relatif coûteux) n'est
        // volontairement pas recalculé ici pour chaque ligne d'une liste —
        // borné à un seul profil ailleurs (publicHighlights/badges). Le rang
        // affiché parle déjà de lui-même ; is_reference (Maître) reste inclus.
        return $rows->values()->map(function ($row, $i) {
            $level = $row->is_reference && $row->score >= self::LOCAL_REFERENCE_MIN_SCORE
                ? self::LEVELS[3]
                : self::scoreLevelCap($row->score);

            return [
                'rank'         => $i + 1,
                'id'           => $row->hairdresser_id,
                'slug'         => $row->slug,
                'name'         => $row->name,
                'avatar'       => $row->avatar,
                'city'         => $row->city,
                'score'        => $row->adjusted_score,
                'level'        => $level['level'],
                'level_name'   => $level['name'],
                'level_color'  => $level['color'],
                'is_reference' => (bool) $row->is_reference,
                'is_verified'  => (bool) $row->is_verified,
            ];
        })->all();
    }

    /**
     * Rang d'UN coiffeur dans une spécialité/zone — utilisé sur son profil
     * public ET sur son propre cockpit (écart de points avec le rang
     * juste au-dessus, pour "il te manque X points pour la 3e place").
     */
    public static function rankFor(HairdresserProfile $profile, int $specialtyId, string $geo, ?string $geoValue): ?array
    {
        $rows = self::rankedRows($specialtyId, $geo, $geoValue);
        $index = $rows->search(fn($r) => $r->hairdresser_id === $profile->id);

        if ($index === false) return null;

        $pointsToNext = $index > 0 ? max(0, $rows[$index - 1]->adjusted_score - $rows[$index]->adjusted_score) : 0;

        return ['rank' => $index + 1, 'total' => $rows->count(), 'points_to_next' => $index > 0 ? $pointsToNext : null];
    }

    /**
     * Combien de places gagnées (ou perdues) depuis la dernière capture.
     *
     * Positif = il est monté. On compare le rang courant, recalculé à la
     * volée, à la mesure figée la plus récente qui n'est pas d'aujourd'hui —
     * autrement dit celle de la semaine dernière.
     *
     * Renvoie null quand il n'y a pas de point de comparaison : un coiffeur
     * qui vient d'entrer dans un classement n'a rien gagné ni perdu, et
     * afficher « +0 » lui ferait croire qu'il stagne alors qu'il démarre.
     *
     * Un écart négatif est montré tel quel. Il peut venir de l'arrivée de
     * confrères au-dessus de lui plutôt que d'un relâchement de sa part —
     * mais le masquer reviendrait à ne montrer que les bonnes nouvelles, et
     * un compteur qui ne descend jamais ne veut plus rien dire.
     */
    public static function rankDelta(
        HairdresserProfile $profile,
        int $specialtyId,
        string $geo,
        ?string $geoValue,
        int $rangActuel
    ): ?int {
        $precedent = SpecialtyRankSnapshot::query()
            ->where('hairdresser_id', $profile->id)
            ->where('specialty_id', $specialtyId)
            ->where('geo', $geo)
            ->where('geo_value', $geoValue ?? SpecialtyRankSnapshot::PAYS)
            ->whereDate('captured_on', '<', now('Europe/Paris')->toDateString())
            ->orderByDesc('captured_on')
            ->first();

        if (!$precedent) {
            return null;
        }

        // Rang 6 la semaine dernière, 4 aujourd'hui => +2 places gagnées.
        return $precedent->rank - $rangActuel;
    }

    /**
     * Le périmètre géographique d'un coiffeur, pour un niveau donné.
     *
     * Renvoie null quand le niveau n'est pas calculable — et c'est important :
     * `rankedRows` ne filtre pas quand la valeur est vide, donc un
     * département inconnu donnerait silencieusement le classement de la
     * France entière. Annoncer « 6e sur 9 dans le Bas-Rhin » alors qu'il
     * s'agit du national serait faux ; on préfère ne pas proposer le niveau.
     */
    public static function geoValueFor(HairdresserProfile $profile, string $geo): ?string
    {
        switch ($geo) {
            case 'city':
                return $profile->city ?: null;
            case 'department':
                return $profile->department ?: GeoLookupService::departmentName($profile->postal_code);
            case 'region':
                return $profile->region ?: GeoLookupService::regionName($profile->postal_code);
            case 'country':
                // Pas de filtre : le pays entier est le périmètre par défaut.
                return null;
        }
        return null;
    }

    /**
     * Les niveaux réellement affichables pour ce coiffeur, du plus proche au
     * plus large. La France est toujours disponible ; les autres dépendent de
     * ce que le profil renseigne.
     */
    public static function availableScopes(HairdresserProfile $profile): array
    {
        $scopes = [];
        foreach (['city', 'department', 'region'] as $geo) {
            if (self::geoValueFor($profile, $geo)) {
                $scopes[] = ['geo' => $geo, 'value' => self::geoValueFor($profile, $geo)];
            }
        }
        $scopes[] = ['geo' => 'country', 'value' => 'France'];
        return $scopes;
    }

    /**
     * "Pourquoi ce coiffeur est reconnu" — données prêtes pour le profil
     * public (badges métier + classement local), une entrée par spécialité
     * où le coiffeur a un score > 0. Triée par score décroissant, limitée
     * aux signaux qui valent la peine d'être montrés à un client.
     */
    public static function publicHighlights(HairdresserProfile $profile, bool $includePrivate = false, string $geo = 'city'): array
    {
        $rows = self::forProfile($profile)->filter(fn($r) => $r->score > 0);
        if ($rows->isEmpty()) return [];

        return $rows->map(function ($row) use ($profile, $includePrivate, $geo) {
            $level = self::levelFor($profile, $row);
            $rank = self::rankFor($profile, $row->specialty_id, $geo, self::geoValueFor($profile, $geo));

            // Progression rapide : niveau Spécialiste+ atteint alors que le
            // profil a moins de 6 mois — heuristique volontairement simple.
            $accountAgeDays = $profile->created_at ? now()->diffInDays($profile->created_at) : 9999;
            $fastProgress = $accountAgeDays <= 180 && $level['level'] >= 2 && $level['level'] < 4;

            return [
                'specialty_id'    => $row->specialty_id,
                'specialty_name'  => $row->specialty->name ?? null,
                // Score public (décision 31/08/2026) : les points par
                // spécialité sont visibles côté client aussi — seuls les
                // défis et la mécanique interne restent côté pro.
                'score'           => $row->score,
                'level'           => $level['level'],
                'level_name'      => $level['name'],
                'level_color'     => $level['color'],
                'is_reference'    => $level['level'] >= 3,
                'local_rank'      => $rank['rank'] ?? null,
                'local_total'     => $rank['total'] ?? null,
                // L'ecart au rang superieur n'a de sens que pour le coiffeur
                // lui-meme : c'est ce qui lui donne un cap. On ne l'expose pas
                // sur le profil public, ou il ne dirait rien a un client et
                // reviendrait a publier la mecanique de classement.
                'points_to_next'  => $includePrivate ? ($rank['points_to_next'] ?? null) : null,
                // Le mouvement depuis la derniere capture. Prive : un client
                // n'a que faire de savoir qu'un coiffeur a perdu deux places.
                'rank_delta'      => ($includePrivate && $rank && isset($rank['rank']))
                    ? self::rankDelta($profile, $row->specialty_id, $geo, self::geoValueFor($profile, $geo), $rank['rank'])
                    : null,
                'fast_progress'   => $fastProgress,
                'visits_count'    => $row->visits_count,
            ];
        })->values()->all();
    }
}
