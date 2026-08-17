<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'audit immuable (pas d'updated_at — une entrée ne se modifie
 * jamais). Voir App\Services\AdminAuditLogger::log() pour l'écriture.
 * resource_id est une string pour rester générique (id numérique d'un
 * user/review/... OU clé texte d'un app_setting/feature_flag).
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('action');
            $table->string('resource_type')->nullable();
            $table->string('resource_id')->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['resource_type', 'resource_id']);
            $table->index('admin_id');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_audit_logs');
    }
};
