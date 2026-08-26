<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContentFilter;
use App\Models\Post;
use App\Models\PostImage;
use App\Services\BadgeService;
use App\Services\CloudinaryService;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\PushService;
use App\Services\StreakService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

        // Vue réelle — jamais comptée pour le propriétaire qui consulte sa
        // propre réalisation, sinon le compteur ne voudrait plus rien dire.
        if (!$user || $user->id !== ($post->hairdresser->user_id ?? null)) {
            $post->increment('views_count');
        }

        $data = $post->toArray();
        $data['liked_by_user'] = $user
            ? DB::table('post_likes')->where('post_id', $postId)->where('user_id', $user->id)->exists()
            : false;
        $data['saved_by_user'] = $user
            ? DB::table('saved_posts')->where('post_id', $postId)->where('user_id', $user->id)->exists()
            : false;
        $data['saved_count'] = DB::table('saved_posts')->where('post_id', $postId)->count();

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
            ->orderByDesc('is_pinned')
            ->orderBy('display_order')
            ->orderByDesc('created_at')
            ->get();

        // saved_count réel (pas de compteur dénormalisé sur posts, contrairement
        // à likes_count) — une seule requête groupée plutôt qu'une par post.
        $savedCounts = DB::table('saved_posts')
            ->whereIn('post_id', $posts->pluck('id'))
            ->selectRaw('post_id, COUNT(*) as cnt')
            ->groupBy('post_id')
            ->pluck('cnt', 'post_id');

        $posts->each(function ($post) use ($savedCounts) {
            $post->saved_count = (int) ($savedCounts[$post->id] ?? 0);
        });

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

        // ── Vidéo courte (CHAIR+) ─────────────────────────────────────
        if ($request->hasFile('video')) {
            if (!$profile->hasChairPlus()) {
                return response()->json([
                    'message'              => 'Les vidéos courtes sont réservées aux abonnés CHAIR+.',
                    'chair_plus_required'  => true,
                ], 403);
            }

            $request->validate([
                // 25 Mo — plafond volontaire pour maîtriser le coût de stockage
                // Cloudinary (voir docs/CHAIR_PLUS.md) ; durée/résolution/codec
                // (15s max, 1080x1920, H264) sont des contraintes déclarées côté
                // client (enregistrement/compression avant envoi) — aucune lib de
                // transcodage serveur n'existe dans ce stack pour les vérifier ici.
                'video'            => 'required|mimes:mp4,mov|max:25600',
                'video_duration_seconds' => 'nullable|integer|min:1|max:15',
                'description'      => 'nullable|string|max:1000',
                'gender'           => 'nullable|string|in:homme,femme',
                'specialty_id'     => 'nullable|integer|exists:specialties,id',
                'tag_ids'          => 'nullable|string',
            ]);

        // Filtrage au dépôt des légendes de réalisation (App Store Review
        // Guideline 1.2). Le média lui-même n'est pas analysé — c'est dit tel
        // quel dans les notes de review : les images relèvent du signalement.
        if ($reason = ContentFilter::check($request->input('description'))) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

            $videoUrl = $cloudinary->upload($request->file('video'), 'chair/post-videos', 'video');
            // Cloudinary génère une vignette JPG automatique pour toute vidéo
            // uploadée (même chemin, extension changée) — pas d'appel séparé.
            $thumbnailUrl = preg_replace('/\.(mp4|mov|MP4|MOV)$/', '.jpg', $videoUrl);

            $post = Post::create([
                'hairdresser_id'          => $profile->id,
                'specialty_id'            => $request->input('specialty_id'),
                'gender'                  => $request->input('gender'),
                'type'                    => 'video',
                'description'             => $request->input('description'),
                'cover_image'             => $thumbnailUrl,
                'video_url'               => $videoUrl,
                'video_thumbnail_url'     => $thumbnailUrl,
                'video_duration_seconds'  => $request->input('video_duration_seconds'),
                'is_published'            => true,
                'views_count'             => 0,
                'likes_count'             => 0,
            ]);

            $this->syncTags($post, $request->input('specialty_id'), $request->input('tag_ids'));
            $profile->increment('posts_count');
            StreakService::record($profile);
            BadgeService::refresh($profile);

            // Notifie les abonnés du coiffeur (fenêtre calme + plafonds gérés).
            $this->notifyFollowersOfPublication($post, $profile);

            return response()->json($post->load(['specialty', 'tags', 'images']), 201);
        }

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

        // Filtrage au dépôt des légendes de réalisation (App Store Review
        // Guideline 1.2). Le média lui-même n'est pas analysé — c'est dit tel
        // quel dans les notes de review : les images relèvent du signalement.
        if ($reason = ContentFilter::check($request->input('description'))) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

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
            StreakService::record($profile);
            BadgeService::refresh($profile);

            // Notifie les abonnés du coiffeur (fenêtre calme + plafonds gérés).
            $this->notifyFollowersOfPublication($post, $profile);

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

        // Filtrage au dépôt des légendes de réalisation (App Store Review
        // Guideline 1.2). Le média lui-même n'est pas analysé — c'est dit tel
        // quel dans les notes de review : les images relèvent du signalement.
        if ($reason = ContentFilter::check($request->input('description'))) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

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
        StreakService::record($profile);
        BadgeService::refresh($profile);

        // Notifie les abonnés du coiffeur (fenêtre calme + plafonds gérés).
        $this->notifyFollowersOfPublication($post, $profile);

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
            // Archiver = dépublier sans supprimer : disparaît du feed public et
            // des classements/scores (mêmes filtres que show()/index() public),
            // reste visible sur le portfolio du coiffeur lui-même (index() ici
            // ne filtre pas is_published).
            'is_published' => 'nullable|boolean',
        ]);

        // Filtrage au dépôt des légendes de réalisation (App Store Review
        // Guideline 1.2). Le média lui-même n'est pas analysé — c'est dit tel
        // quel dans les notes de review : les images relèvent du signalement.
        if ($reason = ContentFilter::check($request->input('description'))) {
            return response()->json(['message' => ContentFilter::message($reason)], 422);
        }

        $wasPublished = (bool) $post->is_published;

        $post->update([
            'description'  => $validated['description'] ?? $post->description,
            'gender'       => array_key_exists('gender', $validated) ? $validated['gender'] : $post->gender,
            'specialty_id' => array_key_exists('specialty_id', $validated) ? $validated['specialty_id'] : $post->specialty_id,
            'is_published' => array_key_exists('is_published', $validated) ? $validated['is_published'] : $post->is_published,
        ]);

        // Republication (archivé → publié) : mêmes notifications abonnés qu'à
        // la création. Le plafond 6 h par (abonné, coiffeur) évite qu'un
        // coiffeur qui archive/républie en boucle spamme ses abonnés en push.
        if (!$wasPublished && (bool) $post->is_published) {
            $this->notifyFollowersOfPublication($post, $profile);
        }

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
        if ($post->video_url) {
            $cloudinary->deleteOldMedia($post->video_url);
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
    // ÉPINGLER
    // ════════════════════════════════════════════════════════════════

    const MAX_PINNED_POSTS = 3;

    /**
     * POST /posts/{id}/pin — épingle/désépingle une réalisation en tête de
     * portfolio. Limite de MAX_PINNED_POSTS épinglées appliquée côté
     * frontend ET ici (défense en profondeur — le frontend seul ne protège
     * pas contre un appel API direct).
     */
    public function togglePin(Request $request, int $postId)
    {
        $profile = $request->user()->hairdresserProfile;
        $post    = Post::where('id', $postId)
            ->where('hairdresser_id', $profile?->id)
            ->firstOrFail();

        if (!$post->is_pinned) {
            $pinnedCount = Post::where('hairdresser_id', $profile?->id)
                ->where('is_pinned', true)
                ->count();

            if ($pinnedCount >= self::MAX_PINNED_POSTS) {
                return response()->json([
                    'message' => 'Vous ne pouvez épingler que ' . self::MAX_PINNED_POSTS . ' réalisations maximum. Désépinglez-en une avant d\'en ajouter une nouvelle.',
                ], 422);
            }
        }

        $post->update(['is_pinned' => !$post->is_pinned]);

        return response()->json(['is_pinned' => $post->is_pinned]);
    }

    // ════════════════════════════════════════════════════════════════
    // RÉORGANISER
    // ════════════════════════════════════════════════════════════════

    /**
     * PUT /posts/reorder — réordonne le portfolio après un drag & drop.
     * Reçoit la liste COMPLÈTE des IDs dans le nouvel ordre souhaité.
     */
    public function reorder(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'order'   => 'required|array|min:1',
            'order.*' => 'integer',
        ]);

        $ownedIds = Post::where('hairdresser_id', $profile->id)
            ->whereIn('id', $validated['order'])
            ->pluck('id')
            ->all();

        foreach ($validated['order'] as $index => $postId) {
            if (!in_array($postId, $ownedIds, true)) continue; // ignore un id qui n'appartient pas au coiffeur
            Post::where('id', $postId)->update(['display_order' => $index]);
        }

        return response()->json(['ok' => true]);
    }

    // ════════════════════════════════════════════════════════════════
    // HELPER — notification des abonnés à la publication
    // ════════════════════════════════════════════════════════════════

    /** Plafond de pushes par publication (fan-out synchrone, cf. commentaire). */
    private const FOLLOWER_PUSH_CAP = 100;

    /** Un abonné ne reçoit pas 2 pushes du même coiffeur en moins de 6 h. */
    private const SOCIAL_PUSH_COOLDOWN_HOURS = 6;

    /**
     * Notifie les abonnés du coiffeur qu'une réalisation vient d'être publiée
     * (type new_post, préférence followed_post). Stratégie complète :
     * docs/PUSH_NOTIFICATIONS.md § Stratégie d'envoi. En résumé :
     *
     *  - Notification INTERNE pour tous les abonnés dont la préférence
     *    followed_post est active — toujours, sans plafond ni horaire.
     *  - PUSH seulement si : hors fenêtre calme (21 h - 9 h, PushService),
     *    pas de push du même coiffeur depuis moins de 6 h pour cet abonné
     *    (table social_push_logs), et dans le plafond de 100 pushes par
     *    publication.
     *
     * POURQUOI un plafond de 100 : QUEUE_CONNECTION=sync en prod (mutualisé,
     * pas de worker) — ce fan-out s'exécute DANS la requête HTTP du pro qui
     * publie. 100 appels APNs séquentiels restent supportables ; au-delà, les
     * abonnés les plus récents sont poussés en premier, les autres gardent la
     * notification interne, et un log l'enregistre.
     *
     * Best-effort : ne fait JAMAIS échouer la publication.
     */
    private function notifyFollowersOfPublication(Post $post, $profile): void
    {
        try {
            if (!$post->is_published || !$profile) {
                return;
            }

            // Abonnés, les plus récents d'abord (ce sont eux qui sont poussés
            // en premier si le plafond de pushes est atteint).
            $followerIds = DB::table('follows')
                ->where('hairdresser_id', $profile->id)
                ->orderByDesc('created_at')
                ->pluck('follower_id');

            if ($followerIds->isEmpty()) {
                return;
            }

            if ($followerIds->count() > self::FOLLOWER_PUSH_CAP) {
                Log::info('followed_post fan-out : plafond de pushes atteint', [
                    'post_id'        => $post->id,
                    'hairdresser_id' => $profile->id,
                    'followers'      => $followerIds->count(),
                    'push_cap'       => self::FOLLOWER_PUSH_CAP,
                ]);
            }

            $coiffeurName = $profile->user->name ?? null;
            $vars         = ['coiffeur' => $coiffeurName];
            $data         = ['post_id' => $post->id, 'url' => '/app/realisation/' . $post->id];
            $quietHours   = PushService::inQuietHours();
            $pushBudget   = self::FOLLOWER_PUSH_CAP;
            $now          = now();

            foreach ($followerIds->chunk(50) as $chunk) {
                // Abonnés déjà poussés par CE coiffeur il y a moins de 6 h :
                // notification interne seulement (anti-rafale).
                $throttled = DB::table('social_push_logs')
                    ->whereIn('user_id', $chunk)
                    ->where('hairdresser_id', $profile->id)
                    ->where('last_pushed_at', '>', $now->copy()->subHours(self::SOCIAL_PUSH_COOLDOWN_HOURS))
                    ->pluck('user_id')
                    ->all();

                foreach ($chunk as $followerId) {
                    $followerId = (int) $followerId;
                    $withPush   = !$quietHours
                        && $pushBudget > 0
                        && !in_array($followerId, $throttled, true);

                    if ($withPush) {
                        // Interne + push d'un coup — préférence vérifiée dedans.
                        // (La fenêtre calme est de toute façon re-vérifiée par
                        // PushService : double rempart, pas de double logique.)
                        $notif = NotificationService::sendTyped(
                            $followerId,
                            'new_post',
                            $vars,
                            NotificationCopy::AUDIENCE_CLIENT,
                            $data
                        );

                        if ($notif !== null) {
                            $pushBudget--;
                            DB::table('social_push_logs')->upsert(
                                [[
                                    'user_id'        => $followerId,
                                    'hairdresser_id' => $profile->id,
                                    'last_pushed_at' => $now,
                                ]],
                                ['user_id', 'hairdresser_id'],
                                ['last_pushed_at']
                            );
                        }
                    } else {
                        // Notification interne seule (préférence respectée).
                        NotificationService::sendTypedWithoutPush(
                            $followerId,
                            'new_post',
                            $vars,
                            NotificationCopy::AUDIENCE_CLIENT,
                            $data
                        );
                    }
                }
            }
        } catch (\Throwable $e) {
            // Un échec de notification ne doit jamais faire échouer la
            // publication d'une réalisation.
            Log::warning('followed_post fan-out failed', [
                'post_id' => $post->id ?? null,
                'error'   => $e->getMessage(),
            ]);
        }
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
