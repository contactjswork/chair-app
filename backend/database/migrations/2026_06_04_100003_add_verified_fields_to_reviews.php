<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedBigInteger('verified_visit_id')->nullable()->after('appointment_id');
            $table->boolean('is_certified')->default(false)->after('is_verified');

            $table->foreign('verified_visit_id')->references('id')->on('verified_visits')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['verified_visit_id']);
            $table->dropColumn(['verified_visit_id', 'is_certified']);
        });
    }
};
