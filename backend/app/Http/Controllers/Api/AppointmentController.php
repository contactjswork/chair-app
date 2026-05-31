<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    /**
     * Créer une demande de RDV (public — client connecté ou guest).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'hairdresser_id' => 'required|integer|exists:hairdresser_profiles,id',
            'client_name'    => 'required|string|max:100',
            'client_email'   => 'required|email|max:150',
            'client_phone'   => 'nullable|string|max:30',
            'service'        => 'required|string|max:200',
            'desired_date'   => 'required|date|after:today',
            'desired_slot'   => 'required|in:Matin,Après-midi,Soir',
            'message'        => 'nullable|string|max:1000',
        ]);

        // Associer au client connecté si disponible
        $clientId = null;
        if ($request->bearerToken()) {
            try {
                $user = $request->user();
                if ($user) $clientId = $user->id;
            } catch (\Throwable) {}
        }

        $appointment = Appointment::create([
            ...$validated,
            'client_id' => $clientId,
            'status'    => 'pending',
        ]);

        return response()->json($appointment, 201);
    }

    /**
     * Liste des RDVs du coiffeur connecté, par statut.
     */
    public function index(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $appointments = Appointment::with(['client'])
            ->where('hairdresser_id', $profile->id)
            ->orderByRaw("FIELD(status, 'pending', 'confirmed', 'completed', 'declined', 'cancelled')")
            ->orderByDesc('desired_date')
            ->get();

        return response()->json($appointments);
    }

    /**
     * Mettre à jour le statut d'un RDV (confirm / decline / complete / cancel).
     */
    public function updateStatus(Request $request, int $id)
    {
        $profile = $request->user()->hairdresserProfile;
        $appointment = Appointment::where('id', $id)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:confirmed,declined,completed,cancelled',
        ]);

        $newStatus = $validated['status'];

        // Quand le RDV est terminé : générer un token de review
        if ($newStatus === 'completed' && !$appointment->review_token) {
            $appointment->review_token    = Str::random(48);
            $appointment->review_unlocked = true;
        }

        $appointment->status = $newStatus;
        $appointment->save();

        return response()->json($appointment);
    }

    /**
     * Laisser un avis via le token (public, client ou guest).
     */
    public function reviewByToken(Request $request, string $token)
    {
        $appointment = Appointment::where('review_token', $token)
            ->where('review_unlocked', true)
            ->where('status', 'completed')
            ->firstOrFail();

        // Un seul avis par token
        if ($appointment->review()->exists()) {
            return response()->json(['message' => 'Un avis a déjà été laissé pour ce rendez-vous.'], 409);
        }

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $clientId = null;
        if ($request->bearerToken()) {
            try {
                $user = $request->user();
                if ($user) $clientId = $user->id;
            } catch (\Throwable) {}
        }

        $review = Review::create([
            'hairdresser_id' => $appointment->hairdresser_id,
            'client_id'      => $clientId,
            'appointment_id' => $appointment->id,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? '',
            'is_verified'    => true,
        ]);

        // Recalcul avg_rating + reviews_count
        $profile = $appointment->hairdresser;
        $avg     = Review::where('hairdresser_id', $profile->id)->avg('rating');
        $count   = Review::where('hairdresser_id', $profile->id)->count();
        $profile->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        return response()->json($review->load('hairdresser'), 201);
    }

    /**
     * Stats du coiffeur connecté.
     */
    public function stats(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil introuvable'], 404);
        }

        $appointmentBase = Appointment::where('hairdresser_id', $profile->id);

        $savedCount = \DB::table('saved_profiles')
            ->where('hairdresser_id', $profile->id)
            ->count();

        return response()->json([
            'followers_count'       => $profile->followers_count,
            'posts_count'           => $profile->posts_count,
            'avg_rating'            => $profile->avg_rating,
            'reviews_count'         => $profile->reviews_count,
            'saved_count'           => $savedCount,
            'appointments_pending'  => (clone $appointmentBase)->where('status', 'pending')->count(),
            'appointments_confirmed'=> (clone $appointmentBase)->where('status', 'confirmed')->count(),
            'appointments_completed'=> (clone $appointmentBase)->where('status', 'completed')->count(),
            'appointments_total'    => (clone $appointmentBase)->count(),
        ]);
    }
}
