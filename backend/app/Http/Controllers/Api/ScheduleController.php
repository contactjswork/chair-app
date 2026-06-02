<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserSchedule;
use App\Models\HairdresserUnavailability;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    private function getProfile(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) abort(403, 'Profil coiffeur introuvable');
        return $profile;
    }

    /**
     * GET /api/schedule
     * Retourne les 7 jours de la semaine avec les horaires du coiffeur.
     */
    public function index(Request $request)
    {
        $profile   = $this->getProfile($request);
        $schedules = HairdresserSchedule::where('hairdresser_id', $profile->id)
            ->orderBy('day_of_week')
            ->get()
            ->keyBy('day_of_week');

        // Retourner toujours les 7 jours, créer les manquants comme fermés
        $result = [];
        for ($day = 0; $day <= 6; $day++) {
            $result[] = $schedules->get($day) ?? [
                'hairdresser_id' => $profile->id,
                'day_of_week'    => $day,
                'start_time'     => null,
                'end_time'       => null,
                'break_start'    => null,
                'break_end'      => null,
                'is_open'        => false,
            ];
        }

        return response()->json($result);
    }

    /**
     * PUT /api/schedule
     * Met à jour les horaires de la semaine (upsert des 7 jours).
     * Body: { schedules: [ { day_of_week: 1, is_open: true, start_time: "09:00", end_time: "18:00", ... }, ... ] }
     */
    public function update(Request $request)
    {
        $profile = $this->getProfile($request);

        $request->validate([
            'schedules'                 => 'required|array|min:1',
            'schedules.*.day_of_week'   => 'required|integer|min:0|max:6',
            'schedules.*.is_open'       => 'required|boolean',
            'schedules.*.start_time'    => 'nullable|date_format:H:i',
            'schedules.*.end_time'      => 'nullable|date_format:H:i',
            'schedules.*.break_start'   => 'nullable|date_format:H:i',
            'schedules.*.break_end'     => 'nullable|date_format:H:i',
        ]);

        foreach ($request->schedules as $row) {
            HairdresserSchedule::updateOrCreate(
                ['hairdresser_id' => $profile->id, 'day_of_week' => $row['day_of_week']],
                [
                    'is_open'     => $row['is_open'],
                    'start_time'  => $row['is_open'] ? ($row['start_time'] ?? null) : null,
                    'end_time'    => $row['is_open'] ? ($row['end_time'] ?? null) : null,
                    'break_start' => $row['is_open'] ? ($row['break_start'] ?? null) : null,
                    'break_end'   => $row['is_open'] ? ($row['break_end'] ?? null) : null,
                ]
            );
        }

        return $this->index($request);
    }

    /**
     * GET /api/unavailabilities
     */
    public function indexUnavailabilities(Request $request)
    {
        $profile = $this->getProfile($request);
        $items   = HairdresserUnavailability::where('hairdresser_id', $profile->id)
            ->where('end_datetime', '>=', now())
            ->orderBy('start_datetime')
            ->get();
        return response()->json($items);
    }

    /**
     * POST /api/unavailabilities
     */
    public function storeUnavailability(Request $request)
    {
        $profile = $this->getProfile($request);

        $validated = $request->validate([
            'start_datetime' => 'required|date|after:now',
            'end_datetime'   => 'required|date|after:start_datetime',
            'reason'         => 'nullable|string|max:255',
        ]);

        $item = HairdresserUnavailability::create(array_merge($validated, [
            'hairdresser_id' => $profile->id,
        ]));

        return response()->json($item, 201);
    }

    /**
     * DELETE /api/unavailabilities/{id}
     */
    public function destroyUnavailability(Request $request, int $id)
    {
        $profile = $this->getProfile($request);
        $item    = HairdresserUnavailability::where('id', $id)
            ->where('hairdresser_id', $profile->id)
            ->firstOrFail();
        $item->delete();
        return response()->json(null, 204);
    }
}
