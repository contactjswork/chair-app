<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddDailyAppointmentGoalToHairdresserProfiles extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->unsignedTinyInteger('daily_appointment_goal')->default(3);
        });
    }

    public function down()
    {
        DB::statement('ALTER TABLE hairdresser_profiles DROP COLUMN daily_appointment_goal');
    }
}
