<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE services MODIFY price DECIMAL(8,2) NULL');
        DB::statement('ALTER TABLE services MODIFY duration_minutes SMALLINT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE services MODIFY price DECIMAL(8,2) NOT NULL DEFAULT 0');
        DB::statement('ALTER TABLE services MODIFY duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0');
    }
};
