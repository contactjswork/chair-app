<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateTrainingBadgesTable extends Migration
{
    public function up()
    {
        Schema::create('training_badges', function (Blueprint $table) {
            $table->id();
            $table->string('institution');
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('category', ['formation', 'certification'])->default('formation');
            $table->string('logo_url')->nullable();
            $table->timestamps();
        });

        Schema::create('hairdresser_training_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_profile_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->foreignId('training_badge_id')->constrained('training_badges')->onDelete('cascade');
            $table->smallInteger('year')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['hairdresser_profile_id', 'training_badge_id'], 'hdp_tb_unique');
        });

        // Catalogue initial des institutions
        $now = now();
        DB::table('training_badges')->insert([
            ['institution' => 'Toni & Guy',               'name' => 'Formé chez Toni & Guy',               'slug' => 'toni-guy',               'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => "L'Oréal Professionnel",    'name' => "Formé chez L'Oréal Professionnel",    'slug' => 'loreal-professionnel',   'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Wella',                    'name' => 'Formé chez Wella',                    'slug' => 'wella',                  'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Schwarzkopf Professional', 'name' => 'Formé chez Schwarzkopf Professional', 'slug' => 'schwarzkopf',            'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Dessange',                 'name' => 'Formé chez Dessange',                 'slug' => 'dessange',               'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Pivot Point',              'name' => 'Formé chez Pivot Point',              'slug' => 'pivot-point',            'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Kérastase',                'name' => 'Formé chez Kérastase',                'slug' => 'kerastase',              'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Redken',                   'name' => 'Formé chez Redken',                   'slug' => 'redken',                 'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Franck Provost',           'name' => 'Formé chez Franck Provost',           'slug' => 'franck-provost',         'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Jean-Louis David',         'name' => 'Formé chez Jean-Louis David',         'slug' => 'jean-louis-david',       'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Vidal Sassoon',            'name' => 'Formé chez Vidal Sassoon',            'slug' => 'vidal-sassoon',          'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Saint Algue',              'name' => 'Formé chez Saint Algue',              'slug' => 'saint-algue',            'category' => 'formation',      'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Wella',                    'name' => 'Certification Wella Color',           'slug' => 'wella-color-cert',       'category' => 'certification',  'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => "L'Oréal Professionnel",   'name' => "Certification L'Oréal Expert",        'slug' => 'loreal-expert-cert',     'category' => 'certification',  'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['institution' => 'Schwarzkopf Professional','name' => 'Certification Schwarzkopf',           'slug' => 'schwarzkopf-cert',       'category' => 'certification',  'logo_url' => null, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('hairdresser_training_badges');
        Schema::dropIfExists('training_badges');
    }
}
