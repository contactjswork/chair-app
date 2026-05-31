<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // doctrine/dbal incompatible avec PHP 8.0 + Laravel 8 — on passe par DB::statement
        DB::statement('ALTER TABLE reviews ADD COLUMN appointment_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE reviews ADD CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE reviews DROP FOREIGN KEY fk_reviews_appointment');
        DB::statement('ALTER TABLE reviews DROP COLUMN appointment_id');
    }
};
