<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE hairdresser_profiles
            ADD COLUMN work_status ENUM('home','private_salon','rented_chair','studio') NULL AFTER is_independent,
            ADD COLUMN work_address VARCHAR(255) NULL AFTER work_status
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE hairdresser_profiles DROP COLUMN work_status, DROP COLUMN work_address');
    }
};
