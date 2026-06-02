<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GeocodingService;
use Illuminate\Http\Request;

class GeocodingController extends Controller
{
    /**
     * GET /api/geocode?q=Haguenau
     *
     * Géocode une ville française et retourne ses coordonnées GPS.
     * Utilisé par le frontend pour transformer une ville saisie en lat/lng
     * avant d'appliquer un filtre rayon haversine.
     *
     * Réponse succès :
     * {
     *   "city": "Haguenau",
     *   "lat": 48.8161,
     *   "lng": 7.79,
     *   "source": "local"
     * }
     *
     * Réponse échec :
     * { "error": "Ville non trouvée", "city": "XYZ" }
     */
    public function geocode(Request $request)
    {
        $q = trim($request->get('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json(['error' => 'Requête trop courte'], 400);
        }

        $result = GeocodingService::geocode($q);

        if ($result === null) {
            return response()->json([
                'error'  => 'Ville non trouvée dans notre référentiel',
                'city'   => $q,
                'hint'   => 'Essayez une ville plus grande ou vérifiez l\'orthographe',
            ], 404);
        }

        return response()->json([
            'city'    => $result['display'],
            'lat'     => $result['lat'],
            'lng'     => $result['lng'],
            'source'  => $result['source'],
        ]);
    }
}
