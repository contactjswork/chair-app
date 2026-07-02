<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateJobOffersTable extends Migration
{
    public function up()
    {
        Schema::create('job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained('salons')->onDelete('cascade');
            $table->string('title');
            $table->enum('job_type', ['hairdresser', 'colorist', 'barber', 'stylist', 'apprentice', 'other'])->default('hairdresser');
            $table->enum('contract_type', ['cdi', 'cdd', 'alternance', 'freelance'])->default('cdi');
            $table->text('description')->nullable();
            $table->string('city')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('job_offers');
    }
}
