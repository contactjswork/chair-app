<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChairRental;
use App\Models\ChairRentalRequest;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class ChairRentalController extends Controller
{
    // ── SALON OWNER — gestion des fauteuils ──────────────────────────────────

    /** GET /my-salon/rentals */
    public function myRentals(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $rentals = ChairRental::with(['requests.hairdresser.user'])
            ->where('salon_id', $salon->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rentals);
    }

    /** POST /my-salon/rentals */
    public function store(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'title'           => 'required|string|max:200',
            'description'     => 'nullable|string|max:2000',
            'price_per_day'   => 'nullable|numeric|min:0',
            'price_per_week'  => 'nullable|numeric|min:0',
            'price_per_month' => 'nullable|numeric|min:0',
            'available_days'  => 'nullable|array',
            'available_days.*'=> 'integer|between:1,7',
            'start_date'      => 'nullable|date',
            'end_date'        => 'nullable|date|after_or_equal:start_date',
            'equipment'       => 'nullable|string|max:1000',
            'conditions'      => 'nullable|string|max:1000',
            'status'          => 'nullable|in:available,rented,disabled',
        ]);

        $rental = ChairRental::create(array_merge($validated, ['salon_id' => $salon->id]));

        return response()->json($rental, 201);
    }

    /** PUT /my-salon/rentals/{id} */
    public function update(Request $request, int $id)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $validated = $request->validate([
            'title'           => 'nullable|string|max:200',
            'description'     => 'nullable|string|max:2000',
            'price_per_day'   => 'nullable|numeric|min:0',
            'price_per_week'  => 'nullable|numeric|min:0',
            'price_per_month' => 'nullable|numeric|min:0',
            'available_days'  => 'nullable|array',
            'available_days.*'=> 'integer|between:1,7',
            'start_date'      => 'nullable|date',
            'end_date'        => 'nullable|date',
            'equipment'       => 'nullable|string|max:1000',
            'conditions'      => 'nullable|string|max:1000',
            'status'          => 'nullable|in:available,rented,disabled',
        ]);

        $rental->update($validated);

        return response()->json($rental->fresh());
    }

    /** DELETE /my-salon/rentals/{id} */
    public function destroy(Request $request, int $id)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();
        $rental->delete();

        return response()->json(['ok' => true]);
    }

    /** GET /my-salon/rental-requests — toutes les demandes reçues */
    public function myRequests(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $requests = ChairRentalRequest::with(['chairRental', 'hairdresser.user'])
            ->whereHas('chairRental', fn ($q) => $q->where('salon_id', $salon->id))
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($requests);
    }

    /** POST /my-salon/rental-requests/{id}/accept */
    public function acceptRequest(Request $request, int $id)
    {
        $salon       = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rentalReq   = ChairRentalRequest::with(['chairRental', 'hairdresser.user'])
            ->whereHas('chairRental', fn ($q) => $q->where('salon_id', $salon->id))
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

    /** POST /my-salon/rentals/{id}/photos — upload photo */
    public function uploadPhoto(Request $request, int $id)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $request->validate(['photo' => 'required|image|max:5120']);

        $path  = $request->file('photo')->store('chair-rentals', 'public');
        $url   = '/storage/' . $path;
        $photos = $rental->photos ?? [];
        $photos[] = $url;
        $rental->update(['photos' => $photos]);

        return response()->json(['url' => $url, 'photos' => $photos]);
    }

    /** DELETE /my-salon/rentals/{id}/photos — supprimer une photo */
    public function deletePhoto(Request $request, int $id)
    {
        $salon  = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $rental = ChairRental::where('id', $id)->where('salon_id', $salon->id)->firstOrFail();

        $validated = $request->validate(['url' => 'required|string']);
        $photos    = array_values(array_filter($rental->photos ?? [], fn($p) => $p !== $validated['url']));
        $rental->update(['photos' => $photos]);

        return response()->json(['photos' => $photos]);
    }

    // ── COIFFEUR INDÉPENDANT — chercher un fauteuil ───────────────────────────

    /** GET /chair-rentals?city=Paris */
    public function publicList(Request $request)
    {
        $query = ChairRental::with(['salon'])
            ->where('status', 'available');

        if ($request->city) {
            $query->whereHas('salon', fn ($q) => $q->where('city', 'LIKE', '%' . $request->city . '%'));
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    /** GET /my-chair-requests — demandes envoyées par le coiffeur */
    public function myRequests_hairdresser(Request $request)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->first();
        if (!$profile) return response()->json([]);

        $requests = ChairRentalRequest::where('hairdresser_id', $profile->id)
            ->get(['id', 'chair_rental_id', 'status', 'message', 'created_at']);

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
}
