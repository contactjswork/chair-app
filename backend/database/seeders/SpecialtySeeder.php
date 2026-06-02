<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Specialty;

class SpecialtySeeder extends Seeder
{
    public function run()
    {
        $specialties = [
            ['name' => 'Balayage',       'slug' => 'balayage',       'icon' => '', 'category' => 'Couleur'],
            ['name' => 'Blond',          'slug' => 'blond',          'icon' => '', 'category' => 'Couleur'],
            ['name' => 'Coloration',     'slug' => 'coloration',     'icon' => '', 'category' => 'Couleur'],
            ['name' => 'Ombré Hair',     'slug' => 'ombre-hair',     'icon' => '', 'category' => 'Couleur'],
            ['name' => 'Hair Contouring','slug' => 'hair-contouring','icon' => '', 'category' => 'Couleur'],
            ['name' => 'Coupe Femme',    'slug' => 'coupe-femme',    'icon' => '', 'category' => 'Coupe'],
            ['name' => 'Coupe Homme',    'slug' => 'coupe-homme',    'icon' => '', 'category' => 'Coupe'],
            ['name' => 'Barber',         'slug' => 'barber',         'icon' => '', 'category' => 'Coupe'],
            ['name' => 'Boucles',        'slug' => 'boucles',        'icon' => '', 'category' => 'Texture'],
            ['name' => 'Extensions',     'slug' => 'extensions',     'icon' => '', 'category' => 'Texture'],
            ['name' => 'Lissage',        'slug' => 'lissage',        'icon' => '', 'category' => 'Texture'],
            ['name' => 'Mariage',        'slug' => 'mariage',        'icon' => '', 'category' => 'Occasion'],
        ];

        foreach ($specialties as $s) {
            Specialty::firstOrCreate(
                ['slug' => $s['slug']],
                array_merge($s, ['is_active' => true])
            );
        }
    }
}
