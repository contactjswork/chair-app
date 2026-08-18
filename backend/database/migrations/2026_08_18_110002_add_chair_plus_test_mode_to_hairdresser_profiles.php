<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mode test CHAIR+ (spec CHAIR+ §3) — permet à un admin d'activer/désactiver
 * CHAIR+ manuellement sur un compte, sans passer par Stripe, pour tester les
 * fonctionnalités premium avant le vrai lancement du paiement. Colonne
 * DISTINCTE de chair_plus_until (banqué parrainage) : un toggle test ne doit
 * jamais écraser ou interagir avec une vraie récompense de parrainage déjà
 * accordée — les deux sources restent indépendantes et réversibles séparément.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->boolean('chair_plus_test_mode')->default(false)->after('chair_plus_until');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('chair_plus_test_mode');
        });
    }
};
