<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BadgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaderboardController extends Controller
{
    /**
     * GET /leaderboard?city=Paris&type=engagement&limit=20
     * Types: engagement | posts | reviews | progression
     * Filtre: city | department | region
     */
    public function index(Request $request)
    {
        $type   = $request->input('type', 'engagement');
        $city   = $request->input('city');
        $dept   = $request->input('department');
        $region = $request->input('region');
        $limit  = min((int) $request->input('limit', 20), 50);

        $query = DB::table('hairdresser_profiles as hp')
            ->join('users as u', 'u.id', '=', 'hp.user_id')
            ->leftJoin('specialties as s', 's.id', '=', 'hp.specialty_id')
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
                'u.name',
                'u.avatar',
                's.name as specialty_name',
                's.slug as specialty_slug',
            ]);

        if ($city) {
            $query->where('hp.city', 'LIKE', '%' . $city . '%');
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

        $results = $query->limit($limit)->get();

        // Ajouter le rang et les badges visibles
        $ranked = $results->values()->map(function ($row, $index) use ($type) {
            $score = $this->computeScore((array) $row, $type);
            return [
                'rank'           => $index + 1,
                'id'             => $row->id,
                'slug'           => $row->slug,
                'name'           => $row->name,
                'avatar'         => $row->avatar ? (
                    str_starts_with($row->avatar, 'http') ? $row->avatar
                    : (config('app.url') . '/storage/' . ltrim($row->avatar, '/storage/'))
                ) : null,
                'city'           => $row->city,
                'specialty'      => $row->specialty_name,
                'specialty_slug' => $row->specialty_slug,
                'avg_rating'     => (float) $row->avg_rating,
                'reviews_count'  => (int) $row->reviews_count,
                'followers_count'=> (int) $row->followers_count,
                'posts_count'    => (int) $row->posts_count,
                'is_verified'    => (bool) $row->is_verified,
                'identity_verified' => (bool) $row->identity_verified,
                'score'          => $score,
            ];
        });

        return response()->json([
            'type'    => $type,
            'city'    => $city,
            'results' => $ranked,
        ]);
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
