<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Deux outils du lot du 01/09/2026 :
 *
 * 1. LA CONFIRMATION 24 H — le tueur de no-shows. La veille du rendez-vous,
 *    le client reçoit « Confirme ton RDV de demain » (confirmation_requested_at,
 *    drapeau posé avant l'envoi). S'il confirme, client_confirmed_at est posé.
 *    S'il ne confirme pas à temps, le créneau est libéré par
 *    chair:release-unconfirmed et la liste d'attente est notifiée.
 *
 * 2. L'OBJECTIF MENSUEL — le CA que le coiffeur SE fixe (monthly_goal_amount,
 *    null = pas d'objectif). Motivation personnelle, jamais comparée.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('confirmation_requested_at')->nullable()->after('rebook_reminded_at');
            $table->timestamp('client_confirmed_at')->nullable()->after('confirmation_requested_at');
        });

        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->unsignedInteger('monthly_goal_amount')->nullable()->after('google_review_url');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('monthly_goal_amount');
        });
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['confirmation_requested_at', 'client_confirmed_at']);
        });
    }
};
