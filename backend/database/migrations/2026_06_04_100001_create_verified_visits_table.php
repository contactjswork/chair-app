<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verified_visits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hairdresser_id');
            $table->unsignedBigInteger('client_user_id')->nullable();
            $table->string('client_token', 64)->nullable(); // fingerprint anonyme si pas inscrit
            $table->unsignedBigInteger('qr_token_id');
            $table->string('service_type', 50)->nullable(); // coupe, barbe, couleur, autre
            $table->dateTime('scanned_at');
            $table->timestamps();

            $table->foreign('hairdresser_id')->references('id')->on('hairdresser_profiles')->onDelete('cascade');
            $table->foreign('client_user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('qr_token_id')->references('id')->on('qr_tokens')->onDelete('cascade');
            // Anti-fraude : 1 visite par client par coiffeur par 12h
            $table->index(['hairdresser_id', 'client_user_id', 'scanned_at']);
            $table->index(['hairdresser_id', 'client_token', 'scanned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verified_visits');
    }
};
