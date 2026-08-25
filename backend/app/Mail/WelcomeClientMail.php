<?php

namespace App\Mail;

use App\Services\MailService;

/**
 * Bienvenue client — envoyé après une inscription avec le rôle "client"
 * (AuthController::register).
 */
class WelcomeClientMail extends ChairMailable
{
    public string $name;

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    public function build()
    {
        return $this
            ->subject('Bienvenue sur CHAIR')
            ->text('emails.text.welcome-client')
            ->view('emails.welcome-client', array_merge($this->layoutData(), [
                'name'       => $this->name,
                'exploreUrl' => MailService::frontendUrl('/app/recherche'),
                'preheader'  => 'Ton compte est prêt. Trouve le coiffeur qu\'il te faut.',
            ]));
    }
}
