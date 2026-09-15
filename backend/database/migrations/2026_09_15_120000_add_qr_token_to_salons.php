<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * QR avis du salon (idée validée par Julien le 15/09/2026) : un seul QR
 * permanent à la caisse — le client scanne, choisit qui l'a coiffé, et
 * repart dans le circuit de visite vérifiée existant (jeton coiffeur frappé
 * à la volée, tous les garde-fous anti-fraude conservés).
 *
 * Le jeton est un secret STABLE (imprimé sur un sticker physique) mais
 * révocable : le gérant peut le régénérer, l'ancien sticker devient inerte.
 * Jamais exposé publiquement (PublicScope::SALON_PRIVATE).
 */
class AddQrTokenToSalons extends Migration
{
    public function up()
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->string('qr_token', 64)->nullable()->unique()->after('slug');
        });
    }

    public function down()
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->dropUnique(['qr_token']);
            $table->dropColumn('qr_token');
        });
    }
}
