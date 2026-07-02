<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Review;
use App\Services\StreakService;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, int $hairdresserId)
    {
        $request->validate([
            'rating'    => 'required|integer|min:1|max:5',
            'comment'   => 'required|string|min:10|max:1000',
            'specialty' => 'nullable|string|max:100',
        ]);

        $hairdresser = HairdresserProfile::findOrFail($hairdresserId);
        $user = $request->user();

        if ($hairdresser->user_id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas vous noter vous-même.'], 403);
        }

        if (Review::where('hairdresser_id', $hairdresserId)->where('client_id', $user->id)->exists()) {
            return response()->json(['message' => 'Vous avez déjà laissé un avis pour ce coiffeur.'], 422);
        }

        $review = Review::create([
            'hairdresser_id' => $hairdresserId,
            'client_id'      => $user->id,
            'rating'         => $request->rating,
            'comment'        => $request->comment,
            'specialty'      => $request->specialty,
            'is_verified'    => false,
        ]);

        // Recalculer avg_rating et reviews_count
        $avg   = Review::where('hairdresser_id', $hairdresserId)->avg('rating');
        $count = Review::where('hairdresser_id', $hairdresserId)->count();
        $hairdresser->update(['avg_rating' => round($avg, 2), 'reviews_count' => $count]);

        return response()->json($review->load('client'), 201);
    }

    public function reply(Request $request, int $reviewId)
    {
        $request->validate([
            'reply' => 'required|string|min:1|max:1000',
        ]);

        $review = Review::findOrFail($reviewId);
        $user   = $request->user();

        $hairdresser = HairdresserProfile::where('user_id', $user->id)->first();
        if (!$hairdresser || $hairdresser->id !== $review->hairdresser_id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $review->update([
            'hairdresser_reply' => $request->reply,
            'replied_at'        => now(),
        ]);

        StreakService::record($hairdresser);

        return response()->json($review->load('client'));
    }
}
