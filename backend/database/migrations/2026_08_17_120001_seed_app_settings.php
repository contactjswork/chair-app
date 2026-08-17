<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Services\HomeSectionsConfig;

/**
 * Seed idempotent des réglages applicatifs rendus configurables sans build :
 * paramètres de l'algorithme de recommandation (RecommendationService) et
 * configuration de la home. Chaque valeur ci-dessous est EXACTEMENT la
 * constante actuelle du code (voir RecommendationService, HomeSectionsConfig)
 * — ce seed ne change AUCUN comportement observable au premier `migrate`.
 *
 * Groupes 'gamification'/'professionnels'/'moderation'/'general' existent
 * (voir AppSettingsService::GROUPS) mais ne sont pas encore peuplés — aucun
 * réglage n'y est aujourd'hui lu par le code, volontairement laissé aux
 * agents produit suivants plutôt que d'y mettre des lignes non câblées qui
 * donneraient une fausse impression d'effet à l'admin.
 */
return new class extends Migration
{
    private function settings(): array
    {
        return [
            // ── Algorithme de recommandation (RecommendationService) ──────
            [
                'key' => 'recommendation_radius_tiers_km', 'group' => 'recherche', 'type' => 'json',
                'value' => [10, 25, 50, 100, 250], 'default_value' => [10, 25, 50, 100, 250],
                'min' => null, 'max' => null,
                'description' => "Paliers de rayon (km) de la cascade géographique : 5 valeurs croissantes. Les libellés (« Près de chez vous »...) restent fixes dans le code, seuls les km sont ajustables.",
            ],
            [
                'key' => 'recommendation_weight_specialty_max', 'group' => 'recherche', 'type' => 'integer',
                'value' => 220, 'default_value' => 220, 'min' => 0, 'max' => 1000,
                'description' => "Poids max du match spécialité/service exact — doit rester le plus grand poids (dominant), voir RecommendationService::score().",
            ],
            [
                'key' => 'recommendation_weight_proximity_max', 'group' => 'recherche', 'type' => 'integer',
                'value' => 60, 'default_value' => 60, 'min' => 0, 'max' => 500,
                'description' => "Bonus max de proximité (0 km). Doit rester < poids spécialité.",
            ],
            [
                'key' => 'recommendation_proximity_decay_per_km', 'group' => 'recherche', 'type' => 'float',
                'value' => 0.6, 'default_value' => 0.6, 'min' => 0, 'max' => 10,
                'description' => "Décroissance du bonus de proximité par km parcouru.",
            ],
            [
                'key' => 'recommendation_weight_rating_mult', 'group' => 'recherche', 'type' => 'float',
                'value' => 4, 'default_value' => 4, 'min' => 0, 'max' => 50,
                'description' => "Multiplicateur de la note moyenne (0-5) dans le score.",
            ],
            [
                'key' => 'recommendation_weight_reviews_cap', 'group' => 'recherche', 'type' => 'integer',
                'value' => 200, 'default_value' => 200, 'min' => 0, 'max' => 5000,
                'description' => "Plafond du nombre d'avis pris en compte dans le score (évite qu'un compte très ancien écrase un profil récent).",
            ],
            [
                'key' => 'recommendation_weight_reviews_mult', 'group' => 'recherche', 'type' => 'float',
                'value' => 0.15, 'default_value' => 0.15, 'min' => 0, 'max' => 5,
                'description' => "Multiplicateur du volume d'avis (plafonné) dans le score.",
            ],
            [
                'key' => 'recommendation_weight_availability', 'group' => 'recherche', 'type' => 'integer',
                'value' => 12, 'default_value' => 12, 'min' => 0, 'max' => 200,
                'description' => "Bonus si un créneau disponible est connu pour ce coiffeur.",
            ],
            [
                'key' => 'recommendation_weight_chair_plus', 'group' => 'recherche', 'type' => 'integer',
                'value' => 6, 'default_value' => 6, 'min' => 0, 'max' => 200,
                'description' => "Bonus CHAIR+ — départage à mérite égal seulement, doit rester petit (< poids spécialité/proximité).",
            ],
            [
                'key' => 'ranking_radius_tiers_km', 'group' => 'recherche', 'type' => 'json',
                'value' => [['km' => 50, 'label' => 'près de chez vous'], ['km' => 200, 'label' => 'dans votre région']],
                'default_value' => [['km' => 50, 'label' => 'près de chez vous'], ['km' => 200, 'label' => 'dans votre région']],
                'min' => null, 'max' => null,
                'description' => "Paliers de rayon (km + libellé) de la cascade du classement local sur la home client (frontend/lib/homeFilters.ts RADIUS_TIERS).",
            ],

            // ── Configuration de la home ────────────────────────────────
            [
                'key' => 'home_sections', 'group' => 'home', 'type' => 'json',
                'value' => HomeSectionsConfig::defaults(), 'default_value' => HomeSectionsConfig::defaults(),
                'min' => null, 'max' => null,
                'description' => "Présence/ordre/titre/limite des sections de la home client (frontend/app/app/page.tsx). Le rendu de chaque section reste géré par le code.",
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
