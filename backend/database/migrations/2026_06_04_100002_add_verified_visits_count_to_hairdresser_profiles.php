<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->unsignedInteger('verified_visits_count')->default(0)->after('visits_count');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('verified_visits_count');
        });
    }
};
