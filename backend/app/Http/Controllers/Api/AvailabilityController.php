<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Models\HairdresserSchedule;
use App\Models\HairdresserUnavailability;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    /**
     * Fuseau de référence des créneaux (audit timezone du 2026-08-24).
     *
     * Toute la chaîne (horaires du planning, appointment_time, créneaux
     * affichés) manipule des heures « murales » du salon, en France. Or
     * config/app.php est en UTC : `isPast()` / `now()` comparaient donc un
     * créneau « 15:00 » (heure française) à l'heure UTC, soit 2 h de retard
     * en été — prouvé en test réel : à 16h00 (Paris), GET /availability
     * proposait encore 14:30, 15:00, 15:30 et POST /appointments acceptait
     * un RDV à 14:30. Toutes les instances Carbon de ce contrôleur sont
     * désormais créées explicitement en Europe/Paris ; les comparaisons
     * entre créneaux restent inchangées (mêmes heures murales), seule la
     * frontière « passé / futur » et la fenêtre de réservation deviennent
     * justes. Même constante dans App\Services\SlotGuard.
     */
    public const TZ = 'Europe/Paris';

    /**
     * GET /api/hairdressers/{slug}/availability
     * Params: date (YYYY-MM-DD), service_id
     *
     * Retourne les créneaux disponibles pour un coiffeur, une date et un service donnés.
     */
    public function slots(Request $request, string $slug)
    {
        $request->validate([
            'date'       => 'required|date_format:Y-m-d',
            'service_id' => 'required|integer|exists:services,id',
        ]);

        $profile = HairdresserProfile::where('slug', $slug)->firstOrFail();
        $service = Service::where('id', $request->service_id)
            ->where('hairdresser_id', $profile->id)
            ->where('is_active', true)
            ->firstOrFail();

        $date     = Carbon::createFromFormat('Y-m-d', $request->date, self::TZ);
        $dayOfWeek = (int) $date->format('w'); // 0=Dimanche

        // 0. Fenêtre de réservation — le coiffeur peut limiter jusqu'à combien
        // de jours à l'avance les clients ont le droit de réserver.
        if ($profile->booking_window_days !== null && $date->isAfter(Carbon::now(self::TZ)->addDays($profile->booking_window_days)->endOfDay())) {
            return response()->json(['slots' => [], 'reason' => 'outside_booking_window']);
        }

        // 1. Vérifier que ce jour est ouvert dans le planning
        $schedule = HairdresserSchedule::where('hairdresser_id', $profile->id)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if (!$schedule || !$schedule->is_open || !$schedule->start_time || !$schedule->end_time) {
            return response()->json(['slots' => [], 'reason' => 'closed']);
        }

        $duration = $service->duration_minutes;

        // 2. Générer tous les créneaux possibles (toutes les 30 min)
        $startTime = Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->start_time, self::TZ);
        $endTime   = Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->end_time, self::TZ);

        // Pause déjeuner
        $breakStart = $schedule->break_start
            ? Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->break_start, self::TZ)
            : null;
        $breakEnd = $schedule->break_end
            ? Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->break_end, self::TZ)
            : null;

        // 3. Récupérer les RDVs du jour (confirmés ou pending)
        $bookedSlots = Appointment::where('hairdresser_id', $profile->id)
            ->where('appointment_date', $date->format('Y-m-d'))
            ->whereIn('status', ['confirmed', 'pending'])
            ->whereNotNull('appointment_time')
            ->whereNotNull('duration_minutes')
            ->get(['appointment_time', 'duration_minutes']);

        // 4. Récupérer les indisponibilités du jour
        $unavailabilities = HairdresserUnavailability::where('hairdresser_id', $profile->id)
            ->where('start_datetime', '<=', $date->format('Y-m-d') . ' 23:59:59')
            ->where('end_datetime', '>=', $date->format('Y-m-d') . ' 00:00:00')
            ->get(['start_datetime', 'end_datetime']);

        // 5. Construire la liste des créneaux disponibles
        $slots     = [];
        $slotStep  = 30; // incrément en minutes
        $current   = $startTime->copy();

        while ($current->copy()->addMinutes($duration)->lte($endTime)) {
            $slotEnd = $current->copy()->addMinutes($duration);

            // Vérifier si le créneau est dans la pause
            $inBreak = false;
            if ($breakStart && $breakEnd) {
                // Le créneau chevauche la pause si : début < fin_pause ET fin > début_pause
                if ($current->lt($breakEnd) && $slotEnd->gt($breakStart)) {
                    $inBreak = true;
                }
            }

            // Vérifier si le créneau chevauche une indisponibilité
            $inUnavailability = false;
            foreach ($unavailabilities as $unavail) {
                // Le cast `datetime` hydrate en UTC des heures murales saisies
                // en France : on ré-étiquette la valeur murale en Europe/Paris
                // pour comparer des instants cohérents.
                $uStart = Carbon::parse($unavail->start_datetime->format('Y-m-d H:i:s'), self::TZ);
                $uEnd   = Carbon::parse($unavail->end_datetime->format('Y-m-d H:i:s'), self::TZ);
                if ($current->lt($uEnd) && $slotEnd->gt($uStart)) {
                    $inUnavailability = true;
                    break;
                }
            }

            // Vérifier si le créneau chevauche un RDV existant
            $isBooked = false;
            foreach ($bookedSlots as $booked) {
                $bStart = Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $booked->appointment_time, self::TZ);
                $bEnd   = $bStart->copy()->addMinutes($booked->duration_minutes);
                if ($current->lt($bEnd) && $slotEnd->gt($bStart)) {
                    $isBooked = true;
                    break;
                }
            }

            // Vérifier que le créneau n'est pas dans le passé
            $isPast = $current->isPast();

            if (!$inBreak && !$isBooked && !$inUnavailability && !$isPast) {
                $slots[] = $current->format('H:i');
            }

            $current->addMinutes($slotStep);
        }

        return response()->json([
            'slots'    => $slots,
            'date'     => $date->format('Y-m-d'),
            'service'  => [
                'id'               => $service->id,
                'name'             => $service->name,
                'duration_minutes' => $service->duration_minutes,
                'price'            => $service->price,
            ],
            'schedule' => [
                'start' => $schedule->start_time,
                'end'   => $schedule->end_time,
            ],
        ]);
    }

    /**
     * GET /api/hairdressers/{slug}/available-dates
     * Params: service_id, month (YYYY-MM)
     *
     * Retourne les jours disponibles dans un mois donné (jours ouverts avec au moins 1 créneau libre).
     */
    public function availableDates(Request $request, string $slug)
    {
        $request->validate([
            'service_id' => 'required|integer|exists:services,id',
            'month'      => 'required|date_format:Y-m',
        ]);

        $profile = HairdresserProfile::where('slug', $slug)->firstOrFail();
        $service = Service::where('id', $request->service_id)
            ->where('hairdresser_id', $profile->id)
            ->where('is_active', true)
            ->firstOrFail();

        // Jamais createFromFormat('Y-m', ...) : Carbon complète le jour manquant
        // avec le jour COURANT. Le 31 du mois, « 2026-09 » devenait 31/09, qui
        // déborde sur le 1er octobre — tout le calendrier glissait d'un mois.
        $monthStart = Carbon::createFromFormat('Y-m-d', $request->month . '-01', self::TZ)->startOfDay();
        $monthEnd   = $monthStart->copy()->endOfMonth();

        $now = Carbon::now(self::TZ);

        // Fenêtre de réservation — ne pas proposer de jours au-delà
        $windowEnd = $profile->booking_window_days !== null
            ? $now->copy()->addDays($profile->booking_window_days)->endOfDay()
            : null;

        // Jours ouverts selon le planning, avec leurs horaires (pour détecter
        // les journées entièrement bloquées par une indisponibilité)
        $schedulesByDow = HairdresserSchedule::where('hairdresser_id', $profile->id)
            ->where('is_open', true)
            ->get()
            ->keyBy('day_of_week');

        // Indisponibilités qui recouvrent le mois demandé
        $unavailabilities = HairdresserUnavailability::where('hairdresser_id', $profile->id)
            ->where('start_datetime', '<=', $monthEnd)
            ->where('end_datetime', '>=', $monthStart)
            ->get(['start_datetime', 'end_datetime']);

        $availableDates = [];
        $day = $monthStart->copy();

        while ($day->lte($monthEnd)) {
            $dow = (int) $day->format('w');
            $schedule = $schedulesByDow->get($dow);

            // `!$day->isPast()` excluait AUSSI aujourd'hui ($day est à minuit,
            // donc toujours « passé » dès 00h01) : la réservation le jour même
            // était impossible depuis le calendrier alors que slots() renvoyait
            // encore des créneaux. Prouvé en test réel le 2026-08-24 à 16h00 :
            // available-dates commençait au 25 alors que slots(24/08) proposait
            // 16:30…18:30. On garde donc les jours >= aujourd'hui, et pour
            // aujourd'hui uniquement, on vérifie qu'il reste au moins un départ
            // de créneau possible (fermeture - durée >= maintenant).
            $withinWindow = $windowEnd === null || $day->lte($windowEnd);
            $isPastDay    = $day->lt($now->copy()->startOfDay());

            if ($schedule && $withinWindow && !$isPastDay) {
                // Une indisponibilité qui couvre entièrement les horaires d'ouverture
                // du jour rend la journée indisponible (sinon slots() renverrait 0 créneau
                // mais le jour resterait cliquable dans le calendrier client)
                $dayStart = Carbon::createFromFormat('Y-m-d H:i:s', $day->format('Y-m-d') . ' ' . $schedule->start_time, self::TZ);
                $dayEnd   = Carbon::createFromFormat('Y-m-d H:i:s', $day->format('Y-m-d') . ' ' . $schedule->end_time, self::TZ);

                $fullyBlocked = $unavailabilities->contains(fn($u) =>
                    Carbon::parse($u->start_datetime->format('Y-m-d H:i:s'), self::TZ)->lte($dayStart)
                    && Carbon::parse($u->end_datetime->format('Y-m-d H:i:s'), self::TZ)->gte($dayEnd)
                );

                $stillBookableToday = !$day->isSameDay($now)
                    || $dayEnd->copy()->subMinutes((int) ($service->duration_minutes ?: 30))->gte($now);

                if (!$fullyBlocked && $stillBookableToday) {
                    $availableDates[] = $day->format('Y-m-d');
                }
            }
            $day->addDay();
        }

        return response()->json(['dates' => $availableDates]);
    }
}
