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

        // hairdresser_profiles n'a PAS de colonne 'name' : la selectionner
        // produisait un SQLSTATE 42S22 a chaque appel, donc une 500 systematique
        // sur la page Reservations de l'admin. Le nom vit sur users, via la
        // relation — et user_id doit figurer dans le select, sinon l'eager
        // loader n'a aucune cle a resoudre et pose user = null en silence.
        $query = Appointment::with(['hairdresser:id,slug,user_id', 'hairdresser.user:id,name', 'client:id,name']);

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

    // ─────────────────────────────────────────────────────────────────────
    //  PUSH APNs — panneau d'administration
    //
    //  Trois lectures (diagnostic, appareils, destinataires) + un envoi
    //  réel + l'historique. Toute la logique APNs vit dans ApnsService et
    //  PushService : ces méthodes ne font que les exposer à l'UI admin.
    //
    //  RÈGLE DE SÉCURITÉ, sans exception : ni la clé privée .p8, ni son
    //  chemin absolu, ni le JWT provider, ni un token d'appareil complet ne
    //  sortent d'ici. Les tokens sont masqués (8 premiers caractères), le
    //  JWT n'est représenté que par un booléen « signable ».
    // ─────────────────────────────────────────────────────────────────────

    /** Envoi ciblé sur UN utilisateur : type technique, hors taxonomie des préférences. */
    private const PUSH_ADMIN_TEST_TYPE = 'admin_test';

    /** Envoi de masse : type produit, soumis aux préférences (opt-in) et à la fenêtre calme. */
    private const PUSH_ADMIN_BROADCAST_TYPE = 'promotions';

    /** Plafond DUR d'un envoi de masse : au-delà, il faut un vrai outil de campagne. */
    private const PUSH_BROADCAST_MAX_USERS = 200;

    /**
     * GET /admin/push/diagnostics — état de la chaîne push, lisible par un
     * non-technicien. Réutilise ApnsService::diagnostics() (la même source
     * que `php artisan chair:test-push --check`), n'en réimplémente rien.
     *
     * Ne renvoie NI le chemin absolu de la clé (seulement son nom de
     * fichier), NI le JWT : `jwt_signable` est la preuve utile, la valeur du
     * jeton ne l'est pas.
     */
    public function pushDiagnostics(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $d = \App\Services\ApnsService::diagnostics();

        // signJwt() (et non jwt()) : on veut savoir si la signature marche
        // MAINTENANT, pas si un JWT traîne encore dans le cache 30 min.
        $jwtSignable = $d['key_parseable'] ? \App\Services\ApnsService::signJwt() !== null : false;

        $byPlatform = [];
        $rows = \App\Models\PushSubscription::selectRaw('platform, COUNT(*) as total')
            ->groupBy('platform')
            ->get();
        foreach ($rows as $row) {
            $byPlatform[$row->platform ?: 'inconnue'] = (int) $row->total;
        }

        $total    = \App\Models\PushSubscription::count();
        $active   = \App\Models\PushSubscription::where('enabled', true)->count();
        $users    = \App\Models\PushSubscription::where('enabled', true)->distinct()->count('user_id');

        // Points bloquants, formulés pour être affichés tels quels dans l'UI.
        $blocking = [];
        if (!$d['key_id']) {
            $blocking[] = "APNS_KEY_ID est absent de la configuration du serveur (Key ID de la clé APNs).";
        }
        if (!$d['team_id']) {
            $blocking[] = "APNS_TEAM_ID est absent de la configuration du serveur (Team ID Apple Developer).";
        }
        if (!$d['key_path']) {
            $blocking[] = "APNS_KEY_PATH est absent : le chemin du fichier de clé .p8 n'est pas renseigné.";
        } elseif (!$d['key_readable']) {
            $blocking[] = "Le fichier de clé .p8 est introuvable ou illisible à l'emplacement configuré.";
        } elseif (!$d['key_parseable']) {
            $blocking[] = "Le fichier de clé existe mais n'est pas une clé privée valide (format .p8 attendu).";
        } elseif (!$jwtSignable) {
            $blocking[] = "La signature du jeton d'authentification Apple échoue malgré une clé lisible.";
        }
        if (!$d['curl_http2']) {
            $blocking[] = "Le PHP de ce serveur n'a pas le support HTTP/2 dans curl, exigé par Apple.";
        }

        // Avertissements non bloquants : la chaîne fonctionne, mais un
        // réglage mérite d'être vérifié avant un envoi réel.
        $warnings = [];
        if ($d['environment'] === 'sandbox') {
            $warnings[] = "Environnement APNs réglé sur « sandbox » : TestFlight et l'App Store utilisent « production ».";
        }

        return response()->json([
            'ready'           => empty($blocking),
            'blocking_issues' => $blocking,
            'warnings'        => $warnings,
            'config' => [
                'key_id_present'   => (bool) $d['key_id'],
                'team_id_present'  => (bool) $d['team_id'],
                'key_path_present' => (bool) $d['key_path'],
                // Nom de fichier seul : suffit à identifier la clé, ne
                // divulgue pas l'arborescence du serveur.
                'key_filename'     => $d['key_path'] ? basename((string) $d['key_path']) : null,
                'key_readable'     => (bool) $d['key_readable'],
                'key_parseable'    => (bool) $d['key_parseable'],
                'jwt_signable'     => $jwtSignable,
                'curl_http2'       => (bool) $d['curl_http2'],
                'environment'      => $d['environment'],
                'topic_client'     => \App\Services\ApnsService::topicForApp(null),
                'topic_pro'        => \App\Services\ApnsService::topicForApp('pro'),
            ],
            'devices' => [
                'total'              => $total,
                'active'             => $active,
                'disabled'           => $total - $active,
                'users_with_devices' => $users,
                // (object) : sans appareil, un tableau PHP vide sortirait en
                // JSON comme [] et non {} — le frontend attend un objet.
                'by_platform'        => (object) $byPlatform,
            ],
            'limits' => [
                'broadcast_max_users' => self::PUSH_BROADCAST_MAX_USERS,
            ],
            'generated_at' => now()->toISOString(),
        ]);
    }

    /**
     * GET /admin/push/devices — appareils enregistrés, paginés.
     * Filtre `search` sur le nom ou l'email du porteur.
     *
     * Le token n'est JAMAIS renvoyé en entier : 8 premiers caractères, de
     * quoi rapprocher une ligne d'un log serveur, pas de quoi pousser une
     * notification depuis l'extérieur.
     */
    public function pushDevices(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = \App\Models\PushSubscription::with('user:id,name,email,role');

        if ($search = trim((string) $request->get('search', ''))) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (($enabled = $request->get('enabled')) !== null && $enabled !== '') {
            $query->where('enabled', filter_var($enabled, FILTER_VALIDATE_BOOLEAN));
        }

        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);
        $page    = $query->orderByDesc('created_at')->paginate($perPage);

        $page->getCollection()->transform(function ($s) {
            return [
                'id'           => $s->id,
                'user_id'      => $s->user_id,
                'user_name'    => $s->user->name ?? null,
                'user_email'   => $s->user->email ?? null,
                'user_role'    => $s->user->role ?? null,
                'platform'     => $s->platform,
                'device_name'  => $s->device_name,
                'provider'     => $s->provider,
                'bundle_id'    => $s->bundle_id,
                'token_masked' => self::maskPushToken((string) $s->token),
                'enabled'      => (bool) $s->enabled,
                'last_used_at' => optional($s->last_used_at)->toISOString(),
                'created_at'   => optional($s->created_at)->toISOString(),
            ];
        });

        return response()->json($page);
    }

    /**
     * GET /admin/push/recipients?search= — recherche de destinataire pour le
     * formulaire d'envoi.
     *
     * Endpoint dédié (plutôt que GET /admin/users) pour deux raisons : il
     * relève de la permission notifications.send (un admin « notifications »
     * n'a pas forcément users.read), et il renvoie le nombre d'appareils
     * actifs — l'information qui décide si l'envoi a une chance d'aboutir.
     */
    public function pushRecipients(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $search = trim((string) $request->get('search', ''));
        if (mb_strlen($search) < 2) {
            return response()->json(['data' => []]);
        }

        $users = User::query()
            ->select('id', 'name', 'email', 'role')
            ->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->limit(10)
            ->get();

        // Comptage des appareils en une requête (le modèle User n'expose pas
        // de relation pushSubscriptions et il n'est pas dans le périmètre de
        // ce module de la modifier).
        $deviceCounts = \App\Models\PushSubscription::whereIn('user_id', $users->pluck('id'))
            ->where('enabled', true)
            ->groupBy('user_id')
            ->selectRaw('user_id, COUNT(*) as total')
            ->pluck('total', 'user_id');

        $data = $users->map(function ($u) use ($deviceCounts) {
            return [
                'id'                   => (int) $u->id,
                'name'                 => $u->name,
                'email'                => $u->email,
                'role'                 => $u->role,
                'active_devices_count' => (int) ($deviceCounts[$u->id] ?? 0),
            ];
        })->sortByDesc('active_devices_count')->values();

        return response()->json(['data' => $data]);
    }

    /**
     * POST /admin/notifications/send — envoi RÉEL d'une notification push.
     *
     * Deux modes, volontairement distincts par leur rapport aux préférences
     * utilisateur (choix produit, pas un oubli) :
     *
     *  - target=user       → type « admin_test ». Ce type n'est mappé sur
     *    AUCUNE clé de préférence (voir NotificationService::TYPE_TO_PREFERENCE),
     *    il part donc toujours, à toute heure. C'est délibéré : ce mode sert à
     *    tester la chaîne sur un appareil précis et à joindre une personne
     *    nommée pour une raison opérationnelle. Il ne contourne aucun REFUS
     *    délibéré — il n'existe simplement aucun toggle « messages de
     *    l'équipe CHAIR » que l'utilisateur aurait pu décocher. À réserver
     *    aux tests et au support ; ce n'est pas un canal marketing.
     *
     *  - target=all_devices → type « promotions ». Là, on s'adresse à des
     *    gens qui n'ont rien demandé : le type EST mappé sur la préférence
     *    « promotions », désactivée par défaut (opt-in explicite, exigence
     *    App Store 4.5.4), et il est social donc bloqué de 21 h à 9 h. Un
     *    utilisateur qui n'a pas coché « promotions » ne reçoit rien, et le
     *    compte rendu le dit noir sur blanc. Plafonné à
     *    PUSH_BROADCAST_MAX_USERS destinataires par appel.
     *
     * L'envoi passe par PushService::sendToUser (préférences, fenêtre calme,
     * badge, deep link, désactivation des tokens morts). Le détail par
     * appareil est reconstitué autour de l'appel : sendToUser met à jour
     * last_used_at en cas de succès et bascule enabled=false sur un token
     * mort — on compare l'état avant/après pour nommer chaque échec.
     */
    public function sendNotification(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $data = $request->validate([
            'target'  => 'required|in:user,all_devices',
            'user_id' => 'required_if:target,user|nullable|integer|exists:users,id',
            'title'   => 'required|string|max:80',
            'message' => 'required|string|max:300',
            // Deep link INTERNE uniquement (contrat PushService : chemin
            // relatif du site, jamais d'URL absolue). Le regex refuse
            // "//evil.com" et "https://…" : une notification CHAIR ne doit
            // pas pouvoir ouvrir un domaine tiers.
            'url'     => 'nullable|string|max:200|regex:/^\/(?!\/)[A-Za-z0-9\-\/_%.]*$/',
        ], [
            'target.required'  => 'Le type de destinataire est obligatoire.',
            'target.in'        => 'Type de destinataire invalide.',
            'user_id.required_if' => 'Sélectionnez le destinataire.',
            'user_id.exists'   => "Cet utilisateur n'existe pas.",
            'title.required'   => 'Le titre est obligatoire.',
            'title.max'        => 'Le titre ne doit pas dépasser 80 caractères.',
            'message.required' => 'Le message est obligatoire.',
            'message.max'      => 'Le message ne doit pas dépasser 300 caractères.',
            'url.regex'        => "Le lien doit être un chemin interne CHAIR commençant par « / » (ex. /app/notifications).",
        ]);

        $title = trim($data['title']);
        $body  = trim($data['message']);
        $url   = isset($data['url']) ? trim((string) $data['url']) : '';

        if ($title === '' || $body === '') {
            return response()->json([
                'message' => 'Le titre et le message ne peuvent pas être vides.',
            ], 422);
        }

        $isBroadcast = $data['target'] === 'all_devices';
        $type        = $isBroadcast ? self::PUSH_ADMIN_BROADCAST_TYPE : self::PUSH_ADMIN_TEST_TYPE;
        $payloadData = $url !== '' ? ['url' => $url] : [];

        // Garde-fou en amont : sans configuration APNs, sendToUser est un
        // no-op silencieux. Autant le dire franchement plutôt que de
        // renvoyer « 0 envoyé » sans explication.
        if (!\App\Services\ApnsService::isConfigured() || !\App\Services\ApnsService::supportsHttp2()) {
            return response()->json([
                'message' => "La configuration APNs de ce serveur est incomplète : aucun envoi n'a été tenté. Consultez l'état de la chaîne push ci-dessus.",
            ], 422);
        }

        // Destinataires : soit l'utilisateur désigné, soit tous ceux qui ont
        // au moins un appareil actif (plafonnés, les plus récemment actifs
        // d'abord pour que le plafond ne coupe pas au hasard).
        if ($isBroadcast) {
            $recipientIds = \App\Models\PushSubscription::where('enabled', true)
                ->groupBy('user_id')
                ->orderByRaw('MAX(COALESCE(last_used_at, created_at)) DESC')
                ->limit(self::PUSH_BROADCAST_MAX_USERS)
                ->pluck('user_id')
                ->all();
            $totalCandidates = \App\Models\PushSubscription::where('enabled', true)->distinct()->count('user_id');
        } else {
            $recipientIds    = [(int) $data['user_id']];
            $totalCandidates = 1;
        }

        $users = User::whereIn('id', $recipientIds)->get();

        $attempted = 0;
        $sent      = 0;
        $failures  = [];
        $skipped   = [];

        foreach ($users as $user) {
            // La préférence se vérifie AVANT tout le reste : elle décide si le
            // message a le droit d'atteindre cette personne, quel que soit le
            // canal. Un compte qui a refusé les promotions ne doit pas non plus
            // en retrouver dans son centre de notifications.
            // (Le mode ciblé utilise un type non mappé : shouldSend renvoie
            // toujours true. Le contrôle n'a d'effet que sur la diffusion.)
            if (!\App\Services\NotificationService::shouldSend((int) $user->id, $type)) {
                $skipped[] = [
                    'user_id' => (int) $user->id,
                    'name'    => $user->name,
                    'reason'  => "Cet utilisateur n'a pas activé les notifications « promotions ».",
                ];
                continue;
            }

            // Trace durable dans le centre de notifications, créée AVANT la
            // tentative d'envoi et indépendamment de son issue.
            //
            // Le push est éphémère : bannière balayée, téléphone éteint,
            // appareil hors ligne — et le message n'existe plus nulle part.
            // Une notification envoyée depuis l'admin doit rester consultable
            // dans l'app, exactement comme celles émises par le produit
            // (NotificationService::send fait déjà les deux). C'est aussi le
            // seul endroit où le message peut atterrir pour un compte sans
            // appareil enregistré, d'où sa place au-dessus du test suivant.
            \App\Services\NotificationService::sendInternal(
                (int) $user->id,
                $type,
                $title,
                $body,
                $payloadData
            );

            $devices = \App\Models\PushSubscription::where('user_id', $user->id)
                ->where('enabled', true)
                ->get();

            if ($devices->isEmpty()) {
                $skipped[] = [
                    'user_id' => (int) $user->id,
                    'name'    => $user->name,
                    'reason'  => "Aucun appareil enregistré : la notification n'apparaîtra que dans l'app.",
                ];
                continue;
            }

            // Photo de l'état avant envoi, pour nommer chaque échec après.
            $before = [];
            foreach ($devices as $device) {
                $before[(int) $device->id] = optional($device->last_used_at)->getTimestamp();
            }

            $attempted += $devices->count();
            $userSent   = \App\Services\PushService::sendToUser($user, $type, $title, $body, $payloadData);
            $sent      += $userSent;

            if ($userSent === $devices->count()) {
                continue;
            }

            // Un push social (« promotions ») n'est jamais envoyé la nuit :
            // sendToUser renvoie 0 sans toucher aux appareils.
            if ($userSent === 0 && \App\Services\PushService::isSocialType($type) && \App\Services\PushService::inQuietHours()) {
                $skipped[] = [
                    'user_id' => (int) $user->id,
                    'name'    => $user->name,
                    'reason'  => 'Fenêtre calme (21 h – 9 h) : les notifications de ce type ne partent pas la nuit.',
                ];
                $attempted -= $devices->count();
                continue;
            }

            $after = \App\Models\PushSubscription::whereIn('id', array_keys($before))->get();
            foreach ($after as $device) {
                $wasUsed = optional($device->last_used_at)->getTimestamp();
                if ($wasUsed !== null && $wasUsed !== $before[(int) $device->id]) {
                    continue; // succès : last_used_at a bougé
                }
                $failures[] = [
                    'user_id'      => (int) $user->id,
                    'name'         => $user->name,
                    'device_id'    => (int) $device->id,
                    'device_name'  => $device->device_name,
                    'token_masked' => self::maskPushToken((string) $device->token),
                    'reason'       => $device->enabled
                        ? "Apple a refusé l'envoi (voir les logs serveur pour le détail)."
                        : "Jeton périmé : l'appareil s'est désinscrit, il a été désactivé.",
                ];
            }
        }

        $result = [
            'ok'                => true,
            'target'            => $data['target'],
            'type'              => $type,
            'title'             => $title,
            'url'               => $url !== '' ? $url : null,
            'recipients'        => count($recipientIds),
            'recipients_total'  => $totalCandidates,
            'truncated'         => $isBroadcast && $totalCandidates > count($recipientIds),
            'attempted'         => $attempted,
            'sent'              => $sent,
            'failed'            => max($attempted - $sent, 0),
            'failures'          => $failures,
            'skipped'           => $skipped,
        ];

        // Journal d'audit : un envoi push est une action sortante vers des
        // utilisateurs réels, elle doit laisser une trace nominative. C'est
        // aussi la source de l'historique (voir notificationHistory).
        AdminAuditLogger::log(
            $request->user(),
            'notifications.send',
            'push_notification',
            $data['target'] === 'user' ? ($data['user_id'] ?? null) : null,
            null,
            [
                'target'     => $result['target'],
                'type'       => $result['type'],
                'title'      => $title,
                'message'    => $body,
                'url'        => $result['url'],
                'recipients' => $result['recipients'],
                'attempted'  => $result['attempted'],
                'sent'       => $result['sent'],
                'failed'     => $result['failed'],
                'skipped'    => count($skipped),
            ],
            $request
        );

        return response()->json($result);
    }

    /**
     * GET /admin/notifications/history — envois passés.
     *
     * Source : admin_audit_logs (action « notifications.send »), pas de table
     * dédiée. Choix assumé : l'audit contient déjà tout ce dont l'historique a
     * besoin (qui, quand, titre, message, cible, compteurs), il est immuable,
     * et il est de toute façon obligatoire pour ce type d'action. Créer une
     * seconde table aurait dupliqué la même information avec un risque de
     * divergence, pour zéro fonctionnalité supplémentaire.
     */
    public function notificationHistory(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);

        $page = \App\Models\AdminAuditLog::with('admin:id,name,email')
            ->where('action', 'notifications.send')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $page->getCollection()->transform(function ($log) {
            $v = is_array($log->new_value) ? $log->new_value : [];
            return [
                'id'         => $log->id,
                'admin_name' => $log->admin->name ?? ('#' . $log->admin_id),
                'target'     => $v['target'] ?? null,
                'type'       => $v['type'] ?? null,
                'title'      => $v['title'] ?? null,
                'message'    => $v['message'] ?? null,
                'url'        => $v['url'] ?? null,
                'recipients' => isset($v['recipients']) ? (int) $v['recipients'] : 0,
                'attempted'  => isset($v['attempted']) ? (int) $v['attempted'] : 0,
                'sent'       => isset($v['sent']) ? (int) $v['sent'] : 0,
                'failed'     => isset($v['failed']) ? (int) $v['failed'] : 0,
                'skipped'    => isset($v['skipped']) ? (int) $v['skipped'] : 0,
                'sent_at'    => optional($log->created_at)->toISOString(),
            ];
        });

        return response()->json($page);
    }

    /**
     * Masque un token d'appareil : 8 premiers caractères, suffisant pour
     * rapprocher une ligne d'un log serveur, inutilisable pour envoyer.
     */
    private static function maskPushToken(string $token): string
    {
        if ($token === '') {
            return '—';
        }
        return substr($token, 0, 8) . '…';
    }
}
