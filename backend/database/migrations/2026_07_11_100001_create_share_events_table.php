<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('share_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('action_type', 40);
            $table->string('target_type', 40)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('channel', 20)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'action_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('share_events');
    }
};
