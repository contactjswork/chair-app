<?php

namespace App\Services;

/**
 * Formule de distance partagée — un seul calcul haversine pour tout CHAIR
 * (RecommendationService, ExploreController, SpecialtyReputationService).
 * Évite que plusieurs implémentations divergent silencieusement avec le temps.
 */
class Geo
{
    const EARTH_RADIUS_KM = 6371;

    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return self::EARTH_RADIUS_KM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
