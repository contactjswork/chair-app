<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Models\Notification;
use App\Models\Review;
use App\Models\Salon;
use App\Models\SalonJoinRequest;
use App\Services\GeocodingService;
use App\Services\NotificationService;
use App\Services\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'salon_id'          => 'nullable|integer|exists:salons,id',
            'specialties'       => 'nullable|array',
            'specialties.*'     => 'integer|exists:specialties,id',
            'salon_name'        => 'required_if:role,salon_owner|nullable|string|max:255',
            // La colonne salons.city est NOT NULL en base — sans cette règle,
            // un salon_owner qui laisse la ville vide fait planter la création
            // du salon en 500 APRÈS que le compte utilisateur soit déjà créé.
            'salon_city'        => 'required_if:role,salon_owner|nullable|string|max:100',
            'booking_url'       => 'nullable|url|max:500',
            'salon_instagram'   => 'nullable|url|max:255',
            // Champs gérant salon
            'siret'             => 'nullable|string|size:14|regex:/^\d{14}$/',
            // Champs adresse coiffeur indépendant (sélecteur en cascade
            // région → département → ville → rue, voir GeoController) —
            // "être retrouvé sur la carte" (recherche/classements).
            'region'            => 'nullable|string|max:100',
            'department'        => 'nullable|string|max:100',
            'address'           => 'nullable|string|max:255',
            // Mêmes champs pour le salon d'un gérant
            'salon_region'      => 'nullable|string|max:100',
            'salon_department'  => 'nullable|string|max:100',
            'salon_address'     => 'nullable|string|max:255',
            // Champs géo client
            'postal_code'       => 'nullable|string|max:10',
            'latitude'          => 'nullable|numeric|between:-90,90',
            'longitude'         => 'nullable|numeric|between:-180,180',
            // Programme ambassadeur — code de parrainage optionnel (voir docs/GROWTH.md)
            'ref'               => 'nullable|string|max:20',
        ]);

        // Toute la création (compte + salon/profil) est atomique — si une étape
        // échoue (ex : contrainte NOT NULL), aucun compte orphelin ne doit rester
        // en base (vécu en pratique : un salon_owner sans salon, invisible dans
        // /pro/salon-owner, ne pouvant plus se reconnecter proprement).
        // Le client envoie juste un nom de ville (texte libre) — pas de lat/lng
        // précis comme le cascade région/département/ville des pros. On géocode
        // ici pour que la home puisse filtrer "près de chez lui" dès l'inscription,
        // sans attendre qu'il passe par modifier-profil.
        $clientCity = $validated['city'] ?? $validated['salon_city'] ?? null;
        $geoCoords  = null;
        if ($clientCity && !isset($validated['latitude'])) {
            $geoCoords = GeocodingService::geocode($clientCity);
        }

        [$user, $token] = DB::transaction(function () use ($validated, $clientCity, $geoCoords) {
            $user = \App\Models\User::create([
                'name'        => $validated['name'],
                'email'       => $validated['email'],
                'password'    => bcrypt($validated['password']),
                'role'        => $validated['role'],
                'phone'       => $validated['phone'] ?? null,
                'city'        => $clientCity,
                'postal_code' => $validated['postal_code'] ?? null,
                'latitude'    => $validated['latitude'] ?? $geoCoords['lat'] ?? null,
                'longitude'   => $validated['longitude'] ?? $geoCoords['lng'] ?? null,
            ]);

            if (!empty($validated['ref'])) {
                ReferralService::attributeSignup($user, $validated['ref']);
            }

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
                        'address'             => $validated['salon_address'] ?? null,
                        // department/region viennent du sélecteur en cascade à
                        // l'inscription — plus fiable que la dérivation par code
                        // postal (GeoLookupService), utilisée en repli pour les
                        // salons plus anciens qui n'ont que le code postal.
                        'department'          => $validated['salon_department'] ?? null,
                        'region'              => $validated['salon_region'] ?? null,
                        'postal_code'         => $validated['postal_code'] ?? null,
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

                // Un salarié rattache un salon EXISTANT (recherché à l'étape précédente) —
                // il ne crée plus de salon fantôme dont il deviendrait "propriétaire".
                // Rattachement immédiat et non-bloquant : le profil est visible tout de
                // suite ("Chez [Salon]"), une SalonJoinRequest notifie le gérant qui peut
                // confirmer (ou retirer via declineJoinRequest) depuis son dashboard.
                $salonId = null;
                if (!$isIndependent && !empty($validated['salon_id'])) {
                    $salon = Salon::find($validated['salon_id']);
                    if ($salon) {
                        $salonId = $salon->id;
                    }
                }

                $profileCity = $validated['city'] ?? $validated['salon_city'] ?? null;
                $geoCoords   = $profileCity ? GeocodingService::geocode($profileCity) : null;

                $profile = HairdresserProfile::create([
                    'user_id'          => $user->id,
                    'salon_id'         => $salonId,
                    'slug'             => $slug,
                    'city'             => $profileCity,
                    // Un salarié rattaché à un salon existant hérite de son adresse
                    // (le salon a déjà été localisé par son gérant) — seul
                    // l'indépendant renseigne région/département/rue lui-même via
                    // le sélecteur en cascade (GeoController).
                    'work_address'     => $isIndependent ? ($validated['address'] ?? null) : null,
                    'department'       => $isIndependent ? ($validated['department'] ?? null) : null,
                    'region'           => $isIndependent ? ($validated['region'] ?? null) : null,
                    'postal_code'      => $validated['postal_code'] ?? null,
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

                if (!empty($validated['specialties'])) {
                    $profile->specialties()->sync($validated['specialties']);
                }

                if ($salonId) {
                    $joinRequest = SalonJoinRequest::updateOrCreate(
                        ['hairdresser_id' => $profile->id, 'salon_id' => $salonId],
                        ['status' => 'pending']
                    );
                    NotificationService::send(
                        $salon->owner_id,
                        'join_request',
                        'Nouveau coiffeur rattaché à votre salon',
                        "{$user->name} a rejoint {$salon->name} — confirmez ce rattachement depuis votre équipe.",
                        ['hairdresser_id' => $profile->id, 'hairdresser_name' => $user->name, 'salon_id' => $salon->id, 'request_id' => $joinRequest->id]
                    );
                }
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return [$user, $token];
        });

        return response()->json([
            'user'  => self::withEntitlement($user),
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

        if ($user->suspended_at) {
            \Illuminate\Support\Facades\Auth::logout();
            return response()->json(['message' => 'Ce compte est suspendu.'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => self::withEntitlement($user),
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
        return response()->json(self::withEntitlement($request->user()));
    }

    /**
     * DELETE /account [auth] — obligatoire App Store (5.1.1(v)) : suppression
     * de compte utilisable en autonomie, pas seulement "contacter le
     * support". Supprime exactement ce que l'écran de confirmation annonce
     * (frontend/app/app/compte/supprimer) : avis laissés, réservations en
     * tant que client, favoris/abonnements — puis anonymise la ligne user
     * (nom/email/mot de passe/coordonnées) et révoque tous les tokens.
     *
     * Volontairement PAS de cascade sur salon/équipe/portfolio pour un
     * compte gérant ou coiffeur — supprimer un salon supprimerait les
     * données d'autres utilisateurs (équipe, avis reçus) qui ne sont pas
     * celles de la personne qui supprime son compte. Un flow de suppression
     * spécifique pro (transfert de salon, etc.) reste à concevoir séparément.
     */
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        Review::where('client_id', $user->id)->delete();
        Appointment::where('client_id', $user->id)->delete();
        Notification::where('user_id', $user->id)->delete();
        $user->follows()->detach();
        $user->savedProfiles()->detach();

        $user->tokens()->delete();

        $user->update([
            'name'        => 'Utilisateur supprimé',
            'email'       => 'deleted-' . $user->id . '-' . time() . '@getchair.invalid',
            'password'    => bcrypt(Str::random(40)),
            'avatar'      => null,
            'bio'         => null,
            'phone'       => null,
            'city'        => null,
            'postal_code' => null,
            'latitude'    => null,
            'longitude'   => null,
        ]);

        return response()->json(['message' => 'Compte supprimé.']);
    }

    /**
     * Double identité — un compte gérant sans profil coiffeur s'en crée un,
     * rattaché à son propre salon (il y coupe lui-même). Voir
     * enableSalonOwnerMode() plus bas pour le sens inverse (coiffeur → gérant).
     */
    public function enableHairdresserMode(Request $request)
    {
        $user = $request->user();

        if ($user->hasHairdresserProfile()) {
            return response()->json(['message' => 'Vous avez déjà un profil coiffeur.'], 422);
        }
        $salon = Salon::where('owner_id', $user->id)->first();
        if (!$salon) {
            return response()->json(['message' => 'Un salon est nécessaire pour activer le mode coiffeur.'], 422);
        }

        $baseSlug = Str::slug($user->name);
        $slug     = $baseSlug;
        $i        = 1;
        while (HairdresserProfile::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$i}";
            $i++;
        }

        HairdresserProfile::create([
            'user_id'         => $user->id,
            'salon_id'        => $salon->id,
            'slug'            => $slug,
            'city'            => $salon->city,
            'work_address'    => $salon->address,
            'department'      => $salon->department,
            'region'          => $salon->region,
            'postal_code'     => $salon->postal_code,
            'latitude'        => $salon->latitude,
            'longitude'       => $salon->longitude,
            'is_independent'  => false,
            'is_verified'     => false,
            'followers_count' => 0,
            'posts_count'     => 0,
            'avg_rating'      => 0,
            'reviews_count'   => 0,
        ]);

        $user->update(['active_pro_mode' => 'hairdresser']);

        return response()->json(self::withEntitlement($user->fresh()));
    }

    /**
     * Double identité (sens inverse) — un coiffeur (salarié ou indépendant)
     * crée son propre salon et devient aussi gérant, même compte. Seule
     * donnée qu'aucune source existante ne peut fournir : le nom du salon,
     * demandé explicitement. Ville/adresse repris du profil coiffeur s'il en
     * a un. SIRET/vérification restent à compléter ensuite via `/pro/salon`,
     * comme pour un salon créé à l'inscription classique.
     */
    public function enableSalonOwnerMode(Request $request)
    {
        $user = $request->user();

        if ($user->canManageSalon()) {
            return response()->json(['message' => 'Vous gérez déjà un salon.'], 422);
        }

        $validated = $request->validate([
            'salon_name' => 'required|string|max:255',
        ]);

        $profile = $user->hairdresserProfile;

        $baseSlug = Str::slug($validated['salon_name']);
        $slug     = $baseSlug;
        $i        = 1;
        while (Salon::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$i}";
            $i++;
        }

        Salon::create([
            'owner_id'             => $user->id,
            'name'                 => $validated['salon_name'],
            'slug'                 => $slug,
            'city'                 => $profile->city ?? $user->city ?? '',
            'address'              => $profile->work_address ?? null,
            'department'           => $profile->department ?? null,
            'region'               => $profile->region ?? null,
            'postal_code'          => $profile->postal_code ?? null,
            'latitude'             => $profile->latitude ?? null,
            'longitude'            => $profile->longitude ?? null,
            'verification_status'  => 'unverified',
            'is_verified'          => false,
        ]);

        $user->update(['active_pro_mode' => 'salon_owner']);

        return response()->json(self::withEntitlement($user->fresh()));
    }

    /** Bascule Mode Gérant / Mode Coiffeur — sans déconnexion, instantané. */
    public function switchProMode(Request $request)
    {
        $validated = $request->validate([
            'mode' => 'required|in:salon_owner,hairdresser',
        ]);
        $user = $request->user();

        if ($validated['mode'] === 'salon_owner' && !$user->canManageSalon()) {
            return response()->json(['message' => 'Vous ne gérez aucun salon.'], 422);
        }
        if ($validated['mode'] === 'hairdresser' && !$user->hasHairdresserProfile()) {
            return response()->json(['message' => 'Vous n\'avez pas de profil coiffeur.'], 422);
        }

        $user->update(['active_pro_mode' => $validated['mode']]);

        return response()->json(self::withEntitlement($user->fresh()));
    }

    /**
     * Charge les DEUX relations (profil coiffeur + salon) quel que soit le
     * `role` d'inscription — un compte peut posséder les deux (double identité
     * gérant/coiffeur). N'y append l'entitlement CHAIR+/BUSINESS calculé
     * (hasChairPlus()/hasChairBusiness()) que sur la relation présente — sans
     * ça, le frontend ne lisait que chair_plus_until brut (banqué uniquement),
     * invisible pour un abonné payant Stripe pur. Voir
     * HairdresserProfile::getIsChairPlusAttribute().
     *
     * `active_pro_mode` expose quel espace pro afficher par défaut : la valeur
     * stockée si elle reste valide (le compte a toujours cette capacité),
     * sinon déduite de ce que le compte possède réellement — jamais une valeur
     * qui pointerait vers une capacité que le compte n'a pas (ou plus).
     */
    private static function withEntitlement(\App\Models\User $user): \App\Models\User
    {
        $user->load(['salon', 'hairdresserProfile']);
        $user->salon?->append('is_chair_business');
        $user->hairdresserProfile?->append('is_chair_plus');

        $canManageSalon        = $user->salon !== null;
        $hasHairdresserProfile = $user->hairdresserProfile !== null;

        $activeMode = $user->active_pro_mode;
        $modeStillValid =
            ($activeMode === 'salon_owner' && $canManageSalon) ||
            ($activeMode === 'hairdresser' && $hasHairdresserProfile);
        if (!$modeStillValid) {
            $activeMode = $canManageSalon ? 'salon_owner' : ($hasHairdresserProfile ? 'hairdresser' : null);
        }

        $user->setAttribute('can_manage_salon', $canManageSalon);
        $user->setAttribute('has_hairdresser_profile', $hasHairdresserProfile);
        $user->setAttribute('active_pro_mode', $activeMode);

        return $user;
    }
}
