<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('reason', 40);
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('chair_plus_days')->default(0);
            $table->unsignedInteger('boost_days')->default(0);
            $table->string('badge_code', 40)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'reason']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_rewards');
    }
};
