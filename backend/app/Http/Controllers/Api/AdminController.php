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
    private function checkAdmin(Request $request)
    {
        $token = $request->bearerToken();
        $adminToken = config('app.admin_token', env('ADMIN_API_TOKEN', 'chair_admin_secret_2026'));
        return $token === $adminToken;
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

        $user = User::findOrFail($id);
        $user->update(['suspended_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function unsuspendUser(Request $request, $id)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = User::findOrFail($id);
        $user->update(['suspended_at' => null]);
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

    public function subscriptions(Request $request)
    {
        if (!$this->checkAdmin($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $proPlus = HairdresserProfile::where('pro_plus', true)
            ->with('user:id,name,email,created_at')
            ->paginate(20);

        $proPlus->getCollection()->transform(fn($h) => [
            'id'         => $h->user_id,
            'name'       => $h->user?->name,
            'email'      => $h->user?->email,
            'plan'       => 'PRO+',
            'amount'     => 29,
            'status'     => 'active',
            'started_at' => $h->pro_plus_started_at ?? $h->updated_at,
        ]);

        return response()->json([
            'data'      => $proPlus->items(),
            'total'     => $proPlus->total(),
            'last_page' => $proPlus->lastPage(),
            'mrr'       => $proPlus->total() * 29,
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
