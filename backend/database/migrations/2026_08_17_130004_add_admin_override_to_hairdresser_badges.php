<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Attribution manuelle d'un badge par un admin (AdminUserController::assignBadge).
 * Les badges sont normalement calculés à la volée par
 * BadgeService::isBadgeUnlocked() à partir de vraies données (posts, avis,
 * abonnés...) — hairdresser_badges ne fait que persister LA DATE de premier
 * déblocage. is_admin_override permet à l'admin de forcer un badge visible
 * même si la condition calculée n'est pas remplie (ex: badge exceptionnel
 * décidé éditorialement) — voir BadgeService::isEffectivelyUnlocked().
 * awarded_by_admin_id = traçabilité en plus de admin_audit_logs (celui qui
 * a réellement posé la ligne, consultable même si le log est purgé un jour).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_badges', function (Blueprint $table) {
            $table->boolean('is_admin_override')->default(false)->after('badge_code');
            $table->foreignId('awarded_by_admin_id')->nullable()->after('is_admin_override')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_badges', function (Blueprint $table) {
            $table->dropConstrainedForeignId('awarded_by_admin_id');
            $table->dropColumn('is_admin_override');
        });
    }
};
