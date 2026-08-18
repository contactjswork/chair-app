<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Stories CHAIR+ — voir docs/CHAIR_PLUS.md. Outil de fidélisation
 * quotidienne réservé aux abonnés, jamais un feed de découverte : un client
 * ne voit que les stories des coiffeurs qu'il suit, jamais de stories
 * d'inconnus, jamais d'algorithme.
 */
class StoryService
{
    const LIFETIME_HOURS = 24;

    public static function create(User $author, UploadedFile $file, string $type, ?int $videoDurationSeconds = null): Story
    {
        $profile = $author->hairdresserProfile;
        if (!$profile || !$profile->hasChairPlus()) {
            abort(403, 'Les stories sont réservées aux abonnés CHAIR+.');
        }

        $cloudinary = new CloudinaryService();
        $url = $cloudinary->upload($file, 'chair/stories', $type === 'video' ? 'video' : 'image');

        return Story::create([
            'user_id'                 => $author->id,
            'media_url'               => $url,
            'type'                    => $type,
            'video_duration_seconds'  => $type === 'video' ? $videoDurationSeconds : null,
            'expires_at'              => now()->addHours(self::LIFETIME_HOURS),
            'views_count'             => 0,
            'created_at'              => now(),
        ]);
    }

    /** Mes propres stories actives (gestion/preview côté coiffeur). */
    public static function mine(User $author)
    {
        return Story::where('user_id', $author->id)->active()->orderBy('created_at')->get();
    }

    /**
     * Bulles pour la home client — UNIQUEMENT les coiffeurs suivis, jamais un
     * feed mondial. Une bulle par coiffeur ayant au moins une story active.
     */
    public static function feedFor(User $client): array
    {
        $followedHairdresserIds = DB::table('follows')
            ->where('follower_id', $client->id)
            ->pluck('hairdresser_id');

        if ($followedHairdresserIds->isEmpty()) return [];

        $authors = HairdresserProfile::whereIn('id', $followedHairdresserIds)
            ->with('user')
            ->get()
            ->keyBy('user_id');

        if ($authors->isEmpty()) return [];

        $stories = Story::whereIn('user_id', $authors->keys())
            ->active()
            ->orderBy('created_at')
            ->get()
            ->groupBy('user_id');

        if ($stories->isEmpty()) return [];

        $seenStoryIds = StoryView::where('user_id', $client->id)
            ->whereIn('story_id', $stories->flatten()->pluck('id'))
            ->pluck('story_id')
            ->all();

        $bubbles = [];
        foreach ($stories as $userId => $userStories) {
            $profile = $authors->get($userId);
            if (!$profile) continue;

            $hasUnseen = $userStories->contains(fn($s) => !in_array($s->id, $seenStoryIds, true));

            $bubbles[] = [
                'hairdresser_id' => $profile->id,
                'slug'           => $profile->slug,
                'name'           => $profile->user->name,
                'avatar'         => $profile->user->avatar,
                'stories_count'  => $userStories->count(),
                'has_unseen'     => $hasUnseen,
            ];
        }

        // Non vues en premier — réflexe quotidien, pas une liste figée.
        usort($bubbles, fn($a, $b) => ($b['has_unseen'] <=> $a['has_unseen']));

        return $bubbles;
    }

    /** Stories actives d'un coiffeur précis, pour le lecteur plein écran. */
    public static function forHairdresser(int $hairdresserId)
    {
        $profile = HairdresserProfile::find($hairdresserId);
        if (!$profile) return collect();

        return Story::where('user_id', $profile->user_id)->active()->orderBy('created_at')->get();
    }

    public static function recordView(Story $story, User $viewer): void
    {
        if ($story->user_id === $viewer->id) return; // l'auteur ne compte pas comme spectateur

        $created = StoryView::firstOrCreate(
            ['story_id' => $story->id, 'user_id' => $viewer->id],
            ['created_at' => now()]
        );

        if ($created->wasRecentlyCreated) {
            $story->increment('views_count');
        }
    }

    public static function delete(Story $story, User $requester): bool
    {
        if ($story->user_id !== $requester->id) return false;
        (new CloudinaryService())->deleteOldMedia($story->media_url);
        $story->delete();
        return true;
    }

    /** Purge des stories expirées — commande planifiée quotidienne. */
    public static function purgeExpired(): int
    {
        $expired = Story::where('expires_at', '<=', now())->get();
        $cloudinary = new CloudinaryService();
        foreach ($expired as $story) {
            $cloudinary->deleteOldMedia($story->media_url);
        }
        return Story::where('expires_at', '<=', now())->delete();
    }
}
