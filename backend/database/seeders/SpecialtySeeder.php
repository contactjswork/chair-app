<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Specialty;

class SpecialtySeeder extends Seeder
{
    public function run()
    {
        $specialties = [
            // ── HOMME (6) ──────────────────────────────────────────
            ['name' => 'Barber',          'slug' => 'barber',        'icon' => '', 'category' => 'Homme'],
            ['name' => 'Coupe Classique', 'slug' => 'coupe-homme',   'icon' => '', 'category' => 'Homme'],
            ['name' => 'Cheveux Longs',   'slug' => 'coupe-longue',  'icon' => '', 'category' => 'Homme'],
            ['name' => 'Barbe',           'slug' => 'barbe',         'icon' => '', 'category' => 'Homme'],
            ['name' => 'Couleur Créative','slug' => 'couleur-homme', 'icon' => '', 'category' => 'Homme'],
            ['name' => 'Dreads & Locks',  'slug' => 'dreads',        'icon' => '', 'category' => 'Homme'],

            // ── FEMME (6) ──────────────────────────────────────────
            ['name' => 'Balayage',        'slug' => 'balayage',      'icon' => '', 'category' => 'Femme'],
            ['name' => 'Coupe & Frange',  'slug' => 'coupe-femme',   'icon' => '', 'category' => 'Femme'],
            ['name' => 'Boucles',         'slug' => 'boucles',       'icon' => '', 'category' => 'Femme'],
            ['name' => 'Lissage',         'slug' => 'lissage',       'icon' => '', 'category' => 'Femme'],
            ['name' => 'Coloration',      'slug' => 'coloration',    'icon' => '', 'category' => 'Femme'],
            ['name' => 'Chignon & Soirée','slug' => 'chignon',       'icon' => '', 'category' => 'Femme'],

            // ── LEGACY (gardés pour compatibilité) ────────────────
            ['name' => 'Blond',           'slug' => 'blond',         'icon' => '', 'category' => 'Femme'],
            ['name' => 'Ombré Hair',      'slug' => 'ombre-hair',    'icon' => '', 'category' => 'Femme'],
            ['name' => 'Extensions',      'slug' => 'extensions',    'icon' => '', 'category' => 'Femme'],
            ['name' => 'Mariage',         'slug' => 'mariage',       'icon' => '', 'category' => 'Occasion'],
        ];

        foreach ($specialties as $s) {
            Specialty::firstOrCreate(
                ['slug' => $s['slug']],
                array_merge($s, ['is_active' => true])
            );
        }
    }
}
