<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContentFilter;
use App\Mail\AppointmentCancelledMail;
use App\Mail\AppointmentConfirmedMail;
use App\Mail\ReviewRequestMail;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Review;
use App\Services\BadgeService;
use App\Services\MailService;
use App\Services\NotificationService;
use App\Services\StreakService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    /**
     * Machine à états des rendez-vous : source => destinations autorisées.
     *
     * Avant, updateStatus() acceptait N'IMPORTE QUELLE valeur de l'enum quel
     * que soit le statut courant : un RDV annulé pouvait passer directement à
     * "terminé", et re-poster "completed" sur un RDV déjà terminé regonflait
     * visits_count et renvoyait une nouvelle demande d'avis au client à chaque
     * appel. Les transitions sont désormais explicites et un statut terminal
     * (completed) ne bouge plus.
     *
     * "Réactiver" (declined/cancelled/no_show => confirmed) est autorisé : le
     * coiffeur reprend le rendez-vous à son compte, donc le client est notifié
     * et re-confirmé (effets déjà branchés sur 'confirmed' plus bas). Il ne
     * revient PAS à 'pending' : personne n'attend plus rien, un RDV bloquerait
     * le créneau sans que le client ne soit prévenu de rien.
     */
    private const STATUS_TRANSITIONS = [
        'pending'         => ['confirmed', 'declined', 'cancelled'],
        'pending_payment' => ['confirmed', 'declined', 'cancelled'],
        'confirmed'       => ['completed', 'cancelled', 'no_show'],
        'completed'       => [],
        'declined'        => ['confirmed'],
        'cancelled'       => ['confirmed'],
        'no_show'         => ['confirmed'],
    ];

    /** Libellés français des statuts, pour les messages de refus. */
    private const STATUS_LABELS = [
        'pending'         => 'en attente',
        'pending_payment' => 'en attente de paiement',
        'confirmed'       => 'confirmé',
        'declined'        => 'refusé',
        'completed'       => 'terminé',
        'cancelled'       => 'annulé',
        'no_show'         => 'noté absent',
    ];

    /**
     * Statuts qui libèrent réellement le créneau côté planning (SlotGuard ne
     * compte comme occupés que 'pending' et 'confirmed'). En revenir exige de
     * re-vérifier que le créneau n'a pas été repris entre-temps.
     * 'no_show' n'y figure pas : il concerne un rendez-vous déjà passé, aucun
     * créneau futur n'est réclamé, et SlotGuard le refuserait toujours ('past').
     */
    private const SLOT_FREEING_STATUSES = ['declined', 'cancelled'];

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

            $profile = \App\Models\HairdresserProfile::findOrFail($validated['hairdresser_id']);

            // Le serveur re-valide TOUT (planning, pause, congés, chevauchement
            // de durée, fenêtre de réservation, heure passée) : la liste de
            // créneaux affichée au client peut être périmée, falsifiée, ou
            // contournée par un POST direct. Voir SlotGuard.
            // La transaction + verrou couvrent la course entre deux clients qui
            // réservent le même créneau à la même seconde.
            $appointment = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $service, $profile, $clientId) {
                Appointment::where('hairdresser_id', $profile->id)
                    ->where('appointment_date', $validated['appointment_date'])
                    ->lockForUpdate()
                    ->get(['id']);

                $reason = \App\Services\SlotGuard::check(
                    $profile,
                    $service,
                    $validated['appointment_date'],
                    $validated['appointment_time']
                );

                if ($reason !== null) {
                    abort(
                        \App\Services\SlotGuard::httpStatus($reason),
                        \App\Services\SlotGuard::message($reason)
                    );
                }

                return Appointment::create([
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
            });

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

            // Email de confirmation → client. Envoyé aussi à un client sans
            // compte : il a lui-même saisi son email pour réserver, c'est le
            // seul canal dont on dispose pour lui. MailService applique la
            // préférence "booking_confirmed" quand il a un compte, et n'émet
            // jamais d'exception (la réservation aboutit dans tous les cas).
            MailService::send(
                $appointment->client_email,
                new AppointmentConfirmedMail($appointment),
                $appointment->client_name,
                $clientId,
                'appointment_confirmed'
            );

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
     * Les transitions autorisées sont décrites par self::STATUS_TRANSITIONS ;
     * toute autre transition est refusée en 422 sans le moindre effet de bord.
     * Quand le statut passe à "completed" :
     *  - génère un review_token
     *  - crée une notification in-app pour le client s'il a un compte
     */
    public function updateStatus(Request $request, int $id)
    {
        $profile = $request->user()->hairdresserProfile;
        $appointment = Appointment::with(['hairdresser.user', 'serviceModel'])
            ->where('id', $id)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:confirmed,declined,completed,cancelled,no_show',
        ]);

        $newStatus = $validated['status'];
        $oldStatus = $appointment->status;

        // Aucun changement réel : on ne rejoue NI les compteurs NI les
        // notifications. C'est le cas du double-tap sur "Terminé", qui
        // regonflait visits_count et renvoyait une demande d'avis à chaque fois.
        if ($newStatus === $oldStatus) {
            return response()->json($appointment);
        }

        if (!in_array($newStatus, self::STATUS_TRANSITIONS[$oldStatus] ?? [], true)) {
            return response()->json([
                'message' => $oldStatus === 'completed'
                    ? "Un rendez-vous terminé ne peut plus changer de statut."
                    : sprintf(
                        'Un rendez-vous %s ne peut pas passer à « %s ».',
                        self::STATUS_LABELS[$oldStatus] ?? $oldStatus,
                        self::STATUS_LABELS[$newStatus] ?? $newStatus
                    ),
            ], 422);
        }

        // Réactivation d'un RDV annulé ou refusé : son créneau avait été rendu
        // disponible, il a pu être repris (ou sortir des horaires, ou tomber
        // dans un congé, ou simplement être passé). On le re-valide avec les
        // mêmes règles que la réservation initiale, sinon "Réactiver" créerait
        // un double-booking silencieux.
        if ($newStatus === 'confirmed' && in_array($oldStatus, self::SLOT_FREEING_STATUSES, true)) {
            $reason = $this->reactivationRefusal($appointment, $profile);
            if ($reason !== null) {
                return response()->json(
                    ['message' => \App\Services\SlotGuard::message($reason)],
                    \App\Services\SlotGuard::httpStatus($reason)
                );
            }
        }

        $changes = ['status' => $newStatus];
        if ($newStatus === 'completed' && !$appointment->review_token) {
            $changes['review_token']    = Str::random(48);
            $changes['review_unlocked'] = true;
        }

        // Écriture conditionnée au statut lu : si deux requêtes concurrentes
        // (double-tap, retry réseau) tentent la même transition, une seule
        // l'applique et une seule déclenche les effets de bord.
        $applied = Appointment::where('id', $appointment->id)
            ->where('status', $oldStatus)
            ->update($changes);

        if ($applied === 0) {
            return response()->json($appointment->fresh());
        }

        $appointment->refresh();

        // Visite réelle : 1 RDV terminé = 1 visite sur le profil public.
        // Atteignable uniquement depuis 'confirmed', une seule fois.
        if ($newStatus === 'completed') {
            $appointment->hairdresser->increment('visits_count');
        }

        // Streak : confirmer ou terminer un RDV = action active
        if (in_array($newStatus, ['confirmed', 'completed']) && $profile) {
            StreakService::record($profile);
            BadgeService::refresh($profile);
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

        if ($newStatus === 'completed' && $appointment->review_token) {
            // Demande d'avis par email — le lien porte le review_token généré
            // juste au-dessus, donc il fonctionne même pour un client sans
            // compte (avis certifié : on ne peut noter qu'avec ce token).
            MailService::send(
                (string) $appointment->client_email,
                new ReviewRequestMail($appointment),
                $appointment->client_name,
                $appointment->client_id,
                'review_request'
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

        if ($newStatus === 'confirmed') {
            MailService::send(
                (string) $appointment->client_email,
                new AppointmentConfirmedMail($appointment),
                $appointment->client_name,
                $appointment->client_id,
                'appointment_confirmed'
            );
        }

        if ($newStatus === 'cancelled') {
            // Email au client — y compris sans compte : il doit savoir que le
            // créneau qu'il a réservé n'aura pas lieu.
            MailService::send(
                (string) $appointment->client_email,
                new AppointmentCancelledMail($appointment),
                $appointment->client_name,
                $appointment->client_id,
                'appointment_cancelled'
            );

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
     * Le créneau d'un RDV annulé/refusé est-il encore réservable ?
     *
     * @return string|null  null = réactivation possible, sinon la clé SlotGuard
     *                      du motif de refus (message français prêt à afficher).
     */
    private function reactivationRefusal(Appointment $appointment, \App\Models\HairdresserProfile $profile): ?string
    {
        // Demande "legacy" (desired_date + créneau flou, sans heure ferme) :
        // aucun créneau précis n'est réclamé, il n'y a rien à re-valider.
        if (!$appointment->appointment_date || !$appointment->appointment_time) {
            return null;
        }

        // Le service peut avoir été supprimé, ou le RDV venir du mode legacy :
        // seule la durée intéresse SlotGuard, on la porte sur un modèle
        // non persisté plutôt que d'abandonner la vérification.
        $service = $appointment->serviceModel;
        if (!$service) {
            $service = new \App\Models\Service();
            $service->duration_minutes = (int) ($appointment->duration_minutes ?: 30);
        }

        // booking_window_days plafonne les réservations EN LIGNE des clients ;
        // ça n'a pas à empêcher un coiffeur de récupérer un RDV de son propre
        // agenda. On neutralise cette règle-là sur une copie en mémoire (aucune
        // écriture), toutes les autres s'appliquent.
        $profileForCheck = clone $profile;
        $profileForCheck->booking_window_days = null;

        return \App\Services\SlotGuard::check(
            $profileForCheck,
            $service,
            $appointment->appointment_date->format('Y-m-d'),
            substr((string) $appointment->appointment_time, 0, 5),
            $appointment->id
        );
    }

    /**
     * Déplacer/redimensionner un rendez-vous (drag & drop ou resize dans
     * l'agenda). PUT /api/appointments/{id}/reschedule.
     */
    public function reschedule(Request $request, int $id)
    {
        $profile = $request->user()->hairdresserProfile;
        $appointment = Appointment::where('id', $id)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'appointment_date'  => 'required|date_format:Y-m-d',
            'appointment_time'  => 'required|date_format:H:i',
            'duration_minutes'  => 'nullable|integer|min:5|max:480',
        ]);

        $duration = $validated['duration_minutes'] ?? $appointment->duration_minutes ?? 30;
        $newStart = $validated['appointment_time'];
        $newEnd   = date('H:i', strtotime($newStart) + $duration * 60);

        // Pas de chevauchement avec un autre RDV actif du même coiffeur ce jour-là.
        $conflict = Appointment::where('hairdresser_id', $profile->id)
            ->where('id', '!=', $appointment->id)
            ->where('appointment_date', $validated['appointment_date'])
            ->whereIn('status', ['pending', 'pending_payment', 'confirmed'])
            ->whereNotNull('appointment_time')
            ->get()
            ->contains(function ($other) use ($newStart, $newEnd) {
                $otherStart = $other->appointment_time;
                $otherEnd   = date('H:i', strtotime($otherStart) + ($other->duration_minutes ?? 30) * 60);
                return $newStart < $otherEnd && $otherStart < $newEnd;
            });

        if ($conflict) {
            return response()->json(['message' => 'Ce créneau chevauche un autre rendez-vous.'], 422);
        }

        // Pas de chevauchement avec un bloc d'indisponibilité.
        $blockConflict = DB::table('hairdresser_unavailabilities')
            ->where('hairdresser_id', $profile->id)
            ->where('start_datetime', '<', "{$validated['appointment_date']} {$newEnd}:00")
            ->where('end_datetime', '>', "{$validated['appointment_date']} {$newStart}:00")
            ->exists();

        if ($blockConflict) {
            return response()->json(['message' => 'Ce créneau chevauche un bloc indisponible.'], 422);
        }

        $appointment->appointment_date = $validated['appointment_date'];
        $appointment->appointment_time = $newStart;
        if (isset($validated['duration_minutes'])) {
            $appointment->duration_minutes = $validated['duration_minutes'];
        }
        $appointment->save();

        if ($appointment->client_id) {
            NotificationService::send(
                $appointment->client_id,
                'appointment_rescheduled',
                'Rendez-vous déplacé',
                "Votre rendez-vous a été déplacé au {$validated['appointment_date']} à {$newStart}.",
                ['appointment_id' => $appointment->id]
            );
        }

        return response()->json($appointment->load(['client', 'serviceModel']));
    }

    /**
     * Soumettre un avis in-app pour un rendez-vous terminé (client connecté).
     * POST /api/appointments/{id}/review
     */
    public function submitReview(Request $request, int $id)
    {
        $user = $request->user();

        $appointment = Appointment::with(['hairdresser', 'serviceModel'])
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

        // Filtrage au dépôt (App Store Review Guideline 1.2 — « a method for
        // filtering objectionable material from being posted to the app »).
        // Complémentaire du signalement, qui n'agit qu'après publication.
        if ($reason = ContentFilter::check($validated['comment'] ?? null)) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

        $review = Review::create([
            'hairdresser_id' => $appointment->hairdresser_id,
            'client_id'      => $user->id,
            'appointment_id' => $appointment->id,
            'specialty_id'   => $appointment->serviceModel->specialty_id ?? null,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? null,
            'is_verified'    => true,
        ]);

        // Recalcul avg_rating + reviews_count
        $profile = $appointment->hairdresser;
        $avg     = Review::where('hairdresser_id', $profile->id)->avg('rating');
        $count   = Review::where('hairdresser_id', $profile->id)->count();
        $profile->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        // Un avis reçu alimente le score de la spécialité + peut débloquer des badges
        BadgeService::refresh($profile);

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
        $appointment = Appointment::with('serviceModel')
            ->where('review_token', $token)
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

        // Filtrage au dépôt (App Store Review Guideline 1.2 — « a method for
        // filtering objectionable material from being posted to the app »).
        // Complémentaire du signalement, qui n'agit qu'après publication.
        if ($reason = ContentFilter::check($validated['comment'] ?? null)) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

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
            'specialty_id'   => $appointment->serviceModel->specialty_id ?? null,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? null,
            'is_verified'    => true,
        ]);

        $profile = $appointment->hairdresser;
        $avg     = Review::where('hairdresser_id', $profile->id)->avg('rating');
        $count   = Review::where('hairdresser_id', $profile->id)->count();
        $profile->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);
        BadgeService::refresh($profile);

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
     * PUT /api/appointments/{id}/cancel — ANNULATION PAR LE CLIENT.
     *
     * Contexte (audit App Store 2026-08-24) : l'app cliente était un cul-de-sac.
     * On pouvait réserver, jamais annuler — PUT /appointments/{id}/status vit
     * dans le groupe coiffeur (il exige $user->hairdresserProfile) et le groupe
     * client n'exposait que GET /my-appointments. Le seul chemin de sortie était
     * d'appeler le salon. Cette route est la sortie manquante.
     *
     * Autorisation : STRICTEMENT le client propriétaire, déterminé par le
     * client_id porté par la LIGNE en base comparé à l'utilisateur du token.
     * Aucun paramètre de requête n'entre dans cette décision. Un RDV pris en
     * invité (client_id NULL) n'est annulable par personne ici — il n'a pas de
     * propriétaire authentifiable.
     *
     * Règles métier : lues dans le code existant, aucune inventée.
     *  - transitions autorisées = self::STATUS_TRANSITIONS (même machine à
     *    états que le coiffeur) : seuls pending / pending_payment / confirmed
     *    mènent à 'cancelled'. Terminé, refusé, absent, déjà annulé : refus.
     *  - un rendez-vous dont l'heure est passée n'est plus annulable : il n'y a
     *    plus de créneau à libérer et le coiffeur doit pouvoir le clore
     *    (completed / no_show).
     *  - AUCUN délai de préavis n'est appliqué : il n'existe aucune politique
     *    d'annulation dans le code ni en base (pas de champ, pas de réglage
     *    coiffeur). En inventer un serait une décision produit. Voir le rapport
     *    d'audit : "délai de préavis" est à trancher par le gérant.
     *
     * Libération du créneau : automatique et déjà couverte — SlotGuard ne
     * compte comme occupés que les statuts 'pending' et 'confirmed'. Passer à
     * 'cancelled' rend donc le créneau immédiatement réservable, sans aucune
     * écriture supplémentaire.
     */
    public function clientCancel(Request $request, int $id)
    {
        $user = $request->user();

        $appointment = Appointment::with(['hairdresser.user', 'serviceModel'])->find($id);
        if (!$appointment) {
            return response()->json(['message' => 'Rendez-vous introuvable.'], 404);
        }

        if ($appointment->client_id === null || (int) $appointment->client_id !== (int) $user->id) {
            return response()->json([
                'message' => "Ce rendez-vous n'est pas le tien.",
            ], 403);
        }

        $oldStatus = $appointment->status;

        if ($oldStatus === 'cancelled') {
            return response()->json(['message' => 'Ce rendez-vous est déjà annulé.'], 422);
        }

        if (!in_array('cancelled', self::STATUS_TRANSITIONS[$oldStatus] ?? [], true)) {
            return response()->json([
                'message' => $oldStatus === 'completed'
                    ? "Ce rendez-vous a déjà eu lieu, il ne peut plus être annulé."
                    : sprintf(
                        'Un rendez-vous %s ne peut plus être annulé.',
                        self::STATUS_LABELS[$oldStatus] ?? $oldStatus
                    ),
            ], 422);
        }

        if ($this->hasAlreadyStarted($appointment)) {
            return response()->json([
                'message' => "Ce rendez-vous est déjà passé. Contacte directement ton coiffeur.",
            ], 422);
        }

        // Écriture conditionnée au statut lu : deux requêtes concurrentes
        // (double-tap, retry réseau, ou le coiffeur qui agit au même instant)
        // ne peuvent pas appliquer l'annulation deux fois, donc la
        // notification au coiffeur ne part jamais en double.
        $applied = Appointment::where('id', $appointment->id)
            ->where('status', $oldStatus)
            ->update(['status' => 'cancelled']);

        if ($applied === 0) {
            return response()->json(
                $appointment->fresh()->load(['hairdresser.user', 'serviceModel', 'review'])
            );
        }

        $appointment->refresh();

        // Le coiffeur est prévenu par le canal existant (notification interne
        // + push OneSignal + préférences du destinataire), avec le texte du
        // catalogue centralisé : "{client} a annulé le {date} à {heure}.
        // Le créneau est libéré." Aucun mécanisme parallèle.
        $hairdresserUserId = $appointment->hairdresser->user_id ?? null;
        if ($hairdresserUserId) {
            $clientName = $appointment->client_name ?: ($user->name ?? null);

            NotificationService::sendTyped(
                (int) $hairdresserUserId,
                'appointment_cancelled',
                [
                    'client' => $clientName,
                    'date'   => $this->shortDateLabel($appointment),
                    'heure'  => $this->shortTimeLabel($appointment),
                ],
                \App\Services\NotificationCopy::AUDIENCE_PRO,
                [
                    'appointment_id' => $appointment->id,
                    'client_name'    => $clientName,
                    'service'        => $appointment->service ?? 'le service',
                    'date'           => $appointment->appointment_date
                        ? (string) $appointment->appointment_date
                        : null,
                    'cancelled_by'   => 'client',
                ]
            );
        }

        return response()->json(
            $appointment->fresh()->load(['hairdresser.user', 'serviceModel', 'review'])
        );
    }

    /**
     * Le rendez-vous a-t-il déjà commencé ?
     *
     * Réservation réelle : on compare l'instant de début (date + heure ferme).
     * Demande legacy (desired_date + créneau flou, sans heure) : aucun instant
     * précis n'existe, le rendez-vous n'est considéré passé qu'une fois la
     * journée demandée terminée. Une demande sans aucune date reste annulable.
     */
    private function hasAlreadyStarted(Appointment $appointment): bool
    {
        $date = $appointment->appointment_date ?: $appointment->desired_date;
        if (!$date) {
            return false;
        }

        $day = \Carbon\Carbon::parse($date)->format('Y-m-d');

        if ($appointment->appointment_time) {
            $time = substr((string) $appointment->appointment_time, 0, 5);
            return \Carbon\Carbon::createFromFormat('Y-m-d H:i', $day . ' ' . $time)->isPast();
        }

        return \Carbon\Carbon::createFromFormat('Y-m-d', $day)->endOfDay()->isPast();
    }

    /** "12 mars" — variable {date} du catalogue de textes. Null si absente. */
    private function shortDateLabel(Appointment $appointment): ?string
    {
        $date = $appointment->appointment_date ?: $appointment->desired_date;

        return $date
            ? \Carbon\Carbon::parse($date)->locale('fr')->isoFormat('D MMMM')
            : null;
    }

    /** "14h30" — variable {heure} du catalogue. Null en mode legacy sans heure. */
    private function shortTimeLabel(Appointment $appointment): ?string
    {
        if (!$appointment->appointment_time) {
            return $appointment->desired_slot ?: null;
        }

        return str_replace(':', 'h', substr((string) $appointment->appointment_time, 0, 5));
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

        // Vraies vues cumulées du profil public (table profile_views, voir
        // HairdresserController::show) — remplace l'ancien libellé "Visites
        // profil" qui affichait en réalité visits_count (RDV terminés, pas
        // des vues de page, voir incrément dans update() ci-dessus). Gratuit
        // pour tous, comme le reste de ces stats de base.
        $profileViewsCount = \DB::table('profile_views')
            ->where('hairdresser_profile_id', $profile->id)
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
            'profile_views_count'       => $profileViewsCount,
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
