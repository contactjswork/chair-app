<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Services\StoryService;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    /** GET /stories/feed — bulles des coiffeurs suivis uniquement (client). */
    public function feed(Request $request)
    {
        return response()->json(['bubbles' => StoryService::feedFor($request->user())]);
    }

    /** GET /stories/mine — mes propres stories actives (coiffeur). */
    public function mine(Request $request)
    {
        return response()->json(StoryService::mine($request->user()));
    }

    /** GET /stories/by-hairdresser/{id} — lecteur plein écran. */
    public function byHairdresser(int $hairdresserId)
    {
        return response()->json(StoryService::forHairdresser($hairdresserId));
    }

    /**
     * POST /stories — création, réservée CHAIR+ (voir StoryService::create,
     * abort 403 si non-abonné).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'media'                   => 'required|file|mimes:jpeg,png,webp,mp4,mov|max:51200',
            'type'                    => 'required|in:image,video',
            // Même limite que le portfolio (15s max) — mesurée côté client via
            // onLoadedMetadata, revalidée ici (aucune lib de transcodage
            // serveur dans ce stack pour la vérifier autrement).
            'video_duration_seconds'  => 'nullable|integer|min:1|max:15',
        ]);

        $story = StoryService::create(
            $request->user(),
            $request->file('media'),
            $validated['type'],
            $validated['video_duration_seconds'] ?? null
        );

        return response()->json($story, 201);
    }

    /** POST /stories/{id}/view — enregistre une vue (dédupliquée par spectateur). */
    public function view(Request $request, int $id)
    {
        $story = Story::findOrFail($id);
        StoryService::recordView($story, $request->user());

        return response()->json(['views_count' => $story->fresh()->views_count]);
    }

    /** DELETE /stories/{id} — suppression manuelle, auteur uniquement. */
    public function destroy(Request $request, int $id)
    {
        $story = Story::findOrFail($id);
        if (!StoryService::delete($story, $request->user())) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        return response()->json(['message' => 'Story supprimée.']);
    }
}
