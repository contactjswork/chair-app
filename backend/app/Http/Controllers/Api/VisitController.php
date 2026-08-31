<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContentFilter;
use App\Models\HairdresserProfile;
use App\Models\Review;
use App\Models\Service;
use App\Models\VerifiedVisit;
use App\Services\BadgeService;
use App\Services\QrTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VisitController extends Controller
{
    // ── QR Code coiffeur ─────────────────────────────────────────────────────

    /**
     * GET /api/hairdresser/qr-token  [auth]
     * Retourne le token QR actif (ou en crée un si aucun valide).
     */
    public function getQrToken(Request $request)
    {
        $profile = $this->resolveHairdresserProfile($request);
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable. Assurez-vous d\'avoir un compte coiffeur.'], 403);
        }

        // Request::integer() n'existe pas dans cette version de Laravel 8 (ajouté en 9+).
        $specialtyId = (int) $request->input('specialty_id', 0) ?: null;
        $token = QrTokenService::getOrCreateToken($profile, $specialtyId);
        return response()->json($this->buildQrResponse($token));
    }

    /**
     * POST /api/hairdresser/qr-token/refresh  [auth]
     * Force la création d'un nouveau QR, même si l'actuel est encore valide.
     * Body optionnel : specialty_id — quelle prestation ce QR va certifier,
     * pour que la visite/l'avis alimentent la bonne spécialité.
     */
    public function refreshQrToken(Request $request)
    {
        $profile = $this->resolveHairdresserProfile($request);
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable. Assurez-vous d\'avoir un compte coiffeur.'], 403);
        }

        $request->validate(['specialty_id' => 'nullable|integer|exists:specialties,id']);

        $token = QrTokenService::createToken($profile, $request->input('specialty_id'));
        return response()->json($this->buildQrResponse($token), 201);
    }

    /**
     * Charge ou auto-crée le profil coiffeur de l'utilisateur connecté.
     */
    private function resolveHairdresserProfile(Request $request)
    {
        $user = $request->user();
        $profile = $user->hairdresserProfile;

        // Un gérant de salon ayant activé le mode coiffeur a un vrai
        // HairdresserProfile mais garde role=salon_owner (identité double,
        // voir User::canManageSalon()/hasHairdresserProfile()) — se fier au
        // profil réel, pas au rôle d'inscription, sous peine de bloquer son
        // propre QR alors que son compte coiffeur existe bel et bien.
        if (!$profile && $user->role !== 'hairdresser') {
            return null;
        }

        // Auto-créer si inexistant (cohérent avec ProfileController)
        if (!$profile) {
            $base = Str::slug($user->name ?: 'coiffeur-' . $user->id);
            $slug = $base;
            $i    = 1;
            while (HairdresserProfile::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $profile = HairdresserProfile::create([
                'user_id'         => $user->id,
                'slug'            => $slug,
                'city'            => $user->city,
                'is_independent'  => true,
                'is_verified'     => false,
                'followers_count' => 0,
                'posts_count'     => 0,
                'avg_rating'      => 0,
                'reviews_count'   => 0,
            ]);
        }

        return $profile;
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

        // Vraies prestations (Service), pas les catégories d'affichage
        // (ServiceCategory n'a pas de specialty_id) — c'est service.specialty_id
        // qui doit alimenter la visite pour que l'avis compte dans la bonne
        // spécialité au classement.
        $services = $hairdresser->services()
            ->where('is_active', true)
            ->with('specialty:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'specialty_id'])
            ->map(fn($s) => [
                'id'             => $s->id,
                'name'           => $s->name,
                'specialty_id'   => $s->specialty_id,
                'specialty_name' => $s->specialty->name ?? null,
            ])
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
        // service_id (prestation réelle du coiffeur, alimente specialty_id
        // correctement) est le chemin normal ; service_name (texte libre) ne
        // reste qu'un repli pour un coiffeur qui n'a encore configuré aucune
        // prestation — la visite compte quand même, juste sans spécialité.
        $request->validate([
            'service_id'   => 'required_without:service_name|nullable|integer|exists:services,id',
            'service_name' => 'required_without:service_id|nullable|string|max:100',
        ]);

        $token = QrTokenService::findValidToken($tokenHash);
        if (!$token) {
            return response()->json(['message' => 'QR Code expiré ou invalide.'], 404);
        }

        if ($request->filled('service_id')) {
            // La prestation doit appartenir à CE coiffeur — sinon un client
            // pourrait attribuer une visite à une spécialité arbitraire.
            $service = Service::where('id', $request->service_id)
                ->where('hairdresser_id', $token->hairdresser_id)
                ->first();
            if (!$service) {
                return response()->json(['message' => 'Cette prestation n\'appartient pas à ce coiffeur.'], 422);
            }
            $serviceName = $service->name;
            $specialtyId = $service->specialty_id;
        } else {
            $serviceName = $request->service_name;
            $specialtyId = null;
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

        // Plafond quotidien du COIFFEUR (voir QrTokenService::MAX_VISITS_PER_DAY).
        //
        // L'intervalle de 12 h ci-dessus protège d'un compte qui rejoue ; il ne
        // protège pas de plusieurs comptes créés pour l'occasion. Le plafond
        // borne ce que la fraude peut rapporter en une journée.
        //
        // Le message ne met rien sur le dos du client : il n'y est pour rien,
        // et il ne doit surtout pas comprendre qu'on soupçonne son coiffeur.
        if (QrTokenService::dailyQuotaReached($token->hairdresser_id)) {
            \Log::warning('Plafond quotidien de visites vérifiées atteint.', [
                'hairdresser_id' => $token->hairdresser_id,
                'visits_today'   => QrTokenService::visitsToday($token->hairdresser_id),
                'client_user_id' => $clientUserId,
            ]);

            return response()->json([
                'message' => "Le nombre de visites vérifiables pour ce coiffeur est atteint pour aujourd'hui. Reviens demain, ou laisse-lui un avis depuis son profil.",
            ], 429);
        }

        $visit = QrTokenService::recordVisit($token, $clientUserId, $serviceName, $specialtyId);

        // La boucle se referme ICI, et nulle part ailleurs.
        //
        // Quand ce client avait ouvert l'agenda externe de ce coiffeur depuis
        // CHAIR, une intention avait été enregistrée en silence. Le scan
        // prouve qu'il est venu : on la résout, et le rappel « pense à faire
        // scanner ton QR » disparaît de lui-même. Le client n'a jamais eu à
        // déclarer quoi que ce soit — c'est le QR qui fait foi.
        \App\Models\BookingIntent::resolveByVisit(
            $clientUserId,
            $token->hairdresser_id,
            $visit->scanned_at ?? now()
        );

        // La carte de fidelite avance ICI — au scan, le seul moment prouve.
        // Nulle si le coiffeur n a pas de programme actif : rien ne change
        // au flux existant.
        $loyalty = \App\Services\LoyaltyService::onVerifiedVisit($token->hairdresser, $clientUserId);

        return response()->json([
            'visit_id'         => $visit->id,
            'loyalty'          => $loyalty,
            'hairdresser_id'   => $token->hairdresser_id,
            'hairdresser_name' => $token->hairdresser->user->name,
            'hairdresser_slug' => $token->hairdresser->slug,
            'service_type'     => $visit->service_type,
            'specialty_id'     => $visit->specialty_id,
        ], 201);
    }

    /**
     * POST /api/scan/review  [auth:client]
     * Soumet un avis vérifié pour une visite vérifiée.
     */
    public function submitReview(Request $request)
    {
        $request->validate([
            'visit_id' => 'required|integer|min:1',
            'rating'   => 'required|integer|min:1|max:5',
            'comment'  => 'required|string|min:10|max:1000',
        ]);

        // Filtrage au dépôt (App Store Review Guideline 1.2 — « a method for
        // filtering objectionable material from being posted to the app »).
        // Complémentaire du signalement, qui n'agit qu'après publication.
        if ($reason = ContentFilter::check($request->input('comment'))) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

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
            'specialty_id'      => $visit->specialty_id,
            'is_verified'       => true,
            'is_certified'      => true,
        ]);

        // Recalculer stats coiffeur
        $avg   = Review::where('hairdresser_id', $visit->hairdresser_id)->avg('rating');
        $count = Review::where('hairdresser_id', $visit->hairdresser_id)->count();
        $visit->hairdresser->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        // Un avis vérifié alimente le score de la spécialité visée + peut
        // débloquer des badges carrière/exceptionnels.
        BadgeService::refresh($visit->hairdresser);

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
        $token->loadMissing('specialty');

        return [
            'token'         => $token->token_hash,
            'scan_url'      => $frontendUrl . '/scan/' . $token->token_hash,
            'valid_until'   => $token->valid_until->toIso8601String(),
            'valid_from'    => $token->valid_from->toIso8601String(),
            'ttl_minutes'   => $token->valid_from->diffInMinutes($token->valid_until),
            'specialty_id'  => $token->specialty_id,
            'specialty_name'=> $token->specialty->name ?? null,
        ];
    }
}
