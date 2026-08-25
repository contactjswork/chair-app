<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Services\MailService;

/**
 * Rendez-vous annulé — envoyé au client quand le coiffeur passe le RDV en
 * "cancelled" (AppointmentController::updateStatus).
 *
 * Ce mail ne couvre QUE l'annulation à l'initiative du coiffeur. Le client
 * dispose aussi de sa propre annulation en libre-service
 * (AppointmentController::clientCancel, PUT /appointments/{id}/cancel) : dans
 * ce cas c'est le coiffeur qu'il faut prévenir, et il l'est par notification
 * interne — aucun Mailable pro n'existe encore pour ce sens-là.
 *
 * Respecte la préférence "booking_cancelled" du destinataire quand il a un
 * compte (type NotificationService : 'appointment_cancelled').
 */
class AppointmentCancelledMail extends ChairMailable
{
    use FormatsAppointment;

    public Appointment $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    public function build()
    {
        $this->appointment->loadMissing('hairdresser.user');

        $hairdresser = $this->hairdresserName($this->appointment);
        $slug        = $this->appointment->hairdresser->slug ?? null;

        return $this
            ->subject($hairdresser
                ? 'Rendez-vous annulé avec ' . $hairdresser
                : 'Rendez-vous annulé')
            ->text('emails.text.appointment-cancelled')
            ->view('emails.appointment-cancelled', array_merge($this->layoutData(), [
                'clientName'     => $this->appointment->client_name ?: 'à toi',
                'rows'           => $this->appointmentRows($this->appointment),
                // Lien vers le profil public du coiffeur pour reprendre un
                // créneau — omis si le profil n'a pas de slug exploitable.
                'hairdresserUrl' => $slug
                    ? MailService::frontendUrl('/app/coiffeur/' . $slug)
                    : null,
                'preheader'      => 'Ce rendez-vous n\'aura pas lieu.',
            ]));
    }
}
