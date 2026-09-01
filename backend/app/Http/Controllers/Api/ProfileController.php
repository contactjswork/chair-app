<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Services\BadgeService;
use App\Services\CloudinaryService;
use App\Services\ContentFilter;
use App\Services\GeocodingService;
use App\Services\SpecialtyReputationService;
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

        $profile->loadMissing('user');
        $profile->append('is_chair_plus');

        // Resync counters from DB to ensure badge accuracy
        BadgeService::syncCounters($profile);

        // Rafraîchit hairdresser_specialty_progress avant lecture des highlights.
        BadgeService::computePoints($profile);

        return response()->json([
            'user'          => $user,
            'profile'       => $profile,
            'chair_badges'  => BadgeService::getVisibleBadges($profile),
            'chair_badges_all' => BadgeService::getUnlockedBadges($profile),
            // Usage privé uniquement (page /pro/badges) — catalogue complet
            // débloqué + verrouillé, jamais exposé sur le profil public.
            'chair_badges_catalog' => BadgeService::getFullCatalog($profile),
            'next_badges'   => BadgeService::nextBadges($profile),
            // chair_points / chair_level supprimés (refonte 31/08/2026) — la
            // progression se lit par spécialité (my-specialty-progress).
            // Classement par specialite dans la ville du coiffeur : le signal
            // le plus concret qu'on puisse lui rendre. « 3e sur 12 en Coupe
            // Homme a Haguenau » se comprend d'un coup d'oeil, la ou un
            // niveau « Novice » ne dit rien de sa position reelle.
            'specialty_highlights' => SpecialtyReputationService::publicHighlights($profile, true),
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
            'bio'               => 'nullable|string|max:1000',
            'tagline'           => 'nullable|string|max:255',
            'city'              => 'nullable|string|max:100',
            'postal_code'       => 'nullable|string|max:10',
            'region'            => 'nullable|string|max:100',
            'department'        => 'nullable|string|max:100',
            'work_address'      => 'nullable|string|max:255',
            'instagram_url'     => 'nullable|url|max:255',
            'booking_url'       => 'nullable|url|max:500|starts_with:https://',
            // Le pont vers l'avis Google : le lien « Laisser un avis » de SA
            // fiche Google Business (g.page/... ou search.google.com/...).
            'google_review_url' => 'nullable|url|max:500|starts_with:https://',
            'years_experience'  => 'nullable|integer|min:0|max:50',
            'work_availability' => 'nullable|in:employed,looking_salon,looking_gig,not_available',
            'specialties'       => 'nullable|array',
            'specialties.*'     => 'integer|exists:specialties,id',
            // Pourquoi as-tu installé CHAIR PRO ? (onboarding indépendant, fin de parcours)
            'pro_goals'         => 'nullable|array',
            'pro_goals.*'       => 'string|in:find_clients,rent_chair,find_job',
        ]);

        // Filtrage par champ, délibérément asymétrique (App Store 1.2) :
        //  - bio / tagline (texte libre affiché publiquement) → volet
        //    insultes/haine UNIQUEMENT. Le volet coordonnées de check()
        //    n'a pas de sens ici : un pro met légitimement son téléphone ou
        //    son Instagram dans sa bio, c'est son outil de travail.
        //  - les champs structurés (work_address, instagram_url, booking_url,
        //    city...) ne passent PAS par le filtre : leurs règles de
        //    validation dédiées (url, starts_with:https://, max) suffisent,
        //    et une adresse postale déclenche par nature le motif « contact ».
        foreach (['bio', 'tagline'] as $field) {
            if ($reason = ContentFilter::checkOffensiveOnly($validated[$field] ?? null)) {
                return response()->json([
                    'message' => ContentFilter::message($reason, 'pro'),
                    'field'   => $field,
                ], 422);
            }
        }

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
            'tagline'           => array_key_exists('tagline',           $validated) ? $validated['tagline']           : $profile->tagline,
            'city'              => $newCity,
            'postal_code'       => array_key_exists('postal_code',       $validated) ? $validated['postal_code']       : $profile->postal_code,
            'region'            => array_key_exists('region',            $validated) ? $validated['region']            : $profile->region,
            'department'        => array_key_exists('department',        $validated) ? $validated['department']        : $profile->department,
            'work_address'      => array_key_exists('work_address',      $validated) ? $validated['work_address']      : $profile->work_address,
            'instagram_url'     => array_key_exists('instagram_url',     $validated) ? $validated['instagram_url']     : $profile->instagram_url,
            'booking_url'       => array_key_exists('booking_url',       $validated) ? $validated['booking_url']       : $profile->booking_url,
            'google_review_url' => array_key_exists('google_review_url', $validated) ? $validated['google_review_url'] : $profile->google_review_url,
            'years_experience'  => array_key_exists('years_experience',  $validated) ? $validated['years_experience']  : $profile->years_experience,
            'work_availability' => array_key_exists('work_availability', $validated) ? $validated['work_availability'] : $profile->work_availability,
            'pro_goals'         => array_key_exists('pro_goals',         $validated) ? $validated['pro_goals']         : $profile->pro_goals,
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

        BadgeService::refresh($profile->fresh());

        return response()->json([
            'user'    => $user->fresh(),
            'profile' => $profile->fresh()->load('specialties')->append('is_chair_plus'),
        ]);
    }

    /**
     * Envoi du document justificatif de diplôme → passe en vérification "pending".
     * Réservé aux indépendants (les salariés n'ont pas ce badge à débloquer).
     */
    public function uploadDiplomaDocument(Request $request)
    {
        $user    = $request->user();
        $profile = $user->hairdresserProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }
        if (!$profile->is_independent) {
            return response()->json(['message' => 'La vérification de diplôme est réservée aux coiffeurs indépendants.'], 403);
        }

        $validated = $request->validate([
            'diploma'  => 'required|in:CAP Coiffure,BP Coiffure,BM Coiffure',
            'document' => 'required|image|mimes:jpeg,png,webp|max:8192',
        ]);

        $cloudinary = new CloudinaryService();
        $cloudinary->deleteOldMedia($profile->diploma_document_url);
        $url = $cloudinary->upload($request->file('document'), 'chair/diplomas');

        $profile->update([
            'diploma'               => $validated['diploma'],
            'diploma_document_url'  => $url,
            'diploma_status'        => 'pending',
        ]);

        return response()->json([
            'diploma'              => $profile->diploma,
            'diploma_status'       => $profile->diploma_status,
            'diploma_document_url' => $profile->diploma_document_url,
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

    /**
     * Vérification SIRET du coiffeur (distincte du SIRET salon) — condition
     * d'accès aux offres d'emploi / location de fauteuil (candidature réelle,
     * pas la simple consultation qui reste libre). Auto-vérifié si l'API
     * publique data.gouv.fr confirme un établissement actif à activité
     * coiffure — contrairement au SIRET salon (badge `siret_verified`, revue
     * manuelle différée volontairement par Julien), il n'y a ici aucun enjeu
     * de classement/réputation à protéger, seulement anti-fraude d'accès :
     * la donnée officielle suffit.
     */
    public function submitSiret(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $request->validate(['siret' => 'required|string|size:14|regex:/^\d{14}$/']);
        $result = \App\Services\SiretVerificationService::lookup($request->siret);

        if (!$result['valid']) {
            return response()->json(['verified' => false, 'message' => $result['message'] ?? 'SIRET introuvable.'], 404);
        }

        if (!$result['is_hairdresser'] || !$result['is_active']) {
            $profile->update(['siret' => $request->siret, 'siret_verification_status' => 'rejected']);
            return response()->json([
                'verified' => false,
                'message'  => !$result['is_active']
                    ? 'Cet établissement est fermé selon le registre officiel.'
                    : 'Cet établissement n\'est pas déclaré en activité coiffure (code 9602A).',
            ], 422);
        }

        $profile->update(['siret' => $request->siret, 'siret_verification_status' => 'verified']);

        return response()->json([
            'verified'      => true,
            'business_name' => $result['business_name'],
            'city'          => $result['city'],
        ]);
    }
}
