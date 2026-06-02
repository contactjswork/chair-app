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

        $date     = Carbon::createFromFormat('Y-m-d', $request->date);
        $dayOfWeek = (int) $date->format('w'); // 0=Dimanche

        // 1. Vérifier que ce jour est ouvert dans le planning
        $schedule = HairdresserSchedule::where('hairdresser_id', $profile->id)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if (!$schedule || !$schedule->is_open || !$schedule->start_time || !$schedule->end_time) {
            return response()->json(['slots' => [], 'reason' => 'closed']);
        }

        $duration = $service->duration_minutes;

        // 2. Générer tous les créneaux possibles (toutes les 30 min)
        $startTime = Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->start_time);
        $endTime   = Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->end_time);

        // Pause déjeuner
        $breakStart = $schedule->break_start
            ? Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->break_start)
            : null;
        $breakEnd = $schedule->break_end
            ? Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $schedule->break_end)
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
                $uStart = Carbon::parse($unavail->start_datetime);
                $uEnd   = Carbon::parse($unavail->end_datetime);
                if ($current->lt($uEnd) && $slotEnd->gt($uStart)) {
                    $inUnavailability = true;
                    break;
                }
            }

            // Vérifier si le créneau chevauche un RDV existant
            $isBooked = false;
            foreach ($bookedSlots as $booked) {
                $bStart = Carbon::createFromFormat('Y-m-d H:i:s', $date->format('Y-m-d') . ' ' . $booked->appointment_time);
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

        $monthStart = Carbon::createFromFormat('Y-m', $request->month)->startOfMonth();
        $monthEnd   = $monthStart->copy()->endOfMonth();

        // Jours ouverts selon le planning
        $openDays = HairdresserSchedule::where('hairdresser_id', $profile->id)
            ->where('is_open', true)
            ->pluck('day_of_week')
            ->toArray();

        $availableDates = [];
        $day = $monthStart->copy();

        while ($day->lte($monthEnd)) {
            $dow = (int) $day->format('w');
            if (in_array($dow, $openDays) && !$day->isPast()) {
                $availableDates[] = $day->format('Y-m-d');
            }
            $day->addDay();
        }

        return response()->json(['dates' => $availableDates]);
    }
}
