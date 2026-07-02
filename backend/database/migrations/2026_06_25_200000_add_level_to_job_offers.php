<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        // level déjà ajoutée par la tentative précédente avortée — on s'assure juste qu'elle existe
        if (!Schema::hasColumn('job_offers', 'level')) {
            Schema::table('job_offers', function (Blueprint $table) {
                $table->enum('level', ['cap1', 'cap2', 'bp1', 'bp2', 'bm_bts1', 'bm_bts2'])
                      ->nullable()
                      ->after('job_type');
            });
        }

        // Ajouter 'apprentissage' à l'enum contract_type
        DB::statement("ALTER TABLE job_offers MODIFY COLUMN contract_type ENUM('cdi','cdd','alternance','apprentissage','freelance') NOT NULL DEFAULT 'cdi'");
    }

    public function down(): void
    {
        DB::statement("UPDATE job_offers SET contract_type = 'alternance' WHERE contract_type = 'apprentissage'");
        DB::statement("ALTER TABLE job_offers MODIFY COLUMN contract_type ENUM('cdi','cdd','alternance','freelance') NOT NULL DEFAULT 'cdi'");

        if (Schema::hasColumn('job_offers', 'level')) {
            Schema::table('job_offers', function (Blueprint $table) {
                $table->dropColumn('level');
            });
        }
    }
};
