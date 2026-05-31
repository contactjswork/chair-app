<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('client_name', 100);
            $table->string('client_email', 150);
            $table->string('client_phone', 30)->nullable();
            $table->string('service', 200);
            $table->date('desired_date');
            $table->string('desired_slot', 50); // Matin / Après-midi / Soir
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'declined', 'completed', 'cancelled'])
                  ->default('pending');
            $table->string('review_token', 64)->unique()->nullable();
            $table->boolean('review_unlocked')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
