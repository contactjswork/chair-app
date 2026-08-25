<?php

namespace App\Mail;

use App\Services\MailService;

/**
 * Bienvenue coiffeur — envoyé après une inscription avec le rôle "hairdresser"
 * (AuthController::register). Ton pro (vouvoiement), objectif : compléter le
 * profil pour être visible.
 */
class WelcomeHairdresserMail extends ChairMailable
{
    public string $name;

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    public function build()
    {
        return $this
            ->subject('Bienvenue sur CHAIR PRO')
            ->text('emails.text.welcome-hairdresser')
            ->view('emails.welcome-hairdresser', array_merge($this->layoutData(), [
                'name'       => $this->name,
                'profileUrl' => MailService::frontendUrl('/pro/profil'),
                'preheader'  => 'Complétez votre profil pour être visible dans la recherche.',
            ]));
    }
}
