<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Services\GeocodingService;
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
            'phone'             => 'nullable|string|max:20',
            'city'              => 'nullable|string|max:100',
            // Champs coiffeur étape 2
            'hairdresser_type'  => 'nullable|in:independent,salon',
            'salon_name'        => 'required_if:role,salon_owner|nullable|string|max:255',
            'salon_city'        => 'nullable|string|max:100',
            'booking_url'       => 'nullable|url|max:500',
            'salon_instagram'   => 'nullable|url|max:255',
            // Champs gérant salon
            'siret'             => 'nullable|string|size:14|regex:/^\d{14}$/',
            // Champs géo client
            'postal_code'       => 'nullable|string|max:10',
            'latitude'          => 'nullable|numeric|between:-90,90',
            'longitude'         => 'nullable|numeric|between:-180,180',
        ]);

        $user = \App\Models\User::create([
            'name'        => $validated['name'],
            'email'       => $validated['email'],
            'password'    => bcrypt($validated['password']),
            'role'        => $validated['role'],
            'phone'       => $validated['phone'] ?? null,
            'city'        => $validated['city'] ?? $validated['salon_city'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'latitude'    => $validated['latitude'] ?? null,
            'longitude'   => $validated['longitude'] ?? null,
        ]);

        if ($user->role === 'salon_owner') {
            if (!empty($validated['salon_name'])) {
                $salonSlug  = Str::slug($validated['salon_name']);
                $salonSlugU = $salonSlug;
                $j          = 1;
                while (Salon::where('slug', $salonSlugU)->exists()) {
                    $salonSlugU = "{$salonSlug}-{$j}";
                    $j++;
                }
                $hasSiret = !empty($validated['siret']);
                Salon::create([
                    'owner_id'            => $user->id,
                    'name'                => $validated['salon_name'],
                    'slug'                => $salonSlugU,
                    'city'                => $validated['salon_city'] ?? null,
                    'siret'               => $validated['siret'] ?? null,
                    'verification_status' => $hasSiret ? 'pending_review' : 'unverified',
                    'is_verified'         => false,
                ]);
            }
        }

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

            $profileCity = $validated['city'] ?? $validated['salon_city'] ?? null;
            $geoCoords   = $profileCity ? GeocodingService::geocode($profileCity) : null;

            HairdresserProfile::create([
                'user_id'          => $user->id,
                'salon_id'         => $salonId,
                'slug'             => $slug,
                'city'             => $profileCity,
                'latitude'         => $geoCoords['lat']  ?? null,
                'longitude'        => $geoCoords['lng']  ?? null,
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

        $relation = $user->role === 'salon_owner' ? 'salon' : 'hairdresserProfile';

        return response()->json([
            'user'  => $user->load($relation),
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

        $relation = $user->role === 'salon_owner' ? 'salon' : 'hairdresserProfile';

        return response()->json([
            'user'  => $user->load($relation),
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = \Illuminate\Support\Facades\Password::sendResetLink(
            $request->only('email')
        );

        // On retourne toujours 200 pour ne pas révéler si l'email existe
        return response()->json(['message' => 'Si cet email existe, un lien de réinitialisation a été envoyé.']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token'                 => 'required',
            'email'                 => 'required|email',
            'password'              => 'required|min:8|confirmed',
        ]);

        $status = \Illuminate\Support\Facades\Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => bcrypt($password)])->save();
                $user->tokens()->delete();
            }
        );

        if ($status === \Illuminate\Support\Facades\Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
        }

        return response()->json(['message' => 'Lien invalide ou expiré.'], 422);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $relation = $user->role === 'salon_owner' ? 'salon' : 'hairdresserProfile';
        return response()->json($user->load($relation));
    }
}
