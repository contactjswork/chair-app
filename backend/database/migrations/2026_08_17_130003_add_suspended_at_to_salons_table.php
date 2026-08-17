<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suspension admin d'un salon (module Salons, jusqu'ici inexistant côté
 * admin — voir rapport). Même pattern que users.suspended_at : HORS
 * $fillable (jamais modifiable via SalonController::updateMySalon, le
 * gérant ne doit jamais pouvoir se suspendre/désuspendre lui-même),
 * uniquement via AdminSalonController. Un salon suspendu disparaît du
 * listing public (SalonController::index/show) mais son équipe et ses
 * données restent intactes — pas un delete, voir contrainte "jamais de
 * hard delete silencieux".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable()->after('verification_status');
            $table->string('suspended_reason')->nullable()->after('suspended_at');
        });
    }

    public function down(): void
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->dropColumn(['suspended_at', 'suspended_reason']);
        });
    }
};
