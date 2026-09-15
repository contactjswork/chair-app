<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Salon;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\SalonPulseService;
use Illuminate\Console\Command;

/**
 * Le Pulse du lundi — le rituel qui fait ouvrir CHAIR BUSINESS au patron.
 *
 * Usage : php artisan chair:send-salon-pulse
 * Planifiée le lundi à 09:00 (voir Console\Kernel) : le moment où un gérant
 * organise sa semaine. Pendant hebdo du récap coiffeur (dimanche 19h).
 *
 * Une notification par semaine et par gérant, une phrase qui résume :
 * avis de la semaine, note, membre en tête — et l'alerte membre s'il y en a.
 *
 * Mêmes règles d'honnêteté que SendWeeklyRecap :
 * - jamais envoyée vide (0 avis et aucune alerte = pas de push) ;
 * - idempotente par jour (un planificateur qui rejoue ne spamme pas).
 */
class SendSalonPulse extends Command
{
    protected $signature   = 'chair:send-salon-pulse';
    protected $description = 'Envoie le bilan hebdomadaire du salon aux gérants (avis, note, équipe)';

    public function handle(): int
    {
        $envoyes = 0;

        Salon::query()
            ->whereNotNull('owner_id')
            ->whereNull('suspended_at')
            ->chunkById(50, function ($lot) use (&$envoyes) {
                foreach ($lot as $salon) {
                    if ($this->dejaEnvoyeAujourdhui((int) $salon->owner_id)) {
                        continue;
                    }

                    $semaine = SalonPulseService::semaine($salon);
                    $alertes = SalonPulseService::alertes($salon);

                    $resume = $this->phrase($semaine, $alertes);
                    if ($resume === null) {
                        continue; // Rien à dire = rien envoyé.
                    }

                    NotificationService::sendTyped(
                        (int) $salon->owner_id,
                        'salon_weekly_pulse',
                        ['resume' => $resume],
                        NotificationCopy::AUDIENCE_SALON,
                        ['url' => '/business', 'salon_id' => $salon->id]
                    );
                    $envoyes++;
                }
            });

        $this->info("{$envoyes} pulse(s) salon envoyé(s).");
        return 0;
    }

    private function dejaEnvoyeAujourdhui(int $userId): bool
    {
        return Notification::where('user_id', $userId)
            ->where('type', 'salon_weekly_pulse')
            ->whereDate('created_at', now('Europe/Paris')->toDateString())
            ->exists();
    }

    /** La phrase du pulse — null quand la semaine n'a rien produit. */
    private function phrase(?array $semaine, array $alertes): ?string
    {
        $morceaux = [];

        if ($semaine && $semaine['avis'] > 0) {
            $texte = "{$semaine['avis']} avis cette semaine";
            if ($semaine['note'] !== null) {
                $note = number_format($semaine['note'], 1, ',', '');
                $texte .= ", note {$note}/5";
            }
            if ($semaine['top']) {
                $texte .= " — {$semaine['top']['nom']} en tête";
            }
            $morceaux[] = $texte . '.';
        }

        foreach ($alertes as $alerte) {
            if ($alerte['type'] === 'etoile') {
                $morceaux[] = "{$alerte['nom']} décolle ({$alerte['avis']} avis en 30 j).";
            } else {
                $morceaux[] = "{$alerte['nom']} n'a reçu aucun avis depuis 30 j — un point ensemble ?";
            }
            break; // Une seule alerte dans le push : la plus importante, pas une liste.
        }

        return $morceaux === [] ? null : implode(' ', $morceaux);
    }
}
