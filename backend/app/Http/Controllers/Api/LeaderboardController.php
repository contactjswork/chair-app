<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Services\AppSettingsService;
use App\Services\BadgeService;
use App\Services\RecommendationService;
use App\Services\SpecialtyReputationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaderboardController extends Controller
{
    // CHAIR+ — départage à mérite égal SEULEMENT, jamais un boost qui fait
    // dépasser un profil plus mérité. Même philosophie/magnitude que
    // RecommendationService::WEIGHT_CHAIR_PLUS (6) — moteur de scoring
    // séparé, réglage app_settings distinct ('leaderboard_weight_chair_plus').
    const WEIGHT_CHAIR_PLUS = 6;

    /**
     * Poids CHAIR+ effectif — lu depuis app_settings, repli sur la constante
     * si absent/invalide/négatif (ceinture + bretelles, voir AppSettingsService).
     */
    private function chairPlusWeight(): float
    {
        return max(0, (float) AppSettingsService::get('leaderboard_weight_chair_plus', self::WEIGHT_CHAIR_PLUS));
    }

    /**
     * GET /leaderboard?city=Paris&type=engagement&limit=20
     * Types: engagement | posts | reviews | progression
     * Filtre: city | department | region
     *
     * GET /leaderboard?specialty_id=5&geo=city&geo_value=Haguenau&limit=20
     * Classement PAR SPÉCIALITÉ (voir docs/REPUTATION_ARCHITECTURE.md) — basé
     * sur specialty_score (avis vérifiés + réalisations + visites, déjà
     * résistant à la manipulation) avec pénalité/exclusion si inactif.
     * geo : city | department | region | country (défaut country).
     */
    public function index(Request $request)
    {
        if ($request->filled('specialty_id')) {
            return $this->specialtyIndex($request);
        }

        $request->validate([
            'lat'       => 'nullable|numeric|between:-90,90',
            'lng'       => 'nullable|numeric|between:-180,180',
            'radius_km' => 'nullable|numeric|min:1|max:2000',
        ]);

        $type     = $request->input('type', 'engagement');
        $city     = $request->input('city');
        $dept     = $request->input('department');
        $region   = $request->input('region');
        $limit    = min((int) $request->input('limit', 20), 50);
        $lat      = $request->filled('lat') ? (float) $request->input('lat') : null;
        $lng      = $request->filled('lng') ? (float) $request->input('lng') : null;
        $radiusKm = $request->filled('radius_km') ? (float) $request->input('radius_km') : null;

        // Pas de leftJoin sur les spécialités ici : c'est une relation many-to-many
        // (table hairdresser_specialties), pas une colonne hp.specialty_id — un
        // join direct ferait planter la requête (colonne inexistante) et dupliquerait
        // les lignes pour les coiffeurs multi-spécialités. Récupéré séparément plus bas.
        $query = DB::table('hairdresser_profiles as hp')
            ->join('users as u', 'u.id', '=', 'hp.user_id')
            ->where('hp.posts_count', '>', 0)
            ->select([
                'hp.id',
                'hp.slug',
                'hp.city',
                'hp.avg_rating',
                'hp.reviews_count',
                'hp.followers_count',
                'hp.posts_count',
                'hp.visits_count',
                'hp.verified_visits_count',
                'hp.is_verified',
                'hp.identity_verified',
                // Nécessaires pour RecommendationService::chairPlusMap() (mode
                // test admin + banqué + abonnement individuel + CHAIR BUSINESS
                // salon) — voir plus bas.
                'hp.chair_plus_test_mode',
                'hp.chair_plus_until',
                'hp.salon_id',
                'u.name',
                'u.avatar',
            ]);

        if ($city) {
            $query->where('hp.city', 'LIKE', '%' . $city . '%');
        }

        // Classement LOCALISÉ sur la position réelle du compte (lat/lng du
        // profil, jamais le GPS appareil) — le frontend élargit lui-même le
        // rayon (50km → région → France) si un premier essai ne renvoie rien,
        // voir HomeRankingSection/classements.
        if ($lat !== null && $lng !== null && $radiusKm !== null) {
            $query->whereNotNull('hp.latitude')->whereNotNull('hp.longitude')->whereRaw(
                '(6371 * ACOS(LEAST(1, GREATEST(-1,
                    COS(RADIANS(?)) * COS(RADIANS(hp.latitude)) * COS(RADIANS(hp.longitude) - RADIANS(?))
                    + SIN(RADIANS(?)) * SIN(RADIANS(hp.latitude))
                )))) <= ?',
                [$lat, $lng, $lat, $radiusKm]
            );
        }

        // Calcul du score selon le type
        switch ($type) {
            case 'posts':
                $query->orderByDesc('hp.posts_count');
                break;

            case 'reviews':
                $query->orderByRaw(
                    '(hp.avg_rating * LEAST(hp.reviews_count, 50) * 4) DESC'
                );
                break;

            case 'progression':
                // Favorise ceux qui progressent vite par rapport à leur ancienneté
                // Score = posts*10 + followers*3 + reviews*15 divisé par ln(ancienneté+1)
                $query->orderByRaw(
                    '((hp.posts_count * 10 + hp.followers_count * 3 + hp.reviews_count * 15)
                     / (LN(DATEDIFF(NOW(), hp.created_at) + 2))) DESC'
                );
                break;

            default: // engagement — formule équilibrée
                // Plafonds pour ne pas favoriser uniquement les gros comptes
                $query->orderByRaw(
                    '(LEAST(hp.followers_count, 500) * 2
                    + LEAST(hp.reviews_count, 100) * 8
                    + hp.avg_rating * LEAST(hp.reviews_count, 50) * 6
                    + LEAST(hp.posts_count, 100) * 4
                    + LEAST(hp.visits_count + hp.verified_visits_count, 200) * 3) DESC'
                );
                break;
        }

        // Fenêtre de candidats plus large que $limit, triée en SQL par mérite
        // pur (orderByRaw ci-dessus) — le boost CHAIR+ est ensuite appliqué et
        // re-trié EN PHP (voir chairPlusMap ci-dessous), jamais dans le SQL, en
        // suivant exactement le même principe que HairdresserController::index
        // (mode featured / géoloc). La fenêtre reste bornée (jamais > 200) : un
        // boost aussi petit ne peut de toute façon faire remonter que des
        // profils déjà proches du seuil, jamais un profil très loin derrière.
        $poolLimit = min($limit * 4, 200);
        $results = $query->limit($poolLimit)->get();

        // Première spécialité de chaque coiffeur (many-to-many), en une requête batchée
        $specialtiesByHairdresser = DB::table('hairdresser_specialties as hs')
            ->join('specialties as s', 's.id', '=', 'hs.specialty_id')
            ->whereIn('hs.hairdresser_id', $results->pluck('id'))
            ->select('hs.hairdresser_id', 's.name', 's.slug')
            ->get()
            ->groupBy('hairdresser_id');

        // Statut CHAIR+ par lot (banqué + abonnement individuel + CHAIR
        // BUSINESS salon) — même principe que RecommendationService::chairPlusMap(),
        // réutilisé tel quel pour ne pas dupliquer la règle une troisième fois.
        $chairPlusMap = RecommendationService::chairPlusMap($results);
        $chairPlusWeight = $this->chairPlusWeight();

        // Score final = mérite pur (computeScore, formule SQL répliquée) +
        // petit bonus additif CHAIR+ — jamais un multiplicateur, jamais assez
        // pour dépasser un écart de mérite réel (le poids reste petit, voir
        // chairPlusWeight()/app_settings 'leaderboard_weight_chair_plus').
        $ranked = $results->values()
            ->map(function ($row) use ($type, $specialtiesByHairdresser, $chairPlusMap, $chairPlusWeight) {
                $isChairPlus = !empty($chairPlusMap[$row->id]);
                $score = $this->computeScore((array) $row, $type) + ($isChairPlus ? (int) round($chairPlusWeight) : 0);
                $specialty = $specialtiesByHairdresser->get($row->id)?->first();
                return [
                    'id'             => $row->id,
                    'slug'           => $row->slug,
                    'name'           => $row->name,
                    // Valeur brute — résolue côté front par resolveMediaUrl(), comme
                    // partout ailleurs dans l'app (HairdresserController ne la
                    // transforme pas non plus).
                    'avatar'         => $row->avatar,
                    'city'           => $row->city,
                    'specialty'      => $specialty->name ?? null,
                    'specialty_slug' => $specialty->slug ?? null,
                    'avg_rating'     => (float) $row->avg_rating,
                    'reviews_count'  => (int) $row->reviews_count,
                    'followers_count'=> (int) $row->followers_count,
                    'posts_count'    => (int) $row->posts_count,
                    'is_verified'    => (bool) $row->is_verified,
                    'identity_verified' => (bool) $row->identity_verified,
                    'is_chair_plus'  => $isChairPlus,
                    'score'          => $score,
                ];
            })
            ->sortByDesc('score')
            ->take($limit)
            ->values()
            ->map(function ($entry, $index) {
                $entry['rank'] = $index + 1;
                return $entry;
            });

        return response()->json([
            'type'    => $type,
            'city'    => $city,
            'results' => $ranked,
        ]);
    }

    private function specialtyIndex(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'specialty_id' => 'required|integer|exists:specialties,id',
            'geo'          => 'nullable|string|in:city,department,region,country,auto,radius',
            'geo_value'    => 'nullable|string|max:100',
            'lat'          => 'nullable|numeric|between:-90,90',
            'lng'          => 'nullable|numeric|between:-180,180',
            'radius_km'    => 'nullable|numeric|min:1|max:2000',
        ]);

        $specialtyId = (int) $request->specialty_id;
        // 'auto' : le client envoie un champ libre unique (ville, département ou
        // région) sans préciser le niveau — voir SpecialtyReputationService::filterByGeo.
        $geo         = $request->input('geo', $request->filled('geo_value') ? 'auto' : 'country');
        $geoValue    = $request->input('geo_value');
        $limit       = min((int) $request->input('limit', 20), 50);
        $lat         = $request->filled('lat') ? (float) $request->input('lat') : null;
        $lng         = $request->filled('lng') ? (float) $request->input('lng') : null;
        $radiusKm    = $request->filled('radius_km') ? (float) $request->input('radius_km') : null;

        $specialty = DB::table('specialties')->where('id', $specialtyId)->first();

        $results = SpecialtyReputationService::leaderboard($specialtyId, $geo, $geoValue, $limit, $lat, $lng, $radiusKm);

        // Statut CHAIR+ par lot — affichage seulement ici (le classement par
        // spécialité garde sa propre logique de score/rang, voir
        // SpecialtyReputationService::leaderboard()), même règle de calcul que
        // partout ailleurs via RecommendationService::chairPlusMap().
        if (!empty($results)) {
            $profiles = HairdresserProfile::whereIn('id', array_column($results, 'id'))
                ->get(['id', 'chair_plus_test_mode', 'chair_plus_until', 'salon_id']);
            $chairPlusMap = RecommendationService::chairPlusMap($profiles);
            $results = array_map(function ($row) use ($chairPlusMap) {
                $row['is_chair_plus'] = !empty($chairPlusMap[$row['id']]);
                return $row;
            }, $results);
        }

        return response()->json([
            'type'           => 'specialty',
            'specialty_id'   => $specialtyId,
            'specialty_name' => $specialty->name ?? null,
            'geo'            => $geo,
            'geo_value'      => $geoValue,
            'results'        => $results,
        ]);
    }

    /**
     * GET /my-rank — rang privé du coiffeur connecté dans sa ville.
     * Réutilise la même formule "engagement" que le classement public pour
     * rester cohérent avec ce que les clients voient sur /app/classements.
     */
    public function myRank(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $city = $profile->city;

        $query = DB::table('hairdresser_profiles as hp')
            ->where('hp.posts_count', '>', 0)
            ->select(['hp.id', 'hp.avg_rating', 'hp.reviews_count', 'hp.followers_count', 'hp.posts_count', 'hp.visits_count', 'hp.verified_visits_count']);

        if ($city) {
            $query->where('hp.city', 'LIKE', '%' . $city . '%');
        }

        $rows = $query->get();

        if ($rows->isEmpty() || !$rows->contains('id', $profile->id)) {
            return response()->json([
                'ranked'     => false,
                'city'       => $city,
                'message'    => 'Publiez au moins une réalisation pour apparaître dans le classement.',
            ]);
        }

        $scored = $rows->map(fn($row) => [
            'id'    => $row->id,
            'score' => $this->computeScore((array) $row, 'engagement'),
        ])->sortByDesc('score')->values();

        $rank  = $scored->search(fn($r) => $r['id'] === $profile->id) + 1;
        $total = $scored->count();
        $percentile = (int) ceil($rank / $total * 100);

        return response()->json([
            'ranked'     => true,
            'city'       => $city,
            'rank'       => $rank,
            'total'      => $total,
            'percentile' => $percentile,
        ]);
    }

    /**
     * GET /my-specialty-rank?specialty_id=&geo=&geo_value= — rang du coiffeur
     * connecté dans EXACTEMENT la même vue (spécialité + zone) que celle
     * affichée sur /app/classements, pour afficher "vous êtes #7, à 14 points
     * du 6e" même quand il n'est pas dans le top de la liste publique.
     */
    public function mySpecialtyRank(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $request->validate([
            'specialty_id' => 'required|integer|exists:specialties,id',
            'geo'          => 'nullable|string|in:city,department,region,country,auto',
            'geo_value'    => 'nullable|string|max:100',
        ]);

        $specialtyId = (int) $request->specialty_id;
        $geo         = $request->input('geo', $request->filled('geo_value') ? 'auto' : 'country');
        $geoValue    = $request->input('geo_value');

        $rank = SpecialtyReputationService::rankFor($profile, $specialtyId, $geo, $geoValue);

        if (!$rank) {
            return response()->json(['ranked' => false]);
        }

        return response()->json(array_merge(['ranked' => true], $rank));
    }

    private function computeScore(array $row, string $type): int
    {
        switch ($type) {
            case 'posts':
                return (int) $row['posts_count'];
            case 'reviews':
                return (int) round(($row['avg_rating'] ?? 0) * min($row['reviews_count'] ?? 0, 50) * 4);
            case 'progression':
                return (int) round(($row['posts_count'] * 10 + $row['followers_count'] * 3 + $row['reviews_count'] * 15));
            default:
                return (int) round(
                    min($row['followers_count'], 500) * 2
                    + min($row['reviews_count'], 100) * 8
                    + ($row['avg_rating'] ?? 0) * min($row['reviews_count'], 50) * 6
                    + min($row['posts_count'], 100) * 4
                    + min(($row['visits_count'] ?? 0) + ($row['verified_visits_count'] ?? 0), 200) * 3
                );
        }
    }
}
