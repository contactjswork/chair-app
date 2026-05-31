<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Retourne le profil complet du coiffeur connecté (pour l'édition).
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = $user->hairdresserProfile()->with('specialties')->first();

        if (!$profile) {
            // Auto-création si le compte coiffeur n'a pas encore de profil
            $base = \Illuminate\Support\Str::slug($user->name ?: 'coiffeur-' . $user->id);
            $slug = $base;
            $i    = 1;
            while (\App\Models\HairdresserProfile::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $profile = \App\Models\HairdresserProfile::create([
                'user_id'         => $user->id,
                'slug'            => $slug,
                'city'            => $user->city,
                'is_independent'  => true,
                'is_verified'     => false,
                'followers_count' => 0,
                'posts_count'     => 0,
                'avg_rating'      => 0,
                'reviews_count'   => 0,
            ]);
            $profile->load('specialties');
        }

        return response()->json([
            'user'    => $user,
            'profile' => $profile,
        ]);
    }

    /**
     * Mise à jour des données texte du profil.
     */
    public function update(Request $request)
    {
        $user = $request->user();
        $profile = $user->hairdresserProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'bio'              => 'nullable|string|max:1000',
            'tagline'          => 'nullable|string|max:255',
            'city'             => 'nullable|string|max:100',
            'instagram_url'    => 'nullable|url|max:255',
            'booking_url'      => 'nullable|url|max:500',
            'years_experience' => 'nullable|integer|min:0|max:50',
            'specialties'      => 'nullable|array',
            'specialties.*'    => 'integer|exists:specialties,id',
        ]);

        // Mise à jour bio + city sur le modèle User
        // array_key_exists permet de vider un champ nullable en envoyant null explicitement
        $user->update([
            'bio'  => array_key_exists('bio',  $validated) ? $validated['bio']  : $user->bio,
            'city' => array_key_exists('city', $validated) ? $validated['city'] : $user->city,
        ]);

        // Mise à jour du profil coiffeur
        $profile->update([
            'tagline'          => array_key_exists('tagline',          $validated) ? $validated['tagline']          : $profile->tagline,
            'city'             => array_key_exists('city',             $validated) ? $validated['city']             : $profile->city,
            'instagram_url'    => array_key_exists('instagram_url',    $validated) ? $validated['instagram_url']    : $profile->instagram_url,
            'booking_url'      => array_key_exists('booking_url',      $validated) ? $validated['booking_url']      : $profile->booking_url,
            'years_experience' => array_key_exists('years_experience', $validated) ? $validated['years_experience'] : $profile->years_experience,
        ]);

        // Synchronisation des spécialités
        if (isset($validated['specialties'])) {
            $profile->specialties()->sync($validated['specialties']);
        }

        return response()->json([
            'user'    => $user->fresh(),
            'profile' => $profile->fresh()->load('specialties'),
        ]);
    }

    /**
     * Upload avatar.
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,webp|max:2048',
        ]);

        $user = $request->user();

        // Supprime l'ancien avatar s'il est en stockage local
        if ($user->avatar && str_starts_with($user->avatar, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $url  = '/storage/' . $path;

        $user->update(['avatar' => $url]);

        return response()->json(['avatar' => $url]);
    }

    /**
     * Upload bannière.
     */
    public function uploadBanner(Request $request)
    {
        $request->validate([
            'banner' => 'required|image|mimes:jpeg,png,webp|max:5120',
        ]);

        $user    = $request->user();
        $profile = $user->hairdresserProfile;

        if (!$profile) {
            $base = \Illuminate\Support\Str::slug($user->name ?: 'coiffeur-' . $user->id);
            $slug = $base; $i = 1;
            while (\App\Models\HairdresserProfile::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $profile = \App\Models\HairdresserProfile::create([
                'user_id' => $user->id, 'slug' => $slug,
                'is_independent' => true, 'is_verified' => false,
                'followers_count' => 0, 'posts_count' => 0,
                'avg_rating' => 0, 'reviews_count' => 0,
            ]);
        }

        // Supprime l'ancienne bannière si locale
        if ($profile->banner_image && str_starts_with($profile->banner_image, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $profile->banner_image));
        }

        $path = $request->file('banner')->store('banners', 'public');
        $url  = '/storage/' . $path;

        $profile->update(['banner_image' => $url]);

        return response()->json(['banner_image' => $url]);
    }
}
