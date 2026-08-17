<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Salon;
use App\Models\HairdresserProfile;
use App\Models\Review;
use App\Models\SalonJoinRequest;
use App\Services\NotificationService;
use App\Services\QrTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class SalonController extends Controller
{
    // ── PUBLIC ────────────────────────────────────────────────────────────────

    /** GET /salons — liste publique */
    public function index(Request $request)
    {
        // Un salon suspendu (AdminSalonController::suspend) reste en base
        // intact mais ne doit plus apparaître dans le listing public — pas
        // un delete, voir Salon::isSuspended().
        $query = Salon::with(['hairdressers.user', 'owner'])
            ->withCount('hairdressers')
            ->whereNull('suspended_at');

        if ($request->q) {
            $q = $request->q;
            $query->where(function ($sq) use ($q) {
                $sq->where('name', 'LIKE', "%{$q}%")
                   ->orWhere('city', 'LIKE', "%{$q}%")
                   ->orWhere('description', 'LIKE', "%{$q}%");
            });
        }

        if ($request->city) {
            $query->where('city', 'LIKE', '%' . $request->city . '%');
        }

        $query->orderByDesc('hairdressers_count');

        return response()->json($query->paginate(20));
    }

    /** GET /salons/{slug} — page publique du salon */
    public function show(string $slug)
    {
        $salon = Salon::with([
            'hairdressers.user',
            'hairdressers.specialties',
            'owner',
        ])->where('slug', $slug)->whereNull('suspended_at')->firstOrFail();

        // Fiche unique — pas de risque N+1, contrairement aux endpoints de
        // liste (index()) qui devraient batcher au lieu d'append() par ligne.
        $salon->append('is_chair_business');

        return response()->json($salon);
    }

    // ── PUBLIC — Vérification SIRET ──────────────────────────────────────────

    /** GET /verify-siret?siret=12345678901234 */
    public function verifySiret(Request $request)
    {
        $request->validate(['siret' => 'required|string|size:14|regex:/^\d{14}$/']);
        $result = \App\Services\SiretVerificationService::lookup($request->siret);
        return response()->json($result, $result['valid'] ? 200 : 404);
    }

    // ── PROTECTED ─────────────────────────────────────────────────────────────

    /** POST /my-salon — créer un salon (salon_owner sans salon existant) */
    public function createMySalon(Request $request)
    {
        $user = $request->user();

        if (Salon::where('owner_id', $user->id)->exists()) {
            return response()->json(['message' => 'Vous possédez déjà un salon.'], 422);
        }

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'city'         => 'nullable|string|max:100',
            'siret'        => 'nullable|string|size:14|regex:/^\d{14}$/',
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug     = $baseSlug;
        $i        = 1;
        while (Salon::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$i}";
            $i++;
        }

        $hasSiret = !empty($validated['siret']);
        $salon = Salon::create([
            'owner_id'            => $user->id,
            'name'                => $validated['name'],
            'slug'                => $slug,
            'city'                => $validated['city'] ?? null,
            'siret'               => $validated['siret'] ?? null,
            'verification_status' => $hasSiret ? 'pending_review' : 'unverified',
            'is_verified'         => false,
        ]);

        return response()->json($salon, 201);
    }

    /** GET /my-salon — salon du coiffeur connecté (si owner) */
    public function mySalon(Request $request)
    {
        $user = $request->user();
        $salon = Salon::with(['hairdressers.user', 'hairdressers.specialties'])
            ->where('owner_id', $user->id)
            ->firstOrFail();

        // Demandes en attente
        $pendingRequests = SalonJoinRequest::with(['hairdresser.user'])
            ->where('salon_id', $salon->id)
            ->where('status', 'pending')
            ->get();

        return response()->json([
            'salon'            => $salon,
            'pending_requests' => $pendingRequests,
        ]);
    }

    /** GET /my-salon/recent-reviews — derniers avis reçus par l'équipe du salon (cockpit) */
    public function recentReviews(Request $request)
    {
        $user  = $request->user();
        $salon = Salon::where('owner_id', $user->id)->firstOrFail();

        $hairdresserIds = HairdresserProfile::where('salon_id', $salon->id)->pluck('id');

        $reviews = Review::with(['hairdresser.user', 'client'])
            ->whereIn('hairdresser_id', $hairdresserIds)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn (Review $r) => [
                'id'               => $r->id,
                'rating'           => $r->rating,
                'comment'          => $r->comment,
                'is_verified'      => $r->is_verified,
                'created_at'       => $r->created_at,
                'hairdresser_name' => $r->hairdresser?->user?->name,
                'client_name'      => $r->client?->name,
            ]);

        return response()->json($reviews);
    }

    /** PUT /my-salon — mise à jour du salon (owner) */
    public function updateMySalon(Request $request)
    {
        $user = $request->user();
        $salon = Salon::where('owner_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'name'         => 'nullable|string|max:255',
            'description'  => 'nullable|string|max:2000',
            'address'      => 'nullable|string|max:500',
            'city'         => 'nullable|string|max:100',
            'postal_code'  => 'nullable|string|max:10',
            'region'       => 'nullable|string|max:100',
            'department'   => 'nullable|string|max:100',
            'phone'        => 'nullable|string|max:30',
            'website'      => 'nullable|url|max:500',
            'instagram_url'=> 'nullable|url|max:255',
            'siret'        => 'nullable|string|size:14|regex:/^\d{14}$/',
        ]);

        // Un SIRET nouveau ou modifié repart en vérification — jamais réputé
        // vérifié du simple fait qu'il a été saisi (même logique qu'à la
        // création du salon, voir createMySalon()).
        if (array_key_exists('siret', $validated) && $validated['siret'] !== $salon->siret) {
            $validated['verification_status'] = !empty($validated['siret']) ? 'pending_review' : 'unverified';
            $validated['is_verified'] = false;
        }

        $salon->update($validated);

        return response()->json($salon->fresh());
    }

    /** POST /my-salon/logo — upload logo */
    public function uploadLogo(Request $request)
    {
        $user = $request->user();
        $salon = Salon::where('owner_id', $user->id)->firstOrFail();

        $request->validate(['logo' => 'required|image|mimes:jpeg,png,webp|max:5120']);

        $url = $this->uploadToCloudinary($request->file('logo'), 'chair/salon-logos');
        $salon->update(['logo' => $url]);

        return response()->json(['url' => $url]);
    }

    /** POST /my-salon/cover — upload cover */
    public function uploadCover(Request $request)
    {
        $user = $request->user();
        $salon = Salon::where('owner_id', $user->id)->firstOrFail();

        $request->validate(['cover' => 'required|image|mimes:jpeg,png,webp|max:10240']);

        $url = $this->uploadToCloudinary($request->file('cover'), 'chair/salon-covers');
        $salon->update(['cover_image' => $url]);

        return response()->json(['url' => $url]);
    }

    /** POST /join-salon — coiffeur demande à rejoindre un salon */
    public function requestJoin(Request $request)
    {
        $user = $request->user();
        $profile = HairdresserProfile::where('user_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'salon_id' => 'required|exists:salons,id',
            'message'  => 'nullable|string|max:500',
        ]);

        // Vérifier qu'il n'est pas déjà dans ce salon
        if ($profile->salon_id === (int) $validated['salon_id']) {
            return response()->json(['message' => 'Vous êtes déjà membre de ce salon.'], 422);
        }

        $joinRequest = SalonJoinRequest::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'salon_id' => $validated['salon_id']],
            ['status' => 'pending', 'message' => $validated['message'] ?? null]
        );

        // Notifier le propriétaire du salon
        $salon = Salon::find($validated['salon_id']);
        NotificationService::send(
            $salon->owner_id,
            'join_request',
            'Demande de rejoindre votre salon',
            "{$user->name} souhaite rejoindre {$salon->name}.",
            ['hairdresser_id' => $profile->id, 'hairdresser_name' => $user->name, 'salon_id' => $salon->id, 'request_id' => $joinRequest->id]
        );

        return response()->json($joinRequest, 201);
    }

    /** GET /my-join-requests — demandes envoyées par le coiffeur */
    public function myJoinRequests(Request $request)
    {
        $user = $request->user();
        $profile = HairdresserProfile::where('user_id', $user->id)->firstOrFail();

        $requests = SalonJoinRequest::with(['salon'])
            ->where('hairdresser_id', $profile->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($requests);
    }

    /** POST /join-requests/{id}/accept — owner accepte */
    public function acceptJoinRequest(Request $request, int $id)
    {
        $user = $request->user();
        $joinRequest = SalonJoinRequest::with(['hairdresser.user', 'salon'])->findOrFail($id);

        // Vérifier que l'utilisateur est bien le propriétaire du salon
        if ($joinRequest->salon->owner_id !== $user->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $joinRequest->update(['status' => 'accepted']);

        // Lier le coiffeur au salon
        $joinRequest->hairdresser->update(['salon_id' => $joinRequest->salon_id]);

        // Notifier le coiffeur
        NotificationService::send(
            $joinRequest->hairdresser->user_id,
            'join_accepted',
            'Demande acceptée',
            "Votre demande de rejoindre {$joinRequest->salon->name} a été acceptée.",
            ['salon_id' => $joinRequest->salon_id, 'salon_name' => $joinRequest->salon->name, 'salon_slug' => $joinRequest->salon->slug]
        );

        return response()->json(['message' => 'Demande acceptée.']);
    }

    /** POST /join-requests/{id}/decline — owner refuse */
    public function declineJoinRequest(Request $request, int $id)
    {
        $user = $request->user();
        $joinRequest = SalonJoinRequest::with(['salon', 'hairdresser'])->findOrFail($id);

        if ($joinRequest->salon->owner_id !== $user->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $joinRequest->update(['status' => 'declined']);

        // Le rattachement à l'inscription est immédiat/non-bloquant (voir
        // AuthController::register) — refuser doit donc bien détacher le coiffeur,
        // pas juste rejeter une demande qui n'a jamais pris effet.
        if ($joinRequest->hairdresser && $joinRequest->hairdresser->salon_id === $joinRequest->salon_id) {
            $joinRequest->hairdresser->update(['salon_id' => null]);
        }

        // Notifier le coiffeur
        $hairdresserUserId = $joinRequest->hairdresser->user_id ?? 0;
        if ($hairdresserUserId) {
            NotificationService::send(
                $hairdresserUserId,
                'join_declined',
                'Demande refusée',
                "Votre demande de rejoindre {$joinRequest->salon->name} n'a pas été acceptée.",
                []
            );
        }

        return response()->json(['message' => 'Demande refusée.']);
    }

    /** DELETE /my-salon/hairdressers/{profileId} — owner retire un coiffeur */
    public function removeHairdresser(Request $request, int $profileId)
    {
        $user   = $request->user();
        $salon  = Salon::where('owner_id', $user->id)->firstOrFail();
        $profile = HairdresserProfile::where('id', $profileId)
                     ->where('salon_id', $salon->id)
                     ->firstOrFail();

        $profile->update(['salon_id' => null]);

        SalonJoinRequest::where('hairdresser_id', $profileId)
            ->where('salon_id', $salon->id)
            ->delete();

        NotificationService::send(
            $profile->user_id,
            'removed_from_salon',
            'Retiré du salon',
            "Vous avez été retiré de l'équipe {$salon->name}.",
            ['salon_id' => $salon->id, 'salon_name' => $salon->name]
        );

        return response()->json(['message' => 'Coiffeur retiré du salon.']);
    }

    /**
     * POST /my-salon/hairdressers/{id}/review-invite — owner attribue une
     * visite / déclenche une demande d'avis pour un membre de son équipe.
     *
     * Fallback pour les salariés qui ne facturent pas eux-mêmes (voir
     * docs/REPUTATION_ARCHITECTURE.md) : le gérant NE PEUT PAS écrire l'avis
     * à la place du client — il génère juste le même lien QR que le coiffeur
     * aurait généré lui-même (réutilise QrTokenService), avec une validité
     * longue (48h au lieu de 30 min) car destiné à être envoyé par SMS/email
     * plutôt que montré en direct. Le client suit le flow /scan/{token}
     * habituel : confirme sa visite, laisse son propre avis.
     */
    public function inviteReview(Request $request, int $profileId)
    {
        $user  = $request->user();
        $salon = Salon::where('owner_id', $user->id)->firstOrFail();

        $profile = HairdresserProfile::where('id', $profileId)
            ->where('salon_id', $salon->id)
            ->firstOrFail();

        $validated = $request->validate([
            'specialty_id' => 'nullable|integer|exists:specialties,id',
        ]);

        $token = QrTokenService::createToken(
            $profile,
            $validated['specialty_id'] ?? null,
            ttlMinutes: 2880, // 48h — lien envoyé de façon asynchrone, pas un QR affiché en direct
            issuedByUserId: $user->id
        );

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        return response()->json([
            'token'        => $token->token_hash,
            'scan_url'     => $frontendUrl . '/scan/' . $token->token_hash,
            'valid_until'  => $token->valid_until->toIso8601String(),
            'specialty_id' => $token->specialty_id,
        ], 201);
    }

    /** DELETE /leave-salon — le coiffeur quitte son salon */
    public function leaveSalon(Request $request)
    {
        $user = $request->user();
        $profile = HairdresserProfile::where('user_id', $user->id)->firstOrFail();

        if (!$profile->salon_id) {
            return response()->json(['message' => 'Vous n\'êtes dans aucun salon.'], 422);
        }

        $salonId = $profile->salon_id;
        $profile->update(['salon_id' => null]);

        // Supprimer la demande acceptée
        SalonJoinRequest::where('hairdresser_id', $profile->id)
            ->where('salon_id', $salonId)
            ->delete();

        return response()->json(['message' => 'Vous avez quitté le salon.']);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private function uploadToCloudinary($file, string $folder): string
    {
        $cloudName = config('cloudinary.cloud_name') ?: env('CLOUDINARY_CLOUD_NAME', 'dnwtc0dra');
        $apiKey    = config('cloudinary.api_key')    ?: env('CLOUDINARY_API_KEY');
        $apiSecret = config('cloudinary.api_secret') ?: env('CLOUDINARY_API_SECRET');

        if ($apiKey && $apiSecret) {
            $timestamp = time();
            $params    = "folder={$folder}&timestamp={$timestamp}{$apiSecret}";
            $signature = sha1($params);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => "https://api.cloudinary.com/v1_1/{$cloudName}/image/upload",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => [
                    'file'      => new \CURLFile($file->getRealPath(), $file->getMimeType(), $file->getClientOriginalName()),
                    'folder'    => $folder,
                    'timestamp' => $timestamp,
                    'api_key'   => $apiKey,
                    'signature' => $signature,
                ],
            ]);
            $response = curl_exec($ch);
            curl_close($ch);
            $result = json_decode($response, true);
            if (!empty($result['secure_url'])) {
                return $result['secure_url'];
            }
        }

        // Fallback local
        $path = $file->store('public/salons');
        return '/' . str_replace('public/', 'storage/', $path);
    }
}
