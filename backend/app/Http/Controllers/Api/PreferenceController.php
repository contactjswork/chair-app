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
}
