<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Masquer" un profil coiffeur (admin, modération) — distinct de la
 * suspension du compte utilisateur (users.suspended_at, qui bloque aussi la
 * connexion) : is_hidden retire uniquement le profil des listings publics
 * pendant qu'une éventuelle discussion/enquête est en cours, sans couper
 * l'accès au compte. Volontairement HORS $fillable (comme suspended_at sur
 * users) — jamais modifiable via ProfileController::update (mass-assignment
 * du coiffeur lui-même), uniquement via AdminHairdresserController.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->boolean('is_hidden')->default(false)->after('is_verified');
            $table->string('hidden_reason')->nullable()->after('is_hidden');
            $table->timestamp('hidden_at')->nullable()->after('hidden_reason');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn(['is_hidden', 'hidden_reason', 'hidden_at']);
        });
    }
};
