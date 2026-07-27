<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Historique horodaté des visites de profil public — jusqu'ici seul un
// compteur cumulatif existait (hairdresser_profiles.visits_count, qui en
// réalité compte des RDV terminés, pas des vues de page — nom trompeur mais
// hors scope ici). Sans historique par date, aucune vraie série "portée"
// n'est possible pour les analytics premium — juste un chiffre unique figé,
// exactement le type de donnée qu'on refuse d'inventer.
class CreateProfileViewsTable extends Migration
{
    public function up()
    {
        Schema::create('profile_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_profile_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['hairdresser_profile_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('profile_views');
    }
}
