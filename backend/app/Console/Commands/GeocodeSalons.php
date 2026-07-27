<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Salon;
use App\Services\GeocodingService;

/**
 * Remplissage des coordonnées GPS manquantes sur les salons (centroïde ville).
 *
 * Même logique que geocode:profiles — précision au niveau de la ville, PAS de
 * l'adresse. Quand les salons auront une vraie adresse renseignée, passer sur
 * un géocodage adresse (API BAN adresse.data.gouv.fr, gratuite, sans clé).
 *
 * Usage :
 *   php artisan geocode:salons           ← salons sans lat/lng
 *   php artisan geocode:salons --all     ← forcer tous les salons
 *   php artisan geocode:salons --dry-run ← simulation
 */
class GeocodeSalons extends Command
{
    protected $signature   = 'geocode:salons {--all : Forcer tous les salons} {--dry-run : Simulation sans modification}';
    protected $description = 'Géocode les salons qui n\'ont pas encore de coordonnées GPS';

    public function handle(): int
    {
        $forceAll = $this->option('all');
        $dryRun   = $this->option('dry-run');

        $query = Salon::whereNotNull('city');

        if (!$forceAll) {
            $query->where(function ($q) {
                $q->whereNull('latitude')->orWhereNull('longitude');
            });
        }

        $salons = $query->get();

        if ($salons->isEmpty()) {
            $this->info('Aucun salon à géocoder.');
            return 0;
        }

        $this->info("Salons à traiter : {$salons->count()}");
        $this->newLine();

        $updated = 0;
        $failed  = 0;

        foreach ($salons as $salon) {
            $result = GeocodingService::geocode($salon->city);

            if ($result === null) {
                $this->line(" <comment>Ignoré</comment>  [{$salon->slug}] — ville inconnue : \"{$salon->city}\"");
                $failed++;
                continue;
            }

            $this->line(
                " <info>OK</info>      [{$salon->slug}] {$salon->city} → lat {$result['lat']}, lng {$result['lng']}" .
                ($dryRun ? ' (dry-run)' : '')
            );

            if (!$dryRun) {
                $salon->update([
                    'latitude'  => $result['lat'],
                    'longitude' => $result['lng'],
                ]);
            }
            $updated++;
        }

        $this->newLine();
        $this->info("Terminé — mis à jour : {$updated} | introuvables : {$failed}");

        if ($dryRun) {
            $this->warn('Mode dry-run : aucune modification enregistrée.');
        }

        return 0;
    }
}
