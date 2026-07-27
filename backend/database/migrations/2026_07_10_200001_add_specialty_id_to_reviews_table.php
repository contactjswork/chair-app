<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->foreignId('specialty_id')->nullable()->after('appointment_id')
                ->constrained('specialties')->nullOnDelete();
        });

        // Backfill : hérite la spécialité du service du rendez-vous, quand connu.
        DB::statement('
            UPDATE reviews r
            JOIN appointments a ON a.id = r.appointment_id
            JOIN services s ON s.id = a.service_id
            SET r.specialty_id = s.specialty_id
            WHERE r.specialty_id IS NULL AND s.specialty_id IS NOT NULL
        ');
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['specialty_id']);
            $table->dropColumn('specialty_id');
        });
    }
};
