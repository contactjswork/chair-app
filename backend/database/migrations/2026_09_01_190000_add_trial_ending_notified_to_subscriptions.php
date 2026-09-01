<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drapeau d'idempotence pour la notification « ton essai CHAIR+ se termine ».
 * La commande chair:notify-trial-ending tourne chaque jour ; sans ce drapeau,
 * elle réenverrait l'alerte à chaque passage tant que l'essai est dans la
 * fenêtre des 3 derniers jours. Posé une fois, l'alerte ne part qu'une fois.
 */
class AddTrialEndingNotifiedToSubscriptions extends Migration
{
    public function up()
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('trial_ending_notified_at')->nullable()->after('trial_ends_at');
        });
    }

    public function down()
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('trial_ending_notified_at');
        });
    }
}
