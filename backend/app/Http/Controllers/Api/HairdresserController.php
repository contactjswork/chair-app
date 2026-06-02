<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Post;
use Illuminate\Http\Request;

class HairdresserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(20, max(1, intval($request->per_page ?? 20)));
        $days    = max(7, min(365, intval($request->days ?? 90)));

        $lat    = $request->has('lat') && $request->lat !== '' ? (float) $request->lat : null;
        $lng    = $request->has('lng') && $request->lng !== '' ? (float) $request->lng : null;
        $radius = min(200, max(1, (float) ($request->radius ?? 20)));

        $query = HairdresserProfile::with(['user', 'specialties', 'salon'])
            ->when($request->specialty, fn($q) => $q->whereHas('specialties', fn($sq) =>
                $sq->where('slug', $request->specialty)
            ));

        // ── Mode géolocalisation ──────────────────────────────────────────────
        // Quand lat/lng sont fournis, on utilise haversine — pas de filtre city (trop restrictif).
        if ($lat !== null && $lng !== null) {
            $hairdressers = $query
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->get()
                ->map(function ($h) use ($lat, $lng) {
                    $h->distance_km = round($this->haversine($lat, $lng, (float) $h->latitude, (float) $h->longitude), 1);
                    return $h;
                })
                ->filter(fn($h) => $h->distance_km <= $radius)
                ->sortBy('distance_km')
                ->values();

            return response()->json([
                'data'         => $hairdressers->take($perPage)->values(),
                'total'        => $hairdressers->count(),
                'per_page'     => $perPage,
                'current_page' => 1,
                'last_page'    => 1,
            ]);
        }

        // ── Mode classique (sans géo) ────────────────────────────────────────
        // Filtre city uniquement en mode classique (pas de haversine disponible)
        if ($request->city) {
            $query->where('city', 'like', '%' . $request->city . '%');
        }

        if ($request->sort === 'popular') {
            $query->orderByRaw('(CAST(avg_rating AS DECIMAL(3,1)) * reviews_count + followers_count + visits_count) DESC');
        } elseif ($request->sort === 'new') {
            $query->where('created_at', '>=', now()->subDays($days))
                  ->orderByDesc('created_at');
        } else {
            $query->orderByDesc('avg_rating');
        }

        return response()->json($query->paginate($perPage));
    }

    public function show(string $slug)
    {
        $hairdresser = HairdresserProfile::with(['user', 'specialties', 'salon', 'reviews.client'])
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json($hairdresser);
    }

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

    public function feed(Request $request)
    {
        $perPage = min(50, max(1, intval($request->per_page ?? 20)));
        $lat     = $request->has('lat') && $request->lat !== '' ? (float) $request->lat : null;
        $lng     = $request->has('lng') && $request->lng !== '' ? (float) $request->lng : null;

        $query = Post::with(['hairdresser.user', 'hairdresser.specialties', 'images', 'specialty'])
            ->where('is_published', true)
            ->when($request->type, fn($q) => $q->where('type', $request->type));

        if ($request->sort === 'trending') {
            // trending = engagement post + signal qualité coiffeur
            $query->orderByRaw('(likes_count * 4 + views_count * 1.5 + DATEDIFF(NOW(), created_at) * -0.5) DESC, created_at DESC');
        } elseif ($request->sort === 'scored' && $lat !== null && $lng !== null) {
            // Feed intelligent géo-aware : on récupère plus puis on trie PHP
            $posts = $query->orderByDesc('created_at')->limit(200)->get();

            $now = now();
            $scored = $posts->map(function ($post) use ($lat, $lng, $now) {
                $h = $post->hairdresser;

                // Score popularité
                $score = ($post->likes_count * 4) + ($post->views_count * 1.5);

                // Score coiffeur
                if ($h) {
                    $score += (float)($h->avg_rating ?? 0) * 8;
                    $score += min($h->followers_count ?? 0, 500) * 0.1;
                    $score += min($h->reviews_count ?? 0, 100) * 0.3;
                    $score += min($h->visits_count ?? 0, 200) * 0.2;
                    $score += $h->is_verified ? 20 : 0;
                }

                // Score récence (décroissance exponentielle sur 30 jours)
                $ageHours = $now->diffInHours($post->created_at);
                $score += max(0, 50 - ($ageHours / 12));

                // Bonus géo — coiffeurs proches remontés
                if ($h && $h->latitude && $h->longitude) {
                    $dist = $this->haversine($lat, $lng, (float)$h->latitude, (float)$h->longitude);
                    if ($dist <= 10)       $score += 40;
                    elseif ($dist <= 30)   $score += 20;
                    elseif ($dist <= 80)   $score += 8;
                }

                $post->_score = $score;
                return $post;
            })->sortByDesc('_score')->values()->take($perPage);

            return response()->json([
                'data'         => $scored,
                'total'        => $scored->count(),
                'current_page' => 1,
                'per_page'     => $perPage,
                'last_page'    => 1,
            ]);
        } else {
            $query->orderByDesc('created_at');
        }

        return response()->json($query->paginate($perPage));
    }

    // ── Haversine formula (km) ───────────────────────────────────────────────
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
