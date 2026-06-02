<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddGeoToUsersTable extends Migration
{
    public function up()
    {
        DB::statement('ALTER TABLE users ADD COLUMN postal_code VARCHAR(10) NULL AFTER city');
        DB::statement('ALTER TABLE users ADD COLUMN latitude DECIMAL(10,7) NULL AFTER postal_code');
        DB::statement('ALTER TABLE users ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude');
    }

    public function down()
    {
        DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS longitude');
        DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS latitude');
        DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS postal_code');
    }
}
