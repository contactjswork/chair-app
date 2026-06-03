<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddIsFeaturedToHairdresserProfiles extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        \DB::statement('ALTER TABLE hairdresser_profiles ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_verified');
    }

    public function down()
    {
        \DB::statement('ALTER TABLE hairdresser_profiles DROP COLUMN is_featured');
    }
}
