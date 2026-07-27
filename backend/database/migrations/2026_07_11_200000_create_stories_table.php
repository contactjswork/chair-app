<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('media_url');
            $table->enum('type', ['image', 'video']);
            $table->timestamp('expires_at');
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'expires_at']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
