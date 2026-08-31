<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La note privée d'un coiffeur sur un client.
 *
 * « Sensible du cuir chevelu », « préfère les ciseaux », « toujours en
 * retard de 10 min » — ce que le coiffeur sait et que l'agenda ne dit pas.
 * C'est le carnet du artisan, en numérique : STRICTEMENT privée, jamais
 * exposée au client ni à quiconque d'autre que son auteur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->cascadeOnDelete();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('note');
            $table->timestamps();

            $table->unique(['hairdresser_id', 'client_user_id'], 'client_note_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_notes');
    }
};
