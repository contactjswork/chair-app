<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Pourquoi as-tu installé CHAIR PRO ?" — réponse multi-choix collectée en
 * fin d'onboarding indépendant (find_clients/rent_chair/find_job), utilisée
 * uniquement pour mettre en avant les bons items de nav (useProNav.ts).
 * Nullable : les comptes existants et les salariés n'ont pas cette réponse.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->json('pro_goals')->nullable()->after('work_availability');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('pro_goals');
        });
    }
};
