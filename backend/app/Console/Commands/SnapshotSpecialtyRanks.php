<?php

namespace App\Console\Commands;

use App\Models\HairdresserProfile;
use App\Models\Notification;
use App\Models\SpecialtyRankSnapshot;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\SpecialtyReputationService;
use Illuminate\Console\Command;

/**
 * Fige les classements du jour, pour pouvoir montrer le mouvement.
 *
 * Usage : php artisan chair:snapshot-specialty-ranks
 * Planifiée le lundi (voir Console\Kernel) — une capture par semaine suffit,
 * et c'est aussi la granularité de la phrase affichée : « +2 places cette
 * semaine ».
 *
 * On ne capture que les périmètres qu'un coiffeur peut réellement choisir
 * dans l'app (SpecialtyReputationService::availableScopes). Capturer un
 * niveau qu'il ne verra jamais coûterait des requêtes pour rien.
 *
 * Idempotente : updateOrCreate sur la clé (coiffeur, spécialité, périmètre,
 * jour). Un planificateur qui la déclenche deux fois le même jour écrase la
 * mesure au lieu d'en créer une seconde — sans quoi la comparaison suivante
 * serait faussée.
 */
class SnapshotSpecialtyRanks extends Command
{
    protected $signature   = 'chair:snapshot-specialty-ranks';
    protected $description = 'Enregistre le rang de chaque coiffeur par spécialité et périmètre';

    public function handle(): int
    {
        $jour = now('Europe/Paris')->toDateString();
        $ecrites = 0;
        $profils = 0;

        HairdresserProfile::query()
            ->whereNotNull('city')
            ->chunkById(100, function ($lot) use ($jour, &$ecrites, &$profils) {
                foreach ($lot as $profile) {
                    $profils++;
                    $scopes = SpecialtyReputationService::availableScopes($profile);
                    // Le mouvement le plus marquant du coiffeur, toutes
                    // spécialités confondues — pour n'envoyer qu'UN push.
                    $meilleurMouvement = null;

                    foreach ($scopes as $scope) {
                        $geo = $scope['geo'];
                        $valeur = SpecialtyReputationService::geoValueFor($profile, $geo);

                        foreach (SpecialtyReputationService::publicHighlights($profile, true, $geo) as $h) {
                            if ($h['local_rank'] === null || $h['local_total'] === null) {
                                continue;
                            }

                            SpecialtyRankSnapshot::updateOrCreate(
                                [
                                    'hairdresser_id' => $profile->id,
                                    'specialty_id'   => $h['specialty_id'],
                                    'geo'            => $geo,
                                    // Jamais NULL : MySQL ignore les NULL dans un
                                    // index unique, la contrainte ne jouerait pas.
                                    'geo_value'      => $valeur ?? SpecialtyRankSnapshot::PAYS,
                                    'captured_on'    => $jour,
                                ],
                                [
                                    'rank'  => $h['local_rank'],
                                    'total' => $h['local_total'],
                                ]
                            );
                            $ecrites++;

                            // rankDelta compare au dernier instantané
                            // STRICTEMENT antérieur à aujourd'hui : l'ordre
                            // écrire/comparer est donc sans effet. On ne pousse
                            // que sur le périmètre ville — celui que le
                            // coiffeur voit par défaut ; un push par périmètre
                            // serait du spam.
                            $delta = $h['rank_delta'] ?? null;
                            if ($geo === 'city' && $delta !== null && $delta !== 0) {
                                if ($meilleurMouvement === null || abs($delta) > abs($meilleurMouvement['delta'])) {
                                    $meilleurMouvement = [
                                        'delta'      => $delta,
                                        'specialite' => $h['specialty_name'] ?? 'votre spécialité',
                                        'rang'       => $h['local_rank'],
                                        'total'      => $h['local_total'],
                                        'zone'       => $valeur ?? 'votre ville',
                                    ];
                                }
                            }
                        }
                    }

                    $this->notifierMouvement($profile, $meilleurMouvement);
                }
            });

        $this->info("{$ecrites} rang(s) enregistré(s) pour {$profils} coiffeur(s) — {$jour}.");
        return 0;
    }

    /**
     * Un seul push par coiffeur et par capture : son plus grand mouvement.
     * La montée se savoure, la descente appelle une réaction — les deux font
     * ouvrir l'app, donc on envoie les deux. Idempotent par jour : un
     * planificateur qui rejoue la capture ne renvoie pas le push.
     */
    private function notifierMouvement(HairdresserProfile $profile, ?array $m): void
    {
        if ($m === null || !$profile->user_id) {
            return;
        }

        $dejaNotifie = Notification::where('user_id', $profile->user_id)
            ->where('type', 'rank_moved')
            ->whereDate('created_at', now('Europe/Paris')->toDateString())
            ->exists();
        if ($dejaNotifie) {
            return;
        }

        $delta = (int) $m['delta'];
        $libelle = $delta > 0
            ? '+' . $delta . ' place' . ($delta > 1 ? 's' : '')
            : $delta . ' place' . ($delta < -1 ? 's' : '');

        NotificationService::sendTyped(
            (int) $profile->user_id,
            'rank_moved',
            [
                'delta'      => $libelle,
                'specialite' => (string) $m['specialite'],
                'rang'       => $m['rang'] . ((int) $m['rang'] === 1 ? 'er' : 'e'),
                'total'      => (string) $m['total'],
                'zone'       => (string) $m['zone'],
            ],
            NotificationCopy::AUDIENCE_PRO,
            ['url' => '/pro/classements']
        );
    }
}
