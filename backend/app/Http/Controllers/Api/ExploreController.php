<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Models\Service;
use App\Models\UserBlock;
use App\Services\BadgeService;
use App\Services\Geo;
use App\Services\RecommendationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
    /**
     * Ids des utilisateurs bloqués par l'appelant — App Store Review
     * Guideline 1.2. Résolu UNE seule fois par requête HTTP dans index() et
     * relu par hairdresserResults()/salonResults(), qui sont rappelés
     * jusqu'à 8 fois par la cascade de repli (fallbackSearch) : recalculer
     * la liste à chaque passe ferait 8 requêtes pour rien. Vide pour un
     * visiteur non connecté → aucune clause SQL ajoutée nulle part.
     *
     * @var array<int>
     */
    private array $blockedUserIds = [];

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

        // ── BLOCAGE UTILISATEUR (App Store Review Guideline 1.2) ────────────
        // Même motif que HairdresserController::feed(). La route /explore est
        // publique : l'auth est résolue à la main via le guard sanctum, comme
        // dans RecommendationController::index().
        $this->blockedUserIds = UserBlock::blockedIdsFor(Auth::guard('sanctum')->user()?->id);

        // Recherche avec repli honnête en cascade : rayon exact demandé d'abord,
        // puis élargissement progressif (mêmes paliers que la home, voir
        // RecommendationService::RADIUS_TIERS), puis en dernier recours
        // relâchement de la spécialité elle-même — jamais silencieux, voir
        // fallbackSearch() pour le détail des étapes et $specialtyRelaxed.
        [$results, $fallbackMeta, $specialtyRelaxed] = $this->fallbackSearch($q, $specialty, $minRating, $lat, $lng, $radius, $bbox);

        // Boost de correspondance spécialité — DOMINANT sur la popularité (même
        // poids que RecommendationService::WEIGHT_SPECIALTY_MAX = 220, contre
        // ~30 maximum pour le signal social pur dans scoreHairdresser/scoreSalon).
        // Priorité au filtre spécialité EXPLICITE (chips choisies par
        // l'utilisateur dans cet écran) : un profil qui coche les 2 spécialités
        // demandées doit toujours passer devant un profil qui n'en coche qu'une,
        // même si ce dernier est mieux noté — jamais l'inverse. À défaut de
        // filtre explicite, on retombe sur les préférences client (interests)
        // comme avant, en repli doux (jamais excluant).
        $wantedForBoost = !empty($specialty) ? $specialty : $interests;
        if (!empty($wantedForBoost)) {
            $results = $results->map(function ($r) use ($wantedForBoost) {
                $slugs = array_column($r['specialties'], 'slug');
                $r['_score'] += RecommendationService::specialtyMatchScore($wantedForBoost, $slugs);
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
            // null si aucune position connue ou si le client a lui-même
            // demandé un rayon/une zone précise (son choix fait déjà foi).
            'fallback'     => $fallbackMeta,
            // true si le filtre spécialité demandé a dû être abandonné faute
            // de correspondance exacte (même sémantique que
            // RecommendationMeta.specialty_filter_relaxed côté home) — le
            // frontend DOIT alors présenter les résultats comme "les mieux
            // notés", jamais comme un vrai match spécialité.
            'specialty_filter_relaxed' => $specialtyRelaxed,
        ]);
    }

    /**
     * Recherche avec repli en cascade, honnête à chaque étape :
     *   1. Critères exacts demandés (spécialité + rayon/bbox tels quels).
     *   2. Si vide et une position est connue et un rayon était fixé : on
     *      élargit le rayon palier par palier (mêmes seuils que la home,
     *      RecommendationService::RADIUS_TIERS) en gardant la spécialité,
     *      jusqu'au national.
     *   3. Si toujours vide (ou pas de géo du tout) et qu'une spécialité
     *      était demandée : on la relâche entièrement — les meilleurs profils
     *      disponibles restent affichés, mais $specialtyRelaxed=true prévient
     *      le frontend qu'aucun profil ne correspond réellement au critère.
     *   4. On réessaie même l'élargissement de rayon SANS la spécialité avant
     *      d'abandonner.
     * Une bbox explicite ("rechercher dans cette zone") ne déclenche jamais
     * cette cascade : la zone dessinée par l'utilisateur fait déjà foi.
     *
     * @return array{0: \Illuminate\Support\Collection, 1: array|null, 2: bool}
     */
    private function fallbackSearch(string $q, array $specialty, float $minRating, ?float $lat, ?float $lng, ?float $radius, ?array $bbox): array
    {
        $hasGeo = $lat !== null && $lng !== null;

        $exact = $this->buildResults($q, $specialty, $minRating, $lat, $lng, $radius, $bbox);
        // Une fiche sans coordonnées passe TOUJOURS le filtre SQL de rayon
        // (voir applyGeoSql — c'est volontaire, elle reste affichée en fin de
        // liste plutôt que cachée). Mais elle ne peut pas, à elle seule,
        // rendre honnête une promesse de rayon explicite ("à 10 km" ne veut
        // rien dire pour un profil dont la position est inconnue) : quand un
        // rayon précis a été demandé, "l'exact" n'est validé que s'il contient
        // AU MOINS une fiche réellement localisée dans ce rayon.
        $exactOk = ($hasGeo && $radius !== null) ? $this->hasLocatedMatch($exact) : $exact->isNotEmpty();

        if ($exactOk || $bbox !== null) {
            // Repli géographique honnête — informatif seulement, n'exclut rien
            // de plus que ce que radius/bbox excluaient déjà : si une position
            // est connue et qu'aucun rayon strict n'a été demandé explicitement,
            // indique quel palier couvre réellement le premier résultat localisé.
            $fallbackMeta = ($bbox === null && $hasGeo && $radius === null)
                ? $this->fallbackMetaFromResults($exact)
                : null;
            return [$exact, $fallbackMeta, false];
        }

        // Étape 2 : élargir le rayon, spécialité conservée. Chaque palier fini
        // exige une correspondance réellement localisée (même raison que
        // ci-dessus) ; le palier national n'affirme aucune proximité, une
        // correspondance suffit même sans coordonnées.
        if ($hasGeo && $radius !== null) {
            foreach (RecommendationService::radiusTiers() as $tierDef) {
                if ($tierDef['km'] <= $radius) continue;
                $attempt = $this->buildResults($q, $specialty, $minRating, $lat, $lng, $tierDef['km'], null);
                if ($this->hasLocatedMatch($attempt)) {
                    return [$attempt, $this->tierMeta($tierDef, true), false];
                }
            }
            $attempt = $this->buildResults($q, $specialty, $minRating, $lat, $lng, null, null);
            if ($attempt->isNotEmpty()) {
                return [$attempt, $this->tierMeta(self::nationalTierDef(), true), false];
            }
        }

        // Étape 3 : plus rien même en élargissant la zone — relâcher la spécialité.
        if (!empty($specialty)) {
            $noSpecialty = $this->buildResults($q, [], $minRating, $lat, $lng, $radius, $bbox);
            $noSpecialtyOk = ($hasGeo && $radius !== null) ? $this->hasLocatedMatch($noSpecialty) : $noSpecialty->isNotEmpty();
            if ($noSpecialtyOk) {
                $meta = ($hasGeo && $radius === null) ? $this->fallbackMetaFromResults($noSpecialty) : null;
                return [$noSpecialty, $meta, true];
            }

            // Étape 4 : élargir le rayon aussi, spécialité relâchée.
            if ($hasGeo && $radius !== null) {
                foreach (RecommendationService::radiusTiers() as $tierDef) {
                    if ($tierDef['km'] <= $radius) continue;
                    $attempt = $this->buildResults($q, [], $minRating, $lat, $lng, $tierDef['km'], null);
                    if ($this->hasLocatedMatch($attempt)) {
                        return [$attempt, $this->tierMeta($tierDef, true), true];
                    }
                }
                $attempt = $this->buildResults($q, [], $minRating, $lat, $lng, null, null);
                if ($attempt->isNotEmpty()) {
                    return [$attempt, $this->tierMeta(self::nationalTierDef(), true), true];
                }
            }
        }

        return [collect(), [
            'tier' => 'empty', 'is_fallback' => true,
            'fallback_label' => 'Aucun profil disponible pour le moment', 'radius_km' => null,
        ], !empty($specialty)];
    }

    /** Au moins une fiche du jeu a une position réellement connue (distance_km non nulle). */
    private function hasLocatedMatch($results): bool
    {
        return $results->contains(fn ($r) => $r['distance_km'] !== null);
    }

    private static function nationalTierDef(): array
    {
        return ['tier' => RecommendationService::NATIONAL_TIER['tier'], 'label' => RecommendationService::NATIONAL_TIER['label'], 'km' => null];
    }

    private function tierMeta(array $tierDef, bool $isFallback): array
    {
        return [
            'tier'           => $tierDef['tier'],
            'is_fallback'    => $isFallback,
            'fallback_label' => $isFallback ? $tierDef['label'] : null,
            'radius_km'      => $tierDef['km'] ?? null,
        ];
    }

    /** Construit le jeu de résultats bruts (coiffeurs + salons, scorés) pour un jeu de critères donné. */
    private function buildResults(string $q, array $specialty, float $minRating, ?float $lat, ?float $lng, ?float $radius, ?array $bbox)
    {
        $hairdressers = $this->hairdresserResults($q, $specialty, $minRating, $lat, $lng, $radius, $bbox);
        $salons       = $this->salonResults($q, $specialty, $minRating, $lat, $lng, $radius, $bbox);

        $results = $hairdressers->concat($salons);

        if ($q !== '') {
            $results = $results->filter(fn ($r) => $r['_score'] > 0);
        }

        return $results->values();
    }

    /**
     * Palier de distance honnête atteint par le MEILLEUR résultat localisé
     * déjà produit par la recherche (mêmes paliers que
     * RecommendationService::RADIUS_TIERS) — purement informatif, ne filtre
     * ni ne re-trie rien : la recherche garde son tri texte/pertinence
     * existant, ceci sert uniquement l'étiquette honnête côté frontend.
     */
    private function fallbackMetaFromResults($results): ?array
    {
        $localized = $results->filter(fn ($r) => $r['distance_km'] !== null);
        if ($localized->isEmpty()) return null;

        $closest = $localized->min('distance_km');

        foreach (RecommendationService::radiusTiers() as $i => $tierDef) {
            if ($closest <= $tierDef['km']) {
                return [
                    'tier'           => $tierDef['tier'],
                    'is_fallback'    => $i > 0,
                    'fallback_label' => $i > 0 ? $tierDef['label'] : null,
                    'radius_km'      => $tierDef['km'],
                ];
            }
        }

        return [
            'tier' => RecommendationService::NATIONAL_TIER['tier'], 'is_fallback' => true,
            'fallback_label' => RecommendationService::NATIONAL_TIER['label'], 'radius_km' => null,
        ];
    }

    // ── Coiffeurs (salariés ET indépendants — chacun sa propre fiche) ────────

    private function hairdresserResults(string $q, array $specialty, float $minRating, ?float $lat, ?float $lng, ?float $radius, ?array $bbox)
    {
        $query = HairdresserProfile::with(['user', 'specialties', 'services', 'salon']);

        // Blocage : la fiche d'un compte bloqué ne remonte plus dans la
        // recherche du bloqueur (voir $blockedUserIds, résolu dans index()).
        if (!empty($this->blockedUserIds)) {
            $query->whereNotIn('user_id', $this->blockedUserIds);
        }

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
     * Batché (une requête pour tout le lot) — délègue à
     * RecommendationService::chairPlusMap(), même règle que
     * HairdresserController::batchChairPlusMap() mais centralisée pour ne
     * pas diverger entre recherche et home. Un appel par profil
     * (hasChairPlus()) ferait un N+1 sur cette liste potentiellement large.
     */
    private function batchChairPlusMap($hairdressers): array
    {
        return RecommendationService::chairPlusMap($hairdressers);
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

        // Le salon reste un établissement, pas un compte : bloquer une
        // personne ne fait pas disparaître son salon de la recherche. En
        // revanche les puces "matched_pros" affichent nom et photo de
        // PERSONNES — un compte bloqué n'a rien à y faire.
        $blockedUserIds = array_map('intval', $this->blockedUserIds);

        $results = $salons->map(function ($salon) use ($priceFrom, $tokens, $q, $blockedUserIds) {
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
                $matchedPros = $team
                    ->filter(fn ($h) => stripos($h->user->name ?? '', $q) !== false)
                    ->reject(fn ($h) => in_array((int) $h->user_id, $blockedUserIds, true))
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
        return Geo::haversineKm($lat1, $lon1, $lat2, $lon2);
    }
}
