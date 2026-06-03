<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedPost;
use App\Models\Post;
use Illuminate\Http\Request;

class SavedPostController extends Controller
{
    /** GET /saved-posts — liste des inspirations de l'utilisateur connecté */
    public function index(Request $request)
    {
        $user = $request->user();

        $savedPosts = SavedPost::where('user_id', $user->id)
            ->with(['post' => function ($q) {
                $q->with(['hairdresser.user', 'specialty', 'images']);
            }])
            ->orderByDesc('created_at')
            ->get()
            ->pluck('post')
            ->filter()
            ->values();

        return response()->json($savedPosts);
    }

    /** POST /saved-posts/{postId} — sauvegarder une réalisation */
    public function save(Request $request, int $postId)
    {
        $user = $request->user();

        Post::findOrFail($postId);

        SavedPost::firstOrCreate([
            'user_id' => $user->id,
            'post_id' => $postId,
        ]);

        return response()->json(['saved' => true]);
    }

    /** DELETE /saved-posts/{postId} — retirer une inspiration */
    public function unsave(Request $request, int $postId)
    {
        $user = $request->user();

        SavedPost::where('user_id', $user->id)->where('post_id', $postId)->delete();

        return response()->json(['saved' => false]);
    }

    /** GET /saved-posts/{postId}/status — statut pour un post */
    public function status(Request $request, int $postId)
    {
        $user = $request->user();
        $saved = SavedPost::where('user_id', $user->id)->where('post_id', $postId)->exists();
        return response()->json(['saved' => $saved]);
    }
}
