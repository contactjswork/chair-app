<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Promo flash sur les jours creux.
 *
 * Un coiffeur regarde son agenda, voit un jour vide, le brade : -X % sur
 * toutes ses prestations ce jour-là. La promo meurt d'elle-même quand le
 * jour est passé — aucune tâche de nettoyage, les lectures filtrent sur
 * date >= aujourd'hui.
 *
 * notified_at : les favoris/abonnés ne sont prévenus qu'UNE fois par promo
 * (drapeau posé avant l'envoi, même règle d'idempotence que partout).
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('flash_promos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->date('date');
            $table->unsignedTinyInteger('discount_percent');
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['hairdresser_id', 'date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('flash_promos');
    }
};
