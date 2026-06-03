<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /** PUT /user/profile — mise à jour nom, ville, bio */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'city' => 'sometimes|nullable|string|max:100',
            'bio'  => 'sometimes|nullable|string|max:500',
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

        if (!empty($update)) {
            $user->update($update);
        }

        return response()->json(['user' => $user->fresh()]);
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
