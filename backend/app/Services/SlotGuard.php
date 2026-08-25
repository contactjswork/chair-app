<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Models\HairdresserSchedule;
use App\Models\HairdresserUnavailability;
use App\Models\Service;
use Carbon\Carbon;

/**
 * Validation SERVEUR d'un créneau de réservation.
 *
 * Contexte (audit produit du 2026-08-20) : toute la logique de disponibilité
 * n'existait que dans AvailabilityController, c'est-à-dire uniquement pour
 * AFFICHER les créneaux. POST /appointments, lui, ne vérifiait qu'une égalité
 * d'heure exacte — prouvé en test réel : un RDV de 10h00 (30 min) n'empêchait
 * pas d'en créer un à 10h15, et on pouvait réserver un dimanche à 22h30 ou une
 * heure déjà passée. Le serveur faisait confiance au client sur toute la ligne.
 *
 * Ce garde applique EXACTEMENT les mêmes règles que l'affichage des créneaux
 * (AvailabilityController::slots), pour qu'un créneau proposé soit toujours
 * acceptable et qu'un créneau non proposé soit toujours refusé :
 *   1. jour ouvert au planning du coiffeur
 *   2. dans la fenêtre de réservation (booking_window_days)
 *   3. dans les horaires d'ouverture, hors pause déjeuner
 *   4. sans chevauchement avec une indisponibilité (congé, pause ponctuelle)
 *   5. sans chevauchement avec un rendez-vous existant (DURÉE comprise)
 *   6. pas dans le passé
 *
 * Utilisé par AppointmentController::store() et ::reschedule().
 */
class SlotGuard
{
    /**
     * Fuseau de référence des créneaux (audit timezone du 2026-08-24).
     *
     * Les heures manipulées ici (planning, appointment_time, créneau demandé)
     * sont des heures « murales » du salon, en France, alors que
     * config/app.php est en UTC. Sans fuseau explicite, `isPast()` comparait
     * « 14:30 heure française » à l'heure UTC : prouvé en test réel, à 16h00
     * (Paris) un POST /appointments à 14:30 le jour même était accepté
     * (RDV n° 143 du jeu de test, supprimé depuis). Toutes les instances
     * Carbon sont créées en Europe/Paris ; les comparaisons créneau/planning
     * restent identiques, seules les frontières « passé » et « fenêtre de
     * réservation » deviennent justes. Même constante dans
     * AvailabilityController — les deux DOIVENT rester alignées.
     */
    public const TZ = 'Europe/Paris';

    /** Motif → message français affichable tel quel au client. */
    public const MESSAGES = [
        'closed'                 => "Ce coiffeur ne travaille pas ce jour-là.",
        'outside_booking_window' => "Cette date est trop éloignée pour être réservée en ligne.",
        'outside_hours'          => "Ce créneau est en dehors des horaires d'ouverture.",
        'in_break'               => "Ce créneau tombe pendant la pause.",
        'unavailable'            => "Le coiffeur n'est pas disponible sur ce créneau.",
        'taken'                  => "Ce créneau vient d'être pris. Veuillez en choisir un autre.",
        'past'                   => "Ce créneau est déjà passé.",
    ];

    /**
     * @param  string  $date  Y-m-d
     * @param  string  $time  H:i
     * @param  int|null $ignoreAppointmentId  RDV à ignorer (cas replanification)
     * @return string|null  null = créneau valide, sinon la clé du motif de refus
     */
    public static function check(
        HairdresserProfile $profile,
        Service $service,
        string $date,
        string $time,
        ?int $ignoreAppointmentId = null
    ): ?string {
        $day      = Carbon::createFromFormat('Y-m-d', $date, self::TZ)->startOfDay();
        $start    = Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $time, self::TZ);
        $duration = (int) ($service->duration_minutes ?: 30);
        $end      = $start->copy()->addMinutes($duration);

        // 6. Passé — testé en premier, c'est le refus le plus fréquent
        if ($start->isPast()) {
            return 'past';
        }

        // 2. Fenêtre de réservation
        if ($profile->booking_window_days !== null
            && $day->isAfter(Carbon::now(self::TZ)->addDays($profile->booking_window_days)->endOfDay())) {
            return 'outside_booking_window';
        }

        // 1. Jour ouvert
        $schedule = HairdresserSchedule::where('hairdresser_id', $profile->id)
            ->where('day_of_week', (int) $day->format('w'))
            ->first();

        if (!$schedule || !$schedule->is_open || !$schedule->start_time || !$schedule->end_time) {
            return 'closed';
        }

        // 3. Dans les horaires (le RDV doit tenir ENTIÈREMENT dans la journée)
        $open  = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $schedule->start_time, self::TZ);
        $close = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $schedule->end_time, self::TZ);

        if ($start->lt($open) || $end->gt($close)) {
            return 'outside_hours';
        }

        // 3bis. Pause déjeuner
        if ($schedule->break_start && $schedule->break_end) {
            $bStart = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $schedule->break_start, self::TZ);
            $bEnd   = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $schedule->break_end, self::TZ);
            if ($start->lt($bEnd) && $end->gt($bStart)) {
                return 'in_break';
            }
        }

        // 4. Indisponibilités (congés, blocages ponctuels)
        $unavailabilities = HairdresserUnavailability::where('hairdresser_id', $profile->id)
            ->whereDate('start_datetime', '<=', $date)
            ->whereDate('end_datetime', '>=', $date)
            ->get();

        foreach ($unavailabilities as $u) {
            // Le cast `datetime` hydrate en UTC des heures murales saisies en
            // France : on ré-étiquette la valeur murale en Europe/Paris.
            $uStart = Carbon::parse($u->start_datetime->format('Y-m-d H:i:s'), self::TZ);
            $uEnd   = Carbon::parse($u->end_datetime->format('Y-m-d H:i:s'), self::TZ);
            if ($start->lt($uEnd) && $end->gt($uStart)) {
                return 'unavailable';
            }
        }

        // 5. Chevauchement avec un RDV existant — la DURÉE compte, pas
        // seulement l'heure de début (c'était la faille du double-booking).
        $booked = Appointment::where('hairdresser_id', $profile->id)
            ->where('appointment_date', $date)
            ->whereIn('status', ['confirmed', 'pending'])
            ->when($ignoreAppointmentId, fn ($q) => $q->where('id', '!=', $ignoreAppointmentId))
            ->whereNotNull('appointment_time')
            ->get(['appointment_time', 'duration_minutes']);

        foreach ($booked as $b) {
            $bStart = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $b->appointment_time, self::TZ);
            $bEnd   = $bStart->copy()->addMinutes((int) ($b->duration_minutes ?: 30));
            if ($start->lt($bEnd) && $end->gt($bStart)) {
                return 'taken';
            }
        }

        return null;
    }

    public static function message(string $reason): string
    {
        return self::MESSAGES[$reason] ?? "Ce créneau n'est pas disponible.";
    }

    /** 409 pour un conflit d'occupation, 422 pour une règle de planning. */
    public static function httpStatus(string $reason): int
    {
        return $reason === 'taken' ? 409 : 422;
    }
}
