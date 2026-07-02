<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }
        $id = $profile->id;

        $now      = now();
        $weekAgo  = $now->copy()->subDays(7);
        $twoWeeksAgo = $now->copy()->subDays(14);
        $monthAgo = $now->copy()->subDays(30);
        $twoMonthsAgo = $now->copy()->subDays(60);

        // ── Posts ──────────────────────────────────────────────────
        $postsThisWeek = DB::table('posts')
            ->where('hairdresser_id', $id)->where('is_published', true)
            ->where('created_at', '>=', $weekAgo)->count();
        $postsLastWeek = DB::table('posts')
            ->where('hairdresser_id', $id)->where('is_published', true)
            ->whereBetween('created_at', [$twoWeeksAgo, $weekAgo])->count();

        // ── Rendez-vous ────────────────────────────────────────────
        $apptThisWeek = DB::table('appointments')
            ->where('hairdresser_id', $id)
            ->whereIn('status', ['confirmed', 'completed'])
            ->where('created_at', '>=', $weekAgo)->count();
        $apptLastWeek = DB::table('appointments')
            ->where('hairdresser_id', $id)
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('created_at', [$twoWeeksAgo, $weekAgo])->count();

        $apptThisMonth = DB::table('appointments')
            ->where('hairdresser_id', $id)->where('status', 'completed')
            ->where('created_at', '>=', $monthAgo)->count();
        $apptLastMonth = DB::table('appointments')
            ->where('hairdresser_id', $id)->where('status', 'completed')
            ->whereBetween('created_at', [$twoMonthsAgo, $monthAgo])->count();

        // ── Abonnés ────────────────────────────────────────────────
        $followersThisWeek = DB::table('follows')
            ->where('hairdresser_id', $id)->where('created_at', '>=', $weekAgo)->count();
        $followersLastWeek = DB::table('follows')
            ->where('hairdresser_id', $id)->whereBetween('created_at', [$twoWeeksAgo, $weekAgo])->count();

        // ── Avis ───────────────────────────────────────────────────
        $reviewsThisMonth = DB::table('reviews')
            ->where('hairdresser_id', $id)->where('created_at', '>=', $monthAgo)->count();

        // ── Top spécialité (par likes/saves sur les posts) ─────────
        $topSpecialty = DB::table('posts as p')
            ->join('specialties as s', 's.id', '=', 'p.specialty_id')
            ->where('p.hairdresser_id', $id)
            ->where('p.is_published', true)
            ->selectRaw('s.name, s.slug, SUM(p.likes_count + p.saves_count * 3) as engagement_score')
            ->groupBy('s.id', 's.name', 's.slug')
            ->orderByDesc('engagement_score')
            ->first();

        // ── Recommandations ────────────────────────────────────────
        $recommendations = $this->buildRecommendations($profile, [
            'posts_this_week'   => $postsThisWeek,
            'appt_this_month'   => $apptThisMonth,
            'followers_gain'    => $followersThisWeek,
            'reviews_count'     => $profile->reviews_count ?? 0,
        ]);

        return response()->json([
            'posts' => [
                'this_week' => $postsThisWeek,
                'last_week' => $postsLastWeek,
                'trend'     => $this->trend($postsThisWeek, $postsLastWeek),
            ],
            'appointments' => [
                'this_week'   => $apptThisWeek,
                'last_week'   => $apptLastWeek,
                'this_month'  => $apptThisMonth,
                'last_month'  => $apptLastMonth,
                'trend_week'  => $this->trend($apptThisWeek, $apptLastWeek),
                'trend_month' => $this->trend($apptThisMonth, $apptLastMonth),
            ],
            'followers' => [
                'this_week' => $followersThisWeek,
                'last_week' => $followersLastWeek,
                'trend'     => $this->trend($followersThisWeek, $followersLastWeek),
                'total'     => $profile->followers_count ?? 0,
            ],
            'reviews' => [
                'this_month' => $reviewsThisMonth,
                'total'      => $profile->reviews_count ?? 0,
                'avg'        => (float) ($profile->avg_rating ?? 0),
            ],
            'top_specialty' => $topSpecialty ? [
                'name'  => $topSpecialty->name,
                'slug'  => $topSpecialty->slug,
                'score' => (int) $topSpecialty->engagement_score,
            ] : null,
            'recommendations' => $recommendations,
        ]);
    }

    private function trend(int $current, int $previous): array
    {
        if ($previous === 0) {
            return ['pct' => $current > 0 ? 100 : 0, 'direction' => $current > 0 ? 'up' : 'stable'];
        }
        $pct = (int) round(($current - $previous) / $previous * 100);
        return [
            'pct'       => abs($pct),
            'direction' => $pct > 0 ? 'up' : ($pct < 0 ? 'down' : 'stable'),
        ];
    }

    private function buildRecommendations(\App\Models\HairdresserProfile $profile, array $data): array
    {
        $recs = [];

        if ($data['posts_this_week'] === 0) {
            $recs[] = [
                'type'    => 'post',
                'title'   => 'Publiez une réalisation cette semaine',
                'desc'    => 'Les coiffeurs qui publient 1× par semaine gagnent 3× plus d\'abonnés.',
                'cta'     => 'Publier',
                'href'    => '/dashboard/realisations',
                'urgency' => 'medium',
            ];
        }

        if (($profile->reviews_count ?? 0) < 5) {
            $recs[] = [
                'type'    => 'reviews',
                'title'   => 'Obtenez vos 5 premiers avis',
                'desc'    => 'Les profils avec 5+ avis reçoivent 4× plus de demandes.',
                'cta'     => 'Partager le lien d\'avis',
                'href'    => '/dashboard/reservations',
                'urgency' => 'high',
            ];
        }

        if (($profile->followers_count ?? 0) < 10 && $data['followers_gain'] === 0) {
            $recs[] = [
                'type'    => 'followers',
                'title'   => 'Partagez votre profil CHAIR',
                'desc'    => 'Ajoutez votre lien CHAIR dans la bio de votre Instagram.',
                'cta'     => 'Voir mon profil',
                'href'    => '/dashboard/mon-qr',
                'urgency' => 'low',
            ];
        }

        if (empty($profile->tagline)) {
            $recs[] = [
                'type'    => 'profile',
                'title'   => 'Ajoutez une accroche',
                'desc'    => 'Une phrase qui résume votre style. Les profils avec accroche ont 40% plus de clics.',
                'cta'     => 'Modifier le profil',
                'href'    => '/dashboard/profil',
                'urgency' => 'medium',
            ];
        }

        return array_slice($recs, 0, 3);
    }
}
