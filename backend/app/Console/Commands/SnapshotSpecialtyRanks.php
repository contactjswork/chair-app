<?php

namespace App\Console\Commands;

use App\Models\HairdresserProfile;
use App\Models\SpecialtyRankSnapshot;
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

                    foreach ($scopes as $scope) {
                        $geo = $scope['geo'];
                        $valeur = SpecialtyReputationService::geoValueFor($profile, $geo);

                        foreach (SpecialtyReputationService::publicHighlights($profile, false, $geo) as $h) {
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
                        }
                    }
                }
            });

        $this->info("{$ecrites} rang(s) enregistré(s) pour {$profils} coiffeur(s) — {$jour}.");
        return 0;
    }
}
