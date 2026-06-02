<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ajout des colonnes pour la réservation réelle
        DB::statement('ALTER TABLE appointments
            ADD COLUMN service_id BIGINT UNSIGNED NULL AFTER hairdresser_id,
            ADD COLUMN appointment_date DATE NULL AFTER desired_slot,
            ADD COLUMN appointment_time TIME NULL AFTER appointment_date,
            ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER appointment_time,
            ADD COLUMN price DECIMAL(8,2) NULL AFTER duration_minutes,
            ADD COLUMN payment_method ENUM("on_site","deposit","full") NULL DEFAULT "on_site" AFTER price
        ');

        // Modifier l'enum status pour ajouter pending_payment
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending','pending_payment','confirmed','declined','completed','cancelled','no_show') NOT NULL DEFAULT 'pending'");

        // FK sur service_id (sans doctrine/dbal)
        DB::statement('ALTER TABLE appointments ADD CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE appointments DROP FOREIGN KEY fk_appointments_service');
        DB::statement('ALTER TABLE appointments
            DROP COLUMN service_id,
            DROP COLUMN appointment_date,
            DROP COLUMN appointment_time,
            DROP COLUMN duration_minutes,
            DROP COLUMN price,
            DROP COLUMN payment_method
        ');
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending','confirmed','declined','completed','cancelled') NOT NULL DEFAULT 'pending'");
    }
};
