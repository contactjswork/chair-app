<?php

namespace App\Mail;

/**
 * Réinitialisation de mot de passe.
 *
 * Branché sur le système Laravel existant : POST /api/forgot-password appelle
 * Password::sendResetLink(), qui appelle User::sendPasswordResetNotification().
 * Cette méthode est surchargée dans App\Models\User pour envoyer ce Mailable
 * au lieu de la notification Laravel par défaut (texte anglais générique, DA
 * Laravel). L'URL du lien reste construite par le callback
 * ResetPassword::createUrlUsing() défini dans AppServiceProvider — une seule
 * source de vérité pour la page frontend qui consomme le token.
 *
 * Email de SÉCURITÉ : il part toujours, aucune préférence ne peut le bloquer.
 */
class ResetPasswordMail extends ChairMailable
{
    public string $name;
    public string $resetUrl;
    public int    $expireMinutes;

    public function __construct(string $name, string $resetUrl, int $expireMinutes)
    {
        $this->name          = $name;
        $this->resetUrl      = $resetUrl;
        $this->expireMinutes = $expireMinutes;
    }

    public function build()
    {
        return $this
            ->subject('Réinitialiser votre mot de passe CHAIR')
            ->text('emails.text.reset-password')
            ->view('emails.reset-password', array_merge(
                // Pas de lien de désinscription sur un email de sécurité, et
                // mention explicite dans le pied de page.
                $this->layoutData(false, true),
                [
                    'name'          => $this->name,
                    'resetUrl'      => $this->resetUrl,
                    'expireMinutes' => $this->expireMinutes,
                    'preheader'     => 'Lien valable ' . $this->expireMinutes . ' minutes.',
                ]
            ));
    }
}
