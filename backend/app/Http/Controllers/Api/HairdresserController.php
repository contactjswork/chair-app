<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Post;
use App\Models\SavedPost;
use App\Models\UserPreference;
use App\Services\BadgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HairdresserController extends Controller
{
    // ════════════════════════════════════════════════════════════════
    // LISTE COIFFEURS
    // ════════════════════════════════════════════════════════════════

    public function index(Request $request)
    {
        $perPage = min(20, max(1, intval($request->per_page ?? 20)));

        $lat    = $request->has('lat') && $request->lat !== '' ? (float) $request->lat : null;
        $lng    = $request->has('lng') && $request->lng !== '' ? (float) $request->lng : null;
        $radius = min(200, max(1, (float) ($request->radius ?? 20)));

        $query = HairdresserProfile::with(['user', 'specialties', 'salon'])
            ->when($request->specialty, fn($q) => $q->whereHas('specialties', fn($sq) =>
                $sq->where('slug', $request->specialty)
            ))
            ->when($request->city, fn($q) => $q->where('city', 'like', '%' . $request->city . '%'))
            ->when($request->looking, fn($q) => $q->whereIn('work_availability', ['looking_salon', 'looking_gig']))
            ->when($request->q, fn($q) => $q->whereHas('user', fn($sq) =>
                $sq->where('name', 'like', '%' . $request->q . '%')
            )->orWhere('city', 'like', '%' . $request->q . '%'));

        // ── Mode géolocalisation (nearby scored) ──────────────────────────────
        if ($lat !== null && $lng !== null) {
            $days = max(7, min(365, intval($request->days ?? 90)));
            $hairdressers = $query
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->get()
                ->map(function ($h) use ($lat, $lng) {
                    $h->distance_km = round($this->haversine($lat, $lng, (float) $h->latitude, (float) $h->longitude), 1);
                    return $h;
                })
                ->filter(fn($h) => $h->distance_km <= $radius)
                ->map(function ($h) {
                    // Score qualité + complétion profil
                    $score = 0;

                    // Qualité coiffeur
                    $score += (float)($h->avg_rating ?? 0) * min($h->reviews_count ?? 0, 50) * 3;
                    $score += min($h->followers_count ?? 0, 500) * 0.2;
                    $score += min($h->visits_count ?? 0, 300) * 0.5;
                    $score += $h->is_verified ? 25 : 0;
                    $score += $h->is_featured ? 50 : 0;

                    // Complétion profil
                    $score += $this->profileCompletionScore($h);

                    // Distance (pénalité progressive)
                    $dist = $h->distance_km;
                    if ($dist <= 3)        $score += 35;
                    elseif ($dist <= 8)    $score += 25;
                    elseif ($dist <= 15)   $score += 15;
                    elseif ($dist <= 30)   $score += 5;

                    $h->_score = $score;
                    return $h;
                })
                ->sortByDesc('_score')
                ->values();

            return response()->json([
                'data'         => $hairdressers->take($perPage)->values(),
                'total'        => $hairdressers->count(),
                'per_page'     => $perPage,
                'current_page' => 1,
                'last_page'    => 1,
            ]);
        }

        // ── Mode featured (Coiffeurs à la une) ───────────────────────────────
        // Score composite : featured bonus + note×avis + abonnés + visites + complétion
        if ($request->sort === 'featured') {
            $hairdressers = $query->get()
                ->map(function ($h) {
                    $score = 0;
                    $score += $h->is_featured ? 100 : 0;
                    $score += (float)($h->avg_rating ?? 0) * min($h->reviews_count ?? 0, 50) * 4;
                    $score += min($h->followers_count ?? 0, 1000) * 0.15;
                    $score += min($h->visits_count ?? 0, 500) * 0.6;
                    $score += min($h->posts_count ?? 0, 50) * 1.5;
                    $score += $h->is_verified ? 30 : 0;
                    $score += $this->profileCompletionScore($h);
                    $h->_score = $score;
                    return $h;
                })
                ->filter(fn($h) => $h->_score > 0)    // exclure les profils vides
                ->sortByDesc('_score')
                ->values();

            return response()->json([
                'data'         => $hairdressers->take($perPage)->values(),
                'total'        => $hairdressers->count(),
                'per_page'     => $perPage,
                'current_page' => 1,
                'last_page'    => 1,
            ]);
        }

        // ── Mode nouveaux talents (profils récents avec qualité minimum) ─────
        if ($request->sort === 'new_quality') {
            $days = max(7, min(365, intval($request->days ?? 60)));
            $hairdressers = $query
                ->where('created_at', '>=', now()->subDays($days))
                ->get()
                ->map(function ($h) {
                    // Score léger pour les nouveaux : complétion + activité naissante
                    $score = $this->profileCompletionScore($h);
                    $score += min($h->posts_count ?? 0, 20) * 3;
                    $score += (float)($h->avg_rating ?? 0) * ($h->reviews_count ?? 0) * 2;
                    $score += $h->is_verified ? 20 : 0;
                    $h->_score = $score;
                    return $h;
                })
                ->filter(fn($h) => $h->_score >= 5)   // seuil minimal de qualité
                ->sortByDesc('_score')
                ->values();

            return response()->json([
                'data'         => $hairdressers->take($perPage)->values(),
                'total'        => $hairdressers->count(),
                'per_page'     => $perPage,
                'current_page' => 1,
                'last_page'    => 1,
            ]);
        }

        // ── Mode populaire ────────────────────────────────────────────────────
        if ($request->sort === 'popular') {
            $query->orderByRaw(
                '(CAST(avg_rating AS DECIMAL(3,1)) * reviews_count * 3 + followers_count * 0.15 + visits_count * 0.5) DESC'
            );
        } else {
            // Default : tri par avg_rating décroissant
            $query->orderByDesc('avg_rating');
        }

        return response()->json($query->paginate($perPage));
    }

    // ════════════════════════════════════════════════════════════════
    // PROFIL COIFFEUR
    // ════════════════════════════════════════════════════════════════

    public function show(string $slug)
    {
        $hairdresser = HairdresserProfile::with(['user', 'specialties', 'salon', 'reviews.client', 'trainingBadges'])
            ->where('slug', $slug)
            ->firstOrFail();

        $points = BadgeService::computePoints($hairdresser);
        $data   = $hairdresser->toArray();
        $data['chair_badges']        = BadgeService::getVisibleBadges($hairdresser);
        $data['chair_points']        = $points;
        $data['chair_level']         = BadgeService::getLevel($points);
        $data['chair_badges_all']    = BadgeService::getUnlockedBadges($hairdresser);

        return response()->json($data);
    }

    // ════════════════════════════════════════════════════════════════
    // POSTS D'UN COIFFEUR
    // ════════════════════════════════════════════════════════════════

    public function posts(string $slug)
    {
        $hairdresser = HairdresserProfile::where('slug', $slug)->firstOrFail();

        $posts = Post::with(['hairdresser.user', 'images', 'specialty'])
            ->where('hairdresser_id', $hairdresser->id)
            ->where('is_published', true)
            ->orderByDesc('created_at')
            ->paginate(12);

        return response()->json($posts);
    }

    // ════════════════════════════════════════════════════════════════
    // FEED — moteur de réalisations
    // ════════════════════════════════════════════════════════════════

    public function feed(Request $request)
    {
        $perPage  = min(50, max(1, intval($request->per_page ?? 20)));
        $lat      = $request->has('lat') && $request->lat !== '' ? (float) $request->lat : null;
        $lng      = $request->has('lng') && $request->lng !== '' ? (float) $request->lng : null;
        $authUser = Auth::guard('sanctum')->user();

        $query = Post::with(['hairdresser.user', 'hairdresser.specialties', 'images', 'specialty', 'tags'])
            ->where('is_published', true)
            ->when($request->type, fn($q) => $q->where('type', $request->type));

        // ── TRENDING — score engagements + saves + qualité coiffeur ─────────
        if ($request->sort === 'trending') {
            $posts = $query->orderByDesc('created_at')->limit(300)->get();

            // Préchargement des saved_counts pour éviter N+1
            $postIds    = $posts->pluck('id')->toArray();
            $savedCounts = SavedPost::whereIn('post_id', $postIds)
                ->selectRaw('post_id, COUNT(*) as save_count')
                ->groupBy('post_id')
                ->pluck('save_count', 'post_id')
                ->toArray();

            $savedPostIds = $authUser
                ? SavedPost::where('user_id', $authUser->id)->whereIn('post_id', $postIds)->pluck('post_id')->toArray()
                : [];

            $now = now();
            $scored = $posts->map(function ($post) use ($savedCounts, $savedPostIds, $now) {
                $h     = $post->hairdresser;
                $saves = $savedCounts[$post->id] ?? 0;

                // Engagement post — les saves comptent 3× plus que les likes
                $score = ($post->likes_count * 3)
                       + ($saves * 9)
                       + ($post->views_count * 0.8);

                // Qualité coiffeur
                if ($h) {
                    $score += (float)($h->avg_rating ?? 0) * min($h->reviews_count ?? 0, 30) * 2;
                    $score += min($h->followers_count ?? 0, 500) * 0.1;
                    $score += min($h->visits_count ?? 0, 200) * 0.3;
                    $score += $h->is_verified ? 20 : 0;
                    $score += $h->is_featured ? 40 : 0;
                }

                // Récence (décroissance exponentielle sur 45 jours)
                $ageHours = $now->diffInHours($post->created_at);
                $score += max(0, 60 - ($ageHours / 10));

                $post->_score     = $score;
                $post->save_count = $saves;
                $post->saved_by_user = in_array($post->id, $savedPostIds);
                return $post;
            })->sortByDesc('_score')->values()->take($perPage);

            return response()->json([
                'data'         => $scored,
                'total'        => $scored->count(),
                'current_page' => 1,
                'per_page'     => $perPage,
                'last_page'    => 1,
            ]);
        }

        // ── PERSONALIZED ─────────────────────────────────────────────────────
        // Matching : post.tags[] + post.gender  ↔  user.interests[] + user.profile_type
        // Chaque réalisation est scorée sur SES PROPRES tags, pas sur les spécialités du coiffeur.
        if ($request->sort === 'personalized' && $authUser) {
            $posts = $query->with(['tags'])->orderByDesc('created_at')->limit(300)->get();

            $prefs       = UserPreference::where('user_id', $authUser->id)->first();
            $interests   = $prefs ? ($prefs->interests ?? []) : [];
            $profileType = $prefs ? ($prefs->profile_type ?? null) : null; // 'homme' | 'femme'
            $followedIds = $authUser->follows()->pluck('hairdresser_id')->toArray();

            $postIds     = $posts->pluck('id')->toArray();
            $savedCounts = SavedPost::whereIn('post_id', $postIds)
                ->selectRaw('post_id, COUNT(*) as save_count')
                ->groupBy('post_id')
                ->pluck('save_count', 'post_id')
                ->toArray();
            $savedPostIds = SavedPost::where('user_id', $authUser->id)
                ->whereIn('post_id', $postIds)->pluck('post_id')->toArray();

            // Préchargement des slugs de tags par post — évite N+1
            $postTagSlugs = \DB::table('post_tags')
                ->join('specialties', 'post_tags.specialty_id', '=', 'specialties.id')
                ->whereIn('post_tags.post_id', $postIds)
                ->select('post_tags.post_id', 'specialties.slug')
                ->get()
                ->groupBy('post_id')
                ->map(fn($items) => $items->pluck('slug')->toArray());

            $now = now();
            $scored = $posts->map(function ($post) use (
                $interests, $profileType, $followedIds,
                $savedCounts, $savedPostIds, $postTagSlugs, $now
            ) {
                $h     = $post->hairdresser;
                $saves = $savedCounts[$post->id] ?? 0;
                $score = 0;

                // ── MATCHING : spécialité principale + tags supplémentaires ↔ intérêts ──
                // La spécialité principale (affichée sur la carte) est prioritaire.
                // Les tags post_tags servent pour les spécialités secondaires.
                $postTags   = $postTagSlugs[$post->id] ?? [];
                $primarySlug = $post->specialty?->slug;

                $matchCount = 0;
                foreach ($interests as $interest) {
                    if ($primarySlug === $interest) {
                        $score += 100;  // Match spécialité principale = +100 (fort signal)
                        $matchCount++;
                    } elseif (in_array($interest, $postTags)) {
                        $score += 60;   // Match tag secondaire = +60
                        $matchCount++;
                    }
                }
                // Bonus contenu très ciblé (≥2 intérêts couverts)
                if ($matchCount >= 2) $score += 30;

                // ── MATCHING GENRE ──
                // post.gender = 'homme'|'femme'|null  ↔  user.profile_type = 'homme'|'femme'
                if ($profileType && $post->gender === $profileType) {
                    $score += 45;
                } elseif ($profileType && $post->gender !== null && $post->gender !== $profileType) {
                    // Genre opposé : forte pénalité
                    $score -= 60;
                }
                // gender = null : contenu unisexe, pas de bonus ni pénalité

                // ── BOOST COIFFEUR SUIVI ──
                if ($h && in_array($h->id, $followedIds)) {
                    $score += 50;
                }

                // ── ENGAGEMENT ──
                $score += ($post->likes_count * 2) + ($saves * 7) + ($post->views_count * 0.5);

                // ── QUALITÉ COIFFEUR ──
                if ($h) {
                    $score += (float)($h->avg_rating ?? 0) * min($h->reviews_count ?? 0, 30) * 1.5;
                    $score += min($h->followers_count ?? 0, 500) * 0.06;
                    $score += $h->is_verified ? 12 : 0;
                    $score += $h->is_featured ? 25 : 0;
                }

                // ── RÉCENCE — base forte : un post récent passe devant naturellement ──
                $ageHours = $now->diffInHours($post->created_at);
                // Décroissance sur 30 jours : -2 pts/heure → un post de 7j reste devant un vieux post moyen
                $score += max(0, 150 - ($ageHours * 0.21));

                $post->_score        = $score;
                $post->_match_count  = $matchCount;
                $post->save_count    = $saves;
                $post->saved_by_user = in_array($post->id, $savedPostIds);
                return $post;
            })
            ->filter(fn($p) => $p->_match_count > 0 && $p->_score > 0)  // exiger au moins 1 tag qui correspond
            ->sortByDesc('_score')
            ->values()
            ->take($perPage);

            return response()->json([
                'data'         => $scored,
                'total'        => $scored->count(),
                'current_page' => 1,
                'per_page'     => $perPage,
                'last_page'    => 1,
            ]);
        }

        // ── FOLLOWING — réalisations des coiffeurs suivis ────────────────────
        if ($request->sort === 'following') {
            if (!$authUser) {
                return response()->json([
                    'data' => [], 'total' => 0, 'current_page' => 1, 'per_page' => $perPage, 'last_page' => 1,
                ]);
            }
            $followedIds = $authUser->follows()->pluck('hairdresser_id')->toArray();
            if (empty($followedIds)) {
                return response()->json([
                    'data' => [], 'total' => 0, 'current_page' => 1, 'per_page' => $perPage, 'last_page' => 1,
                ]);
            }

            $paginated = $query->whereIn('hairdresser_id', $followedIds)
                ->orderByDesc('created_at')
                ->paginate($perPage);

            $postIds = collect($paginated->items())->pluck('id')->toArray();
            $savedPostIds = SavedPost::where('user_id', $authUser->id)
                ->whereIn('post_id', $postIds)->pluck('post_id')->toArray();

            $items = collect($paginated->items())->map(function ($post) use ($savedPostIds) {
                $post->saved_by_user = in_array($post->id, $savedPostIds);
                return $post;
            });

            return response()->json([
                'data'         => $items,
                'total'        => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page'     => $paginated->perPage(),
                'last_page'    => $paginated->lastPage(),
            ]);
        }

        // ── SCORED GÉO ───────────────────────────────────────────────────────
        if ($request->sort === 'scored' && $lat !== null && $lng !== null) {
            $posts = $query->orderByDesc('created_at')->limit(200)->get();

            $postIds     = $posts->pluck('id')->toArray();
            $savedCounts = SavedPost::whereIn('post_id', $postIds)
                ->selectRaw('post_id, COUNT(*) as save_count')
                ->groupBy('post_id')
                ->pluck('save_count', 'post_id')
                ->toArray();
            $savedPostIds = $authUser
                ? SavedPost::where('user_id', $authUser->id)->whereIn('post_id', $postIds)->pluck('post_id')->toArray()
                : [];

            $now = now();
            $scored = $posts->map(function ($post) use ($lat, $lng, $savedCounts, $savedPostIds, $now) {
                $h     = $post->hairdresser;
                $saves = $savedCounts[$post->id] ?? 0;

                $score = ($post->likes_count * 3) + ($saves * 9) + ($post->views_count * 0.8);

                if ($h) {
                    $score += (float)($h->avg_rating ?? 0) * min($h->reviews_count ?? 0, 30) * 2;
                    $score += min($h->followers_count ?? 0, 500) * 0.1;
                    $score += min($h->visits_count ?? 0, 200) * 0.3;
                    $score += $h->is_verified ? 20 : 0;
                    $score += $h->is_featured ? 40 : 0;
                }

                $ageHours = $now->diffInHours($post->created_at);
                $score += max(0, 50 - ($ageHours / 12));

                if ($h && $h->latitude && $h->longitude) {
                    $dist = $this->haversine($lat, $lng, (float)$h->latitude, (float)$h->longitude);
                    if ($dist <= 10)       $score += 40;
                    elseif ($dist <= 30)   $score += 20;
                    elseif ($dist <= 80)   $score += 8;
                }

                $post->_score        = $score;
                $post->save_count    = $saves;
                $post->saved_by_user = in_array($post->id, $savedPostIds);
                return $post;
            })->sortByDesc('_score')->values()->take($perPage);

            return response()->json([
                'data'         => $scored,
                'total'        => $scored->count(),
                'current_page' => 1,
                'per_page'     => $perPage,
                'last_page'    => 1,
            ]);
        }

        // ── CHRONOLOGIQUE (défaut) ────────────────────────────────────────────
        $query->orderByDesc('created_at');
        $result = $query->paginate($perPage);
        $this->attachSavedByUser($result->getCollection(), $authUser);
        return response()->json($result);
    }

    // ════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════

    /**
     * Score de complétion du profil coiffeur (0–68 points).
     * Récompense les profils investis sans pénaliser les nouveaux arrivants.
     */
    private function profileCompletionScore($h): int
    {
        $score = 0;
        if (!empty($h->user?->avatar))  $score += 12;
        if (!empty($h->banner_image))   $score += 10;
        if (!empty($h->tagline))        $score +=  6;
        if (!empty($h->city))           $score +=  4;
        if (($h->specialties?->count() ?? 0) > 0) $score += 16;
        if ($h->is_verified)            $score += 20;
        return $score;
    }

    private function attachSavedByUser($posts, $authUser): void
    {
        if (!$authUser || $posts->isEmpty()) return;
        $savedIds = SavedPost::where('user_id', $authUser->id)
            ->whereIn('post_id', $posts->pluck('id'))
            ->pluck('post_id')
            ->toArray();
        foreach ($posts as $post) {
            $post->saved_by_user = in_array($post->id, $savedIds);
        }
    }

    /** Formule haversine (km) */
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
