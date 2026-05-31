<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'email'             => 'required|string|email|max:255|unique:users',
            'password'          => 'required|string|min:8|confirmed',
            'role'              => 'required|in:client,hairdresser,salon_owner',
            'city'              => 'nullable|string|max:100',
            // Champs coiffeur étape 2
            'hairdresser_type'  => 'nullable|in:independent,salon',
            'salon_name'        => 'nullable|string|max:255',
            'salon_city'        => 'nullable|string|max:100',
            'booking_url'       => 'nullable|url|max:500',
            'salon_instagram'   => 'nullable|url|max:255',
        ]);

        $user = \App\Models\User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role'     => $validated['role'],
            'city'     => $validated['city'] ?? $validated['salon_city'] ?? null,
        ]);

        if ($user->role === 'hairdresser') {
            $baseSlug = Str::slug($user->name);
            $slug     = $baseSlug;
            $i        = 1;
            while (HairdresserProfile::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$i}";
                $i++;
            }

            $isIndependent = ($validated['hairdresser_type'] ?? 'independent') === 'independent';
            $salonId       = null;

            // Créer le salon si type = salon et nom renseigné
            if (!$isIndependent && !empty($validated['salon_name'])) {
                $salonSlug  = Str::slug($validated['salon_name']);
                $salonSlugU = $salonSlug;
                $j          = 1;
                while (Salon::where('slug', $salonSlugU)->exists()) {
                    $salonSlugU = "{$salonSlug}-{$j}";
                    $j++;
                }
                $salon   = Salon::create([
                    'owner_id'      => $user->id,
                    'name'          => $validated['salon_name'],
                    'slug'          => $salonSlugU,
                    'city'          => $validated['salon_city'] ?? null,
                    'website'       => $validated['booking_url'] ?? null,
                    'instagram_url' => $validated['salon_instagram'] ?? null,
                    'is_verified'   => false,
                ]);
                $salonId = $salon->id;
            }

            HairdresserProfile::create([
                'user_id'          => $user->id,
                'salon_id'         => $salonId,
                'slug'             => $slug,
                'city'             => $validated['city'] ?? $validated['salon_city'] ?? null,
                'is_independent'   => $isIndependent,
                'is_verified'      => false,
                'booking_url'      => $validated['booking_url'] ?? null,
                'followers_count'  => 0,
                'posts_count'      => 0,
                'avg_rating'       => 0,
                'reviews_count'    => 0,
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('hairdresserProfile'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!\Illuminate\Support\Facades\Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Identifiants invalides'], 401);
        }

        $user = \App\Models\User::where('email', $request->email)->first();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('hairdresserProfile'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('hairdresserProfile'));
    }
}
