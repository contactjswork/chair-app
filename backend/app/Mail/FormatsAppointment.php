<?php

namespace App\Mail;

use App\Models\Appointment;
use Carbon\Carbon;

/**
 * Mise en forme du récapitulatif d'un rendez-vous pour les emails.
 *
 * Aucune valeur inventée : une information absente en base ne produit pas de
 * ligne (le partial emails/partials/details ignore les valeurs vides).
 * Gère les deux modes de réservation existants (réservation réelle avec
 * date/heure, et demande legacy avec desired_date/desired_slot).
 */
trait FormatsAppointment
{
    protected function hairdresserName(Appointment $appointment): ?string
    {
        $appointment->loadMissing('hairdresser.user');

        return $appointment->hairdresser->user->name ?? null;
    }

    protected function appointmentDateLabel(Appointment $appointment): ?string
    {
        $date = $appointment->appointment_date ?: $appointment->desired_date;
        if (!$date) {
            return null;
        }

        return Carbon::parse($date)->locale('fr')->isoFormat('dddd D MMMM YYYY');
    }

    protected function appointmentTimeLabel(Appointment $appointment): ?string
    {
        if ($appointment->appointment_time) {
            // Stocké en HH:MM:SS — on n'affiche jamais les secondes.
            return substr((string) $appointment->appointment_time, 0, 5);
        }

        // Mode legacy : pas d'heure précise, seulement un moment de la journée.
        return $appointment->desired_slot ?: null;
    }

    protected function appointmentRows(Appointment $appointment): array
    {
        $price = null;
        if ($appointment->price !== null && (float) $appointment->price > 0) {
            $price = number_format((float) $appointment->price, 2, ',', ' ') . ' €';
        }

        $duration = null;
        if (!empty($appointment->duration_minutes)) {
            $duration = $appointment->duration_minutes . ' min';
        }

        return [
            ['label' => 'Coiffeur',   'value' => $this->hairdresserName($appointment)],
            ['label' => 'Prestation', 'value' => $appointment->service],
            ['label' => 'Date',       'value' => $this->appointmentDateLabel($appointment)],
            ['label' => 'Heure',      'value' => $this->appointmentTimeLabel($appointment)],
            ['label' => 'Durée',      'value' => $duration],
            ['label' => 'Prix',       'value' => $price],
        ];
    }
}
