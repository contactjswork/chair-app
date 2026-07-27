<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Models\Service;
use App\Services\BadgeService;
use Illuminate\Http\Request;

/**
 * GET /api/explore — moteur de découverte unifié de la page Recherche client.
 *
 * Principe produit CHAIR : le coiffeur est la marque, pas le salon. Chaque
 * professionnel — salarié ou indépendant — remonte donc comme sa PROPRE
 * fiche (type 'hairdresser'), avec sa photo, son niveau, ses avis. Un salarié
 * garde simplement son salon en métadonnée (`salon: {name, slug}`), affichée
 * comme contexte ("chez Koehler Coiffeur"), jamais comme identité substituée.
 *
 * Les salons remontent AUSSI comme entités à part (type 'salon') pour qui
 * cherche l'établissement lui-même (nom du salon, adresse, toute l'équipe) —
 * mais ce n'est pas une catégorie concurrente : un salarié cherché par son nom
 * fait remonter À LA FOIS sa fiche perso ET le salon (matched_pros), les deux
 * mènent quelque part d'utile.
 *
 * Filtres SQL en amont (spécialité, note, bounding box) — le scoring texte fin
 * se fait en PHP sur le jeu déjà réduit. Les fiches sans coordonnées restent
 * dans la liste (has_coords=false, jamais sur la carte) sauf en recherche par
 * zone explicite (bbox) où la zone fait autorité.
 */
class ExploreController extends Controller
{
    public function index(Request $request)
    {
        $q         = trim((string) $request->get('q', ''));
        $specialty = array_values(array_filter(explode(',', (string) $request->get('specialty', ''))));
        $interests = array_values(array_filter(explode(',', (string) $request->get('interests', ''))));
        $minRating = (float) $request->get('min_rating', 0);
        $type      = in_array($request->get('type'), ['salon', 'hairdresser']) ? $request->get('type') : 'all';
        $sort      = in_array($request->get('sort'), ['relevance', 'distance', 'rating', 'popular']) ? $request->get('sort') : 'relevance';
        $perPage   = min(50, max(1, (int) $request->get('per_page', 30)));
        $page      = max(1, (int) $request->get('page', 1));

        $lat    = $request->filled('lat') ? (float) $request->lat : null;
        $lng    = $request->filled('lng') ? (float) $request->lng : null;
        $radius = $request->filled('radius') ? min(1000, max(1, (float) $request->radius)) : null;

        $bbox = null;
        if ($request->filled('sw_lat') && $request->filled('sw_lng') && $request->filled('ne_lat') && $request->filled('ne_lng')) {
            $bbox = [
                'sw_lat' => (float) $request->sw_lat, 'sw_lng' => (float) $request->sw_lng,
                'ne_lat' => (float) $request->ne_lat, 'ne_lng' => (float) $request->ne_lng,
            ];
        }

        $hairdressers = $this->hairdresserResults($q, $specialty, $minRating, $lat, $lng, $radius, $bbox);
        $salons       = $this->salonResults($q, $specialty, $minRating, $lat, $lng, $radius, $bbox);

        $results = $hairdressers->concat($salons);

        if ($q !== '') {
            $results = $results->filter(fn ($r) => $r['_score'] > 0);
        }

        // Boost soft des préférences client (jamais excluant)
        if (!empty($interests)) {
            $results = $results->map(function ($r) use ($interests) {
                $slugs = array_column($r['specialties'], 'slug');
                if (count(array_intersect($interests, $slugs)) > 0) {
                    $r['_score'] += 8;
                }
                return $r;
            });
        }

        $counts = [
            'all'         => $results->count(),
            'salons'      => $results->where('type', 'salon')->count(),
            'hairdressers'=> $results->where('type', 'hairdresser')->count(),
        ];

        if ($type !== 'all') {
            $results = $results->where('type', $type)->values();
        }

        $results = $this->sortResults($results, $sort);

        $total = $results->count();
        $items = $results->slice(($page - 1) * $perPage, $perPage)->values()
            ->map(function ($r) {
                unset($r['_score'], $r['_popularity']);
                return $r;
            });

        return response()->json([
            'data'         => $items,
            'total'        => $total,
            'counts'       => $counts,
            'per_page'     => $perPage,
            'current_page' => $page,
        ]);
    }

    // ── Coiffeurs (salariés ET indépendants — chacun sa propre fiche) ────────

    private function hairdresserResults(string $q, array $specialty, float $minRating, ?float $lat, ?float $lng, ?float $radius, ?array $bbox)
    {
        $query = HairdresserProfile::with(['user', 'specialties', 'services', 'salon']);

        if (!empty($specialty)) {
            $query->whereHas('specialties', fn ($s) => $s->whereIn('slug', $specialty));
        }

        if ($minRating > 0) {
            $query->where('reviews_count', '>', 0)->where('avg_rating', '>=', $minRating);
        }

        $this->applyGeoSql($query, $lat, $lng, $radius, $bbox);

        if ($q !== '') {
            $this->applyTextSql($query, $q);
        }

        $profiles = $this->attachDistance($query->get(), $lat, $lng, $radius);
        BadgeService::attachGamification($profiles);

        $priceFrom = $this->priceFromMap($profiles->pluck('id')->all());
        $tokens    = $this->tokenize($q);
        $chairPlusMap = $this->batchChairPlusMap($profiles);

        return $profiles->map(function ($h) use ($priceFrom, $tokens, $chairPlusMap) {
            $hasCoords = $h->latitude !== null && $h->longitude !== null;
            // Salarié = is_independent explicitement false ET rattaché à un salon.
            // Tout le reste (indépendant déclaré, ou pas de salon) = indépendant.
            $isIndependent = !($h->is_independent === false && $h->salon_id !== null);

            return [
                'type'           => 'hairdresser',
                'id'             => $h->id,
                'slug'           => $h->slug,
                'name'           => $h->user->name ?? '',
                'image'          => $h->banner_image ?: ($h->user->avatar ?? null),
                'avatar'         => $h->user->avatar ?? null,
                'city'           => $h->city,
                'address'        => $h->work_address,
                'latitude'       => $hasCoords ? (float) $h->latitude : null,
                'longitude'      => $hasCoords ? (float) $h->longitude : null,
                'has_coords'     => $hasCoords,
                'distance_km'    => $h->distance_km ?? null,
                'avg_rating'     => round((float) $h->avg_rating, 1),
                'reviews_count'  => (int) $h->reviews_count,
                'is_verified'    => (bool) $h->is_verified,
                // Badge "Certifié CHAIR" (abonné CHAIR+) — distinct de is_verified
                // (diplôme vérifié), voir BadgeService::BADGES code='verified'.
                'is_chair_plus'  => $chairPlusMap[$h->id] ?? false,
                // Sélection éditoriale "Coup de cœur CHAIR" — accesseur déjà
                // appendé sur le modèle (coût nul, colonne déjà chargée), mais
                // cette réponse liste ses clés à la main plutôt que toArray().
                'is_chair_pick'  => $h->is_chair_pick,
                'is_independent' => $isIndependent,
                'salon'          => $h->salon ? ['name' => $h->salon->name, 'slug' => $h->salon->slug] : null,
                'specialties'    => $h->specialties->map(fn ($s) => ['name' => $s->name, 'slug' => $s->slug])->values()->all(),
                'price_from'     => $priceFrom[$h->id] ?? null,
                'team_count'     => null,
                'matched_pros'   => [],
                'chair_level'    => $h->chair_level ?? null,
                'tagline'        => $h->tagline,
                '_score'         => $this->scoreHairdresser($h, $tokens),
                '_popularity'    => (float) $h->avg_rating * $h->reviews_count * 3 + $h->followers_count * 0.15 + $h->visits_count * 0.5,
            ];
        })->values();
    }

    /**
     * Batché (une requête pour tout le lot) — même principe que
     * HairdresserController::batchChairPlusMap(), voir ce fichier pour le
     * détail. Un appel par profil (hasChairPlus()) ferait un N+1 sur cette
     * liste de recherche potentiellement large.
     */
    private function batchChairPlusMap($hairdressers): array
    {
        $ids = $hairdressers->pluck('id')->all();
        if (empty($ids)) return [];

        $now = now();
        $map = [];

        foreach ($hairdressers as $h) {
            if ($h->chair_plus_until && $now->lt($h->chair_plus_until)) $map[$h->id] = true;
        }

        $remaining = array_diff($ids, array_keys($map));
        if (!empty($remaining)) {
            \App\Models\Subscription::whereIn('hairdresser_profile_id', $remaining)
                ->where('plan', 'chair_plus')
                ->whereIn('status', ['trialing', 'active', 'past_due'])
                ->get()
                ->groupBy('hairdresser_profile_id')
                ->each(function ($subs, $hid) use (&$map) {
                    if ($subs->first(fn($s) => $s->coversToday())) $map[$hid] = true;
                });
        }

        $salonIds = $hairdressers->pluck('salon_id')->filter()->unique()->all();
        if (!empty($salonIds)) {
            $businessSalonIds = \App\Models\Subscription::whereIn('salon_id', $salonIds)
                ->where('plan', 'chair_business')
                ->whereIn('status', ['trialing', 'active', 'past_due'])
                ->get()
                ->groupBy('salon_id')
                ->filter(fn($subs) => $subs->first(fn($s) => $s->coversToday()))
                ->keys();
            foreach ($hairdressers as $h) {
                if ($h->salon_id && $businessSalonIds->contains($h->salon_id)) $map[$h->id] = true;
            }
        }

        return $map;
    }

    // ── Salons ───────────────────────────────────────────────────────────────

    private function salonResults(string $q, array $specialty, float $minRating, ?float $lat, ?float $lng, ?float $radius, ?array $bbox)
    {
        $query = Salon::with(['hairdressers.user', 'hairdressers.specialties'])
            ->withCount('hairdressers')
            ->has('hairdressers');

        if (!empty($specialty)) {
            $query->whereHas('hairdressers.specialties', fn ($s) => $s->whereIn('slug', $specialty));
        }

        $this->applyGeoSql($query, $lat, $lng, $radius, $bbox);

        if ($q !== '') {
            $qLike = '%' . $q . '%';
            $query->where(function ($w) use ($qLike) {
                $w->where('name', 'LIKE', $qLike)
                  ->orWhere('city', 'LIKE', $qLike)
                  ->orWhere('description', 'LIKE', $qLike)
                  ->orWhereHas('hairdressers.user', fn ($u) => $u->where('name', 'LIKE', $qLike));
            });
        }

        $salons = $this->attachDistance($query->get(), $lat, $lng, $radius);

        $allTeamIds = $salons->flatMap(fn ($s) => $s->hairdressers->pluck('id'))->all();
        $priceFrom  = $this->priceFromMap($allTeamIds);
        $tokens     = $this->tokenize($q);

        $results = $salons->map(function ($salon) use ($priceFrom, $tokens, $q) {
            $team = $salon->hairdressers;

            // Note agrégée de l'équipe, pondérée par le nombre d'avis
            $totalReviews = (int) $team->sum('reviews_count');
            $avgRating    = $totalReviews > 0
                ? round($team->reduce(fn ($carry, $h) => $carry + (float) $h->avg_rating * $h->reviews_count, 0) / $totalReviews, 1)
                : 0.0;

            // Spécialités = union de l'équipe, les plus fréquentes d'abord
            $specialties = $team->flatMap(fn ($h) => $h->specialties)
                ->groupBy('slug')
                ->sortByDesc(fn ($g) => $g->count())
                ->map(fn ($g) => ['name' => $g->first()->name, 'slug' => $g->first()->slug])
                ->values()->all();

            $teamPrices = array_values(array_filter(array_map(
                fn ($h) => $priceFrom[$h->id] ?? null,
                $team->all()
            )));

            $matchedPros = [];
            if ($q !== '') {
                $matchedPros = $team->filter(fn ($h) => stripos($h->user->name ?? '', $q) !== false)
                    ->map(fn ($h) => [
                        'name'   => $h->user->name ?? '',
                        'slug'   => $h->slug,
                        'avatar' => $h->user->avatar ?? null,
                    ])->values()->all();
            }

            $hasCoords = $salon->latitude !== null && $salon->longitude !== null;

            return [
                'type'          => 'salon',
                'id'            => $salon->id,
                'slug'          => $salon->slug,
                'name'          => $salon->name,
                'image'         => $salon->cover_image ?: $salon->logo,
                'avatar'        => $salon->logo,
                'city'          => $salon->city,
                'address'       => $salon->address,
                'latitude'      => $hasCoords ? (float) $salon->latitude : null,
                'longitude'     => $hasCoords ? (float) $salon->longitude : null,
                'has_coords'    => $hasCoords,
                'distance_km'   => $salon->distance_km ?? null,
                'avg_rating'    => $avgRating,
                'reviews_count' => $totalReviews,
                'is_verified'   => (bool) $salon->is_verified,
                'specialties'   => $specialties,
                'price_from'    => !empty($teamPrices) ? min($teamPrices) : null,
                'team_count'    => (int) $salon->hairdressers_count,
                'matched_pros'  => $matchedPros,
                'chair_level'   => null,
                'tagline'       => null,
                '_score'        => $this->scoreSalon($salon, $tokens, $avgRating, $totalReviews),
                '_popularity'   => $avgRating * $totalReviews * 3 + $salon->hairdressers_count * 10,
            ];
        });

        if ($minRating > 0) {
            $results = $results->filter(fn ($r) => $r['reviews_count'] > 0 && $r['avg_rating'] >= $minRating);
        }

        return $results->values();
    }

    // ── Géo ──────────────────────────────────────────────────────────────────

    /**
     * Pré-filtre géographique en SQL. Une bbox explicite ("rechercher dans cette
     * zone") exclut les fiches sans coordonnées ; un rayon garde les fiches sans
     * coordonnées (affichées en fin de liste, jamais sur la carte).
     */
    private function applyGeoSql($query, ?float $lat, ?float $lng, ?float $radius, ?array $bbox): void
    {
        if ($bbox !== null) {
            $query->whereBetween('latitude', [$bbox['sw_lat'], $bbox['ne_lat']])
                  ->whereBetween('longitude', [$bbox['sw_lng'], $bbox['ne_lng']]);
            return;
        }

        if ($lat !== null && $lng !== null && $radius !== null) {
            // Bbox large en SQL (1° lat ≈ 111 km), le haversine précis affine ensuite
            $dLat = $radius / 111.0;
            $dLng = $radius / (111.0 * max(0.2, cos(deg2rad($lat))));
            $query->where(function ($w) use ($lat, $lng, $dLat, $dLng) {
                $w->where(function ($g) use ($lat, $lng, $dLat, $dLng) {
                    $g->whereBetween('latitude', [$lat - $dLat, $lat + $dLat])
                      ->whereBetween('longitude', [$lng - $dLng, $lng + $dLng]);
                })->orWhereNull('latitude');
            });
        }
    }

    /** Calcule distance_km et applique le filtre rayon précis (haversine). */
    private function attachDistance($items, ?float $lat, ?float $lng, ?float $radius)
    {
        if ($lat === null || $lng === null) return $items;

        foreach ($items as $item) {
            $item->distance_km = ($item->latitude !== null && $item->longitude !== null)
                ? round($this->haversine($lat, $lng, (float) $item->latitude, (float) $item->longitude), 1)
                : null;
        }

        if ($radius !== null) {
            // Retire uniquement les fiches localisées hors rayon — celles sans
            // coordonnées restent (triées en fin de liste côté sortResults).
            return $items->filter(fn ($i) => $i->distance_km === null || $i->distance_km <= $radius)->values();
        }

        return $items;
    }

    // ── Texte ────────────────────────────────────────────────────────────────

    /** Pré-filtre texte en SQL — réduit le jeu avant le scoring PHP. */
    private function applyTextSql($query, string $q): void
    {
        $like = '%' . $q . '%';
        $tokens = $this->tokenize($q);

        $query->where(function ($w) use ($like, $tokens) {
            $w->whereHas('user', fn ($u) => $u->where('name', 'LIKE', $like))
              ->orWhere('city', 'LIKE', $like)
              ->orWhere('tagline', 'LIKE', $like)
              ->orWhere('keywords', 'LIKE', $like)
              ->orWhereHas('salon', fn ($s) => $s->where('name', 'LIKE', $like))
              ->orWhereHas('services', fn ($s) => $s->where('name', 'LIKE', $like))
              ->orWhereHas('specialties', fn ($s) => $s->where('name', 'LIKE', $like));

            // Chaque token élargit la recherche (ex : "coupe strasbourg")
            foreach ($tokens as $token) {
                $tLike = '%' . $token . '%';
                $w->orWhere('city', 'LIKE', $tLike)
                  ->orWhereHas('specialties', fn ($s) => $s->where('name', 'LIKE', $tLike))
                  ->orWhereHas('services', fn ($s) => $s->where('name', 'LIKE', $tLike));
            }
        });
    }

    private function tokenize(string $q): array
    {
        if ($q === '') return [];
        $words = preg_split('/[\s\-_\/,;]+/', mb_strtolower($q));
        return array_values(array_filter($words, fn ($w) => mb_strlen($w) >= 2));
    }

    private function scoreHairdresser($h, array $tokens): int
    {
        $score = 0;
        $salonName = $h->salon ? mb_strtolower($h->salon->name ?? '') : '';

        foreach ($tokens as $token) {
            if (str_contains(mb_strtolower($h->user->name ?? ''), $token))  $score += 15;
            if (str_contains(mb_strtolower($h->city ?? ''), $token))        $score += 12;
            if (str_contains(mb_strtolower($h->tagline ?? ''), $token))     $score += 8;
            // Un salarié cherché via le nom de son salon reste trouvable
            if ($salonName && str_contains($salonName, $token))            $score += 10;
            foreach ($h->specialties as $sp) {
                if (str_contains(mb_strtolower($sp->name), $token)) $score += 12;
            }
            foreach ($h->services as $sv) {
                if (str_contains(mb_strtolower($sv->name ?? ''), $token)) $score += 14;
            }
        }

        // Signaux sociaux — départage à pertinence textuelle égale
        $base = (int) (floatval($h->avg_rating) * 3)
              + (int) (min($h->followers_count, 1000) / 40)
              + ($h->reviews_count > 0 ? 3 : 0)
              + ($h->is_verified ? 5 : 0);

        return empty($tokens) ? $base : ($score > 0 ? $score + $base : 0);
    }

    private function scoreSalon($salon, array $tokens, float $avgRating, int $totalReviews): int
    {
        $score = 0;

        foreach ($tokens as $token) {
            if (str_contains(mb_strtolower($salon->name ?? ''), $token))        $score += 15;
            if (str_contains(mb_strtolower($salon->city ?? ''), $token))        $score += 12;
            if (str_contains(mb_strtolower($salon->description ?? ''), $token)) $score += 6;
            foreach ($salon->hairdressers as $h) {
                if (str_contains(mb_strtolower($h->user->name ?? ''), $token)) $score += 13;
                foreach ($h->specialties as $sp) {
                    if (str_contains(mb_strtolower($sp->name), $token)) { $score += 6; break; }
                }
            }
        }

        $base = (int) ($avgRating * 3)
              + ($totalReviews > 0 ? 3 : 0)
              + ($salon->is_verified ? 5 : 0)
              + (int) min($salon->hairdressers_count * 2, 10);

        return empty($tokens) ? $base : ($score > 0 ? $score + $base : 0);
    }

    // ── Tri ──────────────────────────────────────────────────────────────────

    private function sortResults($results, string $sort)
    {
        // Les fiches sans coordonnées passent toujours après les fiches localisées
        // quand un tri géographique est en jeu.
        return match ($sort) {
            'distance' => $results->sortBy([
                fn ($a, $b) => ($a['distance_km'] ?? INF) <=> ($b['distance_km'] ?? INF),
            ])->values(),
            'rating' => $results->sortBy([
                fn ($a, $b) => $b['avg_rating'] <=> $a['avg_rating'],
                fn ($a, $b) => $b['reviews_count'] <=> $a['reviews_count'],
            ])->values(),
            'popular' => $results->sortByDesc('_popularity')->values(),
            default => $results->sortBy([
                fn ($a, $b) => $b['_score'] <=> $a['_score'],
                fn ($a, $b) => ($a['distance_km'] ?? INF) <=> ($b['distance_km'] ?? INF),
            ])->values(),
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Prix minimum réel (> 0) des services actifs, par coiffeur — une seule requête. */
    private function priceFromMap(array $hairdresserIds): array
    {
        if (empty($hairdresserIds)) return [];

        return Service::whereIn('hairdresser_id', $hairdresserIds)
            ->where('is_active', true)
            ->whereNotNull('price')
            ->where('price', '>', 0)
            ->selectRaw('hairdresser_id, MIN(price) as price_from')
            ->groupBy('hairdresser_id')
            ->pluck('price_from', 'hairdresser_id')
            ->map(fn ($p) => (float) $p)
            ->all();
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
