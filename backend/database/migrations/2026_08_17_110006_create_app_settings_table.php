<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Schéma seul — le CRUD admin (endpoints, page frontend section 24) est
 * laissé à l'agent suivant. 'group' suit les sections voulues par Julien :
 * general|recherche|home|gamification|professionnels|moderation.
 * 'value' et 'default_value' sont stockés en JSON pour rester génériques
 * quel que soit 'type' (string|integer|float|boolean|json) — le cast
 * Eloquent 'array' fonctionne aussi sur un JSON scalaire (json_decode ne
 * force pas un tableau). Historique des changements : réutilise
 * admin_audit_logs (resource_type='app_setting', resource_id=key) plutôt
 * qu'une table dédiée — voir rapport pour la justification.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->string('group')->default('general');
            $table->string('type')->default('string');
            $table->decimal('min', 12, 2)->nullable();
            $table->decimal('max', 12, 2)->nullable();
            $table->json('default_value')->nullable();
            $table->string('description')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('app_settings');
    }
};
