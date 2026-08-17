<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPreference;
use Illuminate\Http\Request;

class PreferenceController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'profile_type' => 'nullable|string|max:50',
            'interests'    => 'nullable|array',
            'interests.*'  => 'string|max:100',
            'goal'         => 'nullable|string|max:50',
        ]);

        $pref = UserPreference::updateOrCreate(
            ['user_id' => $request->user()->id],
            array_merge($validated, ['completed_at' => now()])
        );

        return response()->json($pref, 201);
    }

    /**
     * GET /preferences — lit les préférences serveur du compte connecté.
     * Jusqu'ici rien ne lisait cette table (voir mission scoring/recommandation) :
     * l'onboarding écrivait déjà via store() mais aucun autre appareil/session
     * ne pouvait relire ce choix — seul le localStorage local faisait foi.
     * 404 explicite (pas un objet vide) si l'utilisateur n'a jamais complété
     * l'onboarding — le frontend doit alors se rabattre sur son localStorage,
     * jamais interpréter une absence comme "aucun intérêt choisi".
     */
    public function show(Request $request)
    {
        $pref = UserPreference::where('user_id', $request->user()->id)->first();

        if (!$pref) {
            return response()->json(['message' => 'Aucune préférence enregistrée.'], 404);
        }

        return response()->json($pref);
    }
}
