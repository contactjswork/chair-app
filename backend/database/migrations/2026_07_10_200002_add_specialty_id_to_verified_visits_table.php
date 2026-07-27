<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verified_visits', function (Blueprint $table) {
            $table->foreignId('specialty_id')->nullable()->after('qr_token_id')
                ->constrained('specialties')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('verified_visits', function (Blueprint $table) {
            $table->dropForeign(['specialty_id']);
            $table->dropColumn('specialty_id');
        });
    }
};
