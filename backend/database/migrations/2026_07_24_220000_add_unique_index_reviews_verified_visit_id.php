<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le "un seul avis par visite vérifiée" n'était garanti qu'au niveau
 * applicatif (VisitController::submitReview vérifie ->exists() avant
 * d'insérer) — deux requêtes quasi simultanées pouvaient toutes les deux
 * passer ce contrôle avant qu'aucune n'ait committé. NULL reste autorisé en
 * plusieurs exemplaires (avis non issus d'une visite QR).
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->unique('verified_visit_id');
        });
    }

    public function down()
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique(['verified_visit_id']);
        });
    }
};
