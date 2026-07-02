<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChairRentalRequestsTable extends Migration
{
    public function up()
    {
        Schema::create('chair_rental_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chair_rental_id')->constrained('chair_rentals')->onDelete('cascade');
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->timestamps();

            $table->unique(['chair_rental_id', 'hairdresser_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('chair_rental_requests');
    }
}
