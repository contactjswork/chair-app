<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddTitleMessageToNotifications extends Migration
{
    public function up()
    {
        DB::statement("ALTER TABLE notifications ADD COLUMN title VARCHAR(255) NULL AFTER type, ADD COLUMN message TEXT NULL AFTER title");
    }

    public function down()
    {
        DB::statement("ALTER TABLE notifications DROP COLUMN title, DROP COLUMN message");
    }
}
