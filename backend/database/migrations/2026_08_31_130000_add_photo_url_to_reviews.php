<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La photo du résultat, jointe à l'avis.
 *
 * Un avis 5 étoiles dit « c'était bien » ; un avis avec la photo du résultat
 * le PROUVE — et alimente en même temps la crédibilité du coiffeur. C'est le
 * contenu le plus convaincant qu'une marketplace beauté puisse afficher.
 *
 * Réservée aux avis issus d'une visite vérifiée (flux de scan) : la photo
 * engage l'image du coiffeur, elle n'accompagne que les avis dont on sait
 * qu'ils viennent d'un vrai passage. Une seule photo — un avis n'est pas
 * une galerie.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('photo_url', 500)->nullable()->after('comment');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('photo_url');
        });
    }
};
