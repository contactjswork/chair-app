<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use Illuminate\Console\Command;

/**
 * Prévient l'abonné que son essai gratuit CHAIR+ se termine dans ~3 jours et
 * qu'il sera alors débité — la notification honnête qui évite le prélèvement
 * surprise (et les demandes de remboursement qui vont avec).
 *
 * Cible : les essais (status trialing) dont trial_ends_at tombe dans les 3
 * prochains jours et qui n'ont pas encore reçu l'alerte
 * (trial_ending_notified_at nul), quel que soit le fournisseur (Stripe/Apple).
 * Le drapeau est posé AVANT l'envoi → une seule alerte par essai, jamais de
 * doublon même si la commande retourne le même jour.
 */
class NotifyTrialEnding extends Command
{
    protected $signature = 'chair:notify-trial-ending';
    protected $description = 'Alerte les abonnes dont l\'essai gratuit CHAIR+ se termine dans ~3 jours';

    public function handle(): int
    {
        // Tarif affiché : on ne stocke pas le montant exact facturé (Apple le
        // localise), on prend le tarif France de référence pour le texte.
        $prix = config('services.chair_plus.display_price', '15,99 €');

        $rows = Subscription::where('status', 'trialing')
            ->whereNull('trial_ending_notified_at')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now())
            ->where('trial_ends_at', '<=', now()->addDays(3))
            ->get();

        $sent = 0;
        foreach ($rows as $sub) {
            $userId = $sub->hairdresser_profile_id
                ? optional($sub->hairdresserProfile)->user_id
                : optional($sub->salon)->owner_id;

            // Drapeau posé AVANT l'envoi : idempotence garantie même si l'envoi
            // suivant échoue (mieux vaut rater une alerte que la répéter).
            $sub->forceFill(['trial_ending_notified_at' => now()])->save();

            if (!$userId) {
                continue;
            }

            $jours = max(1, (int) ceil(now()->diffInDays($sub->trial_ends_at, false)));

            NotificationService::sendTyped(
                $userId,
                'chair_plus_trial_ending',
                ['jours' => (string) $jours, 'prix' => $prix],
                NotificationCopy::AUDIENCE_PRO,
                ['plan' => $sub->plan]
            );
            $sent++;
        }

        $this->info("Alertes fin d'essai envoyées : {$sent} (sur {$rows->count()} essai(s) en fenêtre).");

        return self::SUCCESS;
    }
}
