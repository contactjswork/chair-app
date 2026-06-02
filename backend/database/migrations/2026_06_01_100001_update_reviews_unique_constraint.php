<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL ne permet pas de supprimer un index UNIQUE utilisé par une FK
        // sans avoir un autre index sur ces colonnes.
        // On crée d'abord des index simples sur hairdresser_id et client_id,
        // puis on supprime le UNIQUE composite.
        DB::statement('ALTER TABLE reviews ADD INDEX idx_reviews_hairdresser (hairdresser_id)');
        DB::statement('ALTER TABLE reviews ADD INDEX idx_reviews_client (client_id)');
        DB::statement('ALTER TABLE reviews DROP INDEX reviews_hairdresser_id_client_id_unique');

        // 1 avis max par rendez-vous (MySQL ignore les NULL dans UNIQUE).
        DB::statement('ALTER TABLE reviews ADD UNIQUE INDEX reviews_appointment_id_unique (appointment_id)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE reviews DROP INDEX reviews_appointment_id_unique');
        DB::statement('ALTER TABLE reviews ADD UNIQUE INDEX reviews_hairdresser_id_client_id_unique (hairdresser_id, client_id)');
        DB::statement('ALTER TABLE reviews DROP INDEX idx_reviews_hairdresser');
        DB::statement('ALTER TABLE reviews DROP INDEX idx_reviews_client');
    }
};
