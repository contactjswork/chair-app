<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\VerifiedVisit;
use App\Services\QrTokenService;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    // ── QR Code coiffeur ─────────────────────────────────────────────────────

    /**
     * GET /api/hairdresser/qr-token  [auth:hairdresser]
     * Retourne le token QR actif (ou en crée un si aucun valide).
     */
    public function getQrToken(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable.'], 404);
        }

        $token = QrTokenService::getOrCreateToken($profile);
        return response()->json($this->buildQrResponse($token));
    }

    /**
     * POST /api/hairdresser/qr-token/refresh  [auth:hairdresser]
     * Force la création d'un nouveau QR, même si l'actuel est encore valide.
     */
    public function refreshQrToken(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable.'], 404);
        }

        $token = QrTokenService::createToken($profile);
        return response()->json($this->buildQrResponse($token), 201);
    }

    // ── Scan client ──────────────────────────────────────────────────────────

    /**
     * GET /api/scan/{token}  [public]
     * Retourne les infos du coiffeur pour affichage avant connexion.
     */
    public function getTokenInfo(string $tokenHash)
    {
        $token = QrTokenService::findValidToken($tokenHash);

        if (!$token) {
            return response()->json([
                'message' => "QR Code expiré ou invalide. Demandez au coiffeur d'afficher un nouveau QR.",
            ], 404);
        }

        $hairdresser = $token->hairdresser;
        $user        = $hairdresser->user;

        $services = $hairdresser->serviceCategories()
            ->orderBy('display_order')
            ->get(['id', 'name'])
            ->map(fn($c) => ['id' => $c->id, 'name' => $c->name])
            ->values();

        return response()->json([
            'hairdresser_id'        => $hairdresser->id,
            'hairdresser_name'      => $user->name,
            'hairdresser_slug'      => $hairdresser->slug,
            'avatar'                => $user->avatar,
            'salon_name'            => $hairdresser->salon?->name,
            'city'                  => $hairdresser->city,
            'verified_visits_count' => $hairdresser->verified_visits_count,
            'token_valid_until'     => $token->valid_until->toIso8601String(),
            'services'              => $services,
        ]);
    }

    /**
     * POST /api/scan/{token}  [auth:client]
     * Valide la visite. Retourne le visit_id pour débloquer l'avis.
     */
    public function confirmVisit(Request $request, string $tokenHash)
    {
        $request->validate([
            'service_type' => 'required|string|max:100',
        ]);

        $token = QrTokenService::findValidToken($tokenHash);
        if (!$token) {
            return response()->json(['message' => 'QR Code expiré ou invalide.'], 404);
        }

        $clientUserId = $request->user()->id;

        // Anti auto-scan (coiffeur ne peut pas se valider lui-même)
        if ($token->hairdresser->user_id === $clientUserId) {
            return response()->json(['message' => 'Vous ne pouvez pas valider votre propre QR.'], 403);
        }

        // Anti-spam : un seul scan toutes les 12h par coiffeur
        if (!QrTokenService::canVisit($token, $clientUserId)) {
            return response()->json([
                'message' => 'Vous avez déjà validé une visite chez ce coiffeur récemment.',
            ], 429);
        }

        $visit = QrTokenService::recordVisit($token, $clientUserId, $request->service_type);

        return response()->json([
            'visit_id'         => $visit->id,
            'hairdresser_id'   => $token->hairdresser_id,
            'hairdresser_name' => $token->hairdresser->user->name,
            'hairdresser_slug' => $token->hairdresser->slug,
            'service_type'     => $visit->service_type,
        ], 201);
    }

    /**
     * POST /api/scan/review  [auth:client]
     * Soumet un avis certifié pour une visite vérifiée.
     */
    public function submitReview(Request $request)
    {
        $request->validate([
            'visit_id' => 'required|integer|min:1',
            'rating'   => 'required|integer|min:1|max:5',
            'comment'  => 'required|string|min:10|max:1000',
        ]);

        $visit = VerifiedVisit::with('hairdresser')->find($request->visit_id);
        if (!$visit) {
            return response()->json(['message' => 'Visite introuvable.'], 404);
        }

        $clientId = $request->user()->id;

        // Vérifier que c'est ce client qui a fait la visite
        if ($visit->client_user_id !== $clientId) {
            return response()->json(['message' => 'Cette visite ne vous appartient pas.'], 403);
        }

        // Anti auto-avis
        if ($visit->hairdresser->user_id === $clientId) {
            return response()->json(['message' => 'Vous ne pouvez pas vous noter vous-même.'], 403);
        }

        // Un seul avis par visite
        if (Review::where('verified_visit_id', $visit->id)->exists()) {
            return response()->json(['message' => 'Un avis a déjà été laissé pour cette visite.'], 422);
        }

        $review = Review::create([
            'hairdresser_id'    => $visit->hairdresser_id,
            'client_id'         => $clientId,
            'verified_visit_id' => $visit->id,
            'rating'            => $request->rating,
            'comment'           => $request->comment,
            'specialty'         => $visit->service_type,
            'is_verified'       => true,
            'is_certified'      => true,
        ]);

        // Recalculer stats coiffeur
        $avg   = Review::where('hairdresser_id', $visit->hairdresser_id)->avg('rating');
        $count = Review::where('hairdresser_id', $visit->hairdresser_id)->count();
        $visit->hairdresser->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        return response()->json(['message' => 'Avis publié avec succès.'], 201);
    }

    // ── Historique coiffeur ───────────────────────────────────────────────────

    /**
     * GET /api/hairdresser/visits  [auth:hairdresser]
     */
    public function myVisits(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil introuvable.'], 404);
        }

        $visits = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->with(['client:id,name,avatar', 'review:id,verified_visit_id,rating,comment'])
            ->orderByDesc('scanned_at')
            ->paginate(20);

        return response()->json($visits);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private function buildQrResponse($token): array
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        return [
            'token'       => $token->token_hash,
            'scan_url'    => $frontendUrl . '/scan/' . $token->token_hash,
            'valid_until' => $token->valid_until->toIso8601String(),
            'valid_from'  => $token->valid_from->toIso8601String(),
            'ttl_minutes' => QrTokenService::TTL_MINUTES,
        ];
    }
}
