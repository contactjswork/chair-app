<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\UserBlock;
use App\Services\BadgeService;
use App\Services\RecommendationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * GET /api/recommendations — point d'entrée de recommandation PARTAGÉ pour
 * la Home. Utilise le même moteur (RecommendationService) que
 * ExploreController pour la recherche — un seul classement de vérité, pas
 * deux logiques qui divergent entre les deux pages.
 *
 * Fonctionne pour un visiteur non connecté (lat/lng + interests[] en query,
 * relais de son localStorage) ET pour un compte connecté (auth optionnelle
 * via le token Sanctum si présent — cette route reste publique pour ne pas
 * bloquer les visiteurs, mais personnalise dès qu'un Bearer valide est
 * fourni) : ses user_preferences serveur et sa position de profil priment
 * alors sur tout paramètre de requête.
 */
class RecommendationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->get('per_page', 20)));

        $params = [
            'specialty'       => $this->splitParam($request->get('specialty')),
            'interests_relay' => $this->splitParam($request->get('interests')),
            'lat'             => $request->filled('lat') ? (float) $request->lat : null,
            'lng'             => $request->filled('lng') ? (float) $request->lng : null,
            'min_rating'      => $request->filled('min_rating') ? (float) $request->min_rating : null,
        ];

        // Auth optionnelle — route publique, personnalisée si un token
        // Sanctum valide est fourni (mêmes garanties que $request->user()
        // dans le groupe protégé, résolu ici manuellement puisque la route
        // n'est pas dans ce groupe).
        $user = Auth::guard('sanctum')->user();

        $context = RecommendationService::resolveContext($user, $params);

        $query = HairdresserProfile::with(['user', 'specialties', 'salon']);

        // ── BLOCAGE UTILISATEUR (App Store Review Guideline 1.2) ────────────
        // Même motif que HairdresserController::feed() : une seule requête
        // pour les ids bloqués, filtre posé sur la requête de base AVANT le
        // clone() ci-dessous — il vaut donc aussi bien pour la passe "avec
        // spécialité" que pour le repli sans spécialité. Un compte bloqué ne
        // doit pas revenir par la porte des recommandations. Visiteur non
        // connecté : liste vide, aucune clause ajoutée.
        $blockedUserIds = UserBlock::blockedIdsFor($user?->id);
        if (!empty($blockedUserIds)) {
            $query->whereNotIn('user_id', $blockedUserIds);
        }

        if (!empty($context['min_rating'])) {
            $query->where('reviews_count', '>', 0)->where('avg_rating', '>=', $context['min_rating']);
        }

        // Pré-filtre spécialité en SQL quand on en connaît — réduit le jeu
        // avant scoring, mais reste soft : si ça ne renvoie rien (aucun
        // coiffeur exact dans la zone), on retente sans filtre spécialité
        // plutôt que de renvoyer une page vide (scénario "petite ville sans
        // coiffeur exact à proximité").
        $candidates = collect();
        if (!empty($context['specialty_slugs'])) {
            $candidates = (clone $query)
                ->whereHas('specialties', fn ($s) => $s->whereIn('slug', $context['specialty_slugs']))
                ->get();
        }

        $specialtyFilterApplied = $candidates->isNotEmpty();
        if ($candidates->isEmpty()) {
            $candidates = $query->get();
        }

        BadgeService::attachGamification($candidates);
        $chairPlusMap = RecommendationService::chairPlusMap($candidates);
        $context['chair_plus_map'] = $chairPlusMap;

        $ranked = RecommendationService::rank($candidates, $context);

        $items = $ranked['items']->take($perPage)->values();

        return response()->json([
            'data'  => $items->map(fn ($h) => $this->present($h, $chairPlusMap)),
            'total' => $ranked['items']->count(),
            'meta'  => [
                'tier'                    => $ranked['tier'],
                'is_fallback'             => $ranked['is_fallback'],
                'fallback_label'          => $ranked['fallback_label'],
                'radius_km'               => $ranked['radius_km'],
                'pref_source'             => $context['pref_source'],
                // true si le filtre spécialité demandé a dû être abandonné
                // faute de résultat exact dans la zone — le frontend peut
                // afficher "aucun profil exact, voici les mieux notés autour
                // de vous" plutôt que de laisser croire à un vrai match.
                'specialty_filter_relaxed' => !empty($context['specialty_slugs']) && !$specialtyFilterApplied,
            ],
        ]);
    }

    private function splitParam($value): array
    {
        if (empty($value)) return [];
        if (is_array($value)) return array_values(array_filter($value));
        return array_values(array_filter(explode(',', (string) $value)));
    }

    private function present(HairdresserProfile $h, array $chairPlusMap): array
    {
        $hasCoords = $h->latitude !== null && $h->longitude !== null;

        return [
            'type'           => 'hairdresser',
            'id'             => $h->id,
            'slug'           => $h->slug,
            'name'           => $h->user->name ?? '',
            'image'          => $h->banner_image ?: ($h->user->avatar ?? null),
            'avatar'         => $h->user->avatar ?? null,
            'city'           => $h->city,
            'latitude'       => $hasCoords ? (float) $h->latitude : null,
            'longitude'      => $hasCoords ? (float) $h->longitude : null,
            'has_coords'     => $hasCoords,
            'distance_km'    => $h->distance_km ?? null,
            'avg_rating'     => round((float) $h->avg_rating, 1),
            'reviews_count'  => (int) $h->reviews_count,
            'is_verified'    => (bool) $h->is_verified,
            'is_chair_plus'  => $chairPlusMap[$h->id] ?? false,
            'is_chair_pick'  => $h->is_chair_pick,
            'salon'          => $h->salon ? ['name' => $h->salon->name, 'slug' => $h->salon->slug] : null,
            'specialties'    => $h->specialties->map(fn ($s) => ['name' => $s->name, 'slug' => $s->slug])->values()->all(),
            'top_specialty_level' => $h->top_specialty_level ?? null,
            'tagline'        => $h->tagline,
            'match_score'    => $h->match_score ?? 0,
        ];
    }
}
