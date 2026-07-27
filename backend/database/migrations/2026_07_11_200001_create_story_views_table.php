<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Dédie une vue par (story, spectateur) — sans ça, "views_count" ne
    // compterait que des rechargements, pas des spectateurs uniques. Détail
    // d'implémentation nécessaire pour que le compteur reste un vrai chiffre,
    // pas absent du schéma demandé, juste son mécanisme de fiabilité.
    public function up(): void
    {
        Schema::create('story_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained('stories')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['story_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('story_views');
    }
};
