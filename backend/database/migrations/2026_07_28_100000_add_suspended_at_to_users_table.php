<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// AdminController::suspendUser()/unsuspendUser() référencent users.suspended_at
// depuis longtemps, mais aucune migration ne créait réellement la colonne —
// le champ était silencieusement ignoré (absent de $fillable), masquant le
// fait qu'il n'existait même pas en base. Voir aussi EnsureNotSuspended.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable()->after('active_pro_mode');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('suspended_at');
        });
    }
};
