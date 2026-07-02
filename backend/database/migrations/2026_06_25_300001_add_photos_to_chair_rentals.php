<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chair_rentals', function (Blueprint $table) {
            $table->json('photos')->nullable()->after('conditions');
        });
    }

    public function down(): void
    {
        Schema::table('chair_rentals', function (Blueprint $table) {
            $table->dropColumn('photos');
        });
    }
};
