<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSiretToHairdresserProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            // SIRET propre au coiffeur (distinct du SIRET du salon employeur,
            // pour les indépendants) — sert de garde-fou avant d'autoriser une
            // demande de location de fauteuil ou une candidature à une offre.
            $table->string('siret', 14)->nullable()->after('booking_url');
            $table->enum('siret_verification_status', ['none', 'pending', 'verified', 'rejected'])
                ->default('none')->after('siret');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn(['siret', 'siret_verification_status']);
        });
    }
}
