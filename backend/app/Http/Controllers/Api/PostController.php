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
    // ════════════════════════════════════════════════════════════════
    // AFFICHAGE PUBLIC
    // ════════════════════════════════════════════════════════════════

    public function show(int $postId)
    {
        $post = Post::with(['hairdresser.user', 'hairdresser.salon', 'specialty', 'tags', 'images'])
            ->where('id', $postId)
            ->where('is_published', true)
            ->firstOrFail();

        $user = \Auth::guard('sanctum')->user();
        $data = $post->toArray();
        $data['liked_by_user'] = $user
            ? DB::table('post_likes')->where('post_id', $postId)->where('user_id', $user->id)->exists()
            : false;
        $data['saved_by_user'] = $user
            ? DB::table('saved_posts')->where('post_id', $postId)->where('user_id', $user->id)->exists()
            : false;

        return response()->json($data);
    }

    // ════════════════════════════════════════════════════════════════
    // LISTE (dashboard coiffeur)
    // ════════════════════════════════════════════════════════════════

    public function index(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $posts = Post::with(['specialty', 'tags', 'images'])
            ->where('hairdresser_id', $profile->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($posts);
    }

    // ════════════════════════════════════════════════════════════════
    // CRÉER
    // ════════════════════════════════════════════════════════════════

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
                'gender'       => 'nullable|string|in:homme,femme',
                'specialty_id' => 'nullable|integer|exists:specialties,id',
                'tag_ids'      => 'nullable|string', // JSON array ou CSV
            ]);

            $post = Post::create([
                'hairdresser_id'   => $profile->id,
                'specialty_id'     => $request->input('specialty_id'),
                'gender'           => $request->input('gender'),
                'type'             => 'result',
                'description'      => $request->input('description'),
                'duration_minutes' => null,
                'price_indication' => null,
                'cover_image'      => null,
                'is_published'     => true,
                'views_count'      => 0,
                'likes_count'      => 0,
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

            $this->syncTags($post, $request->input('specialty_id'), $request->input('tag_ids'));
            $profile->increment('posts_count');

            return response()->json($post->load(['specialty', 'tags', 'images']), 201);
        }

        // ── Ancien format : after_image (compat) ────────────────────
        $request->validate([
            'after_image'      => 'required|image|mimes:jpeg,png,webp|max:5120',
            'before_image'     => 'nullable|image|mimes:jpeg,png,webp|max:5120',
            'description'      => 'nullable|string|max:1000',
            'gender'           => 'nullable|string|in:homme,femme',
            'specialty_id'     => 'nullable|integer|exists:specialties,id',
            'tag_ids'          => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:0|max:480',
            'price_indication' => 'nullable|numeric|min:0|max:9999',
        ]);

        $hasBeforeImage = $request->hasFile('before_image');
        $type           = $hasBeforeImage ? 'before_after' : 'result';
        $afterUrl       = $cloudinary->upload($request->file('after_image'), 'chair/posts');

        $post = Post::create([
            'hairdresser_id'   => $profile->id,
            'specialty_id'     => $request->input('specialty_id'),
            'gender'           => $request->input('gender'),
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

        $this->syncTags($post, $request->input('specialty_id'), $request->input('tag_ids'));
        $profile->increment('posts_count');

        return response()->json($post->load(['specialty', 'tags', 'images']), 201);
    }

    // ════════════════════════════════════════════════════════════════
    // MODIFIER
    // ════════════════════════════════════════════════════════════════

    public function update(Request $request, int $postId)
    {
        $profile = $request->user()->hairdresserProfile;
        $post    = Post::where('id', $postId)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        $validated = $request->validate([
            'description'  => 'nullable|string|max:1000',
            'gender'       => 'nullable|string|in:homme,femme',
            'specialty_id' => 'nullable|integer|exists:specialties,id',
            'tag_ids'      => 'nullable|string',
        ]);

        $post->update([
            'description'  => $validated['description'] ?? $post->description,
            'gender'       => array_key_exists('gender', $validated) ? $validated['gender'] : $post->gender,
            'specialty_id' => array_key_exists('specialty_id', $validated) ? $validated['specialty_id'] : $post->specialty_id,
        ]);

        if (array_key_exists('specialty_id', $validated) || array_key_exists('tag_ids', $validated)) {
            $this->syncTags(
                $post,
                $validated['specialty_id'] ?? $post->specialty_id,
                $request->input('tag_ids')
            );
        }

        return response()->json($post->fresh()->load(['specialty', 'tags', 'images']));
    }

    // ════════════════════════════════════════════════════════════════
    // SUPPRIMER
    // ════════════════════════════════════════════════════════════════

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
        $post->tags()->detach();
        $post->delete();

        if ($profile && $profile->posts_count > 0) {
            $profile->decrement('posts_count');
        }

        return response()->json(['message' => 'Réalisation supprimée']);
    }

    // ════════════════════════════════════════════════════════════════
    // LIKE
    // ════════════════════════════════════════════════════════════════

    public function toggleLike(Request $request, int $postId)
    {
        $post   = Post::where('is_published', true)->findOrFail($postId);
        $userId = $request->user()->id;

        $liked = DB::table('post_likes')
            ->where('post_id', $postId)->where('user_id', $userId)->exists();

        if ($liked) {
            DB::table('post_likes')->where('post_id', $postId)->where('user_id', $userId)->delete();
            $post->decrement('likes_count');
            return response()->json(['liked' => false, 'likes_count' => max(0, $post->fresh()->likes_count)]);
        }

        DB::table('post_likes')->insert(['post_id' => $postId, 'user_id' => $userId, 'created_at' => now()]);
        $post->increment('likes_count');
        return response()->json(['liked' => true, 'likes_count' => $post->fresh()->likes_count]);
    }

    // ════════════════════════════════════════════════════════════════
    // HELPER — synchronisation des tags
    // ════════════════════════════════════════════════════════════════

    /**
     * Synchronise post_tags à partir de :
     *  - specialty_id (tag primaire/display)
     *  - tag_ids (JSON array ou CSV d'IDs supplémentaires)
     *
     * Le résultat = union des deux, dédupliqué.
     */
    private function syncTags(Post $post, $specialtyId, $tagIdsRaw): void
    {
        $ids = [];

        if ($specialtyId) {
            $ids[] = (int) $specialtyId;
        }

        if ($tagIdsRaw) {
            $parsed = is_array($tagIdsRaw)
                ? $tagIdsRaw
                : (json_decode($tagIdsRaw, true) ?? explode(',', $tagIdsRaw));
            foreach ($parsed as $id) {
                $int = (int) $id;
                if ($int > 0) $ids[] = $int;
            }
        }

        $ids = array_unique(array_filter($ids));

        if (empty($ids)) {
            $post->tags()->detach();
            return;
        }

        $post->tags()->sync($ids);
    }
}
