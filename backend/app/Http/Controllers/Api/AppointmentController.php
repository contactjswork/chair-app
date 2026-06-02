<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Review;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    /**
     * Créer un rendez-vous.
     * Mode 1 (nouveau) : service_id + appointment_date + appointment_time → confirmed automatiquement.
     * Mode 2 (legacy)  : service (texte) + desired_date + desired_slot → pending.
     */
    public function store(Request $request)
    {
        $clientId = null;
        if ($request->bearerToken()) {
            try {
                $user = \Auth::guard('sanctum')->user();
                if ($user) $clientId = $user->id;
            } catch (\Throwable $e) {}
        }

        // Détecter le mode
        $isRealBooking = $request->has('service_id') && $request->has('appointment_date') && $request->has('appointment_time');

        if ($isRealBooking) {
            $validated = $request->validate([
                'hairdresser_id'   => 'required|integer|exists:hairdresser_profiles,id',
                'client_name'      => 'required|string|max:100',
                'client_email'     => 'required|email|max:150',
                'client_phone'     => 'nullable|string|max:30',
                'service_id'       => 'required|integer|exists:services,id',
                'appointment_date' => 'required|date|after_or_equal:today',
                'appointment_time' => 'required|date_format:H:i',
                'message'          => 'nullable|string|max:1000',
            ]);

            $service = \App\Models\Service::where('id', $validated['service_id'])
                ->where('hairdresser_id', $validated['hairdresser_id'])
                ->where('is_active', true)
                ->firstOrFail();

            $slotTaken = Appointment::where('hairdresser_id', $validated['hairdresser_id'])
                ->where('appointment_date', $validated['appointment_date'])
                ->where('appointment_time', $validated['appointment_time'] . ':00')
                ->whereIn('status', ['confirmed', 'pending'])
                ->exists();

            if ($slotTaken) {
                return response()->json(['message' => 'Ce créneau vient d\'être pris. Veuillez en choisir un autre.'], 409);
            }

            $appointment = Appointment::create([
                'hairdresser_id'   => $validated['hairdresser_id'],
                'client_id'        => $clientId,
                'client_name'      => $validated['client_name'],
                'client_email'     => $validated['client_email'],
                'client_phone'     => $validated['client_phone'] ?? null,
                'service'          => $service->name,
                'service_id'       => $service->id,
                'desired_date'     => $validated['appointment_date'],
                'desired_slot'     => 'Matin',
                'appointment_date' => $validated['appointment_date'],
                'appointment_time' => $validated['appointment_time'],
                'duration_minutes' => $service->duration_minutes,
                'price'            => $service->price,
                'message'          => $validated['message'] ?? null,
                'status'           => 'confirmed',
            ]);

            // Popularité service + catégorie (référencement interne)
            $service->increment('visits_count');
            \App\Models\ServiceCategory::where('id', $service->category_id)->increment('visits_count');

            // Notification → coiffeur (nouvelle réservation)
            $hairdresserProfile = \App\Models\HairdresserProfile::with('user')->find($validated['hairdresser_id']);
            if ($hairdresserProfile) {
                $dateLabel = \Carbon\Carbon::parse($validated['appointment_date'])->locale('fr')->isoFormat('D MMMM YYYY');
                NotificationService::send(
                    $hairdresserProfile->user_id,
                    'appointment_created',
                    'Nouvelle réservation',
                    "{$validated['client_name']} a réservé {$service->name} le {$dateLabel} à {$validated['appointment_time']}.",
                    [
                        'appointment_id'  => $appointment->id,
                        'client_id'       => $clientId,
                        'client_name'     => $validated['client_name'],
                        'service_id'      => $service->id,
                        'service_name'    => $service->name,
                        'hairdresser_id'  => $hairdresserProfile->id,
                        'date'            => $validated['appointment_date'],
                        'time'            => $validated['appointment_time'],
                    ]
                );

                // Notification → client (confirmation automatique)
                if ($clientId) {
                    $hairdresserName = $hairdresserProfile->user->name ?? 'votre coiffeur';
                    NotificationService::send(
                        $clientId,
                        'appointment_confirmed',
                        'Réservation confirmée',
                        "Votre rendez-vous avec {$hairdresserName} est confirmé pour le {$dateLabel} à {$validated['appointment_time']}.",
                        [
                            'appointment_id'   => $appointment->id,
                            'hairdresser_name' => $hairdresserName,
                            'service'          => $service->name,
                            'date'             => $validated['appointment_date'],
                            'time'             => $validated['appointment_time'],
                        ]
                    );
                }
            }

            return response()->json($appointment->load(['serviceModel.category']), 201);
        }

        // Mode legacy (demande simple)
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

        $appointment = Appointment::create(array_merge($validated, [
            'client_id' => $clientId,
            'status'    => 'pending',
        ]));

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

        $appointments = Appointment::with(['client', 'serviceModel.category'])
            ->where('hairdresser_id', $profile->id)
            ->orderByRaw("FIELD(status, 'pending', 'confirmed', 'completed', 'declined', 'cancelled', 'no_show', 'pending_payment')")
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get();

        return response()->json($appointments);
    }

    /**
     * Mettre à jour le statut d'un RDV (confirm / decline / complete / cancel).
     * Quand le statut passe à "completed" :
     *  - génère un review_token
     *  - crée une notification in-app pour le client s'il a un compte
     */
    public function updateStatus(Request $request, int $id)
    {
        $profile = $request->user()->hairdresserProfile;
        $appointment = Appointment::with(['hairdresser.user'])
            ->where('id', $id)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:confirmed,declined,completed,cancelled,no_show',
        ]);

        $newStatus = $validated['status'];

        if ($newStatus === 'completed' && !$appointment->review_token) {
            $appointment->review_token    = Str::random(48);
            $appointment->review_unlocked = true;
        }

        $appointment->status = $newStatus;
        $appointment->save();

        // Visite réelle : 1 RDV terminé = 1 visite sur le profil public
        if ($newStatus === 'completed') {
            $appointment->hairdresser->increment('visits_count');
        }

        $hairdresserName = $appointment->hairdresser->user->name ?? 'votre coiffeur';
        $clientName      = $appointment->client_name ?? 'Le client';
        $serviceName     = $appointment->service ?? 'le service';
        $apptDate        = $appointment->appointment_date ? (string) $appointment->appointment_date : null;

        if ($newStatus === 'completed' && $appointment->client_id) {
            // Client : invitation à laisser un avis
            NotificationService::send(
                $appointment->client_id,
                'review_request',
                'Votre rendez-vous est terminé',
                'Votre rendez-vous est terminé. Partagez votre expérience.',
                [
                    'appointment_id'   => $appointment->id,
                    'hairdresser_name' => $hairdresserName,
                    'service'          => $serviceName,
                    'appointment_date' => $apptDate,
                ]
            );
        }

        if ($newStatus === 'confirmed' && $appointment->client_id) {
            // Client : confirmation manuelle par le coiffeur
            NotificationService::send(
                $appointment->client_id,
                'appointment_confirmed',
                'Réservation confirmée',
                "Votre rendez-vous avec {$hairdresserName} est confirmé.",
                [
                    'appointment_id'   => $appointment->id,
                    'hairdresser_name' => $hairdresserName,
                    'service'          => $serviceName,
                    'appointment_date' => $apptDate,
                ]
            );
        }

        if ($newStatus === 'cancelled') {
            // Notifier le client si c'est le coiffeur qui annule
            if ($appointment->client_id) {
                NotificationService::send(
                    $appointment->client_id,
                    'appointment_cancelled',
                    'Rendez-vous annulé',
                    "Votre rendez-vous a été annulé.",
                    [
                        'appointment_id'   => $appointment->id,
                        'hairdresser_name' => $hairdresserName,
                        'service'          => $serviceName,
                        'appointment_date' => $apptDate,
                    ]
                );
            }
            // Notifier le coiffeur
            $hairdresserUserId = $appointment->hairdresser->user_id ?? null;
            if ($hairdresserUserId) {
                NotificationService::send(
                    $hairdresserUserId,
                    'appointment_cancelled',
                    'Rendez-vous annulé',
                    "{$clientName} a annulé son rendez-vous.",
                    [
                        'appointment_id' => $appointment->id,
                        'client_name'    => $clientName,
                        'service'        => $serviceName,
                        'date'           => $apptDate,
                    ]
                );
            }
        }

        return response()->json($appointment);
    }

    /**
     * Soumettre un avis in-app pour un rendez-vous terminé (client connecté).
     * POST /api/appointments/{id}/review
     */
    public function submitReview(Request $request, int $id)
    {
        $user = $request->user();

        $appointment = Appointment::with(['hairdresser'])
            ->where('id', $id)
            ->where('client_id', $user->id)
            ->firstOrFail();

        if ($appointment->status !== 'completed') {
            return response()->json(['message' => 'Le rendez-vous doit être terminé pour laisser un avis.'], 422);
        }

        // 1 avis max par rendez-vous
        if ($appointment->review()->exists()) {
            return response()->json(['message' => 'Un avis a déjà été soumis pour ce rendez-vous.'], 409);
        }

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review = Review::create([
            'hairdresser_id' => $appointment->hairdresser_id,
            'client_id'      => $user->id,
            'appointment_id' => $appointment->id,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? null,
            'is_verified'    => true,
        ]);

        // Recalcul avg_rating + reviews_count
        $profile = $appointment->hairdresser;
        $avg     = Review::where('hairdresser_id', $profile->id)->avg('rating');
        $count   = Review::where('hairdresser_id', $profile->id)->count();
        $profile->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        // Notification → coiffeur (nouvel avis reçu)
        $profile->loadMissing('user');
        if ($profile->user_id) {
            $clientName = $user->name ?? 'Un client';
            NotificationService::send(
                $profile->user_id,
                'review_received',
                'Nouvel avis reçu',
                "{$clientName} vous a laissé {$validated['rating']}/5 étoiles.",
                [
                    'appointment_id' => $appointment->id,
                    'client_id'      => $user->id,
                    'client_name'    => $clientName,
                    'rating'         => $validated['rating'],
                ]
            );
        }

        // Marquer les notifications "review_request" de ce RDV comme lues
        Notification::where('user_id', $user->id)
            ->where('type', 'review_request')
            ->whereJsonContains('data->appointment_id', $appointment->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($review->load('client'), 201);
    }

    /**
     * Laisser un avis via le token (public, client ou guest — flow email).
     */
    public function reviewByToken(Request $request, string $token)
    {
        $appointment = Appointment::where('review_token', $token)
            ->where('review_unlocked', true)
            ->where('status', 'completed')
            ->firstOrFail();

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
                $user = \Auth::guard('sanctum')->user();
                if ($user) $clientId = $user->id;
            } catch (\Throwable $e) {}
        }

        $review = Review::create([
            'hairdresser_id' => $appointment->hairdresser_id,
            'client_id'      => $clientId,
            'appointment_id' => $appointment->id,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? null,
            'is_verified'    => true,
        ]);

        $profile = $appointment->hairdresser;
        $avg     = Review::where('hairdresser_id', $profile->id)->avg('rating');
        $count   = Review::where('hairdresser_id', $profile->id)->count();
        $profile->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        return response()->json($review->load('hairdresser'), 201);
    }

    /**
     * GET /api/my-appointments
     * Liste des RDVs du client connecté (avec info coiffeur + avis existant).
     */
    public function clientAppointments(Request $request)
    {
        $appointments = Appointment::with(['hairdresser.user', 'serviceModel', 'review'])
            ->where('client_id', $request->user()->id)
            ->orderByDesc('appointment_date')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($appointments);
    }

    /**
     * Stats du coiffeur connecté (inclut répartition des notes).
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

        $revenueEstimate = Appointment::where('hairdresser_id', $profile->id)
            ->where('status', 'completed')
            ->whereNotNull('price')
            ->sum('price');

        $currentMonth = now()->format('Y-m');
        $appointmentsThisMonth = Appointment::where('hairdresser_id', $profile->id)
            ->whereRaw("DATE_FORMAT(COALESCE(appointment_date, desired_date), '%Y-%m') = ?", [$currentMonth])
            ->count();

        // Répartition des notes (1 à 5 étoiles)
        $reviewBreakdown = [];
        for ($i = 1; $i <= 5; $i++) {
            $reviewBreakdown[$i] = Review::where('hairdresser_id', $profile->id)
                ->where('rating', $i)
                ->count();
        }

        return response()->json([
            'followers_count'           => $profile->followers_count,
            'posts_count'               => $profile->posts_count,
            'avg_rating'                => $profile->avg_rating,
            'reviews_count'             => $profile->reviews_count,
            'review_breakdown'          => $reviewBreakdown,
            'visits_count'              => $profile->visits_count,
            'saved_count'               => $savedCount,
            'appointments_pending'      => (clone $appointmentBase)->where('status', 'pending')->count(),
            'appointments_confirmed'    => (clone $appointmentBase)->where('status', 'confirmed')->count(),
            'appointments_completed'    => (clone $appointmentBase)->where('status', 'completed')->count(),
            'appointments_total'        => (clone $appointmentBase)->count(),
            'appointments_this_month'   => $appointmentsThisMonth,
            'revenue_estimate'          => (float) $revenueEstimate,
        ]);
    }
}
