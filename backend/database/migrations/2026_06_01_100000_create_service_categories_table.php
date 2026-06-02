<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->unsignedInteger('visits_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_categories');
    }
};
