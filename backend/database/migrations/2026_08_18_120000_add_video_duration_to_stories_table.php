<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            // Durée déclarée côté client (mesurée via onLoadedMetadata) — même
            // limite que le portfolio (15s max), validée aussi côté serveur
            // dans StoryController::store. Nullable : les stories image n'ont
            // pas de durée, et les anciennes stories vidéo créées avant ce
            // champ n'en ont pas non plus.
            $table->unsignedInteger('video_duration_seconds')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn('video_duration_seconds');
        });
    }
};
