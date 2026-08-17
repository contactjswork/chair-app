<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Review;
use App\Models\SavedPost;
use App\Models\SavedProfile;
use App\Models\User;
use App\Services\AdminAuditLogger;
use App\Services\BadgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Extrait de AdminController (voir rapport de mission "Utilisateurs") — même
 * conventions (permissions granulaires + AdminAuditLogger sur toute
 * mutation). URLs inchangées dans routes/api.php : ce découpage ne casse
 * aucune route déjà consommée par le frontend admin.
 */
class AdminUserController extends Controller
{
    public function index(Request $request)
    {
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

    /**
     * Fiche utilisateur complète — identité + activité (réservations,
     * favoris, avis, publications, filleuls, points, badges) + volet
     * professionnel s'il a un profil coiffeur, + volet salon s'il en
     * possède un. Une seule requête par relation (pas de boucle N+1).
     */
    public function show(Request $request, $id)
    {
        $user = User::with(['adminRole', 'referredBy:id,name,email'])->findOrFail($id);

        $isHairdresser = $user->hasHairdresserProfile();
        $hairdresserProfile = $isHairdresser
            ? $user->hairdresserProfile()->with(['specialties', 'salon:id,name,city,slug', 'trainingBadges'])->first()
            : null;

        $stats = [
            // Réservations — côté client (a réservé chez un coiffeur) ET côté
            // pro si le compte a un profil coiffeur (a reçu des réservations).
            'appointments_as_client'   => Appointment::where('client_id', $user->id)->count(),
            'appointments_as_hairdresser' => $hairdresserProfile
                ? Appointment::where('hairdresser_id', $hairdresserProfile->id)->count()
                : 0,
            'reviews_given'    => Review::where('client_id', $user->id)->count(),
            'reviews_received' => $hairdresserProfile ? $hairdresserProfile->reviews_count : 0,
            'saved_profiles'   => SavedProfile::where('user_id', $user->id)->count(),
            'saved_posts'      => SavedPost::where('user_id', $user->id)->count(),
            'follows'          => DB::table('follows')->where('follower_id', $user->id)->count(),
            'posts_published'  => $hairdresserProfile ? $hairdresserProfile->posts_count : 0,
            'referrals_count'  => $user->referrals()->count(),
        ];

        $recentAppointments = Appointment::where('client_id', $user->id)
            ->orWhere(function ($q) use ($hairdresserProfile) {
                if ($hairdresserProfile) {
                    $q->where('hairdresser_id', $hairdresserProfile->id);
                } else {
                    // Aucun profil coiffeur : condition toujours fausse plutôt
                    // que de retomber sur un ->orWhere() vide qui matcherait tout.
                    $q->whereRaw('1 = 0');
                }
            })
            ->with(['hairdresser:id,slug', 'hairdresser.user:id,name', 'client:id,name'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'hairdresser_id', 'client_id', 'status', 'appointment_date', 'appointment_time', 'created_at']);

        $recentReviews = Review::where('client_id', $user->id)
            ->when($hairdresserProfile, fn ($q) => $q->orWhere('hairdresser_id', $hairdresserProfile->id))
            ->with(['client:id,name', 'hairdresser:id,slug', 'hairdresser.user:id,name'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $referrals = $user->referrals()
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $professional = null;
        if ($hairdresserProfile) {
            $points = BadgeService::computePoints($hairdresserProfile);
            $professional = [
                'profile_id'         => $hairdresserProfile->id,
                'slug'                => $hairdresserProfile->slug,
                'city'                => $hairdresserProfile->city,
                'is_independent'      => $hairdresserProfile->is_independent,
                'is_verified'         => $hairdresserProfile->is_verified,
                'identity_verified'   => $hairdresserProfile->identity_verified,
                'diploma_status'      => $hairdresserProfile->diploma_status,
                'is_hidden'           => $hairdresserProfile->is_hidden,
                'hidden_reason'       => $hairdresserProfile->hidden_reason,
                'chair_pick_until'    => $hairdresserProfile->chair_pick_until,
                'chair_plus_until'    => $hairdresserProfile->chair_plus_until,
                'is_chair_plus'       => $hairdresserProfile->hasChairPlus(),
                'salon'               => $hairdresserProfile->salon,
                'specialties'         => $hairdresserProfile->specialties->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'slug' => $s->slug]),
                'services_count'      => DB::table('services')->where('hairdresser_id', $hairdresserProfile->id)->count(),
                'service_categories_count' => DB::table('service_categories')->where('hairdresser_id', $hairdresserProfile->id)->count(),
                'avg_rating'          => (float) $hairdresserProfile->avg_rating,
                'reviews_count'       => $hairdresserProfile->reviews_count,
                'followers_count'     => $hairdresserProfile->followers_count,
                'verified_visits_count' => $hairdresserProfile->verified_visits_count,
                'chair_score'         => $points,
                'chair_score_adjustment' => $hairdresserProfile->chair_score_adjustment,
                'chair_level'         => BadgeService::getLevel($points),
                'badges'              => BadgeService::getFullCatalog($hairdresserProfile),
            ];
        }

        $salonOwned = $user->salon()->withCount('hairdressers')->first();

        return response()->json([
            'user'  => $user,
            'stats' => $stats,
            'recent_appointments' => $recentAppointments,
            'recent_reviews'      => $recentReviews,
            'referrals'           => $referrals,
            'professional'        => $professional,
            'salon_owned'         => $salonOwned,
        ]);
    }

    public function suspendUser(Request $request, $id)
    {
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
        $user->tokens()->delete();

        AdminAuditLogger::log($request->user(), 'users.suspend', 'user', $user->id, ['suspended_at' => null], ['suspended_at' => $user->suspended_at->toISOString()], $request);

        return response()->json(['ok' => true]);
    }

    public function unsuspendUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        // 'suspended_at' n'est pas casté en Carbon sur User (volontairement
        // hors $casts/$fillable, même logique que suspendUser() ci-dessus) —
        // c'est donc une chaîne brute issue de la base, pas un objet Carbon.
        // ->toISOString() plantait ici en 500 sur CHAQUE réactivation
        // (Error: Call to a member function toISOString() on string),
        // trouvé en testant le shell admin depuis le frontend.
        $old = $user->suspended_at;
        $user->suspended_at = null;
        $user->save();

        AdminAuditLogger::log($request->user(), 'users.unsuspend', 'user', $user->id, ['suspended_at' => $old], ['suspended_at' => null], $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Suppression définitive du compte — reste un VRAI delete (pas un soft
     * delete) : c'est le mécanisme du droit à l'oubli RGPD (DELETE /account,
     * même logique côté self-service dans AuthController::deleteAccount).
     * Un admin doit pouvoir honorer une demande RGPD sans que la ligne
     * persiste en base. Le snapshot loggé dans admin_audit_logs (jamais
     * purgé automatiquement) reste la seule trace après coup — c'est
     * volontaire et documenté dans le rapport de mission.
     */
    public function deleteUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $snapshot = ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role];
        $user->delete();

        AdminAuditLogger::log($request->user(), 'users.delete', 'user', $id, $snapshot, null, $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Attribue manuellement un badge au coiffeur lié à cet utilisateur. Codes
     * valides = catalogue BadgeService::BADGES (mêmes clés que celles
     * affichées côté coiffeur, ex: 'pioneer_chair', 'top_5_local'...).
     */
    public function assignBadge(Request $request, $id)
    {
        $validated = $request->validate([
            'badge_code' => ['required', 'string', 'in:' . implode(',', BadgeService::allBadgeCodes())],
        ]);

        $user = User::findOrFail($id);
        $profile = $user->hairdresserProfile;
        if (!$profile) {
            return response()->json(['error' => "Cet utilisateur n'a pas de profil coiffeur"], 422);
        }

        $wasUnlocked = in_array($validated['badge_code'], array_column(BadgeService::getUnlockedBadges($profile), 'code'), true);

        BadgeService::adminAssign($profile, $validated['badge_code'], $request->user()->id);

        AdminAuditLogger::log(
            $request->user(),
            'hairdressers.badge_assign',
            'hairdresser_profile',
            $profile->id,
            ['badge_code' => $validated['badge_code'], 'was_unlocked' => $wasUnlocked],
            ['badge_code' => $validated['badge_code'], 'admin_awarded' => true],
            $request
        );

        return response()->json(['ok' => true, 'badges' => BadgeService::getFullCatalog($profile->fresh())]);
    }

    public function removeBadge(Request $request, $id, string $badgeCode)
    {
        $user = User::findOrFail($id);
        $profile = $user->hairdresserProfile;
        if (!$profile) {
            return response()->json(['error' => "Cet utilisateur n'a pas de profil coiffeur"], 422);
        }

        BadgeService::adminRemove($profile, $badgeCode);

        AdminAuditLogger::log(
            $request->user(),
            'hairdressers.badge_remove',
            'hairdresser_profile',
            $profile->id,
            ['badge_code' => $badgeCode],
            null,
            $request
        );

        return response()->json(['ok' => true, 'badges' => BadgeService::getFullCatalog($profile->fresh())]);
    }

    /**
     * Correction manuelle de points — additive (peut être négative), stockée
     * dans hairdresser_profiles.chair_score_adjustment pour ne jamais être
     * écrasée par un recalcul automatique (voir BadgeService::computePoints).
     * 'reason' obligatoire : sert de trace lisible dans l'audit log, en plus
     * des valeurs old/new.
     */
    public function adjustPoints(Request $request, $id)
    {
        $validated = $request->validate([
            'delta'  => 'required|integer|min:-100000|max:100000',
            'reason' => 'required|string|max:500',
        ]);

        $user = User::findOrFail($id);
        $profile = $user->hairdresserProfile;
        if (!$profile) {
            return response()->json(['error' => "Cet utilisateur n'a pas de profil coiffeur"], 422);
        }

        $old = $profile->chair_score_adjustment;
        $profile->chair_score_adjustment = $old + $validated['delta'];
        $profile->save();

        // Repersiste chair_score/chair_level immédiatement (sinon la fiche
        // reste affichée avec l'ancien total jusqu'au prochain refresh()
        // naturel — post publié, avis reçu...).
        BadgeService::refresh($profile->fresh());

        AdminAuditLogger::log(
            $request->user(),
            'users.points_adjust',
            'hairdresser_profile',
            $profile->id,
            ['chair_score_adjustment' => $old, 'reason' => null],
            ['chair_score_adjustment' => $profile->chair_score_adjustment, 'delta' => $validated['delta'], 'reason' => $validated['reason']],
            $request
        );

        return response()->json([
            'ok' => true,
            'chair_score_adjustment' => $profile->chair_score_adjustment,
            'chair_score' => BadgeService::computePoints($profile->fresh()),
        ]);
    }
}
