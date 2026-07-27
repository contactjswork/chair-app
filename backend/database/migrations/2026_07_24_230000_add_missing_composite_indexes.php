<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->index(['hairdresser_id', 'appointment_date', 'status'], 'appointments_hairdresser_date_status_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_id', 'read_at'], 'notifications_user_read_index');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->index(['hairdresser_id', 'is_published'], 'posts_hairdresser_published_index');
        });
    }

    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_hairdresser_date_status_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_index');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex('posts_hairdresser_published_index');
        });
    }
};
