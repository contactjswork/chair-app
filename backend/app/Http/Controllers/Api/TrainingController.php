<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\TrainingBadge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrainingController extends Controller
{
    /** GET /training-badges — catalogue complet */
    public function catalogue()
    {
        return response()->json(TrainingBadge::orderBy('category')->orderBy('institution')->get());
    }

    /** GET /my-training-badges — formations du coiffeur connecté */
    public function myBadges(Request $request)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        return response()->json($profile->trainingBadges()->get());
    }

    /** POST /my-training-badges — déclarer une formation */
    public function add(Request $request)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'training_badge_id' => 'required|exists:training_badges,id',
            'year'              => 'nullable|integer|min:1970|max:' . date('Y'),
        ]);

        // Ignore si déjà présent
        if (!$profile->trainingBadges()->where('training_badge_id', $validated['training_badge_id'])->exists()) {
            $profile->trainingBadges()->attach($validated['training_badge_id'], [
                'year'        => $validated['year'] ?? null,
                'is_verified' => false,
            ]);
        }

        return response()->json($profile->trainingBadges()->get(), 201);
    }

    /** DELETE /my-training-badges/{badgeId} — retirer une formation */
    public function remove(Request $request, int $badgeId)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        $profile->trainingBadges()->detach($badgeId);
        return response()->json(['message' => 'Formation retirée.']);
    }
}
