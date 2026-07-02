<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddWorkAvailabilityToHairdresserProfiles extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->enum('work_availability', ['employed', 'looking_salon', 'looking_gig', 'not_available'])
                  ->default('employed')
                  ->after('work_address');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('work_availability');
        });
    }
}
