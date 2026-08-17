<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FeatureFlagService;

/**
 * Endpoint PUBLIC — aucune auth requise (le client, connecté ou non, doit
 * pouvoir savoir quelles fonctionnalités sont actives avant même de se
 * connecter). Le CRUD admin vit dans AdminFeatureFlagController.
 */
class FeatureFlagController extends Controller
{
    /** GET /api/feature-flags — {key: boolean} pour tous les flags connus. */
    public function index()
    {
        return response()->json(FeatureFlagService::all());
    }
}
