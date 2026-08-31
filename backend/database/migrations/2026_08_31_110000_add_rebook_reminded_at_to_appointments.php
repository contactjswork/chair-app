<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trace du rappel de re-réservation envoyé pour ce rendez-vous.
 *
 * Le rappel « ça fait N semaines depuis ta dernière coupe » ne doit partir
 * qu'UNE fois par rendez-vous terminé — c'est le seul push commercial de
 * l'app côté client, et le répéter grillerait la permission de notification
 * pour tout le reste. Même mécanique que reminded_24h_at / reminded_1h_at :
 * on flague avant l'envoi, un cron qui rejoue ne double jamais.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('rebook_reminded_at')->nullable()->after('review_token');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('rebook_reminded_at');
        });
    }
};
