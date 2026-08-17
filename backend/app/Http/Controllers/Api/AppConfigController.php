<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use App\Services\HomeSectionsConfig;
use Illuminate\Support\Facades\Cache;

/**
 * Endpoint PUBLIC — GET /api/app-config. Regroupe tous les réglages
 * applicatifs par groupe ({recherche: {...}, home: {...}, ...}).
 *
 * Contrat dur : cet endpoint NE DOIT JAMAIS faire planter l'app appelante.
 * Toute panne (DB down, ligne corrompue, cache indisponible) retombe sur
 * defaults() — les mêmes valeurs que les constantes historiques du code.
 */
class AppConfigController extends Controller
{
    const CACHE_KEY = 'app_config:public';
    const CACHE_TTL = 30;

    /** Repli codé en dur — mêmes valeurs que les constantes historiques. */
    public static function defaults(): array
    {
        return [
            'recherche' => [
                'recommendation_radius_tiers_km'        => [10, 25, 50, 100, 250],
                'recommendation_weight_specialty_max'   => 220,
                'recommendation_weight_proximity_max'   => 60,
                'recommendation_proximity_decay_per_km' => 0.6,
                'recommendation_weight_rating_mult'     => 4,
                'recommendation_weight_reviews_cap'     => 200,
                'recommendation_weight_reviews_mult'    => 0.15,
                'recommendation_weight_availability'    => 12,
                'recommendation_weight_chair_plus'      => 6,
                'ranking_radius_tiers_km'               => [
                    ['km' => 50,  'label' => 'près de chez vous'],
                    ['km' => 200, 'label' => 'dans votre région'],
                ],
            ],
            'home' => [
                'home_sections' => HomeSectionsConfig::defaults(),
            ],
            'gamification'   => [],
            'professionnels' => [],
            'moderation'     => [],
            'general'        => [],
        ];
    }

    /**
     * À appeler par TOUT code qui écrit dans app_settings (voir
     * AdminAppSettingController) — ce cache agrégé est SÉPARÉ de celui
     * d'AppSettingsService (deux caches, deux clés) et doit être invalidé
     * explicitement, sinon une écriture admin reste invisible côté public
     * jusqu'à expiration du TTL.
     */
    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function index()
    {
        try {
            $config = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
                return self::buildPublicConfig();
            });
        } catch (\Throwable $e) {
            $config = self::defaults();
        }

        return response()->json($config);
    }

    private static function buildPublicConfig(): array
    {
        $out = self::defaults();

        foreach (AppSetting::query()->get() as $setting) {
            $group = in_array($setting->group, AppSettingsService::GROUPS, true) ? $setting->group : 'general';
            $value = AppSettingsService::coerce($setting->type, $setting->value, $setting->min, $setting->max);

            if ($value === null) continue; // invalide/hors-bornes -> garde le défaut

            // 'home_sections' a une forme stricte en plus du typage générique
            // (7 clés connues) — jamais laisser une home cassée passer.
            if ($setting->key === 'home_sections' && !HomeSectionsConfig::isValid($value)) {
                continue;
            }

            if (!isset($out[$group])) $out[$group] = [];
            $out[$group][$setting->key] = $value;
        }

        return $out;
    }
}
