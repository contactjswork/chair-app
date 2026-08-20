<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    /**
     * GET /api/notification-preferences
     * Retourne les préférences de l'utilisateur, créées avec les défauts
     * au premier accès.
     */
    public function show(Request $request)
    {
        $prefs = NotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            NotificationPreference::DEFAULTS
        );

        return response()->json(['preferences' => $prefs->toPrefsArray()]);
    }

    /**
     * PUT /api/notification-preferences
     * Mise à jour partielle ou complète — uniquement des booléens sur les
     * 10 clés connues, tout le reste est ignoré par la validation.
     */
    public function update(Request $request)
    {
        $rules = [];
        foreach (NotificationPreference::KEYS as $key) {
            $rules[$key] = 'sometimes|boolean';
        }
        $validated = $request->validate($rules);

        $prefs = NotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            NotificationPreference::DEFAULTS
        );

        if (!empty($validated)) {
            $prefs->fill($validated)->save();
        }

        return response()->json(['preferences' => $prefs->fresh()->toPrefsArray()]);
    }
}
