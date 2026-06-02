<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\HairdresserSchedule;
use App\Models\Appointment;
use App\Models\HairdresserUnavailability;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AvailableHairdressersController extends Controller
{
    /**
     * GET /available-hairdressers
     * Params: when (today|tomorrow|this_week|weekend), lat, lng, radius, per_page
     *
     * Retourne les coiffeurs qui ont au moins 1 créneau libre dans la période demandée.
     */
    public function index(Request $request)
    {
        $when    = $request->get('when', 'today');
        $lat     = $request->has('lat') && $request->lat !== '' ? (float) $request->lat : null;
        $lng     = $request->has('lng') && $request->lng !== '' ? (float) $request->lng : null;
        $radius  = min(200, max(1, (float) ($request->radius ?? 50)));
        $perPage = min(20, max(1, intval($request->per_page ?? 8)));

        // Calculer la plage de dates selon `when`
        $dates = $this->getDates($when);

        // Charger tous les profils avec leurs horaires et RDVs
        $query = HairdresserProfile::with(['user', 'specialties', 'schedules', 'unavailabilities']);

        // Filtre géo si disponible
        if ($lat !== null && $lng !== null) {
            $query->whereNotNull('latitude')->whereNotNull('longitude');
        }

        $profiles = $query->get();

        $available = $profiles->filter(function ($profile) use ($dates) {
            foreach ($dates as $date) {
                if ($this->hasAvailableSlot($profile, $date)) {
                    return true;
                }
            }
            return false;
        });

        // Filtrer par distance si géo
        if ($lat !== null && $lng !== null) {
            $available = $available->map(function ($p) use ($lat, $lng) {
                $p->distance_km = round($this->haversine($lat, $lng, (float)$p->latitude, (float)$p->longitude), 1);
                return $p;
            })->filter(fn($p) => $p->distance_km <= $radius)
              ->sortBy('distance_km');
        } else {
            // Trier par popularité
            $available = $available->sortByDesc(fn($p) => $p->avg_rating * $p->reviews_count + $p->followers_count);
        }

        // Enrichir avec le nombre de créneaux dispo aujourd'hui
        $today = $dates[0] ?? Carbon::today()->toDateString();
        $available = $available->take($perPage)->map(function ($p) use ($today) {
            $p->slots_today = $this->countAvailableSlots($p, $today);
            return $p;
        })->values();

        return response()->json([
            'data'     => $available,
            'total'    => $available->count(),
            'when'     => $today,
        ]);
    }

    // ── Dates selon la période ─────────────────────────────────────────────

    private function getDates(string $when): array
    {
        $today = Carbon::today();

        return match ($when) {
            'tomorrow'  => [$today->copy()->addDay()->toDateString()],
            'this_week' => collect(range(0, 6))->map(fn($d) => $today->copy()->addDays($d)->toDateString())->all(),
            'weekend'   => collect(range(0, 6))
                ->map(fn($d) => $today->copy()->addDays($d))
                ->filter(fn($dt) => $dt->isWeekend())
                ->map(fn($dt) => $dt->toDateString())
                ->values()->all(),
            default     => [$today->toDateString()], // today
        };
    }

    // ── Vérifier si un coiffeur a au moins 1 créneau libre ─────────────────

    private function hasAvailableSlot(HairdresserProfile $profile, string $date): bool
    {
        $dt       = Carbon::parse($date);
        $dayOfWeek = $dt->dayOfWeek; // 0=dim, 6=sam

        // Vérifier l'horaire du jour
        $schedule = $profile->schedules->firstWhere('day_of_week', $dayOfWeek);
        if (!$schedule || !$schedule->is_open || !$schedule->start_time || !$schedule->end_time) {
            return false;
        }

        // Vérifier indisponibilités
        foreach ($profile->unavailabilities as $unavail) {
            $start = Carbon::parse($unavail->start_datetime);
            $end   = Carbon::parse($unavail->end_datetime);
            if ($dt->between($start->startOfDay(), $end->endOfDay())) {
                return false;
            }
        }

        // Compter les RDVs confirmés ce jour
        $appointmentsCount = Appointment::where('hairdresser_id', $profile->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->whereDate('appointment_date', $date)
            ->count();

        // Calculer le nombre de créneaux théoriques (30 min par défaut)
        $startTime = Carbon::parse($date . ' ' . substr($schedule->start_time, 0, 5));
        $endTime   = Carbon::parse($date . ' ' . substr($schedule->end_time, 0, 5));
        $totalMinutes = $endTime->diffInMinutes($startTime);

        // Déduire la pause
        if ($schedule->break_start && $schedule->break_end) {
            $breakStart = Carbon::parse($date . ' ' . substr($schedule->break_start, 0, 5));
            $breakEnd   = Carbon::parse($date . ' ' . substr($schedule->break_end, 0, 5));
            $totalMinutes -= $breakEnd->diffInMinutes($breakStart);
        }

        $slotSize        = 30; // minutes
        $totalSlots      = max(0, floor($totalMinutes / $slotSize));

        return $appointmentsCount < $totalSlots;
    }

    private function countAvailableSlots(HairdresserProfile $profile, string $date): int
    {
        $dt        = Carbon::parse($date);
        $dayOfWeek = $dt->dayOfWeek;
        $schedule  = $profile->schedules->firstWhere('day_of_week', $dayOfWeek);

        if (!$schedule || !$schedule->is_open || !$schedule->start_time || !$schedule->end_time) {
            return 0;
        }

        $startTime = Carbon::parse($date . ' ' . substr($schedule->start_time, 0, 5));
        $endTime   = Carbon::parse($date . ' ' . substr($schedule->end_time, 0, 5));
        $totalMinutes = max(0, $endTime->diffInMinutes($startTime));

        if ($schedule->break_start && $schedule->break_end) {
            $breakStart = Carbon::parse($date . ' ' . substr($schedule->break_start, 0, 5));
            $breakEnd   = Carbon::parse($date . ' ' . substr($schedule->break_end, 0, 5));
            $totalMinutes -= max(0, $breakEnd->diffInMinutes($breakStart));
        }

        $slotSize   = 30;
        $totalSlots = max(0, (int) floor($totalMinutes / $slotSize));

        $booked = Appointment::where('hairdresser_id', $profile->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->whereDate('appointment_date', $date)
            ->count();

        return max(0, $totalSlots - $booked);
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
