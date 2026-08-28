<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Services\MailService;

/**
 * Demande d'avis après visite — envoyée au client quand le coiffeur passe le
 * RDV en "completed" (AppointmentController::updateStatus), au moment même où
 * le review_token est généré.
 *
 * C'est le levier des avis vérifiés : le lien porte le review_token du
 * rendez-vous, consommé par POST /api/review-by-token/{token}. Sans ce token,
 * personne ne peut noter — c'est ce qui rend les avis CHAIR impossibles à
 * falsifier, y compris pour un client sans compte.
 *
 * Respecte la préférence "review_request" du destinataire quand il a un compte
 * (type NotificationService : 'review_request').
 */
class ReviewRequestMail extends ChairMailable
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

        // Le récapitulatif d'une demande d'avis reste court : ce qu'on demande,
        // c'est un ressenti, pas une relecture de facture.
        $rows = [
            ['label' => 'Coiffeur',   'value' => $hairdresser],
            ['label' => 'Prestation', 'value' => $this->appointment->service],
            ['label' => 'Date',       'value' => $this->appointmentDateLabel($this->appointment)],
        ];

        return $this
            ->subject($hairdresser
                ? 'Ton avis sur ta visite chez ' . $hairdresser
                : 'Ton avis sur ta dernière visite')
            ->text('emails.text.review-request')
            ->view('emails.review-request', array_merge($this->layoutData(), [
                'clientName' => $this->appointment->client_name ?: 'à toi',
                'rows'       => $rows,
                'reviewUrl'  => MailService::frontendUrl('/app/avis/' . $this->appointment->review_token),
                'preheader'  => 'Deux minutes pour laisser un avis vérifié.',
            ]));
    }
}
