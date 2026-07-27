<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateHairdresserBadgesTable extends Migration
{
    public function up()
    {
        Schema::create('hairdresser_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_profile_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->string('badge_code');
            $table->timestamp('unlocked_at')->useCurrent();

            $table->unique(['hairdresser_profile_id', 'badge_code'], 'hdp_badge_unique');
        });
    }

    public function down()
    {
        Schema::dropIfExists('hairdresser_badges');
    }
}
