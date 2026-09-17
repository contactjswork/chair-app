<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Stories éphémères retirées de toute l'app (décision Julien 17/09/2026 :
// « stories enlève de tout l'app ») — le partage se fait par lien natif
// uniquement (lib/partage.ts). Les médias Cloudinary restants expirent
// d'eux-mêmes : la purge tournait toutes les heures, il ne reste au pire
// que les stories des dernières 24 h, orphelines et inaccessibles.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('story_views');
        Schema::dropIfExists('stories');
    }

    public function down(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('media_url');
            $table->enum('type', ['image', 'video']);
            $table->unsignedInteger('video_duration_seconds')->nullable();
            $table->timestamp('expires_at');
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'expires_at']);
            $table->index('expires_at');
        });

        Schema::create('story_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained('stories')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['story_id', 'user_id']);
        });
    }
};
