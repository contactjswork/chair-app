<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddChairScoreAndLevelToHairdresserProfiles extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->unsignedInteger('chair_score')->default(0);
            $table->unsignedTinyInteger('chair_level')->default(0);
        });
    }

    public function down()
    {
        // Pas de doctrine/dbal (PHP 8.0 / Laravel 8) — DROP COLUMN direct
        DB::statement('ALTER TABLE hairdresser_profiles DROP COLUMN chair_score');
        DB::statement('ALTER TABLE hairdresser_profiles DROP COLUMN chair_level');
    }
}
