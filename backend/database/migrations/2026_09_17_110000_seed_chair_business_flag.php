<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Flag CHAIR BUSINESS — créé DÉSACTIVÉ : le prix de l'abonnement gérant
 * n'est pas encore décidé (décision Julien 17/09/2026), la page affiche
 * « Bientôt disponible » sans tarif ni bouton tant que le flag est éteint.
 * À activer depuis l'admin (Feature flags) le jour où le prix est fixé.
 */
return new class extends Migration
{
    public function up()
    {
        $now = now();
        DB::table('feature_flags')->updateOrInsert(
            ['key' => 'chair_business_enabled'],
            [
                'enabled'     => false,
                'description' => "Abonnement CHAIR BUSINESS souscriptible (prix affiché + boutons). Éteint = page « Bientôt disponible ».",
                'created_at'  => $now,
                'updated_at'  => $now,
            ]
        );
    }

    public function down()
    {
        DB::table('feature_flags')->where('key', 'chair_business_enabled')->delete();
    }
};
