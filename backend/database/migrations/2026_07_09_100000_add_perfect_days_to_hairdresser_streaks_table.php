<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPerfectDaysToHairdresserStreaksTable extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_streaks', function (Blueprint $table) {
            $table->unsignedInteger('perfect_days_count')->default(0)->after('total_active_days');
            $table->date('last_perfect_date')->nullable()->after('perfect_days_count');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_streaks', function (Blueprint $table) {
            $table->dropColumn(['perfect_days_count', 'last_perfect_date']);
        });
    }
}
