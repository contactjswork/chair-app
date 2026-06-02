<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSalonJoinRequestsTable extends Migration
{
    public function up()
    {
        Schema::create('salon_join_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->foreignId('salon_id')->constrained('salons')->onDelete('cascade');
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->text('message')->nullable();
            $table->timestamps();

            $table->unique(['hairdresser_id', 'salon_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('salon_join_requests');
    }
}
