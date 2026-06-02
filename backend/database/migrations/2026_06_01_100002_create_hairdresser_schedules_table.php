<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // day_of_week: 0=Dimanche, 1=Lundi, ..., 6=Samedi (PHP date('w') convention)
        Schema::create('hairdresser_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->unsignedTinyInteger('day_of_week'); // 0-6
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
            $table->boolean('is_open')->default(true);
            $table->timestamps();

            $table->unique(['hairdresser_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hairdresser_schedules');
    }
};
