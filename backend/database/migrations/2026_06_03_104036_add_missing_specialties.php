<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddMissingSpecialties extends Migration
{
    public function up()
    {
        $add = [
            ['name' => 'Barbe',           'slug' => 'barbe',           'category' => 'Homme'],
            ['name' => 'Coupe Courte',    'slug' => 'coupe-courte',    'category' => 'Coupe'],
            ['name' => 'Coupe Longue',    'slug' => 'coupe-longue',    'category' => 'Coupe'],
            ['name' => 'Kératine',        'slug' => 'keratine',        'category' => 'Texture'],
            ['name' => 'Ondulations',     'slug' => 'ondulations',     'category' => 'Texture'],
            ['name' => 'Frange',          'slug' => 'frange',          'category' => 'Coupe'],
            ['name' => 'Coiffure Soirée', 'slug' => 'coiffure-soiree', 'category' => 'Occasion'],
            ['name' => 'Dreads & Locks',  'slug' => 'dreads',          'category' => 'Style'],
            ['name' => 'Roux',            'slug' => 'roux',            'category' => 'Couleur'],
            ['name' => 'Couleur Homme',   'slug' => 'couleur-homme',   'category' => 'Couleur'],
        ];

        foreach ($add as $s) {
            if (!DB::table('specialties')->where('slug', $s['slug'])->exists()) {
                DB::table('specialties')->insert(array_merge($s, [
                    'icon'       => '',
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    public function down()
    {
        DB::table('specialties')->whereIn('slug', [
            'barbe','coupe-courte','coupe-longue','keratine','ondulations',
            'frange','coiffure-soiree','dreads','roux','couleur-homme',
        ])->delete();
    }
}
