<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // doctrine/dbal incompatible PHP 8.0 → DB::statement
        DB::statement('ALTER TABLE hairdresser_profiles ADD COLUMN visits_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER reviews_count');

        // Backfill : visites = nombre de rendez-vous terminés par coiffeur
        DB::statement('
            UPDATE hairdresser_profiles hp
            SET hp.visits_count = (
                SELECT COUNT(*)
                FROM appointments a
                WHERE a.hairdresser_id = hp.id
                  AND a.status = \'completed\'
            )
        ');

        // Backfill service_categories.visits_count = somme des visits_count de leurs services
        // (cohérent avec l'incrémentation faite à la création du RDV)
        DB::statement('
            UPDATE service_categories sc
            SET sc.visits_count = (
                SELECT COALESCE(SUM(s.visits_count), 0)
                FROM services s
                WHERE s.category_id = sc.id
            )
        ');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE hairdresser_profiles DROP COLUMN visits_count');
        // On ne réinitialise pas service_categories (pas destructeur)
    }
};
