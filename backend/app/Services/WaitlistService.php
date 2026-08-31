<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\SlotWaitlist;

/**
 * La liste d'attente — le pont entre une annulation et un client qui attend.
 *
 * Appelé à CHAQUE passage d'un rendez-vous vers un statut qui libère le
 * créneau (cancelled, declined). Un seul push par inscription, jamais deux :
 * après l'avoir prévenu une fois, c'est au client de jouer.
 */
class WaitlistService
{
    public static function onSlotFreed(Appointment $appointment): void
    {
        if (!$appointment->appointment_date) {
            return;
        }
        $date = \Carbon\Carbon::parse($appointment->appointment_date);
        // Un créneau libéré dans le passé ne sert à personne.
        if ($date->isPast() && !$date->isToday()) {
            return;
        }

        $enAttente = SlotWaitlist::where('hairdresser_id', $appointment->hairdresser_id)
            ->whereDate('date', $date->toDateString())
            ->whereNull('notified_at')
            // Celui qui annule ne doit pas être prévenu que « ça se libère ».
            ->where('client_user_id', '!=', (int) $appointment->client_id)
            ->get();

        if ($enAttente->isEmpty()) {
            return;
        }

        $profile = $appointment->hairdresser()->with('user')->first();
        if (!$profile) {
            return;
        }

        foreach ($enAttente as $inscription) {
            // Flag AVANT l'envoi — même règle que partout : on perd au pire
            // un push, on n'en double jamais.
            $inscription->forceFill(['notified_at' => now()])->save();

            NotificationService::sendTyped(
                (int) $inscription->client_user_id,
                'slot_freed',
                [
                    'coiffeur' => $profile->user->name ?? 'votre coiffeur',
                    'date'     => $date->locale('fr')->isoFormat('dddd D MMMM'),
                ],
                NotificationCopy::AUDIENCE_CLIENT,
                ['url' => "/app/coiffeur/{$profile->slug}"]
            );
        }
    }
}
