<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChairRental;
use App\Models\ChairRentalRequest;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Services\CloudinaryService;
use App\Services\GeocodingService;
use App\Services\NotificationService;
use App\Services\StripeConnectService;
use App\Support\PublicScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChairRentalController extends Controller
{
    private function rules(bool $creating): array
    {
        return [
            'space_type'          => ($creating ? 'required' : 'nullable') . '|in:' . implode(',', ChairRental::SPACE_TYPES),
            'title'               => 'nullable|string|max:200',
            'description'         => 'nullable|string|max:2000',
            'address'             => 'nullable|string|max:255',
            'city'                => 'nullable|string|max:120',
            'access_instructions' => 'nullable|string|max:1000',
            'price_per_day'       => 'nullable|numeric|min:0',
            'price_per_week'      => 'nullable|numeric|min:0',
            'price_per_month'     => 'nullable|numeric|min:0',
            'deposit_amount'      => 'nullable|numeric|min:0',
            'available_days'      => 'nullable|array',
            'available_days.*'    => 'integer|between:1,7',
            'start_date'          => 'nullable|date',
            'end_date'            => 'nullable|date|after_or_equal:start_date',
            'blocked_dates'       => 'nullable|array',
            'blocked_dates.*'     => 'date',
            'equipment'           => 'nullable|array',
            'equipment.*'         => 'in:' . implode(',', ChairRental::EQUIPMENT_OPTIONS),
            'conditions'          => 'nullable|string|max:1000',
            'insurance_required'  => 'nullable|boolean',
            'insurance_notes'     => 'nullable|string|max:1000',
            'products_policy'     => 'nullable|string|max:1000',
            'status'              => 'nullable|in:draft,available,rented,disabled',
        ];
    }

    /** Résout ville + lat/lng d'une annonce : override explicite sinon repli sur le salon. */
    private function resolveLocation(Salon $salon, array $data): array
    {
        $city = $data['city'] ?? $salon->city;
        $lat  = $salon->latitude;
        $lng  = $salon->longitude;

        if (($data['city'] ?? null) && $data['city'] !== $salon->city) {
            $geo = GeocodingService::geocode($data['city']);
            if ($geo) {
                $lat = $geo['lat'];
                $lng = $geo['lng'];
            }
        }

        return ['city' => $city, 'latitude' => $lat, 'longitude' => $lng];
    }

    // ── SALON OWNER — gestion des fauteuils ──────────────────────────────────

    /** GET /my-salon/rentals */
    public function myRentals(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $rentals = ChairRental::with(['requests.hairdresser.user'])
            ->where('salon_id', $salon->id)
            ->orderByDesc('created_at')
            ->get();

        $rentals->each(fn ($r) => $r->setAttribute('estimated_monthly_revenue', $r->estimatedMonthlyRevenue()));

        return response()->json($rentals);
    }

    /** POST /my-salon/rentals */
    public function store(Request $request)
    {
        $salon     = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $validated = $request->validate($this->rules(true));

        $location = $this->resolveLocation($salon, $validated);
        $status   = $validated['status'] ?? 'draft';
        $title    = $validated['title'] ?? 'Nouvelle annonce';

        $rental = ChairRental::create(array_merge($validated, [
            'salon_id'      => $salon->id,
            'title'         => $title,
            'slug'          => ChairRental::generateUniqueSlug($title),
            'city'          => $location['city'],
            'latitude'      => $location['latitude'],
            'longitude'     => $location['longitude'],
            'status'        => $status,
            'published_at'  => in_array($status, ['available', 'rented']) ? now() : null,
        ]));

        return response()->json($rental, 201);
    }

    /** PUT /my-salon/rentals/{id} */
    public function update(Request $request, int $id)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $validated = $request->validate($this->rules(false));

        if (array_key_exists('city', $validated)) {
            $location = $this->resolveLocation($salon, $validated);
            $validated['city']      = $location['city'];
            $validated['latitude']  = $location['latitude'];
            $validated['longitude'] = $location['longitude'];
        }

        if (isset($validated['title']) && $validated['title'] !== $rental->title) {
            $validated['slug'] = ChairRental::generateUniqueSlug($validated['title'], $rental->id);
        }

        if (isset($validated['status']) && in_array($validated['status'], ['available', 'rented']) && !$rental->published_at) {
            $validated['published_at'] = now();
        }

        $rental->update($validated);

        return response()->json($rental->fresh());
    }

    /** DELETE /my-salon/rentals/{id} */
    public function destroy(Request $request, int $id, CloudinaryService $cloudinary)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        foreach ($rental->photos ?? [] as $url) {
            $cloudinary->deleteOldMedia($url);
        }

        $rental->delete();

        return response()->json(['ok' => true]);
    }

    /** GET /my-salon/rental-requests — toutes les demandes reçues (?status= filtre optionnel) */
    public function myRequests(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $query = ChairRentalRequest::with(['chairRental', 'hairdresser.user'])
            ->whereHas('chairRental', fn ($q) => $q->where('salon_id', $salon->id));

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderByDesc('updated_at')->get());
    }

    /** POST /my-salon/rental-requests/{id}/accept */
    public function acceptRequest(Request $request, int $id)
    {
        $salon     = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rentalReq = ChairRentalRequest::with(['chairRental', 'hairdresser.user'])
            ->whereHas('chairRental', fn ($q) => $q->where('salon_id', $salon->id))
            ->whereIn('status', ['pending', 'in_discussion'])
            ->findOrFail($id);

        $rentalReq->update(['status' => 'accepted']);
        $rentalReq->chairRental->update(['status' => 'rented']);

        NotificationService::send(
            $rentalReq->hairdresser->user_id,
            'rental_accepted',
            'Demande de fauteuil acceptée',
            "Votre demande pour \"{$rentalReq->chairRental->title}\" a été acceptée.",
            ['rental_id' => $rentalReq->chairRental->id, 'salon_id' => $salon->id]
        );

        return response()->json(['ok' => true]);
    }

    /** POST /my-salon/rental-requests/{id}/decline */
    public function declineRequest(Request $request, int $id)
    {
        $salon     = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rentalReq = ChairRentalRequest::with(['chairRental', 'hairdresser.user'])
            ->whereHas('chairRental', fn ($q) => $q->where('salon_id', $salon->id))
            ->whereIn('status', ['pending', 'in_discussion'])
            ->findOrFail($id);

        $rentalReq->update(['status' => 'declined']);

        NotificationService::send(
            $rentalReq->hairdresser->user_id,
            'rental_declined',
            'Demande de fauteuil refusée',
            "Votre demande pour \"{$rentalReq->chairRental->title}\" n'a pas été retenue.",
            []
        );

        return response()->json(['ok' => true]);
    }

    /** GET /chair-rental-requests/{id} — détail + fil de discussion (gérant OU coiffeur demandeur) */
    public function showRequest(Request $request, int $id)
    {
        $rentalReq = ChairRentalRequest::with(['chairRental.salon', 'hairdresser.user', 'messages'])->findOrFail($id);
        $senderType = $this->authorizeRequestAccess($request, $rentalReq);

        // Le coiffeur consulte le fil d'un salon qui n'est pas le sien : il n'a
        // pas à recevoir le SIRET du salon ni son statut de vérification.
        if ($senderType === 'hairdresser') {
            PublicScope::salon($rentalReq->chairRental->salon);
        }

        return response()->json($rentalReq);
    }

    /** POST /chair-rental-requests/{id}/messages — répondre (gérant OU coiffeur), fait passer en discussion */
    public function sendMessage(Request $request, int $id)
    {
        $rentalReq = ChairRentalRequest::with(['chairRental.salon', 'hairdresser.user'])->findOrFail($id);
        $senderType = $this->authorizeRequestAccess($request, $rentalReq);

        $validated = $request->validate(['message' => 'required|string|max:1000']);

        $message = $rentalReq->messages()->create([
            'sender_type' => $senderType,
            'body'        => $validated['message'],
        ]);

        if ($rentalReq->status === 'pending') {
            $rentalReq->update(['status' => 'in_discussion']);
        } else {
            $rentalReq->touch();
        }

        if ($senderType === 'owner') {
            NotificationService::send(
                $rentalReq->hairdresser->user_id,
                'rental_message',
                'Nouveau message',
                "Le salon \"{$rentalReq->chairRental->title}\" vous a répondu.",
                ['rental_id' => $rentalReq->chair_rental_id, 'request_id' => $rentalReq->id]
            );
        } else {
            NotificationService::send(
                $rentalReq->chairRental->salon->owner_id,
                'rental_message',
                'Nouveau message',
                "Message reçu au sujet de \"{$rentalReq->chairRental->title}\".",
                ['rental_id' => $rentalReq->chair_rental_id, 'request_id' => $rentalReq->id]
            );
        }

        return response()->json($message, 201);
    }

    /** Vérifie que l'utilisateur courant est le gérant du salon OU le coiffeur de la demande, renvoie son rôle dans l'échange. */
    private function authorizeRequestAccess(Request $request, ChairRentalRequest $rentalReq): string
    {
        $userId = $request->user()->id;

        if ($rentalReq->chairRental->salon->owner_id === $userId) {
            return 'owner';
        }

        if ($rentalReq->hairdresser->user_id === $userId) {
            return 'hairdresser';
        }

        abort(403);
    }

    /** POST /my-salon/rentals/{id}/photos — upload multi-photos (Cloudinary) */
    public function uploadPhoto(Request $request, int $id, CloudinaryService $cloudinary)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $request->validate([
            'photos'   => 'required|array|min:1',
            'photos.*' => 'image|max:8192',
        ]);

        $photos = $rental->photos ?? [];
        foreach ($request->file('photos') as $file) {
            $photos[] = $cloudinary->upload($file, 'chair/chair-rentals');
        }

        $rental->update(['photos' => $photos]);

        return response()->json(['photos' => $photos]);
    }

    /** PUT /my-salon/rentals/{id}/photos/order — réordonner la galerie (première = couverture) */
    public function reorderPhotos(Request $request, int $id)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $validated = $request->validate(['photos' => 'required|array', 'photos.*' => 'string']);

        $current = $rental->photos ?? [];
        // N'accepte que des URLs déjà présentes — pas d'injection d'URL arbitraire.
        $reordered = array_values(array_intersect($validated['photos'], $current));
        $rental->update(['photos' => $reordered]);

        return response()->json(['photos' => $reordered]);
    }

    /** DELETE /my-salon/rentals/{id}/photos — supprimer une photo (Cloudinary + local legacy) */
    public function deletePhoto(Request $request, int $id, CloudinaryService $cloudinary)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $validated = $request->validate(['url' => 'required|string']);
        $cloudinary->deleteOldMedia($validated['url']);

        $photos = array_values(array_filter($rental->photos ?? [], fn ($p) => $p !== $validated['url']));
        $rental->update(['photos' => $photos]);

        return response()->json(['photos' => $photos]);
    }

    // ── COIFFEUR INDÉPENDANT — chercher un fauteuil ───────────────────────────

    /** GET /chair-rentals — filtres prix/ville/distance/équipements/type/dispo */
    public function publicList(Request $request)
    {
        $query = ChairRental::with(['salon'])
            ->whereIn('status', ['available']);

        if ($request->filled('city')) {
            $query->where('city', 'LIKE', '%' . $request->city . '%');
        }
        if ($request->filled('space_type')) {
            $query->where('space_type', $request->space_type);
        }
        if ($request->filled('min_price')) {
            $query->where('price_per_day', '>=', (float) $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price_per_day', '<=', (float) $request->max_price);
        }
        if ($request->filled('day')) {
            // JSON_CONTAINS attend un entier encodé — filtre "disponible ce jour de la semaine".
            $query->whereRaw('JSON_CONTAINS(available_days, ?)', [(int) $request->day]);
        }
        if ($request->filled('equipment')) {
            foreach (array_filter(explode(',', $request->equipment)) as $eq) {
                $query->whereJsonContains('equipment', $eq);
            }
        }

        $rentals = $query->orderByDesc('created_at')->get();

        $lat = $request->filled('lat') ? (float) $request->lat : null;
        $lng = $request->filled('lng') ? (float) $request->lng : null;

        if ($lat !== null && $lng !== null) {
            $rentals->each(function ($r) use ($lat, $lng) {
                $r->distance_km = ($r->latitude !== null && $r->longitude !== null)
                    ? round($this->haversine($lat, $lng, $r->latitude, $r->longitude), 1)
                    : null;
            });

            if ($request->filled('radius')) {
                $radius  = (float) $request->radius;
                $rentals = $rentals->filter(fn ($r) => $r->distance_km === null || $r->distance_km <= $radius)->values();
            }

            $rentals = $rentals->sortBy([fn ($a, $b) => ($a->distance_km ?? INF) <=> ($b->distance_km ?? INF)])->values();
        }

        // Liste PUBLIQUE : le salon ne doit pas partir avec son SIRET, son
        // statut de vérification ni son motif de suspension (voir PublicScope).
        $rentals->each(fn ($r) => PublicScope::salon($r->salon));

        return response()->json($rentals);
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /** GET /chair-rentals/slug/{slug} — fiche détaillée publique (annonces publiées, ou brouillon si le gérant consulte son propre aperçu) */
    public function show(Request $request, string $slug)
    {
        $rental = ChairRental::with(['salon.hairdressers.user'])->where('slug', $slug)->firstOrFail();

        $isOwner = $request->user() && $rental->salon->owner_id === $request->user()->id;
        if (!$isOwner && !in_array($rental->status, ['available', 'rented'])) {
            abort(404);
        }

        $rental->setAttribute('estimated_monthly_revenue', $rental->estimatedMonthlyRevenue());

        // Fiche PUBLIQUE : masque le SIRET du salon et, pour chaque membre de
        // l'équipe affichée, l'email/téléphone/code de parrainage (voir
        // PublicScope — la fiche exposait tout le compte de chaque coiffeur).
        PublicScope::salon($rental->salon);

        return response()->json($rental);
    }

    /** GET /my-chair-requests — demandes envoyées par le coiffeur */
    /**
     * GET /chair-rental-requests/{id}/contract — les données du contrat de
     * mise à disposition, réservées aux DEUX parties d'une demande ACCEPTÉE
     * (le gérant du salon de l'annonce, ou le coiffeur demandeur). Les SIRET
     * des deux parties y figurent : c'est un document contractuel entre eux,
     * pas une donnée publique (PublicScope ne s'applique pas ici).
     */
    public function contractData(Request $request, int $id)
    {
        $rentalReq = ChairRentalRequest::with(['chairRental.salon.owner', 'hairdresser.user'])
            ->where('status', 'accepted')
            ->findOrFail($id);

        $user   = $request->user();
        $salon  = $rentalReq->chairRental?->salon;
        $profil = $rentalReq->hairdresser;

        $estGerant   = $salon && (int) $salon->owner_id === (int) $user->id;
        $estLocataire = $profil && (int) $profil->user_id === (int) $user->id;
        if (!$estGerant && !$estLocataire) {
            return response()->json(['message' => 'Ce contrat ne vous concerne pas.'], 403);
        }

        $rental = $rentalReq->chairRental;

        return response()->json([
            'accepted_at' => $rentalReq->updated_at?->toDateString(),
            'salon' => [
                'name'    => $salon->name,
                'siret'   => $salon->siret,
                'address' => trim(($salon->address ? $salon->address . ', ' : '') . ($salon->postal_code ? $salon->postal_code . ' ' : '') . ($salon->city ?? '')),
                'owner_name' => $salon->owner?->name,
            ],
            'locataire' => [
                'name'  => $profil->user?->name,
                'siret' => $profil->siret,
                'city'  => $profil->city,
            ],
            'fauteuil' => [
                'title'               => $rental->title,
                'address'             => trim(($rental->address ? $rental->address . ', ' : '') . ($rental->city ?? '')),
                'price_per_day'       => $rental->price_per_day,
                'price_per_week'      => $rental->price_per_week,
                'price_per_month'     => $rental->price_per_month,
                'deposit_amount'      => $rental->deposit_amount,
                'available_days'      => $rental->available_days,
                'equipment'           => $rental->equipment,
                'insurance_required'  => $rental->insurance_required,
                'insurance_notes'     => $rental->insurance_notes,
                'products_policy'     => $rental->products_policy,
                'conditions'          => $rental->conditions,
            ],
        ]);
    }

    // ── Paiement via CHAIR (Stripe Connect, commission plateforme) ───────

    /** POST /my-salon/stripe-connect/onboard — le gérant active les paiements. */
    public function connectOnboard(Request $request)
    {
        if (!StripeConnectService::enabled()) {
            return response()->json(['message' => 'Les paiements CHAIR ne sont pas encore ouverts — bientôt disponible.'], 503);
        }
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        return response()->json(['url' => StripeConnectService::onboardingUrl($salon)]);
    }

    /** GET /my-salon/stripe-connect/status */
    public function connectStatus(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        if (!StripeConnectService::enabled()) {
            return response()->json(['available' => false, 'connected' => (bool) $salon->stripe_account_id]);
        }

        return response()->json(array_merge(['available' => true], StripeConnectService::accountStatus($salon)));
    }

    /**
     * POST /chair-rental-requests/{id}/pay {period} — le coiffeur paie une
     * période de SA demande acceptée. Refus propre si le salon n'a pas
     * activé les paiements (les deux parties peuvent toujours régler en
     * direct : le paiement CHAIR est un service, pas une obligation).
     */
    public function payRequest(Request $request, int $id)
    {
        $request->validate(['period' => 'required|in:day,week,month']);

        if (!StripeConnectService::enabled()) {
            return response()->json(['message' => 'Les paiements CHAIR ne sont pas encore ouverts — réglez directement avec le salon.'], 503);
        }

        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        $rentalReq = ChairRentalRequest::with(['chairRental.salon'])
            ->where('hairdresser_id', $profile->id)
            ->where('status', 'accepted')
            ->findOrFail($id);

        $salon = $rentalReq->chairRental?->salon;
        if (!$salon?->stripe_account_id) {
            return response()->json(['message' => 'Ce salon n\'a pas encore activé le paiement via CHAIR — réglez directement avec lui.'], 422);
        }
        $status = StripeConnectService::accountStatus($salon);
        if (empty($status['charges_enabled'])) {
            return response()->json(['message' => 'Le salon finalise l\'activation de ses paiements — réessayez bientôt.'], 422);
        }

        return response()->json(['checkout_url' => StripeConnectService::createRentalCheckout($rentalReq, $request->period)]);
    }

    public function myRequests_hairdresser(Request $request)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->first();
        if (!$profile) return response()->json([]);

        $requests = ChairRentalRequest::with(['chairRental'])
            ->where('hairdresser_id', $profile->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'chair_rental_id', 'hairdresser_id', 'status', 'message', 'created_at', 'updated_at']);

        return response()->json($requests);
    }

    /** POST /chair-rentals/{id}/request */
    public function sendRequest(Request $request, int $id)
    {
        $rental  = ChairRental::with('salon')->where('id', $id)->where('status', 'available')->firstOrFail();
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->first();
        if (!$profile) {
            return response()->json(['message' => 'Vous devez avoir un profil coiffeur pour envoyer une demande.'], 422);
        }

        // Louer un fauteuil engage une relation commerciale entre
        // professionnels indépendants — SIRET vérifié obligatoire (sécurité,
        // anti-fraude), la simple consultation des annonces reste libre.
        if ($profile->siret_verification_status !== 'verified') {
            return response()->json([
                'message'        => 'SIRET vérifié requis pour louer un fauteuil.',
                'siret_required' => true,
            ], 403);
        }

        $validated = $request->validate(['message' => 'nullable|string|max:500']);

        $rentalReq = ChairRentalRequest::updateOrCreate(
            ['chair_rental_id' => $rental->id, 'hairdresser_id' => $profile->id],
            ['status' => 'pending', 'message' => $validated['message'] ?? null]
        );

        // Notifier le gérant du salon
        NotificationService::send(
            $rental->salon->owner_id,
            'rental_request',
            'Demande de fauteuil reçue',
            "{$request->user()->name} souhaite louer \"{$rental->title}\".",
            ['rental_id' => $rental->id, 'hairdresser_id' => $profile->id, 'request_id' => $rentalReq->id]
        );

        return response()->json($rentalReq, 201);
    }

    /** POST /my-chair-requests/{id}/cancel — le coiffeur annule sa propre demande */
    public function cancelRequest(Request $request, int $id)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        $rentalReq = ChairRentalRequest::with('chairRental.salon')
            ->where('hairdresser_id', $profile->id)
            ->whereIn('status', ['pending', 'in_discussion'])
            ->findOrFail($id);

        $rentalReq->update(['status' => 'cancelled']);

        NotificationService::send(
            $rentalReq->chairRental->salon->owner_id,
            'rental_cancelled',
            'Demande annulée',
            "Une demande pour \"{$rentalReq->chairRental->title}\" a été annulée par le coiffeur.",
            ['rental_id' => $rentalReq->chair_rental_id]
        );

        return response()->json(['ok' => true]);
    }
}
