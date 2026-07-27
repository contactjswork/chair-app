<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hairdresser_specialty_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->foreignId('specialty_id')->constrained('specialties')->onDelete('cascade');
            $table->unsignedInteger('score')->default(0);
            $table->unsignedTinyInteger('level')->default(0);
            $table->unsignedInteger('posts_count')->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->decimal('avg_rating', 3, 2)->default(0);
            $table->unsignedInteger('visits_count')->default(0);
            $table->boolean('is_reference')->default(false);
            $table->timestamps();

            $table->unique(['hairdresser_id', 'specialty_id'], 'hsp_hairdresser_specialty_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hairdresser_specialty_progress');
    }
};
