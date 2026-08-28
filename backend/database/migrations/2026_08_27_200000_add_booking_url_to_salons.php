<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lien de réservation externe du salon (Planity, Zenoti, Shortcuts…).
 *
 * Sans lui, un coiffeur SALARIÉ était dans une impasse totale : ses
 * prestations s'affichaient avec leurs tarifs, mais rien n'était cliquable et
 * aucun texte n'expliquait comment le joindre. Seuls les indépendants
 * pouvaient être réservés — un salarié ne pouvait donc se constituer aucune
 * clientèle sur CHAIR, ce qui vide de son sens la promesse « le coiffeur au
 * centre, pas le salon ».
 *
 * Le lien vit sur le SALON et non sur chaque coiffeur : c'est le salon qui
 * détient l'abonnement au logiciel de réservation, et son agenda est commun.
 * Chaque salarié en hérite automatiquement, sans rien avoir à saisir.
 *
 * Même colonne que hairdresser_profiles.booking_url (500 caractères, https
 * imposé à la validation) pour que les deux chemins restent interchangeables.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->string('booking_url', 500)->nullable()->after('website');
        });
    }

    public function down(): void
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->dropColumn('booking_url');
        });
    }
};
