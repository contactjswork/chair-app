<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class MakeCityNullableInHairdresserProfiles extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        \Illuminate\Support\Facades\DB::statement(
            'ALTER TABLE hairdresser_profiles MODIFY city VARCHAR(100) NULL'
        );
        // Nettoyer les chaînes vides héritées de la config non-nullable
        \Illuminate\Support\Facades\DB::statement(
            "UPDATE hairdresser_profiles SET city = NULL WHERE city = ''"
        );
        // Idem banner_image
        \Illuminate\Support\Facades\DB::statement(
            "UPDATE hairdresser_profiles SET banner_image = NULL WHERE banner_image = ''"
        );
    }

    public function down()
    {
        \Illuminate\Support\Facades\DB::statement(
            "UPDATE hairdresser_profiles SET city = '' WHERE city IS NULL"
        );
        \Illuminate\Support\Facades\DB::statement(
            'ALTER TABLE hairdresser_profiles MODIFY city VARCHAR(100) NOT NULL DEFAULT \'\''
        );
    }
}
