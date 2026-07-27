<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
}
