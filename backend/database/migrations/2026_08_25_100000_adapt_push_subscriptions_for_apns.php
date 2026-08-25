<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adapte la table push_subscriptions (créée pour un Web Push jamais déployé,
 * puis dormante pendant l'ère OneSignal) au push APNs natif :
 *
 *  - token       : VARCHAR(255) NOT NULL + UNIQUE. Le token APNs identifie un
 *                  (appareil, app) ; l'unicité gère le renouvellement (même
 *                  appareil, nouveau token = nouvelle ligne, l'ancien token
 *                  sera invalidé par APNs → désactivé au premier envoi) et le
 *                  changement d'utilisateur sur un même appareil (upsert par
 *                  token → la ligne change de user_id).
 *  - device_name : libellé facultatif ("iPhone de Julie") pour le diagnostic.
 *  - bundle_id   : topic APNs du binaire d'origine (app.getchair.client ou
 *                  app.getchair.pro) — indispensable car un token n'est valable
 *                  que pour le bundle qui l'a obtenu (deux binaires TestFlight).
 *
 * Les lignes sans token sont purgées : elles ne peuvent désigner aucun appareil.
 * La table est réutilisée (plutôt qu'une nouvelle) parce que deleteAccount()
 * et chair:demo-reset la purgent déjà.
 */
class AdaptPushSubscriptionsForApns extends Migration
{
    public function up()
    {
        DB::table('push_subscriptions')->whereNull('token')->delete();

        // MODIFY en SQL brut : pas de doctrine/dbal dans ce projet (contrainte
        // assumée — voir feedback dev), donc pas de ->change().
        DB::statement('ALTER TABLE push_subscriptions MODIFY token VARCHAR(255) NOT NULL');

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->string('device_name', 100)->nullable()->after('platform');
            $table->string('bundle_id', 100)->nullable()->after('provider');
            $table->unique('token');
        });
    }

    public function down()
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['token']);
            $table->dropColumn(['device_name', 'bundle_id']);
        });

        DB::statement('ALTER TABLE push_subscriptions MODIFY token VARCHAR(512) NULL');
    }
}
