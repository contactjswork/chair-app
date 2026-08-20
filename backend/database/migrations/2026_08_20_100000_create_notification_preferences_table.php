<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Préférences de notifications par utilisateur — table dédiée (requêtable
 * à l'envoi, voir NotificationService::shouldSend()).
 *
 * Les défauts DB sont IDENTIQUES aux défauts historiques du frontend
 * (app/app/notifications/preferences/page.tsx) : ON pour le transactionnel
 * (rappels, confirmations, annulations, invitation à laisser un avis,
 * sécurité), OFF pour le social/découverte/promo.
 */
class CreateNotificationPreferencesTable extends Migration
{
    public function up()
    {
        // Idempotence : ne rien faire si la table existe déjà (re-run partiel).
        if (Schema::hasTable('notification_preferences')) {
            return;
        }

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');

            // Réservations
            $table->boolean('reminder_24h')->default(true);
            $table->boolean('reminder_1h')->default(true);
            $table->boolean('booking_confirmed')->default(true);
            $table->boolean('booking_cancelled')->default(true);

            // Avis
            $table->boolean('review_request')->default(true);
            $table->boolean('review_reply')->default(false);

            // Social / découverte
            $table->boolean('followed_post')->default(false);
            $table->boolean('new_hairdresser_nearby')->default(false);
            $table->boolean('promotions')->default(false);

            // Système — stockée pour refléter le toggle frontend, mais les
            // notifications de sécurité sont TOUJOURS envoyées côté service
            // (choix documenté dans NotificationService).
            $table->boolean('security')->default(true);

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('notification_preferences');
    }
}
