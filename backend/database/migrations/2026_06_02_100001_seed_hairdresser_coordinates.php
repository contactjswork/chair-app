<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute des coordonnées GPS réalistes aux coiffeurs seedés.
 * N'écrase pas les coiffeurs qui ont déjà des coordonnées.
 */
class SeedHairdresserCoordinates extends Migration
{
    public function up()
    {
        $coords = [
            'sophie-martin' => ['lat' => 48.5734, 'lng' => 7.7521],  // Strasbourg centre
            'lucas-bernard' => ['lat' => 48.5884, 'lng' => 7.7651],  // Strasbourg Cronenbourg
            'amara-diallo'  => ['lat' => 48.8566, 'lng' => 2.3522],  // Paris centre
            'clara-petit'   => ['lat' => 45.7640, 'lng' => 4.8357],  // Lyon
            'mehdi-razzouk' => ['lat' => 48.0793, 'lng' => 7.3585],  // Colmar
        ];

        foreach ($coords as $slug => $c) {
            DB::table('hairdresser_profiles')
                ->where('slug', $slug)
                ->whereNull('latitude')
                ->update(['latitude' => $c['lat'], 'longitude' => $c['lng']]);
        }
    }

    public function down()
    {
        $slugs = ['sophie-martin', 'lucas-bernard', 'amara-diallo', 'clara-petit', 'mehdi-razzouk'];
        DB::table('hairdresser_profiles')
            ->whereIn('slug', $slugs)
            ->update(['latitude' => null, 'longitude' => null]);
    }
}
