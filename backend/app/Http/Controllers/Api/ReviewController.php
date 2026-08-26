<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Review;
use App\Services\BadgeService;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
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

        // Première réponse ou modification ? On ne notifie que la PREMIÈRE :
        // un coiffeur qui corrige une faute ne doit pas re-vibrer le client.
        $isFirstReply = trim((string) $review->hairdresser_reply) === '';

        $review->update([
            'hairdresser_reply' => $request->reply,
            'replied_at'        => now(),
        ]);

        StreakService::record($hairdresser);
        BadgeService::refresh($hairdresser);

        // Notifie l'auteur de l'avis (type review_reply, préférence respectée).
        // Avis invité (déposé via review_token, sans compte) : client_id NULL
        // → personne à notifier dans l'app, on saute proprement.
        if ($isFirstReply && $review->client_id) {
            $data = ['review_id' => $review->id, 'hairdresser_id' => $hairdresser->id];
            if ($hairdresser->slug) {
                // Deep link : la fiche du coiffeur (les avis y sont affichés).
                $data['url'] = '/app/coiffeur/' . $hairdresser->slug;
            }

            NotificationService::sendTyped(
                (int) $review->client_id,
                'review_reply',
                ['coiffeur' => $user->name ?? null],
                NotificationCopy::AUDIENCE_CLIENT,
                $data
            );
        }

        return response()->json($review->load('client'));
    }
}
