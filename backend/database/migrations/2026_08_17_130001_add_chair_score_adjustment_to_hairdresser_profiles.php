<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Correction manuelle de points (admin) — voir AdminUserController::adjustPoints().
 * Stockée séparément de hairdresser_profiles.chair_score (recalculé en
 * permanence par BadgeService::refresh()/computePoints() depuis les
 * badges/spécialités) pour ne PAS être écrasée au prochain refresh : le
 * total affiché est toujours careerPoints + specialtyAggregate +
 * chair_score_adjustment (voir BadgeService). Signée (contrairement à
 * chair_score qui est unsignedInteger) pour permettre un retrait de points,
 * clampée à 0 avant persistance dans chair_score.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->integer('chair_score_adjustment')->default(0)->after('chair_level');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('chair_score_adjustment');
        });
    }
};
