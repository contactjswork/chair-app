<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /** PUT /user/profile — mise à jour nom, ville, bio, téléphone */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'city'      => 'sometimes|nullable|string|max:100',
            'bio'       => 'sometimes|nullable|string|max:500',
            'phone'     => 'sometimes|nullable|string|max:20',
            // Coordonnées précises déjà résolues côté frontend (sélection dans
            // l'autocomplétion ville ou bouton "Ma position") — évite un
            // second aller-retour de géocodage et garantit qu'on stocke
            // exactement ce que l'utilisateur a choisi.
            'latitude'  => 'sometimes|nullable|numeric|between:-90,90',
            'longitude' => 'sometimes|nullable|numeric|between:-180,180',
        ]);

        $update = [];
        if (array_key_exists('name', $validated) && $validated['name']) {
            $update['name'] = $validated['name'];
        }
        if (array_key_exists('bio', $validated)) {
            $update['bio'] = $validated['bio'];
        }
        if (array_key_exists('phone', $validated)) {
            $update['phone'] = $validated['phone'];
        }

        // Géocodage automatique — même logique que ProfileController (coiffeurs) :
        // sans ça, latitude/longitude ne sont jamais renseignées pour un client,
        // et tout filtrage "près de chez vous" côté home devient impossible.
        if (array_key_exists('city', $validated)) {
            $update['city'] = $validated['city'];
            if ($validated['city'] && $validated['city'] !== $user->city) {
                if (array_key_exists('latitude', $validated) && $validated['latitude'] !== null) {
                    $update['latitude']  = $validated['latitude'];
                    $update['longitude'] = $validated['longitude'] ?? null;
                } else {
                    $geo = \App\Services\GeocodingService::geocode($validated['city']);
                    if ($geo !== null) {
                        $update['latitude']  = $geo['lat'];
                        $update['longitude'] = $geo['lng'];
                    }
                }
            } elseif (!$validated['city']) {
                $update['latitude']  = null;
                $update['longitude'] = null;
            }
        }

        if (!empty($update)) {
            $user->update($update);
        }

        return response()->json(['user' => $user->fresh()]);
    }

    /** PUT /user/password — changement de mot de passe (utilisateur déjà authentifié) */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect.'], 422);
        }

        $user->update(['password' => bcrypt($validated['password'])]);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }

    /** POST /user/avatar — upload photo de profil client */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,webp|max:2048',
        ]);

        $user = $request->user();
        $cloudinary = new CloudinaryService();

        $cloudinary->deleteOldMedia($user->avatar);
        $url = $cloudinary->upload($request->file('avatar'), 'chair/avatars');

        $user->update(['avatar' => $url]);

        return response()->json(['avatar' => $url]);
    }
}
