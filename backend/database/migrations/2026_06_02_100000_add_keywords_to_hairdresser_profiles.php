<?php

use Illuminate\Database\Migrations\Migration;

class AddKeywordsToHairdresserProfiles extends Migration
{
    public function up()
    {
        \DB::statement("ALTER TABLE hairdresser_profiles ADD COLUMN keywords TEXT NULL AFTER tiktok_url");
    }

    public function down()
    {
        \DB::statement("ALTER TABLE hairdresser_profiles DROP COLUMN keywords");
    }
}
