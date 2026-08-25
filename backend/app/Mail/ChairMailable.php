<?php

namespace App\Mail;

use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Base commune à tous les emails CHAIR : fournit au gabarit
 * (resources/views/emails/layout.blade.php) les données de pied de page.
 *
 * PHP 8.0 — on utilise array_merge(), jamais l'opérateur spread sur un
 * tableau associatif.
 */
abstract class ChairMailable extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  bool $withUnsubscribe  affiche le lien "Gérer mes notifications"
     * @param  bool $securityNotice   affiche la mention "email de sécurité"
     */
    protected function layoutData(bool $withUnsubscribe = true, bool $securityNotice = false): array
    {
        return [
            'legalUrls' => [
                'cgu'     => MailService::frontendUrl('/cgu'),
                'privacy' => MailService::frontendUrl('/confidentialite'),
            ],
            'unsubscribeUrl' => $withUnsubscribe
                ? MailService::frontendUrl('/app/notifications/preferences')
                : null,
            'securityNotice' => $securityNotice,
            'preheader'      => null,
        ];
    }
}
