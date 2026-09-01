<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use Illuminate\Console\Command;

/**
 * Le rappel de coupe — la boucle qui ramène le client.
 *
 * Usage : php artisan chair:send-rebook-reminders
 * Planifiée chaque jour à 11h (voir Console\Kernel) : ni au réveil, ni le
 * soir — le moment où l'on planifie sa semaine sans être dérangé.
 *
 * « Ça fait N semaines depuis ta visite chez Julien. » L'app connaît la date
 * du dernier rendez-vous terminé et, quand l'historique le permet, le rythme
 * réel du client chez CE coiffeur. Ce rappel remplit l'agenda du coiffeur
 * sans qu'il lève le petit doigt — c'est la fonctionnalité qui rend CHAIR
 * utile des deux côtés à la fois.
 *
 * C'est aussi le seul push commercial de l'app côté client, donc les
 * garde-fous comptent plus que la fonctionnalité :
 * - un seul rappel par rendez-vous terminé, jamais répété (rebook_reminded_at,
 *   flagué AVANT l'envoi — un cron qui rejoue perd un rappel, n'en double pas) ;
 * - jamais si le client a déjà un rendez-vous à venir, chez qui que ce soit :
 *   lui proposer de re-réserver alors qu'il a déjà réservé, c'est du spam ;
 * - le rythme est borné entre 3 et 12 semaines. En dessous, on harcèle ;
 *   au-delà, le client est parti et un push ne le ramènera pas.
 */
class SendRebookReminders extends Command
{
    protected $signature   = 'chair:send-rebook-reminders';
    protected $description = 'Rappelle aux clients de reprendre rendez-vous, au rythme réel de chacun';

    /** Rythme par défaut quand un seul rendez-vous : six semaines. */
    private const RYTHME_DEFAUT_JOURS = 42;
    private const RYTHME_MIN_JOURS = 21;
    private const RYTHME_MAX_JOURS = 84;

    public function handle(): int
    {
        $envoyes = 0;

        // Le dernier rendez-vous terminé de chaque couple (client, coiffeur)
        // pas encore rappelé. La jointure sur MAX(id) évite de rappeler pour
        // un rendez-vous ancien quand un plus récent existe.
        $derniers = Appointment::query()
            ->whereIn('id', function ($q) {
                $q->selectRaw('MAX(id)')
                    ->from('appointments')
                    ->where('status', 'completed')
                    ->whereNotNull('client_id')
                    ->groupBy('client_id', 'hairdresser_id');
            })
            ->whereNull('rebook_reminded_at')
            ->with(['hairdresser.user'])
            ->get();

        foreach ($derniers as $rdv) {
            $dateRdv = $rdv->appointment_date ? \Carbon\Carbon::parse($rdv->appointment_date) : null;
            if (!$dateRdv) {
                continue;
            }

            $rythme = $this->rythmeJours((int) $rdv->client_id, (int) $rdv->hairdresser_id);
            $ecart = (int) $dateRdv->diffInDays(now('Europe/Paris'));
            if ($ecart < $rythme) {
                continue;
            }
            // Trop vieux : le client est parti, un push ne le ramènera pas —
            // il le marquerait surtout comme du spam.
            if ($ecart > self::RYTHME_MAX_JOURS + 30) {
                $rdv->forceFill(['rebook_reminded_at' => now()])->save();
                continue;
            }

            // Déjà un rendez-vous à venir, chez qui que ce soit : on se tait.
            $aDejaReserve = Appointment::where('client_id', $rdv->client_id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereDate('appointment_date', '>=', now('Europe/Paris')->toDateString())
                ->exists();
            if ($aDejaReserve) {
                continue;
            }

            // Flag avant envoi : on perd au pire UN rappel, on n'en double jamais.
            $rdv->forceFill(['rebook_reminded_at' => now()])->save();

            $slug = $rdv->hairdresser->slug ?? null;
            NotificationService::sendTyped(
                (int) $rdv->client_id,
                'rebook_reminder',
                [
                    'semaines' => (string) max(1, intdiv($ecart, 7)),
                    'coiffeur' => $rdv->hairdresser->user->name ?? 'ton coiffeur',
                ],
                NotificationCopy::AUDIENCE_CLIENT,
                ['url' => $slug ? "/app/coiffeur/{$slug}" : '/app']
            );
            $envoyes++;
        }

        $this->info("{$envoyes} rappel(s) de re-réservation envoyé(s).");
        return 0;
    }

    /**
     * Le rythme réel du client chez ce coiffeur : l'écart moyen entre ses
     * rendez-vous terminés, borné. Avec un seul rendez-vous, six semaines.
     */
    private function rythmeJours(int $clientId, int $hairdresserId): int
    {
        // Le rythme réglé PAR le coiffeur pour ce client (fiche client,
        // 01/09/2026) est prioritaire sur la moyenne calculée : « ses
        // racines, c'est toutes les 6 semaines » sait mieux qu'une moyenne.
        // Volontairement hors bornes MIN/MAX automatiques : un choix humain
        // explicite (2 à 26 semaines validées à l'écriture) n'a pas à être
        // corrigé par la machine.
        $regle = \App\Models\ClientNote::where('hairdresser_id', $hairdresserId)
            ->where('client_user_id', $clientId)
            ->value('rebook_weeks');
        if ($regle) {
            return (int) $regle * 7;
        }

        $dates = Appointment::where('client_id', $clientId)
            ->where('hairdresser_id', $hairdresserId)
            ->where('status', 'completed')
            ->whereNotNull('appointment_date')
            ->orderBy('appointment_date')
            ->pluck('appointment_date')
            ->map(fn ($d) => \Carbon\Carbon::parse($d));

        if ($dates->count() < 2) {
            return self::RYTHME_DEFAUT_JOURS;
        }

        $ecarts = [];
        for ($i = 1; $i < $dates->count(); $i++) {
            $ecarts[] = $dates[$i - 1]->diffInDays($dates[$i]);
        }
        $moyen = (int) round(array_sum($ecarts) / count($ecarts));

        return max(self::RYTHME_MIN_JOURS, min(self::RYTHME_MAX_JOURS, $moyen));
    }
}
