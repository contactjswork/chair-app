<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plafond anti-rafale des pushes sociaux (réalisation d'un coiffeur suivi).
 *
 * Une ligne = le dernier push social envoyé à un abonné pour UN coiffeur
 * donné. Si un coiffeur publie 5 réalisations d'affilée, ses abonnés ne
 * reçoivent qu'UN push par période de 6 h (les notifications internes,
 * elles, partent toutes). Voir docs/PUSH_NOTIFICATIONS.md § Stratégie.
 *
 * Table volontairement minimale (clé composite, un seul timestamp, upsert) :
 * pas de modèle Eloquent, accès direct DB::table('social_push_logs').
 */
class CreateSocialPushLogsTable extends Migration
{
    public function up()
    {
        Schema::create('social_push_logs', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->onDelete('cascade');
            $table->timestamp('last_pushed_at');
            $table->primary(['user_id', 'hairdresser_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('social_push_logs');
    }
}
