<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    /**
     * Afficher une réalisation publique avec son contexte.
     */
    public function show(int $postId)
    {
        $post = Post::with(['hairdresser.user', 'hairdresser.salon', 'specialty', 'images'])
            ->where('id', $postId)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json($post);
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
     * after_image obligatoire (résultat), before_image optionnel (avant).
     */
    public function store(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

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

        $afterPath = $request->file('after_image')->store('posts', 'public');
        $afterUrl  = '/storage/' . $afterPath;

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

        PostImage::create([
            'post_id' => $post->id,
            'url'     => $afterUrl,
            'type'    => 'after',
            'order'   => 1,
        ]);

        if ($hasBeforeImage) {
            $beforePath = $request->file('before_image')->store('posts', 'public');
            $beforeUrl  = '/storage/' . $beforePath;
            PostImage::create([
                'post_id' => $post->id,
                'url'     => $beforeUrl,
                'type'    => 'before',
                'order'   => 0,
            ]);
        }

        $profile->increment('posts_count');

        return response()->json($post->load(['specialty', 'images']), 201);
    }

    /**
     * Modifier description, spécialité, durée, prix.
     */
    public function update(Request $request, int $postId)
    {
        $profile = $request->user()->hairdresserProfile;
        $post    = Post::where('id', $postId)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'description'      => 'nullable|string|max:1000',
            'specialty_id'     => 'nullable|integer|exists:specialties,id',
            'duration_minutes' => 'nullable|integer|min:0|max:480',
            'price_indication' => 'nullable|numeric|min:0|max:9999',
        ]);

        $post->update($validated);

        return response()->json($post->fresh()->load(['specialty', 'images']));
    }

    /**
     * Supprimer une réalisation + ses fichiers.
     */
    public function destroy(Request $request, int $postId)
    {
        $profile = $request->user()->hairdresserProfile;
        $post    = Post::where('id', $postId)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        foreach ($post->images as $image) {
            if (str_starts_with($image->url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $image->url));
            }
        }

        $post->images()->delete();
        $post->delete();

        if ($profile && $profile->posts_count > 0) {
            $profile->decrement('posts_count');
        }

        return response()->json(['message' => 'Réalisation supprimée']);
    }
}
