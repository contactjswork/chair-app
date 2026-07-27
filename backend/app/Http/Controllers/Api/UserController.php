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
            'name'  => 'sometimes|string|max:100',
            'city'  => 'sometimes|nullable|string|max:100',
            'bio'   => 'sometimes|nullable|string|max:500',
            'phone' => 'sometimes|nullable|string|max:20',
        ]);

        $update = [];
        if (array_key_exists('name', $validated) && $validated['name']) {
            $update['name'] = $validated['name'];
        }
        if (array_key_exists('city', $validated)) {
            $update['city'] = $validated['city'];
        }
        if (array_key_exists('bio', $validated)) {
            $update['bio'] = $validated['bio'];
        }
        if (array_key_exists('phone', $validated)) {
            $update['phone'] = $validated['phone'];
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
