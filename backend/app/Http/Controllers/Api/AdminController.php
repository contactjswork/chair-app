<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Appointment;
use App\Models\Post;
use App\Models\Review;
use App\Models\Report;
use App\Models\Salon;
use App\Models\HairdresserProfile;
use App\Models\Subscription;
use App\Models\SupportRequest;
use App\Services\AdminAuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Second layer, en plus des middlewares 'admin.auth' + 'admin.permission'
     * sur le groupe de routes (voir routes/api.php) — défense en profondeur
     * si une route est un jour ajoutée sans le bon middleware. Ne remplace
     * PAS la vérification de permission granulaire faite en amont par
     * EnsureAdminPermission ; ne fait que confirmer qu'on a bien affaire à
     * un compte admin authentifié (l'ancien jeton statique ADMIN_API_TOKEN
     * est abandonné, voir EnsureAdminAuthenticated).
     */
    private function checkAdmin(Request $request)
    {
        $user = $request->user();

        return $user && $user->role === 'admin' && !$user->suspended_at;
    }

    public function stats(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $totalUsers       = User::count();
        $totalHairdressers = User::where('role', 'hairdresser')->count();
        $totalClients     = User::where('role', 'client')->count();
        $totalAppointments = Appointment::count();
        $totalReviews     = Review::count();

        try {
            $newUsersThisMonth = User::where('created_at', '>=', now()->startOfMonth())->count();
            $newUsersLastMonth = User::whereBetween('created_at', [
                now()->subMonth()->startOfMonth(),
                now()->subMonth()->endOfMonth(),
            ])->count();
            $newAppointmentsThisMonth = Appointment::where('created_at', '>=', now()->startOfMonth())->count();
        } catch (\Exception $e) {
            $newUsersThisMonth = 0; $newUsersLastMonth = 0; $newAppointmentsThisMonth = 0;
        }

        return response()->json([
            'total_users'               => $totalUsers,
            'total_hairdressers'        => $totalHairdressers,
            'total_clients'             => $totalClients,
            'total_appointments'        => $totalAppointments,
            'total_reviews'             => $totalReviews,
            'new_users_this_month'      => $newUsersThisMonth,
            'new_users_last_month'      => $newUsersLastMonth,
            'new_appointments_this_month' => $newAppointmentsThisMonth,
        ]);
    }

    /**
     * GET /admin/dashboard/today — premier écran admin, "aujourd'hui" +
     * "cette semaine" + alertes. Voir rapport de mission "Statistiques et
     * Insights" partie (a) pour le détail exact de chaque champ.
     *
     * "Cette semaine" = semaine ISO en cours (lundi 00:00 -> maintenant),
     * comportement par défaut de Carbon::startOfWeek() dans cette app
     * (aucune config locale ne le change, voir config/app.php).
     */
    public function dashboardToday(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $now       = now();
        $todayFrom = $now->copy()->startOfDay();
        $weekFrom  = $now->copy()->startOfWeek();

        $counters = function ($since) {
            return [
                'new_users'                => User::where('created_at', '>=', $since)->count(),
                'new_hairdressers'         => User::where('role', 'hairdresser')->where('created_at', '>=', $since)->count(),
                'new_salons'               => Salon::where('created_at', '>=', $since)->count(),
                'new_appointments'         => Appointment::where('created_at', '>=', $since)->count(),
                'new_reviews'              => Review::where('created_at', '>=', $since)->count(),
                'new_posts'                => Post::where('created_at', '>=', $since)->count(),
                // Nouvel abonnement démarré (essai ou payant), CHAIR+ individuel
                // ET CHAIR BUSINESS confondus — voir subscriptions() pour la
                // ventilation détaillée par plan.
                'new_chair_plus_subscriptions' => Subscription::whereIn('plan', ['chair_plus', 'chair_business'])
                    ->where('created_at', '>=', $since)->count(),
            ];
        };

        $pendingReports        = Report::whereNull('resolved_at')->count();
        $hairdressersToVerify  = HairdresserProfile::where('diploma_status', 'pending')->count();
        $suspendedUsers        = User::whereNotNull('suspended_at')->count();
        $suspendedSalons       = Salon::whereNotNull('suspended_at')->count();
        // "Nécessitant une intervention" = tickets support pas encore fermés,
        // avec priorité aux comptes CHAIR+ (support_requests.priority=true).
        $supportOpen           = SupportRequest::where('status', '!=', 'closed')->count();
        $supportOpenPriority   = SupportRequest::where('status', '!=', 'closed')->where('priority', true)->count();

        return response()->json([
            'today'    => $counters($todayFrom),
            'this_week' => $counters($weekFrom),
            'alerts'   => [
                'pending_reports'          => $pendingReports,
                'hairdressers_to_verify'   => $hairdressersToVerify,
                'suspended_accounts'       => $suspendedUsers + $suspendedSalons,
                'suspended_users'          => $suspendedUsers,
                'suspended_salons'         => $suspendedSalons,
                'support_requests_open'    => $supportOpen,
                'support_requests_priority_open' => $supportOpenPriority,
            ],
            'week_started_at' => $weekFrom->toISOString(),
            'generated_at'    => $now->toISOString(),
        ]);
    }

    public function topHairdressers(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $top = HairdresserProfile::withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->orderByDesc('reviews_count')
            ->limit(5)
            ->get()
            ->map(fn($h) => [
                'id'       => $h->user_id,
                'name'     => $h->display_name ?? $h->user?->name,
                'city'     => $h->city ?? $h->user?->city,
                'appointments' => Appointment::where('hairdresser_id', $h->user_id)->count(),
                'rating'   => round($h->reviews_avg_rating ?? 0, 1),
            ]);

        return response()->json(['top' => $top]);
    }

    public function recentActivity(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $users = User::latest()->limit(5)->get()->map(fn($u) => [
                'type'       => 'user',
                'message'    => "Nouvel utilisateur : {$u->name}",
                'created_at' => $u->created_at?->toISOString(),
            ]);

            $appointments = Appointment::latest()->limit(5)->get()->map(fn($a) => [
                'type'       => 'appointment',
                'message'    => "Nouveau RDV #{$a->id}",
                'created_at' => $a->created_at?->toISOString(),
            ]);

            $activity = $users->concat($appointments)
                ->sortByDesc('created_at')
                ->values()
                ->take(10);

            return response()->json(['activity' => $activity]);
        } catch (\Exception $e) {
            return response()->json(['activity' => []]);
        }
    }

    // users(), showUser(), suspendUser(), unsuspendUser(), deleteUser() ont
    // été déplacées dans AdminUserController (voir rapport de mission
    // "Utilisateurs") — mêmes URLs dans routes/api.php, rien de cassé côté
    // frontend. hairdressers(), pendingDiplomas(), approveDiploma(),
    // rejectDiploma(), setChairPick(), removeChairPick() ont été déplacées
    // dans AdminHairdresserController (mission "Professionnels").

    public function appointments(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = Appointment::with(['hairdresser:id,name', 'client:id,name']);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $appointments = $query->orderByDesc('created_at')->paginate(20);
        return response()->json($appointments);
    }

    public function reviews(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // NB: Review::user() et Review::hairdresserProfile() n'existent pas —
        // les relations s'appellent client() et hairdresser() (voir
        // app/Models/Review.php). Cette route plantait en 500 sur TOUT appel
        // (RelationNotFoundException) avant ce correctif — trouvé en testant
        // la consolidation de la modération.
        $query = Review::with(['client:id,name', 'hairdresser.user:id,name']);

        if ($rating = $request->get('rating')) {
            if ($rating === 'lte2') {
                $query->where('rating', '<=', 2);
            } else {
                $query->where('rating', (int)$rating);
            }
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $reviews = $query->orderByDesc('created_at')->paginate(20);

        $reviews->getCollection()->transform(fn($r) => [
            'id'               => $r->id,
            'author_name'      => $r->client?->name ?? 'Anonyme',
            'hairdresser_name' => $r->hairdresser?->user?->name ?? '-',
            'rating'           => $r->rating,
            'comment'          => $r->comment,
            'created_at'       => $r->created_at,
            'status'           => $r->status ?? 'visible',
            // Avis <=2 étoiles, encore visible, jamais traité par un
            // modérateur (voir migration 2026_08_17_140004) — file "à
            // regarder" sans forcément masquer un avis sévère mais légitime.
            'needs_attention'  => $r->rating <= 2 && ($r->status ?? 'visible') === 'visible' && $r->moderation_reviewed_at === null,
        ]);

        return response()->json($reviews);
    }

    /**
     * "Traite" un avis à faible note sans le masquer (avis sévère mais
     * légitime) — le retire du flag needs_attention sans toucher à
     * status/visibilité. Distinct de hideReview() (voir migration
     * 2026_08_17_140004).
     */
    public function markReviewReviewed(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $review = Review::findOrFail($id);
        $old = $review->moderation_reviewed_at;
        $review->update(['moderation_reviewed_at' => now()]);

        AdminAuditLogger::log($request->user(), 'reviews.mark_reviewed', 'review', $review->id, ['moderation_reviewed_at' => $old], ['moderation_reviewed_at' => now()->toISOString()], $request);

        return response()->json(['ok' => true]);
    }

    public function hideReview(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $review = Review::findOrFail($id);
        $old = $review->status ?? 'visible';
        $review->update(['status' => 'hidden']);

        AdminAuditLogger::log($request->user(), 'reviews.hide', 'review', $review->id, ['status' => $old], ['status' => 'hidden'], $request);

        return response()->json(['ok' => true]);
    }

    public function showReview(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $review = Review::findOrFail($id);
        $old = $review->status ?? 'visible';
        $review->update(['status' => 'visible']);

        AdminAuditLogger::log($request->user(), 'reviews.show', 'review', $review->id, ['status' => $old], ['status' => 'visible'], $request);

        return response()->json(['ok' => true]);
    }

    public function deleteReview(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $review = Review::findOrFail($id);
        $snapshot = ['id' => $review->id, 'rating' => $review->rating, 'comment' => $review->comment];
        $review->delete();

        AdminAuditLogger::log($request->user(), 'reviews.delete', 'review', $id, $snapshot, null, $request);

        return response()->json(['ok' => true]);
    }

    /**
     * GET /admin/reports — table 'reports' réelle depuis
     * migration 2026_08_17_140003 (elle n'a jamais existé avant : ce
     * endpoint retournait toujours une liste vide via le try/catch
     * d'origine). Contrat de réponse inchangé — frontend
     * app/admin/signalements/page.tsx déjà câblé dessus.
     */
    public function reports(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $reports = Report::with(['reportedUser:id,name', 'reporter:id,name'])
            ->whereNull('resolved_at')
            ->orderByDesc('created_at')
            ->paginate(20);

        $reports->getCollection()->transform(fn(Report $r) => [
            'id'                 => $r->id,
            'type'               => $r->type,
            'reported_user_name' => $r->reportedUser?->name ?? '-',
            'reported_user_id'   => $r->reported_user_id,
            'reason'             => $r->reason,
            'reporter_name'      => $r->reporter?->name ?? 'Anonyme',
            'created_at'         => $r->created_at,
            'content_id'         => $r->content_id,
        ]);

        return response()->json($reports);
    }

    public function ignoreReport(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $report = Report::findOrFail($id);
        $old = ['resolved_at' => $report->resolved_at];
        $report->update(['resolved_at' => now(), 'resolved_by' => $request->user()->id, 'resolution' => 'ignored']);

        AdminAuditLogger::log($request->user(), 'reports.ignore', 'report', $report->id, $old, ['resolved_at' => now()->toISOString(), 'resolution' => 'ignored'], $request);

        return response()->json(['ok' => true]);
    }

    /**
     * POST /admin/reports/{id}/delete-content — supprime le contenu
     * signalé (avis ou réalisation) et résout le signalement. Le frontend
     * (app/admin/signalements/page.tsx) appelait déjà cette route ; elle
     * n'existait tout simplement pas côté backend (bouton "Supprimer" mort).
     */
    public function deleteReportContent(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $report = Report::findOrFail($id);
        $snapshot = null;

        if ($report->type === 'review' && $report->content_id) {
            $review = Review::find($report->content_id);
            if ($review) {
                $snapshot = ['review_id' => $review->id, 'rating' => $review->rating, 'comment' => $review->comment];
                $review->delete();
            }
        } elseif ($report->type === 'post' && $report->content_id) {
            $post = \App\Models\Post::find($report->content_id);
            if ($post) {
                $snapshot = ['post_id' => $post->id, 'description' => $post->description];
                $post->delete();
            }
        }

        $report->update(['resolved_at' => now(), 'resolved_by' => $request->user()->id, 'resolution' => 'content_deleted']);

        AdminAuditLogger::log($request->user(), 'reports.delete_content', 'report', $report->id, ['content_id' => $report->content_id, 'type' => $report->type], $snapshot, $request);

        return response()->json(['ok' => true]);
    }

    /**
     * GET /admin/moderation/summary — vue d'ensemble légère qui unifie les
     * deux files existantes (signalements réels + avis à faible note non
     * traités) sans fusionner leurs pages dédiées (app/admin/signalements et
     * app/admin/avis restent les vues détaillées). Voir rapport de mission,
     * partie (d).
     */
    public function moderationSummary(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json([
            'pending_reports'          => Report::whereNull('resolved_at')->count(),
            'low_rating_needs_attention' => Review::where('rating', '<=', 2)
                ->where('status', 'visible')
                ->whereNull('moderation_reviewed_at')
                ->count(),
            'hidden_reviews'           => Review::where('status', 'hidden')->count(),
        ]);
    }

    /**
     * Remplace un ancien stub "PRO+" (colonne hairdresser_profiles.pro_plus,
     * déjà supprimée de la base — cet endpoint plantait silencieusement)
     * par une vraie lecture de la table subscriptions (voir docs/CHAIR_PLUS.md).
     */
    public function subscriptions(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $subs = \App\Models\Subscription::whereIn('status', ['trialing', 'active', 'past_due'])
            ->with(['hairdresserProfile.user:id,name,email', 'salon:id,name'])
            ->orderByDesc('id')
            ->paginate(20);

        $subs->getCollection()->transform(fn($s) => [
            'id'         => $s->id,
            'name'       => $s->hairdresserProfile?->user?->name ?? $s->salon?->name,
            'email'      => $s->hairdresserProfile?->user?->email,
            'plan'       => $s->plan === 'chair_business' ? 'CHAIR BUSINESS' : 'CHAIR+',
            'amount'     => $s->plan === 'chair_business' ? 49.99 : 9.99,
            'status'     => $s->status,
            'started_at' => $s->created_at,
        ]);

        $activeCount = \App\Models\Subscription::whereIn('status', ['active', 'past_due'])->count();
        $plusMrr     = \App\Models\Subscription::whereIn('status', ['active', 'past_due'])->where('plan', 'chair_plus')->count() * 9.99;
        $businessMrr = \App\Models\Subscription::whereIn('status', ['active', 'past_due'])->where('plan', 'chair_business')->count() * 49.99;

        return response()->json([
            'data'      => $subs->items(),
            'total'     => $subs->total(),
            'last_page' => $subs->lastPage(),
            // MRR réel — trialing exclu volontairement, ne compte que ce qui facture.
            'mrr'       => round($plusMrr + $businessMrr, 2),
            'active_paying_count' => $activeCount,
        ]);
    }

    /**
     * GET /admin/analytics — étendu pour la mission "Statistiques et
     * Insights" (voir rapport, partie (a)/(b)). Contrat d'origine conservé
     * à l'identique (registrations/appointments/top_cities, mêmes clés,
     * mêmes formes) pour ne rien casser côté frontend existant — tout le
     * reste est ADDITIF.
     *
     * days plafonné à 365 : au-delà, les group by DATE() sur des tables qui
     * grossissent (users/appointments/reviews/posts) deviennent coûteux
     * pour un dashboard censé répondre vite ; un vrai historique long terme
     * demanderait des agrégats pré-calculés (table de rollup quotidien), pas
     * encore construits (hors scope de cette mission — lecture seule).
     */
    public function analyticsStats(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $days  = min(365, max(1, (int) $request->get('days', 30)));
        $since = now()->subDays($days);

        $registrations = User::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $appointments = Appointment::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topCities = User::whereNotNull('city')
            ->selectRaw('city, COUNT(*) as count')
            ->groupBy('city')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Inscriptions ventilées par rôle (client vs coiffeur) — une seule
        // requête groupée par (date, role), reventilée en PHP plutôt que 2
        // requêtes séparées.
        $registrationsByRoleRaw = User::where('created_at', '>=', $since)
            ->whereIn('role', ['client', 'hairdresser'])
            ->selectRaw('DATE(created_at) as date, role, COUNT(*) as count')
            ->groupBy('date', 'role')
            ->orderBy('date')
            ->get();
        $registrationsByRole = ['client' => [], 'hairdresser' => []];
        foreach ($registrationsByRoleRaw as $row) {
            $registrationsByRole[$row->role][] = ['date' => $row->date, 'count' => $row->count];
        }

        $reviews = Review::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')->orderBy('date')->get();

        $posts = Post::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')->orderBy('date')->get();

        $newSubscriptions = Subscription::whereIn('plan', ['chair_plus', 'chair_business'])
            ->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, plan, COUNT(*) as count')
            ->groupBy('date', 'plan')
            ->orderBy('date')
            ->get();

        // Utilisateurs actifs : proxy réel via personal_access_tokens.last_used_at
        // (mis à jour à chaque requête authentifiée Sanctum). PAS un vrai
        // compteur de sessions/visites distinctes — juste "au moins une
        // requête authentifiée dans la fenêtre". Un jeton n'est supprimé
        // qu'au logout explicite (voir AuthController::logout) : un jeton
        // jamais révoqué reste donc un signal honnête de dernière activité,
        // pas un artefact de connexion pré-remplie.
        $activeUsers = [
            'last_7_days'  => DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('last_used_at', '>=', now()->subDays(7))
                ->distinct()->count('tokenable_id'),
            'last_30_days' => DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('last_used_at', '>=', now()->subDays(30))
                ->distinct()->count('tokenable_id'),
        ];

        $retention = $this->retentionProxy();

        return response()->json([
            'registrations'         => $registrations,
            'appointments'          => $appointments,
            'top_cities'            => $topCities,
            'registrations_by_role' => $registrationsByRole,
            'reviews'               => $reviews,
            'posts'                 => $posts,
            'new_subscriptions'     => $newSubscriptions,
            'active_users'          => $activeUsers,
            'retention'             => $retention,
            'days'                  => $days,
        ]);
    }

    /**
     * Proxy de rétention RÉEL (pas inventé) mais approximatif, faute d'un
     * vrai journal de sessions. Principe : personal_access_tokens.last_used_at
     * est mis à jour par Sanctum à CHAQUE requête authentifiée et n'est
     * supprimé qu'au logout explicite (voir docblock analyticsStats()). Pour
     * un utilisateur donné, MAX(last_used_at) sur tous ses jetons est donc sa
     * dernière activité connue, toutes sessions confondues.
     *
     * D7/D30 "retenu" = ce dernier instant d'activité connu est survenu au
     * moins N jours après l'inscription — c'est-à-dire que le compte a bien
     * été réutilisé après sa première semaine/premier mois, pas seulement
     * lors de l'inscription elle-même (qui crée déjà un jeton).
     *
     * LIMITE ASSUMÉE, documentée aussi dans le rapport de mission : ceci
     * mesure "encore actif au moins une fois après N jours", pas un vrai
     * cohort multi-période (ex: "actif chaque semaine depuis l'inscription").
     * Un utilisateur revenu une seule fois à J+3 puis jamais après compte
     * comme NON retenu à D7 — c'est le comportement correct pour cette
     * définition, mais ce n'est pas une courbe de rétention complète. Cette
     * dernière demanderait un vrai journal d'événements de session, qui
     * n'existe pas aujourd'hui (voir rapport, partie (b)).
     *
     * Cohortes bornées (7-90 jours pour D7, 30-180 jours pour D30) pour
     * garder la requête raisonnable et parce qu'un compte de plus de 6 mois
     * n'apporte plus d'info supplémentaire pertinente pour un taux "à
     * chaud".
     */
    private function retentionProxy(): array
    {
        $note = "Proxy réel basé sur personal_access_tokens.last_used_at (dernière requête authentifiée connue), pas un vrai cohort de sessions multiples — voir doc technique. Compte comme \"retenu\" un utilisateur dont la dernière activité connue a eu lieu au moins N jours après son inscription.";

        $build = function (int $days, int $cohortMaxAgeDays) {
            $cohort = User::where('created_at', '<=', now()->subDays($days))
                ->where('created_at', '>=', now()->subDays($cohortMaxAgeDays))
                ->get(['id', 'created_at']);

            if ($cohort->isEmpty()) {
                return ['cohort_size' => 0, 'retained' => 0, 'rate' => null];
            }

            $lastSeenByUser = DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $cohort->pluck('id'))
                ->selectRaw('tokenable_id, MAX(last_used_at) as last_seen')
                ->groupBy('tokenable_id')
                ->pluck('last_seen', 'tokenable_id');

            $retained = 0;
            foreach ($cohort as $user) {
                $lastSeen = $lastSeenByUser[$user->id] ?? null;
                if ($lastSeen && \Carbon\Carbon::parse($lastSeen)->gte($user->created_at->copy()->addDays($days))) {
                    $retained++;
                }
            }

            return [
                'cohort_size' => $cohort->count(),
                'retained'    => $retained,
                'rate'        => round($retained / $cohort->count() * 100, 1),
            ];
        };

        return [
            'd7'   => $build(7, 90),
            'd30'  => $build(30, 180),
            'note' => $note,
        ];
    }

    // pendingDiplomas(), approveDiploma(), rejectDiploma(), setChairPick(),
    // removeChairPick() ont été déplacées dans AdminHairdresserController
    // (mission "Professionnels") — mêmes URLs dans routes/api.php.

    /** Support prioritaire CHAIR+ — les tickets priority=true remontent en premier. */
    public function supportRequests(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $requests = \App\Models\SupportRequest::with('user:id,name,email')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderByDesc('priority')
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    public function resolveSupportRequest(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $supportRequest = \App\Models\SupportRequest::findOrFail($id);
        $old = $supportRequest->status;
        $supportRequest->update(['status' => 'closed']);

        AdminAuditLogger::log($request->user(), 'support_requests.resolve', 'support_request', $supportRequest->id, ['status' => $old], ['status' => 'closed'], $request);

        return response()->json(['ok' => true]);
    }

    public function sendNotification(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Placeholder — intégrer Firebase/OneSignal ici
        return response()->json(['ok' => true, 'sent' => 0]);
    }

    public function notificationHistory(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['history' => []]);
    }
}
