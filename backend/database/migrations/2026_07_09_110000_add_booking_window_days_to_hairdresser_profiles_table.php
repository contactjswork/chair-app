<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBookingWindowDaysToHairdresserProfilesTable extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            // null = illimité (comportement actuel, inchangé par défaut)
            $table->unsignedSmallInteger('booking_window_days')->nullable()->after('daily_appointment_goal');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('booking_window_days');
        });
    }
}
