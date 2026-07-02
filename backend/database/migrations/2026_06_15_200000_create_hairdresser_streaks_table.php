<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateHairdresserStreaksTable extends Migration
{
    public function up()
    {
        Schema::create('hairdresser_streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->unique()->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->unsignedSmallInteger('current_streak')->default(0);
            $table->unsignedSmallInteger('longest_streak')->default(0);
            $table->unsignedSmallInteger('weekly_streak')->default(0); // semaines consécutives actives
            $table->unsignedInteger('total_active_days')->default(0);
            $table->date('last_activity_date')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('hairdresser_streaks');
    }
}
