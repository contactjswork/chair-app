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
        $isPremium = $profile->hasChairPlus();

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

        // ── Top spécialité (par likes + favoris sur les réalisations) ──
        // saved_posts n'a pas de compteur dénormalisé sur `posts` (contrairement
        // à likes_count) — sous-requête plutôt qu'une colonne inexistante
        // (bug trouvé en auditant : l'ancienne requête référençait
        // `p.saves_count`, une colonne qui n'existe pas, 500 garanti dès
        // qu'un coiffeur a un post avec spécialité).
        $topSpecialty = DB::table('posts as p')
            ->join('specialties as s', 's.id', '=', 'p.specialty_id')
            ->leftJoinSub(
                DB::table('saved_posts')->selectRaw('post_id, COUNT(*) as cnt')->groupBy('post_id'),
                'sp',
                'sp.post_id', '=', 'p.id'
            )
            ->where('p.hairdresser_id', $id)
            ->where('p.is_published', true)
            ->selectRaw('s.name, s.slug, SUM(p.likes_count + COALESCE(sp.cnt, 0) * 3) as engagement_score')
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

        // ── Métriques premium (CHAIR+) ────────────────────────────
        // Aucune calculée si pas premium — même discipline que timeseries().
        // Les 4 métriques ci-dessous sont toutes dérivées de données déjà
        // réellement trackées (appointments, posts/saved_posts, saved_profiles) :
        // aucun nouveau tracking, aucune donnée inventée.
        $premium = $isPremium ? $this->buildPremiumMetrics($id, $weekAgo, $twoWeeksAgo) : null;

        return response()->json([
            'is_premium' => $isPremium,
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
            'premium' => $premium,
        ]);
    }

    /**
     * 4 métriques premium (CHAIR+), gated par $isPremium dans show() —
     * jamais appelée ni calculée pour un profil non-CHAIR+. Chaque valeur
     * vient d'une table déjà alimentée en continu (appointments, posts,
     * saved_posts, saved_profiles) : aucune donnée fabriquée.
     *
     * NB classement : l'évolution du classement (rang à J vs J-7) n'est PAS
     * incluse ici — elle nécessiterait un job de snapshot périodique du
     * classement qui n'existe pas encore dans le projet. Chantier séparé.
     */
    private function buildPremiumMetrics(int $id, \Illuminate\Support\Carbon $weekAgo, \Illuminate\Support\Carbon $twoWeeksAgo): array
    {
        // ── Services les plus réservés ───────────────────────────
        // service_id n'est renseigné que par le flux de réservation "réel"
        // (voir AppointmentController::store, mode service_id+date+heure) ;
        // les anciennes demandes en texte libre (colonne `service`) n'ont
        // pas de service_id et sont donc naturellement exclues du join,
        // plutôt que comptées à tort sous un service inventé.
        $topServices = DB::table('appointments as a')
            ->join('services as s', 's.id', '=', 'a.service_id')
            ->where('a.hairdresser_id', $id)
            ->whereIn('a.status', ['completed', 'confirmed'])
            ->selectRaw('s.id, s.name, COUNT(*) as bookings_count, SUM(COALESCE(a.price, s.price)) as revenue')
            ->groupBy('s.id', 's.name')
            ->orderByDesc('bookings_count')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'id'             => (int) $r->id,
                'name'           => $r->name,
                'bookings_count' => (int) $r->bookings_count,
                'revenue'        => round((float) $r->revenue, 2),
            ])
            ->values();

        // ── Réalisations les plus performantes ───────────────────
        // Score combiné vues + likes*2 + favoris*3 — mêmes poids que
        // top_specialty ci-dessus (engagement_score), pour rester cohérent
        // dans tout le contrôleur. saved_posts n'a pas de compteur
        // dénormalisé sur `posts` — sous-requête, comme pour top_specialty.
        $topPosts = DB::table('posts as p')
            ->leftJoinSub(
                DB::table('saved_posts')->selectRaw('post_id, COUNT(*) as cnt')->groupBy('post_id'),
                'sp',
                'sp.post_id', '=', 'p.id'
            )
            ->where('p.hairdresser_id', $id)
            ->where('p.is_published', true)
            ->selectRaw('p.id, p.cover_image, p.views_count, p.likes_count, COALESCE(sp.cnt, 0) as saved_count,
                (p.views_count + p.likes_count * 2 + COALESCE(sp.cnt, 0) * 3) as score')
            ->orderByDesc('score')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'id'           => (int) $r->id,
                'cover_image'  => $r->cover_image,
                'views_count'  => (int) $r->views_count,
                'likes_count'  => (int) $r->likes_count,
                'saved_count'  => (int) $r->saved_count,
                'score'        => (int) $r->score,
            ])
            ->values();

        // ── Jours / heures les plus performants ──────────────────
        // COALESCE(appointment_date, desired_date) : les RDV créés avant le
        // flux de réservation "réel" (extend_appointments_for_booking) n'ont
        // qu'une desired_date — sans ce fallback ils seraient silencieusement
        // exclus du calcul plutôt que comptés à la bonne date.
        // desired_date est NOT NULL en base (colonne requise dès la création
        // du RDV) — le COALESCE ne peut donc jamais être null, pas besoin de
        // whereNotNull défensif.
        $byDayRaw = DB::table('appointments')
            ->where('hairdresser_id', $id)
            ->whereIn('status', ['completed', 'confirmed'])
            ->selectRaw('DAYOFWEEK(COALESCE(appointment_date, desired_date)) as dow, COUNT(*) as cnt')
            ->groupBy('dow')
            ->orderByDesc('cnt')
            ->get();
        // DAYOFWEEK MySQL : 1=dimanche … 7=samedi.
        $dayNames = [1 => 'Dimanche', 2 => 'Lundi', 3 => 'Mardi', 4 => 'Mercredi', 5 => 'Jeudi', 6 => 'Vendredi', 7 => 'Samedi'];
        $byDay = $byDayRaw->map(fn($r) => [
            'day'   => $dayNames[(int) $r->dow] ?? '?',
            'count' => (int) $r->cnt,
        ])->values();

        // appointment_time n'existe que sur les RDV du flux de réservation
        // "réel" (mode service_id+date+heure) — les anciens (desired_slot en
        // texte libre "Matin/Après-midi/Soir") n'ont pas d'heure exacte et
        // sont exclus plutôt qu'approximés.
        $byHourRaw = DB::table('appointments')
            ->where('hairdresser_id', $id)
            ->whereIn('status', ['completed', 'confirmed'])
            ->whereNotNull('appointment_time')
            ->selectRaw('HOUR(appointment_time) as hour, COUNT(*) as cnt')
            ->groupBy('hour')
            ->orderByDesc('cnt')
            ->get()
            ->map(fn($r) => ['hour' => (int) $r->hour, 'count' => (int) $r->cnt])
            ->values();

        // ── Croissance des favoris (saved_profiles) ──────────────
        // Même pattern this_week/last_week/trend que posts/appointments/
        // followers plus haut dans show().
        $savedThisWeek = DB::table('saved_profiles')
            ->where('hairdresser_id', $id)->where('created_at', '>=', $weekAgo)->count();
        $savedLastWeek = DB::table('saved_profiles')
            ->where('hairdresser_id', $id)->whereBetween('created_at', [$twoWeeksAgo, $weekAgo])->count();
        $savedTotal = DB::table('saved_profiles')->where('hairdresser_id', $id)->count();

        return [
            'top_services' => $topServices,
            'top_posts'    => $topPosts,
            'best_times'   => [
                'by_day'  => $byDay,
                'by_hour' => $byHourRaw,
            ],
            'saved_growth' => [
                'this_week' => $savedThisWeek,
                'last_week' => $savedLastWeek,
                'trend'     => $this->trend($savedThisWeek, $savedLastWeek),
                'total'     => $savedTotal,
            ],
        ];
    }

    /**
     * GET /analytics/timeseries?period=7d|30d|90d|12mo — séries réelles pour
     * les graphiques (Performance). Group-by SQL sur les dates réelles,
     * jamais de données interpolées/inventées — un jour sans activité vaut 0.
     *
     * 90d + visits/saves/conversion sont réservés CHAIR+ (analytics premium) —
     * 7d/30d/12mo + posts/appointments/followers/revenue restent gratuits et
     * inchangés (aucune fonctionnalité gratuite existante ne devient payante,
     * voir docs/CHAIR_PLUS.md).
     */
    public function timeseries(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }
        $id = $profile->id;
        $isPremium = $profile->hasChairPlus();

        $period = $request->query('period', '7d');
        if (!in_array($period, ['7d', '30d', '90d', '12mo'], true)) {
            $period = '7d';
        }
        // Les plages longues (90 j ET 12 mois) sont réservées à CHAIR+ : le
        // rabattement du 12mo avait été oublié, un non-abonné obtenait 12 mois
        // de séries via period=12mo (audit sécurité 01/09/2026).
        if (($period === '90d' || $period === '12mo') && !$isPremium) {
            $period = '30d';
        }

        if ($period === '12mo') {
            $since = now()->subMonths(11)->startOfMonth();
            $buckets = collect(range(0, 11))->map(fn($i) => now()->subMonths(11 - $i)->format('Y-m'));
            $dateFormat = '%Y-%m';
        } else {
            $days  = $period === '90d' ? 89 : ($period === '30d' ? 29 : 6);
            $since = now()->subDays($days)->startOfDay();
            $buckets = collect(range(0, $days))->map(fn($i) => now()->subDays($days - $i)->format('Y-m-d'));
            $dateFormat = '%Y-%m-%d';
        }

        $postsRaw = DB::table('posts')
            ->where('hairdresser_id', $id)->where('is_published', true)
            ->where('created_at', '>=', $since)
            ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as bucket, COUNT(*) as cnt")
            ->groupBy('bucket')->pluck('cnt', 'bucket');

        $apptRaw = DB::table('appointments')
            ->where('hairdresser_id', $id)->where('status', 'completed')
            ->where('created_at', '>=', $since)
            ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as bucket, COUNT(*) as cnt")
            ->groupBy('bucket')->pluck('cnt', 'bucket');

        $followersRaw = DB::table('follows')
            ->where('hairdresser_id', $id)
            ->where('created_at', '>=', $since)
            ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as bucket, COUNT(*) as cnt")
            ->groupBy('bucket')->pluck('cnt', 'bucket');

        $revenueRaw = DB::table('appointments')
            ->where('hairdresser_id', $id)->where('status', 'completed')
            ->where('created_at', '>=', $since)
            ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as bucket, SUM(price) as total")
            ->groupBy('bucket')->pluck('total', 'bucket');

        $payload = [
            'period'    => $period,
            'is_premium' => $isPremium,
            'labels'    => $buckets->values(),
            'posts'     => $buckets->map(fn($b) => (int) ($postsRaw[$b] ?? 0))->values(),
            'appointments' => $buckets->map(fn($b) => (int) ($apptRaw[$b] ?? 0))->values(),
            'followers' => $buckets->map(fn($b) => (int) ($followersRaw[$b] ?? 0))->values(),
            'revenue'   => $buckets->map(fn($b) => round((float) ($revenueRaw[$b] ?? 0), 2))->values(),
        ];

        if ($isPremium) {
            $visitsRaw = DB::table('profile_views')
                ->where('hairdresser_profile_id', $id)
                ->where('created_at', '>=', $since)
                ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as bucket, COUNT(*) as cnt")
                ->groupBy('bucket')->pluck('cnt', 'bucket');

            $savesRaw = DB::table('saved_posts as sp')
                ->join('posts as p', 'p.id', '=', 'sp.post_id')
                ->where('p.hairdresser_id', $id)
                ->where('sp.created_at', '>=', $since)
                ->selectRaw("DATE_FORMAT(sp.created_at, '{$dateFormat}') as bucket, COUNT(*) as cnt")
                ->groupBy('bucket')->pluck('cnt', 'bucket');

            $payload['visits'] = $buckets->map(fn($b) => (int) ($visitsRaw[$b] ?? 0))->values();
            $payload['saves']  = $buckets->map(fn($b) => (int) ($savesRaw[$b] ?? 0))->values();
            // Conversion réelle par bucket (visites → RDV honorés) — 0 si pas de
            // visite ce bucket-là, jamais une division par zéro déguisée en 0%.
            $payload['conversion'] = $buckets->map(function ($b) use ($visitsRaw, $apptRaw) {
                $v = (int) ($visitsRaw[$b] ?? 0);
                $a = (int) ($apptRaw[$b] ?? 0);
                return $v > 0 ? round(($a / $v) * 100, 1) : 0.0;
            })->values();
        }

        return response()->json($payload);
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
