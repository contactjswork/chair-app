<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Appointment;
use App\Models\Review;
use App\Models\HairdresserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Second layer, en plus du middleware admin.token sur le groupe de
     * routes — défense en profondeur si une route est un jour ajoutée sans
     * passer par le groupe. Jamais de secret par défaut : sans
     * ADMIN_API_TOKEN configuré, aucune requête ne passe.
     */
    private function checkAdmin(Request $request)
    {
        $configured = env('ADMIN_API_TOKEN');
        if (!$configured || $configured === 'chair_admin_secret_2026') {
            return false;
        }

        return hash_equals($configured, (string) $request->bearerToken());
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

    public function users(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = User::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->get('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->get('status')) {
            if ($status === 'suspended') {
                $query->whereNotNull('suspended_at');
            } elseif ($status === 'active') {
                $query->whereNull('suspended_at');
            }
        }

        $perPage = (int) $request->get('per_page', 20);
        $users = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json($users);
    }

    public function showUser(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = User::with('hairdresserProfile')->findOrFail($id);
        return response()->json(['user' => $user]);
    }

    public function suspendUser(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // update(['suspended_at' => ...]) ne persistait RIEN : 'suspended_at'
        // n'est pas dans $fillable sur User, donc Laravel ignorait
        // silencieusement le champ (pas d'exception). Assignation directe +
        // save() pour contourner la protection de mass-assignment sur ce
        // champ volontairement absent de $fillable (un utilisateur ne doit
        // jamais pouvoir se suspendre/désuspendre lui-même via un update
        // classique de son profil).
        $user = User::findOrFail($id);
        $user->suspended_at = now();
        $user->save();
        // Révoque aussi les tokens déjà émis : sans ça, la suspension n'avait
        // aucun effet tant que l'utilisateur ne se déconnectait pas lui-même.
        // Voir aussi EnsureNotSuspended (bloque toute requête future) et
        // AuthController::login (bloque une nouvelle connexion).
        $user->tokens()->delete();
        return response()->json(['ok' => true]);
    }

    public function unsuspendUser(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = User::findOrFail($id);
        $user->suspended_at = null;
        $user->save();
        return response()->json(['ok' => true]);
    }

    public function deleteUser(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        User::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function hairdressers(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = HairdresserProfile::with('user')
            ->withCount('reviews')
            ->withAvg('reviews', 'rating');

        if ($search = $request->get('search')) {
            $query->whereHas('user', fn($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($city = $request->get('city')) {
            $query->where('city', 'like', "%{$city}%");
        }

        $hairdressers = $query->orderByDesc('reviews_count')->paginate(20);

        $hairdressers->getCollection()->transform(fn($h) => [
            'id'           => $h->user_id,
            'name'         => $h->display_name ?? $h->user?->name,
            'email'        => $h->user?->email,
            'city'         => $h->city ?? $h->user?->city,
            'type'         => $h->type ?? 'independant',
            'score'        => $h->score ?? 0,
            'rating'       => round($h->reviews_avg_rating ?? 0, 1),
            'reviews_count'=> $h->reviews_count,
            'appointments' => Appointment::where('hairdresser_id', $h->user_id)->count(),
            'status'       => $h->user?->suspended_at ? 'suspended' : 'active',
            'pro_plus'     => $h->pro_plus ?? false,
            'created_at'   => $h->user?->created_at,
        ]);

        return response()->json($hairdressers);
    }

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

        $query = Review::with(['user:id,name', 'hairdresserProfile.user:id,name']);

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
            'author_name'      => $r->user?->name ?? 'Anonyme',
            'hairdresser_name' => $r->hairdresserProfile?->user?->name ?? '-',
            'rating'           => $r->rating,
            'comment'          => $r->comment,
            'created_at'       => $r->created_at,
            'status'           => $r->status ?? 'visible',
        ]);

        return response()->json($reviews);
    }

    public function hideReview(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        Review::findOrFail($id)->update(['status' => 'hidden']);
        return response()->json(['ok' => true]);
    }

    public function showReview(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        Review::findOrFail($id)->update(['status' => 'visible']);
        return response()->json(['ok' => true]);
    }

    public function deleteReview(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        Review::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function reports(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Table reports optionnelle — retourne vide si elle n'existe pas
        try {
            $reports = DB::table('reports')
                ->whereNull('resolved_at')
                ->orderByDesc('created_at')
                ->paginate(20);
            return response()->json($reports);
        } catch (\Exception $e) {
            return response()->json(['data' => [], 'total' => 0, 'last_page' => 1]);
        }
    }

    public function ignoreReport(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            DB::table('reports')->where('id', $id)->update(['resolved_at' => now()]);
        } catch (\Exception $e) {}
        return response()->json(['ok' => true]);
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

    public function analyticsStats(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $days = (int) $request->get('days', 30);

        $registrations = User::where('created_at', '>=', now()->subDays($days))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $appointments = Appointment::where('created_at', '>=', now()->subDays($days))
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

        return response()->json([
            'registrations' => $registrations,
            'appointments'  => $appointments,
            'top_cities'    => $topCities,
        ]);
    }

    public function pendingDiplomas(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $pending = HairdresserProfile::where('diploma_status', 'pending')
            ->with('user:id,name,email')
            ->orderBy('updated_at')
            ->get()
            ->map(fn($h) => [
                'id'                    => $h->id,
                'name'                  => $h->user?->name,
                'email'                 => $h->user?->email,
                'city'                  => $h->city,
                'diploma'               => $h->diploma,
                'diploma_document_url'  => $h->diploma_document_url,
                'submitted_at'          => $h->updated_at,
            ]);

        return response()->json(['data' => $pending]);
    }

    public function approveDiploma(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $profile = HairdresserProfile::findOrFail($id);
        $profile->update(['diploma_status' => 'verified']);
        \App\Services\BadgeService::refresh($profile->fresh());

        return response()->json(['ok' => true]);
    }

    public function rejectDiploma(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        HairdresserProfile::findOrFail($id)->update(['diploma_status' => 'rejected']);

        return response()->json(['ok' => true]);
    }

    /**
     * "Coup de cœur CHAIR" — sélection éditoriale manuelle, jamais automatique
     * ni liée à l'abonnement (voir HairdresserProfile::getIsChairPickAttribute).
     * POST /admin/hairdressers/{id}/chair-pick {days?: int} — active pour N
     * jours (défaut 14) ; DELETE retire immédiatement.
     */
    public function setChairPick(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $days = max(1, min(90, (int) ($request->input('days', 14))));
        $profile = HairdresserProfile::findOrFail($id);
        $profile->update(['chair_pick_until' => now()->addDays($days)]);

        return response()->json(['ok' => true, 'chair_pick_until' => $profile->chair_pick_until]);
    }

    public function removeChairPick(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        HairdresserProfile::findOrFail($id)->update(['chair_pick_until' => null]);

        return response()->json(['ok' => true]);
    }

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

        \App\Models\SupportRequest::findOrFail($id)->update(['status' => 'closed']);

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
