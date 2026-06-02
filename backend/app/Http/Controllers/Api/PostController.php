<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostImage;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PostController extends Controller
{
    /**
     * Afficher une réalisation publique avec son contexte.
     * Inclut liked_by_user si un token Sanctum est présent.
     */
    public function show(int $postId)
    {
        $post = Post::with(['hairdresser.user', 'hairdresser.salon', 'specialty', 'images'])
            ->where('id', $postId)
            ->where('is_published', true)
            ->firstOrFail();

        $user   = \Auth::guard('sanctum')->user();
        $data   = $post->toArray();
        $data['liked_by_user'] = $user
            ? DB::table('post_likes')->where('post_id', $postId)->where('user_id', $user->id)->exists()
            : false;

        return response()->json($data);
    }

    /**
     * Liste des réalisations du coiffeur connecté.
     */
    public function index(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $posts = Post::with(['specialty', 'images'])
            ->where('hairdresser_id', $profile->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($posts);
    }

    /**
     * Créer une réalisation.
     * Accepte images[] (1–10 fichiers) OU after_image + before_image (compat legacy).
     */
    public function store(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $cloudinary = new CloudinaryService();

        // ── Nouveau format : images[] ────────────────────────────────
        if ($request->hasFile('images')) {
            $request->validate([
                'images'       => 'required|array|min:1|max:10',
                'images.*'     => 'image|mimes:jpeg,png,webp|max:5120',
                'description'  => 'nullable|string|max:1000',
                'specialty_id' => 'nullable|integer|exists:specialties,id',
            ]);

            $post = Post::create([
                'hairdresser_id' => $profile->id,
                'specialty_id'   => $request->input('specialty_id'),
                'type'           => 'result',
                'description'    => $request->input('description'),
                'duration_minutes' => null,
                'price_indication' => null,
                'cover_image'    => null,
                'is_published'   => true,
                'views_count'    => 0,
                'likes_count'    => 0,
            ]);

            foreach ($request->file('images') as $index => $file) {
                $url = $cloudinary->upload($file, 'chair/posts');
                if ($index === 0) {
                    $post->update(['cover_image' => $url]);
                }
                PostImage::create([
                    'post_id' => $post->id,
                    'url'     => $url,
                    'type'    => 'result',
                    'order'   => $index,
                ]);
            }

            $profile->increment('posts_count');
            return response()->json($post->load(['specialty', 'images']), 201);
        }

        // ── Ancien format : after_image (compat) ────────────────────
        $request->validate([
            'after_image'      => 'required|image|mimes:jpeg,png,webp|max:5120',
            'before_image'     => 'nullable|image|mimes:jpeg,png,webp|max:5120',
            'description'      => 'nullable|string|max:1000',
            'specialty_id'     => 'nullable|integer|exists:specialties,id',
            'duration_minutes' => 'nullable|integer|min:0|max:480',
            'price_indication' => 'nullable|numeric|min:0|max:9999',
        ]);

        $hasBeforeImage = $request->hasFile('before_image');
        $type           = $hasBeforeImage ? 'before_after' : 'result';
        $afterUrl       = $cloudinary->upload($request->file('after_image'), 'chair/posts');

        $post = Post::create([
            'hairdresser_id'   => $profile->id,
            'specialty_id'     => $request->input('specialty_id'),
            'type'             => $type,
            'description'      => $request->input('description'),
            'duration_minutes' => $request->input('duration_minutes'),
            'price_indication' => $request->input('price_indication'),
            'cover_image'      => $afterUrl,
            'is_published'     => true,
            'views_count'      => 0,
            'likes_count'      => 0,
        ]);

        PostImage::create(['post_id' => $post->id, 'url' => $afterUrl, 'type' => 'after', 'order' => 1]);

        if ($hasBeforeImage) {
            $beforeUrl = $cloudinary->upload($request->file('before_image'), 'chair/posts');
            PostImage::create(['post_id' => $post->id, 'url' => $beforeUrl, 'type' => 'before', 'order' => 0]);
        }

        $profile->increment('posts_count');
        return response()->json($post->load(['specialty', 'images']), 201);
    }

    /**
     * Modifier description et spécialité d'une réalisation.
     */
    public function update(Request $request, int $postId)
    {
        $profile = $request->user()->hairdresserProfile;
        $post    = Post::where('id', $postId)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'description'  => 'nullable|string|max:1000',
            'specialty_id' => 'nullable|integer|exists:specialties,id',
        ]);

        $post->update($validated);

        return response()->json($post->fresh()->load(['specialty', 'images']));
    }

    /**
     * Supprimer une réalisation + ses fichiers (Cloudinary ou local).
     */
    public function destroy(Request $request, int $postId)
    {
        $profile = $request->user()->hairdresserProfile;
        $post    = Post::where('id', $postId)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $cloudinary = new CloudinaryService();

        foreach ($post->images as $image) {
            $cloudinary->deleteOldMedia($image->url);
        }

        $post->images()->delete();
        $post->delete();

        if ($profile && $profile->posts_count > 0) {
            $profile->decrement('posts_count');
        }

        return response()->json(['message' => 'Réalisation supprimée']);
    }

    /**
     * Basculer le like d'une réalisation (authentifié requis).
     */
    public function toggleLike(Request $request, int $postId)
    {
        $post = Post::where('is_published', true)->findOrFail($postId);
        $userId = $request->user()->id;

        $liked = DB::table('post_likes')
            ->where('post_id', $postId)
            ->where('user_id', $userId)
            ->exists();

        if ($liked) {
            DB::table('post_likes')
                ->where('post_id', $postId)
                ->where('user_id', $userId)
                ->delete();
            $post->decrement('likes_count');
            $newCount = max(0, $post->fresh()->likes_count);
            return response()->json(['liked' => false, 'likes_count' => $newCount]);
        }

        DB::table('post_likes')->insert([
            'post_id'    => $postId,
            'user_id'    => $userId,
            'created_at' => now(),
        ]);
        $post->increment('likes_count');

        return response()->json(['liked' => true, 'likes_count' => $post->fresh()->likes_count]);
    }
}
