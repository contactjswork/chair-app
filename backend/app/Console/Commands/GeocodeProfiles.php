<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\HairdresserProfile;
use App\Services\GeocodingService;

/**
 * Remplissage automatique des coordonnées GPS manquantes sur les profils coiffeurs.
 *
 * Usage :
 *   php artisan geocode:profiles           ← tous les profils sans lat/lng
 *   php artisan geocode:profiles --all     ← forcer la mise à jour de tous
 *   php artisan geocode:profiles --dry-run ← afficher sans modifier
 */
class GeocodeProfiles extends Command
{
    protected $signature   = 'geocode:profiles {--all : Forcer tous les profils} {--dry-run : Simulation sans modification}';
    protected $description = 'Géocode les profils coiffeurs qui n\'ont pas encore de coordonnées GPS';

    public function handle(): int
    {
        $forceAll = $this->option('all');
        $dryRun   = $this->option('dry-run');

        $query = HairdresserProfile::whereNotNull('city');

        if (!$forceAll) {
            $query->where(function ($q) {
                $q->whereNull('latitude')->orWhereNull('longitude');
            });
        }

        $profiles = $query->get();

        if ($profiles->isEmpty()) {
            $this->info('Aucun profil à géocoder.');
            return 0;
        }

        $this->info("Profils à traiter : {$profiles->count()}");
        $this->newLine();

        $updated = 0;
        $skipped = 0;
        $failed  = 0;

        foreach ($profiles as $profile) {
            $city = $profile->city;
            $result = GeocodingService::geocode($city);

            if ($result === null) {
                $this->line(" <comment>Ignoré</comment>  [{$profile->slug}] — ville inconnue : \"{$city}\"");
                $failed++;
                continue;
            }

            $this->line(
                " <info>OK</info>      [{$profile->slug}] {$city} → lat {$result['lat']}, lng {$result['lng']}" .
                ($dryRun ? ' (dry-run)' : '')
            );

            if (!$dryRun) {
                $profile->update([
                    'latitude'  => $result['lat'],
                    'longitude' => $result['lng'],
                ]);
                $updated++;
            } else {
                $updated++;
            }
        }

        $this->newLine();
        $this->info("Terminé — mis à jour : {$updated} | introuvables : {$failed}");

        if ($dryRun) {
            $this->warn('Mode dry-run : aucune modification enregistrée.');
        }

        return 0;
    }
}
