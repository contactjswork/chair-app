<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seed idempotent du poids CHAIR+ du CLASSEMENT (LeaderboardController),
 * même pattern que 2026_08_17_120001_seed_app_settings.php. Réglage distinct
 * de 'recommendation_weight_chair_plus' (RecommendationService, home/recherche)
 * car le classement est un moteur de scoring séparé — même magnitude par
 * défaut (6) pour rester cohérent produit, mais réglable indépendamment.
 * Ne change AUCUN comportement observable au premier `migrate` : la valeur
 * seedée est exactement la constante de repli du code
 * (LeaderboardController::WEIGHT_CHAIR_PLUS).
 */
return new class extends Migration
{
    private function settings(): array
    {
        return [
            [
                'key' => 'leaderboard_weight_chair_plus', 'group' => 'recherche', 'type' => 'integer',
                'value' => 6, 'default_value' => 6, 'min' => 0, 'max' => 200,
                'description' => "Bonus CHAIR+ dans le classement (LeaderboardController) — départage à mérite égal seulement, doit rester petit (jamais assez pour dépasser un écart de mérite réel).",
            ],
        ];
    }

    public function up()
    {
        $now = now();

        foreach ($this->settings() as $setting) {
            $row = $setting;
            $row['value']         = json_encode($row['value']);
            $row['default_value'] = json_encode($row['default_value']);
            $row['updated_at']    = $now;
            $row['created_at']    = $now;

            DB::table('app_settings')->updateOrInsert(['key' => $setting['key']], $row);
        }
    }

    public function down()
    {
        DB::table('app_settings')->whereIn('key', array_column($this->settings(), 'key'))->delete();
    }
};
