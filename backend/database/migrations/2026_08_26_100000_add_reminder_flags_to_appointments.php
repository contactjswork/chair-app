<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Marqueurs d'idempotence des rappels de rendez-vous.
 *
 * chair:send-appointment-reminders tourne toutes les 15 minutes : sans ces
 * colonnes, un cron qui rejoue (ou deux crons qui se chevauchent) renverrait
 * le même rappel. Un rappel envoyé pose son timestamp — la commande filtre
 * sur NULL, donc un rappel ne part JAMAIS deux fois pour le même RDV.
 */
class AddReminderFlagsToAppointments extends Migration
{
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('reminded_24h_at')->nullable()->after('review_unlocked');
            $table->timestamp('reminded_1h_at')->nullable()->after('reminded_24h_at');
        });
    }

    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['reminded_24h_at', 'reminded_1h_at']);
        });
    }
}
