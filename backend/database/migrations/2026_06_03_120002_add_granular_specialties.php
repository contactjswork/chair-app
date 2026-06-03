<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddGranularSpecialties extends Migration
{
    public function up()
    {
        $now = now();

        // Techniques Barber granulaires — ajoutées si absentes
        $barberTags = [
            ['name' => 'Taper',     'slug' => 'taper',     'category' => 'Coupe',   'icon' => '✂️'],
            ['name' => 'Fade',      'slug' => 'fade',      'category' => 'Coupe',   'icon' => '✂️'],
            ['name' => 'Dégradé',   'slug' => 'degrade',   'category' => 'Coupe',   'icon' => '✂️'],
            ['name' => 'Buzz Cut',  'slug' => 'buzz-cut',  'category' => 'Coupe',   'icon' => '✂️'],
            ['name' => 'Braid',     'slug' => 'braid',     'category' => 'Texture', 'icon' => '💎'],
            ['name' => 'Chignon',   'slug' => 'chignon',   'category' => 'Texture', 'icon' => '💎'],
            ['name' => 'Tie & Dye', 'slug' => 'tie-dye',   'category' => 'Couleur', 'icon' => '🎨'],
        ];

        foreach ($barberTags as $tag) {
            DB::table('specialties')->insertOrIgnore(array_merge($tag, [
                'is_active'  => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }
    }

    public function down()
    {
        DB::table('specialties')->whereIn('slug', [
            'taper', 'fade', 'degrade', 'buzz-cut', 'braid', 'chignon', 'tie-dye',
        ])->delete();
    }
}
