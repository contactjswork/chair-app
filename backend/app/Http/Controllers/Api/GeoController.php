<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GeocodingService;
use App\Services\GeoLookupService;
use Illuminate\Http\Request;

/**
 * Sert la liste régions/départements pour le sélecteur en cascade de
 * l'inscription pro (Région → Département → Ville → Rue) — même source de
 * vérité que la dérivation par code postal (GeoLookupService::DEPARTMENTS),
 * pas de duplication de la liste côté frontend.
 */
class GeoController extends Controller
{
    public function regions()
    {
        return response()->json(['regions' => GeoLookupService::allRegions()]);
    }

    public function departments(Request $request)
    {
        $validated = $request->validate(['region' => 'required|string|max:100']);

        return response()->json([
            'departments' => GeoLookupService::departmentsForRegion($validated['region']),
        ]);
    }

    /**
     * Autocomplétion ville — "Stras" → Strasbourg, Strasbourg-... — utilisée
     * par le champ Ville de l'inscription client et de modifier mon profil.
     * Public (pas de middleware auth) : utile dès l'inscription, avant token.
     */
    public function searchCity(Request $request)
    {
        $validated = $request->validate(['q' => 'required|string|max:100']);

        return response()->json([
            'results' => GeocodingService::search($validated['q']),
        ]);
    }

    /** Ville la plus proche d'une position GPS — bouton "Ma position". */
    public function reverseCity(Request $request)
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        $result = GeocodingService::reverse((float) $validated['lat'], (float) $validated['lng']);
        if (!$result) {
            return response()->json(['message' => 'Ville introuvable pour cette position.'], 404);
        }

        return response()->json($result);
    }
}
