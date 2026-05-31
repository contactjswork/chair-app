<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use Illuminate\Http\Request;

class InteractionController extends Controller
{
    // ── SAVED PROFILES ────────────────────────────────────────────────

    public function savedIndex(Request $request)
    {
        $saved = $request->user()
            ->savedProfiles()
            ->with(['user', 'specialties'])
            ->get();

        return response()->json($saved);
    }

    public function save(Request $request, int $hairdresserId)
    {
        $hairdresser = HairdresserProfile::findOrFail($hairdresserId);
        $user = $request->user();

        if ($user->savedProfiles()->where('hairdresser_id', $hairdresserId)->exists()) {
            return response()->json(['saved' => true, 'message' => 'Déjà sauvegardé']);
        }

        $user->savedProfiles()->attach($hairdresserId);

        return response()->json(['saved' => true], 201);
    }

    public function unsave(Request $request, int $hairdresserId)
    {
        $request->user()->savedProfiles()->detach($hairdresserId);
        return response()->json(['saved' => false]);
    }

    // ── FOLLOWS ───────────────────────────────────────────────────────

    public function follow(Request $request, int $hairdresserId)
    {
        $hairdresser = HairdresserProfile::findOrFail($hairdresserId);
        $user = $request->user();

        if ($user->follows()->where('hairdresser_id', $hairdresserId)->exists()) {
            return response()->json(['following' => true, 'followers_count' => $hairdresser->followers_count]);
        }

        $user->follows()->attach($hairdresserId);
        $hairdresser->increment('followers_count');

        return response()->json(['following' => true, 'followers_count' => $hairdresser->fresh()->followers_count], 201);
    }

    public function unfollow(Request $request, int $hairdresserId)
    {
        $hairdresser = HairdresserProfile::findOrFail($hairdresserId);
        $user = $request->user();

        $user->follows()->detach($hairdresserId);
        $hairdresser->decrement('followers_count');

        return response()->json(['following' => false, 'followers_count' => $hairdresser->fresh()->followers_count]);
    }

    public function interactionStatus(Request $request, int $hairdresserId)
    {
        $user = $request->user();
        return response()->json([
            'following' => $user->follows()->where('hairdresser_id', $hairdresserId)->exists(),
            'saved'     => $user->savedProfiles()->where('hairdresser_id', $hairdresserId)->exists(),
        ]);
    }
}
