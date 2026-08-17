<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChairRental;
use App\Models\HairdresserProfile;
use App\Models\JobOffer;
use App\Models\Salon;
use App\Services\AdminAuditLogger;
use Illuminate\Http\Request;

/**
 * Module Salons — entièrement neuf (voir rapport de mission : aucun endpoint
 * admin n'existait avant cette passe). Mêmes conventions que le reste de
 * l'admin : 'admin.auth' + 'admin.permission:salons.read|salons.manage' sur
 * chaque route (routes/api.php), AdminAuditLogger sur toute mutation.
 *
 * Limite assumée : PAS de transfert de propriété (changer owner_id) dans
 * cette passe — trop sensible pour un premier jet (implique de re-vérifier
 * l'identité du nouveau propriétaire, l'historique de facturation Stripe
 * lié au salon, etc.). Voir rapport partie (c).
 */
class AdminSalonController extends Controller
{
    /** GET /admin/salons — liste (nom, ville, propriétaire, équipe, statut, visibilité). */
    public function index(Request $request)
    {
        $query = Salon::with('owner:id,name,email')
            ->withCount('hairdressers');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhereHas('owner', fn ($oq) => $oq->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if ($city = $request->get('city')) {
            $query->where('city', 'like', "%{$city}%");
        }

        if ($status = $request->get('status')) {
            if ($status === 'suspended') {
                $query->whereNotNull('suspended_at');
            } elseif ($status === 'active') {
                $query->whereNull('suspended_at');
            } elseif ($status === 'verified') {
                $query->where('is_verified', true);
            } elseif ($status === 'unverified') {
                $query->where('is_verified', false);
            }
        }

        $salons = $query->orderByDesc('hairdressers_count')->paginate(20);

        $salons->getCollection()->transform(fn ($s) => [
            'id'                => $s->id,
            'name'              => $s->name,
            'slug'              => $s->slug,
            'city'              => $s->city,
            'owner'             => $s->owner ? ['id' => $s->owner->id, 'name' => $s->owner->name, 'email' => $s->owner->email] : null,
            'hairdressers_count'=> $s->hairdressers_count,
            'is_verified'       => $s->is_verified,
            'verification_status' => $s->verification_status,
            'suspended'         => $s->suspended_at !== null,
            'created_at'        => $s->created_at,
        ]);

        return response()->json($salons);
    }

    /** GET /admin/salons/{id} — fiche (infos, équipe/rôles, stats, offres d'emploi si recrutement actif). */
    public function show(Request $request, $id)
    {
        $salon = Salon::with(['owner:id,name,email,phone', 'hairdressers.user:id,name,email,suspended_at'])
            ->withCount('hairdressers')
            ->findOrFail($id);

        $team = $salon->hairdressers->map(fn (HairdresserProfile $h) => [
            'profile_id'    => $h->id,
            'user_id'       => $h->user_id,
            'name'          => $h->user?->name,
            'email'         => $h->user?->email,
            // "Rôles" du salon = statut indépendant/salarié, seule notion de
            // rôle d'équipe qui existe aujourd'hui côté modèle (pas de table
            // de rôles salon dédiée) — voir HairdresserProfile::is_independent.
            'is_independent'=> $h->is_independent,
            'is_verified'   => $h->is_verified,
            'suspended'     => (bool) $h->user?->suspended_at,
            'reviews_count' => $h->reviews_count,
            'avg_rating'    => (float) $h->avg_rating,
        ]);

        $jobOffers = JobOffer::where('salon_id', $salon->id)
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'job_type', 'contract_type', 'status', 'created_at']);

        $chairRentals = ChairRental::where('salon_id', $salon->id)
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'space_type', 'status', 'price_per_day', 'price_per_month', 'created_at']);

        return response()->json([
            'salon' => [
                'id'                    => $salon->id,
                'name'                  => $salon->name,
                'slug'                  => $salon->slug,
                'description'           => $salon->description,
                'address'               => $salon->address,
                'city'                  => $salon->city,
                'postal_code'           => $salon->postal_code,
                'department'            => $salon->department,
                'region'                => $salon->region,
                'phone'                 => $salon->phone,
                'website'               => $salon->website,
                'instagram_url'         => $salon->instagram_url,
                'siret'                 => $salon->siret,
                'is_verified'           => $salon->is_verified,
                'verification_status'   => $salon->verification_status,
                'suspended_at'          => $salon->suspended_at,
                'suspended_reason'      => $salon->suspended_reason,
                'is_chair_business'     => $salon->hasChairBusiness(),
                'owner'                 => $salon->owner,
                'created_at'            => $salon->created_at,
            ],
            'stats' => [
                'hairdressers_count' => $salon->hairdressers_count,
                'job_offers_count'   => $jobOffers->count(),
                'chair_rentals_count'=> $chairRentals->count(),
                'avg_rating'         => round((float) $salon->hairdressers->avg('avg_rating'), 1),
                'reviews_count'      => (int) $salon->hairdressers->sum('reviews_count'),
            ],
            'team'          => $team,
            // Module recrutement (JobOffer) déjà en base — exposé seulement
            // s'il y a effectivement des offres, jamais un tableau vide masqué.
            'job_offers'    => $jobOffers,
            'chair_rentals' => $chairRentals,
        ]);
    }

    /** Vérifie un salon (badge confiance) — distinct de la vérification SIRET (verification_status). */
    public function verify(Request $request, $id)
    {
        $salon = Salon::findOrFail($id);
        $old = $salon->is_verified;
        $salon->update(['is_verified' => true]);

        AdminAuditLogger::log($request->user(), 'salons.verify', 'salon', $salon->id, ['is_verified' => $old], ['is_verified' => true], $request);

        return response()->json(['ok' => true]);
    }

    public function unverify(Request $request, $id)
    {
        $salon = Salon::findOrFail($id);
        $old = $salon->is_verified;
        $salon->update(['is_verified' => false]);

        AdminAuditLogger::log($request->user(), 'salons.unverify', 'salon', $salon->id, ['is_verified' => $old], ['is_verified' => false], $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Suspension — pas un delete (voir contrainte "jamais de hard delete
     * silencieux") : le salon disparaît du listing public
     * (SalonController::index/show) mais son équipe et son historique
     * restent intacts en base, réversible via unsuspend.
     */
    public function suspend(Request $request, $id)
    {
        $validated = $request->validate(['reason' => 'nullable|string|max:255']);

        $salon = Salon::findOrFail($id);
        $old = ['suspended_at' => $salon->suspended_at, 'suspended_reason' => $salon->suspended_reason];
        $salon->suspended_at = now();
        $salon->suspended_reason = $validated['reason'] ?? null;
        $salon->save();

        AdminAuditLogger::log($request->user(), 'salons.suspend', 'salon', $salon->id, $old, ['suspended_at' => $salon->suspended_at->toISOString(), 'suspended_reason' => $salon->suspended_reason], $request);

        return response()->json(['ok' => true]);
    }

    public function unsuspend(Request $request, $id)
    {
        $salon = Salon::findOrFail($id);
        $old = ['suspended_at' => $salon->suspended_at, 'suspended_reason' => $salon->suspended_reason];
        $salon->suspended_at = null;
        $salon->suspended_reason = null;
        $salon->save();

        AdminAuditLogger::log($request->user(), 'salons.unsuspend', 'salon', $salon->id, $old, ['suspended_at' => null, 'suspended_reason' => null], $request);

        return response()->json(['ok' => true]);
    }

    /** Modifie les infos de base du salon (jamais owner_id — voir limite assumée en tête de fichier). */
    public function update(Request $request, $id)
    {
        $salon = Salon::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'address'     => 'nullable|string|max:255',
            'city'        => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:10',
            'phone'       => 'nullable|string|max:30',
            'website'     => 'nullable|string|max:255',
        ]);

        $old = collect($validated)->keys()->mapWithKeys(fn ($key) => [$key => $salon->{$key}])->all();

        $salon->update($validated);

        AdminAuditLogger::log($request->user(), 'salons.update', 'salon', $salon->id, $old, $validated, $request);

        return response()->json(['ok' => true, 'salon' => $salon->fresh()]);
    }

    /**
     * Retire un membre de l'équipe du salon — même effet que
     * SalonController::removeHairdresser (action du gérant lui-même), version
     * admin. Le coiffeur redevient indépendant (salon_id = null), son compte
     * n'est pas touché.
     */
    public function removeMember(Request $request, $salonId, $profileId)
    {
        $salon = Salon::findOrFail($salonId);
        $profile = HairdresserProfile::where('id', $profileId)->where('salon_id', $salon->id)->firstOrFail();

        $profile->update(['salon_id' => null]);

        \App\Models\SalonJoinRequest::where('hairdresser_id', $profileId)
            ->where('salon_id', $salon->id)
            ->delete();

        AdminAuditLogger::log(
            $request->user(),
            'salons.remove_member',
            'salon',
            $salon->id,
            ['hairdresser_profile_id' => $profile->id, 'salon_id' => $salon->id],
            ['hairdresser_profile_id' => $profile->id, 'salon_id' => null],
            $request
        );

        return response()->json(['ok' => true]);
    }
}
