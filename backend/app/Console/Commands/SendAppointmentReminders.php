<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\SlotGuard;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * chair:send-appointment-reminders — rappels de rendez-vous client.
 *
 * Planifiée everyFifteenMinutes() dans Kernel (nécessite la ligne cron
 * `php artisan schedule:run`, voir docs/app-store/JULIEN_APP_STORE_SETUP.md
 * étape 8). Deux rappels par RDV confirmé, transactionnels (toujours
 * envoyés, aucune fenêtre calme — voir docs/PUSH_NOTIFICATIONS.md § Stratégie),
 * chacun respectant la préférence du client (reminder_24h / reminder_1h) via
 * NotificationService::sendTyped :
 *
 *   - rappel 24 h : début du RDV dans [maintenant+23h45, maintenant+24h15]
 *   - rappel 1 h  : début du RDV dans [maintenant+45min, maintenant+1h15]
 *
 * Les fenêtres font ±15 min autour de la cible parce que le cron passe
 * toutes les 15 min : chaque RDV tombe dans exactement une passe.
 *
 * IDEMPOTENCE : reminded_24h_at / reminded_1h_at sur appointments. Le flag
 * est posé AVANT l'envoi — si le cron rejoue (ou si deux passes se
 * chevauchent), le rappel ne repart jamais. Au pire (crash entre le flag et
 * l'envoi), un rappel est perdu — préférable à un doublon.
 *
 * Cas limites, assumés :
 *   - RDV annulé/déplacé entre-temps : le filtre status='confirmed' relit
 *     l'état à CHAQUE passe → un RDV annulé ne reçoit plus rien.
 *   - RDV pris moins de 45 min avant l'heure : aucune passe ne matche la
 *     fenêtre 1 h → pas de rappel 1 h (le client vient de réserver, il n'en
 *     a pas besoin). Idem rappel 24 h pour un RDV pris moins de 23h45 avant.
 *   - Client sans compte (client_id NULL, réservation invité) : exclu — pas
 *     de destinataire pour une notification interne ou un push.
 *   - Heures en Europe/Paris (mur du salon), comme SlotGuard : la paire
 *     appointment_date + appointment_time est une heure murale française.
 */
class SendAppointmentReminders extends Command
{
    protected $signature = 'chair:send-appointment-reminders';

    protected $description = 'Envoie les rappels 24h et 1h des rendez-vous confirmés (interne + push, préférences respectées)';

    public function handle()
    {
        $now = Carbon::now(SlotGuard::TZ);

        // Candidats : confirmés, avec un compte client, une heure connue, et
        // au moins un rappel pas encore envoyé. La date borne large (aujourd'hui
        // → J+2 pour couvrir une fenêtre 24 h qui franchit minuit) ; la fenêtre
        // exacte est vérifiée en PHP sur date+heure combinées.
        $candidates = Appointment::query()
            ->where('status', 'confirmed')
            ->whereNotNull('client_id')
            ->whereNotNull('appointment_date')
            ->whereNotNull('appointment_time')
            ->where(function ($q) {
                $q->whereNull('reminded_24h_at')
                  ->orWhereNull('reminded_1h_at')
                  // …ou candidat à la libération (confirmé demandé, pas confirmé).
                  ->orWhere(function ($qq) {
                      $qq->whereNotNull('confirmation_requested_at')->whereNull('client_confirmed_at');
                  });
            })
            ->whereBetween('appointment_date', [$now->toDateString(), $now->copy()->addDays(2)->toDateString()])
            ->with('hairdresser.user')
            ->get();

        $sent24h = 0;
        $sent1h  = 0;
        $liberes = 0;

        foreach ($candidates as $appointment) {
            $start = $this->startsAt($appointment);
            if ($start === null) {
                continue; // heure illisible — on ne devine pas
            }

            if ($appointment->reminded_24h_at === null
                && $start->between($now->copy()->addHours(24)->subMinutes(15), $now->copy()->addHours(24)->addMinutes(15))) {
                // GROSSES PRESTATIONS (>= 3 h) : le rappel devient une demande
                // de confirmation, et confirmation_requested_at arme la
                // libération automatique 4 h avant. En dessous : simple rappel
                // doux, jamais de libération (retour Julien 01/09 : « pour les
                // presta en dessous de 3 h, ça sert à rien »).
                $grosseTransfo = ($appointment->duration_minutes ?? 0) >= 180;
                if ($grosseTransfo) {
                    $appointment->forceFill(['confirmation_requested_at' => now()])->save();
                }
                $this->remind(
                    $appointment,
                    $grosseTransfo ? 'appointment_confirm_request' : 'appointment_reminder_24h',
                    'reminded_24h_at',
                    $start
                );
                $sent24h++;
            }

            // LIBÉRATION : demandé il y a ~20 h, jamais confirmé, et le RDV
            // est dans ~4 h → le créneau repart au planning et la liste
            // d'attente est prévenue. Jamais pour un RDV pris < 24 h avant
            // (aucune confirmation n'a été demandée, confirmation_requested_at
            // est null) ni pour un invité sans compte (client_id null, déjà
            // filtré en amont).
            if ($appointment->confirmation_requested_at !== null
                && $appointment->client_confirmed_at === null
                && $appointment->status === 'confirmed'
                && $start->between($now->copy()->addHours(4)->subMinutes(15), $now->copy()->addHours(4)->addMinutes(15))) {
                $this->liberer($appointment, $start);
                $liberes++;
            }

            if ($appointment->reminded_1h_at === null
                && $start->between($now->copy()->addMinutes(45), $now->copy()->addMinutes(75))) {
                $this->remind($appointment, 'appointment_reminder_1h', 'reminded_1h_at', $start);
                $sent1h++;
            }
        }

        $this->info("Rappels 24h : {$sent24h} — Rappels 1h : {$sent1h} — Libérés : {$liberes} (candidats : {$candidates->count()})");

        return 0;
    }

    /**
     * Début du RDV en Europe/Paris (heure murale), ou null si illisible.
     */
    private function startsAt(Appointment $appointment): ?Carbon
    {
        $date = $appointment->appointment_date ? $appointment->appointment_date->format('Y-m-d') : null;
        $time = (string) $appointment->appointment_time;
        if ($date === null || $time === '') {
            return null;
        }

        if (strlen($time) === 5) {
            $time .= ':00'; // tolère H:i (la colonne stocke H:i:s)
        }

        try {
            return Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . $time, SlotGuard::TZ);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Pose le flag d'idempotence PUIS envoie (interne + push d'un coup,
     * préférence du type vérifiée par NotificationService).
     */
    private function remind(Appointment $appointment, string $type, string $flagColumn, Carbon $start): void
    {
        // Flag d'abord : si l'envoi lève, on perd UN rappel, on n'en double jamais.
        $appointment->forceFill([$flagColumn => now()])->save();

        NotificationService::sendTyped(
            (int) $appointment->client_id,
            $type,
            [
                'coiffeur' => $appointment->hairdresser->user->name ?? null,
                'heure'    => $start->format('H\hi'),
            ],
            NotificationCopy::AUDIENCE_CLIENT,
            [
                'appointment_id' => $appointment->id,
                'url'            => '/app/compte',
            ]
        );
    }

    /**
     * Libère un créneau jamais confirmé : statut annulé, client et coiffeur
     * prévenus, liste d'attente notifiée. Le client n'est pas puni — le
     * message l'invite à reprendre un créneau.
     */
    private function liberer(Appointment $appointment, Carbon $start): void
    {
        // Statut d'abord : si une notification lève, le créneau est quand
        // même libéré — c'est l'effet qui compte.
        $appointment->forceFill(['status' => 'cancelled'])->save();

        $vars = [
            'coiffeur' => $appointment->hairdresser->user->name ?? null,
            'heure'    => $start->format('H\hi'),
        ];

        NotificationService::sendTyped(
            (int) $appointment->client_id,
            'appointment_released',
            $vars,
            NotificationCopy::AUDIENCE_CLIENT,
            ['appointment_id' => $appointment->id, 'url' => '/app/coiffeur/' . ($appointment->hairdresser->slug ?? '')]
        );

        if ($appointment->hairdresser && $appointment->hairdresser->user_id) {
            NotificationService::sendTyped(
                (int) $appointment->hairdresser->user_id,
                'appointment_released',
                ['client' => $appointment->client_name, 'heure' => $start->format('H\hi')],
                NotificationCopy::AUDIENCE_PRO,
                ['appointment_id' => $appointment->id, 'url' => '/pro/agenda']
            );
        }

        AppServicesWaitlistService::onSlotFreed($appointment);
    }
}
