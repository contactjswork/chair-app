<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Services\CloudinaryService;
use App\Services\GeocodingService;
use Illuminate\Http\Request;

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

        $user->update([
            'bio'  => array_key_exists('bio',  $validated) ? $validated['bio']  : $user->bio,
            'city' => array_key_exists('city', $validated) ? $validated['city'] : $user->city,
        ]);

        // Géocodage automatique si la ville a changé
        $newCity   = array_key_exists('city', $validated) ? $validated['city'] : $profile->city;
        $geoCoords = null;
        if ($newCity && $newCity !== $profile->city) {
            $geoCoords = GeocodingService::geocode($newCity);
        }

        $profileData = [
            'tagline'          => array_key_exists('tagline',          $validated) ? $validated['tagline']          : $profile->tagline,
            'city'             => $newCity,
            'instagram_url'    => array_key_exists('instagram_url',    $validated) ? $validated['instagram_url']    : $profile->instagram_url,
            'booking_url'      => array_key_exists('booking_url',      $validated) ? $validated['booking_url']      : $profile->booking_url,
            'years_experience' => array_key_exists('years_experience', $validated) ? $validated['years_experience'] : $profile->years_experience,
        ];

        // Mise à jour des coordonnées si géocodage réussi
        if ($geoCoords !== null) {
            $profileData['latitude']  = $geoCoords['lat'];
            $profileData['longitude'] = $geoCoords['lng'];
        }

        $profile->update($profileData);

        if (isset($validated['specialties'])) {
            $profile->specialties()->sync($validated['specialties']);
        }

        return response()->json([
            'user'    => $user->fresh(),
            'profile' => $profile->fresh()->load('specialties'),
        ]);
    }

    /**
     * Upload avatar → Cloudinary.
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,webp|max:2048',
        ]);

        $user      = $request->user();
        $cloudinary = new CloudinaryService();

        // Supprime l'ancienne image (locale ou Cloudinary)
        $cloudinary->deleteOldMedia($user->avatar);

        $url = $cloudinary->upload($request->file('avatar'), 'chair/avatars');

        $user->update(['avatar' => $url]);

        return response()->json(['avatar' => $url]);
    }

    /**
     * Upload bannière → Cloudinary.
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
            $slug = $base;
            $i    = 1;
            while (\App\Models\HairdresserProfile::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $profile = \App\Models\HairdresserProfile::create([
                'user_id'        => $user->id,
                'slug'           => $slug,
                'is_independent' => true,
                'is_verified'    => false,
                'followers_count'=> 0,
                'posts_count'    => 0,
                'avg_rating'     => 0,
                'reviews_count'  => 0,
            ]);
        }

        $cloudinary = new CloudinaryService();

        // Supprime l'ancienne bannière (locale ou Cloudinary)
        $cloudinary->deleteOldMedia($profile->banner_image);

        $url = $cloudinary->upload($request->file('banner'), 'chair/banners');

        $profile->update(['banner_image' => $url]);

        return response()->json(['banner_image' => $url]);
    }

    /**
     * Mise à jour de la position géographique de l'utilisateur connecté.
     * Appelé après autorisation géolocalisation navigateur.
     */
    public function updateLocation(Request $request)
    {
        $validated = $request->validate([
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'postal_code' => 'nullable|string|max:10',
        ]);

        $request->user()->update($validated);

        return response()->json(['ok' => true, 'user' => $request->user()]);
    }
}
