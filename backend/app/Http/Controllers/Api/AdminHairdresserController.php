<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Services\AdminAuditLogger;
use App\Services\BadgeService;
use Illuminate\Http\Request;

/**
 * Extrait de AdminController (voir rapport de mission "Professionnels") —
 * mêmes conventions (permissions granulaires + AdminAuditLogger sur toute
 * mutation). URLs des endpoints déjà existants (liste, diplômes,
 * chair-pick) inchangées dans routes/api.php.
 */
class AdminHairdresserController extends Controller
{
    public function index(Request $request)
    {
        $query = HairdresserProfile::with('user')
            ->withCount('reviews')
            ->withAvg('reviews', 'rating');

        if ($search = $request->get('search')) {
            $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($city = $request->get('city')) {
            $query->where('city', 'like', "%{$city}%");
        }

        $hairdressers = $query->orderByDesc('reviews_count')->paginate(20);

        $hairdressers->getCollection()->transform(fn ($h) => [
            'id'            => $h->user_id,
            'profile_id'    => $h->id,
            'name'          => $h->display_name ?? $h->user?->name,
            'email'         => $h->user?->email,
            'city'          => $h->city ?? $h->user?->city,
            'type'          => $h->type ?? 'independant',
            'score'         => $h->score ?? 0,
            'rating'        => round($h->reviews_avg_rating ?? 0, 1),
            'reviews_count' => $h->reviews_count,
            'appointments'  => Appointment::where('hairdresser_id', $h->user_id)->count(),
            'status'        => $h->user?->suspended_at ? 'suspended' : 'active',
            'pro_plus'      => $h->pro_plus ?? false,
            'is_verified'   => $h->is_verified,
            'is_hidden'     => $h->is_hidden,
            'created_at'    => $h->user?->created_at,
        ]);

        return response()->json($hairdressers);
    }

    /** Fiche coiffeur complète — profil, salon, spécialités, services, réputation. */
    public function show(Request $request, $id)
    {
        $profile = HairdresserProfile::with([
            'user:id,name,email,phone,city,suspended_at,created_at',
            'salon:id,name,city,slug,is_verified,suspended_at',
            'specialties',
            'trainingBadges',
        ])->findOrFail($id);

        $points = BadgeService::computePoints($profile);

        return response()->json([
            'profile' => $profile,
            'stats'   => [
                'appointments_count'      => Appointment::where('hairdresser_id', $profile->id)->count(),
                'services_count'          => \App\Models\Service::where('hairdresser_id', $profile->id)->count(),
                'service_categories_count'=> \App\Models\ServiceCategory::where('hairdresser_id', $profile->id)->count(),
                'reviews_count'           => $profile->reviews_count,
                'avg_rating'              => (float) $profile->avg_rating,
                'followers_count'         => $profile->followers_count,
                'posts_count'             => $profile->posts_count,
                'visits_count'            => $profile->visits_count,
                'verified_visits_count'   => $profile->verified_visits_count,
            ],
            'chair_score'            => $points,
            'chair_score_adjustment' => $profile->chair_score_adjustment,
            'chair_level'            => BadgeService::getLevel($points),
            'badges'                 => BadgeService::getFullCatalog($profile),
            'is_chair_plus'          => $profile->hasChairPlus(),
            'recent_reviews'         => \App\Models\Review::where('hairdresser_id', $profile->id)
                ->with('client:id,name')
                ->orderByDesc('created_at')
                ->limit(10)
                ->get(),
        ]);
    }

    public function pendingDiplomas(Request $request)
    {
        $pending = HairdresserProfile::where('diploma_status', 'pending')
            ->with('user:id,name,email')
            ->orderBy('updated_at')
            ->get()
            ->map(fn ($h) => [
                'id'                   => $h->id,
                'name'                 => $h->user?->name,
                'email'                => $h->user?->email,
                'city'                 => $h->city,
                'diploma'              => $h->diploma,
                'diploma_document_url' => $h->diploma_document_url,
                'submitted_at'         => $h->updated_at,
            ]);

        return response()->json(['data' => $pending]);
    }

    public function approveDiploma(Request $request, $id)
    {
        $profile = HairdresserProfile::findOrFail($id);
        $old = $profile->diploma_status;
        $profile->update(['diploma_status' => 'verified']);
        BadgeService::refresh($profile->fresh());

        AdminAuditLogger::log($request->user(), 'diplomas.approve', 'hairdresser_profile', $profile->id, ['diploma_status' => $old], ['diploma_status' => 'verified'], $request);

        return response()->json(['ok' => true]);
    }

    public function rejectDiploma(Request $request, $id)
    {
        $profile = HairdresserProfile::findOrFail($id);
        $old = $profile->diploma_status;
        $profile->update(['diploma_status' => 'rejected']);

        AdminAuditLogger::log($request->user(), 'diplomas.reject', 'hairdresser_profile', $profile->id, ['diploma_status' => $old], ['diploma_status' => 'rejected'], $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Vérifie un profil (badge "Identité vérifiée") — distinct du diplôme
     * (diploma_status) et de l'abonnement CHAIR+ (badge "Certifié CHAIR",
     * voir BadgeService::isBadgeUnlocked('verified')). Correspond à la
     * colonne hairdresser_profiles.identity_verified déjà lue par le badge
     * 'identity_verified', jusqu'ici jamais posée par aucun endpoint admin.
     */
    public function verify(Request $request, $id)
    {
        $profile = HairdresserProfile::findOrFail($id);
        $old = $profile->identity_verified;
        $profile->update(['identity_verified' => true]);
        BadgeService::refresh($profile->fresh());

        AdminAuditLogger::log($request->user(), 'hairdressers.verify', 'hairdresser_profile', $profile->id, ['identity_verified' => $old], ['identity_verified' => true], $request);

        return response()->json(['ok' => true]);
    }

    public function unverify(Request $request, $id)
    {
        $profile = HairdresserProfile::findOrFail($id);
        $old = $profile->identity_verified;
        $profile->update(['identity_verified' => false]);

        AdminAuditLogger::log($request->user(), 'hairdressers.unverify', 'hairdresser_profile', $profile->id, ['identity_verified' => $old], ['identity_verified' => false], $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Masque un profil coiffeur des listings publics (HairdresserController
     * index/show, voir migration 2026_08_17_130002) sans suspendre le compte
     * ni couper l'accès à l'espace pro — utile pendant une modération en
     * cours. Pour bloquer complètement le compte, voir POST
     * /admin/users/{id}/suspend (AdminUserController::suspendUser).
     */
    public function hide(Request $request, $id)
    {
        $validated = $request->validate(['reason' => 'nullable|string|max:255']);

        $profile = HairdresserProfile::findOrFail($id);
        $old = ['is_hidden' => $profile->is_hidden, 'hidden_reason' => $profile->hidden_reason];
        $profile->is_hidden = true;
        $profile->hidden_reason = $validated['reason'] ?? null;
        $profile->hidden_at = now();
        $profile->save();

        AdminAuditLogger::log($request->user(), 'hairdressers.hide', 'hairdresser_profile', $profile->id, $old, ['is_hidden' => true, 'hidden_reason' => $profile->hidden_reason], $request);

        return response()->json(['ok' => true]);
    }

    public function unhide(Request $request, $id)
    {
        $profile = HairdresserProfile::findOrFail($id);
        $old = ['is_hidden' => $profile->is_hidden, 'hidden_reason' => $profile->hidden_reason];
        $profile->is_hidden = false;
        $profile->hidden_reason = null;
        $profile->hidden_at = null;
        $profile->save();

        AdminAuditLogger::log($request->user(), 'hairdressers.unhide', 'hairdresser_profile', $profile->id, $old, ['is_hidden' => false, 'hidden_reason' => null], $request);

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
        $days = max(1, min(90, (int) ($request->input('days', 14))));
        $profile = HairdresserProfile::findOrFail($id);
        $old = $profile->chair_pick_until;
        $profile->update(['chair_pick_until' => now()->addDays($days)]);

        AdminAuditLogger::log($request->user(), 'hairdressers.chair_pick.set', 'hairdresser_profile', $profile->id, ['chair_pick_until' => $old], ['chair_pick_until' => $profile->chair_pick_until], $request);

        return response()->json(['ok' => true, 'chair_pick_until' => $profile->chair_pick_until]);
    }

    public function removeChairPick(Request $request, $id)
    {
        $profile = HairdresserProfile::findOrFail($id);
        $old = $profile->chair_pick_until;
        $profile->update(['chair_pick_until' => null]);

        AdminAuditLogger::log($request->user(), 'hairdressers.chair_pick.remove', 'hairdresser_profile', $profile->id, ['chair_pick_until' => $old], ['chair_pick_until' => null], $request);

        return response()->json(['ok' => true]);
    }
}
