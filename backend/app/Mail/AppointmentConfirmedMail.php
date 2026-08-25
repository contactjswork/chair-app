<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Services\MailService;

/**
 * Confirmation de rendez-vous — envoyée au client :
 *  - à la réservation quand le créneau est confirmé automatiquement
 *    (AppointmentController::store, mode réservation réelle),
 *  - quand le coiffeur passe le RDV en "confirmed"
 *    (AppointmentController::updateStatus).
 *
 * Respecte la préférence "booking_confirmed" du destinataire quand il a un
 * compte (type NotificationService : 'appointment_confirmed').
 */
class AppointmentConfirmedMail extends ChairMailable
{
    use FormatsAppointment;

    public Appointment $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    public function build()
    {
        $hairdresser = $this->hairdresserName($this->appointment);
        $dateLabel   = $this->appointmentDateLabel($this->appointment);
        $timeLabel   = $this->appointmentTimeLabel($this->appointment);

        $preheader = $dateLabel
            ? trim($dateLabel . ($timeLabel ? ' à ' . $timeLabel : ''))
            : 'Ton rendez-vous est confirmé.';

        return $this
            ->subject($hairdresser
                ? 'Rendez-vous confirmé avec ' . $hairdresser
                : 'Rendez-vous confirmé')
            ->text('emails.text.appointment-confirmed')
            ->view('emails.appointment-confirmed', array_merge($this->layoutData(), [
                'clientName'      => $this->appointment->client_name ?: 'à toi',
                'rows'            => $this->appointmentRows($this->appointment),
                // Consultable seulement avec un compte : pas de lien pour un
                // client invité (réservation sans inscription).
                'appointmentsUrl' => $this->appointment->client_id
                    // (la liste "Mes rendez-vous" est sur la page compte)
                    ? MailService::frontendUrl('/app/compte')
                    : null,
                'preheader'       => $preheader,
            ]));
    }
}
