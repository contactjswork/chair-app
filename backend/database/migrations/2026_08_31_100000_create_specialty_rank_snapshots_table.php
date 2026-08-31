<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * L'historique des classements, pour pouvoir montrer le MOUVEMENT.
 *
 * Un rang seul est une photo : « 6e sur 9 » se lit une fois, et n'a plus
 * rien à dire le lendemain. Ce qui ramène quelqu'un, c'est de le voir
 * bouger — « +2 places cette semaine ». Cette information n'existait nulle
 * part : le rang est recalculé à la volée à chaque affichage, sans jamais
 * être conservé, donc impossible de le comparer à quoi que ce soit.
 *
 * Une ligne par (coiffeur, spécialité, périmètre) et par jour de capture.
 * L'unicité empêche un double passage du planificateur de créer deux
 * mesures pour la même journée — ce qui fausserait la comparaison.
 *
 * `geo_value` est nullable : au périmètre national il n'y a rien à filtrer.
 * Il fait quand même partie de la clé d'unicité, car deux villes distinctes
 * donnent deux classements distincts pour la même spécialité.
 *
 * cascadeOnDelete : un coiffeur supprimé n'a plus d'historique à défendre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specialty_rank_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->cascadeOnDelete();
            $table->foreignId('specialty_id')->constrained('specialties')->cascadeOnDelete();
            $table->string('geo', 20);
            $table->string('geo_value', 100)->nullable();
            $table->unsignedInteger('rank');
            $table->unsignedInteger('total');
            $table->date('captured_on');
            $table->timestamps();

            // MySQL ignore les NULL dans un index unique : deux captures
            // nationales le même jour passeraient donc au travers. On stocke
            // 'FR' plutôt que NULL au niveau national (voir la commande) pour
            // que la contrainte joue vraiment.
            $table->unique(
                ['hairdresser_id', 'specialty_id', 'geo', 'geo_value', 'captured_on'],
                'srs_unique_capture'
            );

            // Lecture type : « la dernière capture de CE coiffeur, sur CETTE
            // spécialité, à CE périmètre ».
            $table->index(['hairdresser_id', 'specialty_id', 'geo', 'captured_on'], 'srs_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('specialty_rank_snapshots');
    }
};
