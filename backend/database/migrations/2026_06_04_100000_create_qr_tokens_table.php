<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hairdresser_id');
            $table->string('token_hash', 64)->unique();
            $table->dateTime('valid_from');
            $table->dateTime('valid_until');
            $table->unsignedInteger('scan_count')->default(0);
            $table->timestamps();

            $table->foreign('hairdresser_id')->references('id')->on('hairdresser_profiles')->onDelete('cascade');
            $table->index(['hairdresser_id', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_tokens');
    }
};
