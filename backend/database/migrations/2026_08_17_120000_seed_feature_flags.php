<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seed idempotent des feature flags — tous à `true` par défaut : aucun ne
 * désactive une fonctionnalité qui marche aujourd'hui. Le CRUD admin (créer/
 * activer/désactiver/décrire d'autres flags) vit dans
 * AdminFeatureFlagController ; ceux-ci ne sont que le jeu de départ demandé.
 */
return new class extends Migration
{
    private function flags(): array
    {
        return [
            ['key' => 'chair_plus_enabled',   'enabled' => true, 'description' => "Abonnement CHAIR+ (mise en avant payante) visible et souscriptible."],
            ['key' => 'referrals_enabled',    'enabled' => true, 'description' => "Programme de parrainage (codes de parrainage, récompenses)."],
            ['key' => 'chair_rental_enabled', 'enabled' => true, 'description' => "Location de fauteuil (recherche indépendant + annonces gérant)."],
            ['key' => 'recruitment_enabled',  'enabled' => true, 'description' => "Recrutement (offres d'emploi, candidatures, ATS gérant)."],
            ['key' => 'rankings_enabled',     'enabled' => true, 'description' => "Classements (spécialité, engagement, page /app/classements)."],
            ['key' => 'objectives_enabled',   'enabled' => true, 'description' => "Objectifs / gamification (streaks, badges, défis)."],
        ];
    }

    public function up()
    {
        $now = now();

        foreach ($this->flags() as $flag) {
            DB::table('feature_flags')->updateOrInsert(
                ['key' => $flag['key']],
                array_merge($flag, ['updated_at' => $now, 'created_at' => $now])
            );
        }
    }

    public function down()
    {
        DB::table('feature_flags')->whereIn('key', array_column($this->flags(), 'key'))->delete();
    }
};
