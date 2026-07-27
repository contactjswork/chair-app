<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Review;
use App\Services\BadgeService;
use App\Services\StreakService;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
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
        BadgeService::refresh($hairdresser);

        return response()->json($review->load('client'));
    }
}
