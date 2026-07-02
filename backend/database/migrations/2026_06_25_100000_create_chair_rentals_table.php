<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChairRentalsTable extends Migration
{
    public function up()
    {
        Schema::create('chair_rentals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('price_per_day',   8, 2)->nullable();
            $table->decimal('price_per_week',  8, 2)->nullable();
            $table->decimal('price_per_month', 8, 2)->nullable();
            $table->json('available_days')->nullable(); // [1,2,3,4,5] (1=Mon…7=Sun)
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('equipment')->nullable();      // équipements inclus
            $table->text('conditions')->nullable();     // conditions spéciales
            $table->enum('status', ['available', 'rented', 'disabled'])->default('available');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('chair_rentals');
    }
}
