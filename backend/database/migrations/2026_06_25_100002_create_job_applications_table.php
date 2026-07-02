<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateJobApplicationsTable extends Migration
{
    public function up()
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_offer_id')->constrained('job_offers')->onDelete('cascade');
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'viewed', 'accepted', 'declined'])->default('pending');
            $table->timestamps();

            $table->unique(['job_offer_id', 'hairdresser_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('job_applications');
    }
}
