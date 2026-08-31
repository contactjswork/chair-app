<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\LoyaltyProgram;
use App\Models\LoyaltyReward;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;

/**
 * La carte de fidélité — côté coiffeur (config, récompenses à honorer)
 * et côté client (où en est ma carte).
 *
 * Tout ce qui configure est gate-é sur l'add-on. La LECTURE de la carte
 * côté client ne l'est pas : si le programme existe et tourne, le client
 * a le droit de voir où il en est — c'est sa carte.
 */
class LoyaltyController extends Controller
{
    /** GET /loyalty/program — l'état du programme du coiffeur connecté. */
    public function show(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $program = LoyaltyProgram::where('hairdresser_id', $profile->id)->first();

        // Les chiffres qui prouvent que l'add-on travaille : combien de
        // clients jouent, ce qui a été promis, ce qui a été honoré. C'est
        // la réponse à « est-ce que ça vaut son prix ? » — sans elle,
        // l'add-on est un acte de foi renouvelé chaque mois.
        $stats = null;
        if ($program) {
            $stats = [
                'passages'         => \App\Models\VerifiedVisit::where('hairdresser_id', $profile->id)
                    ->where('scanned_at', '>', $program->counting_since)->count(),
                'clients_en_cours' => \App\Models\VerifiedVisit::where('hairdresser_id', $profile->id)
                    ->where('scanned_at', '>', $program->counting_since)
                    ->distinct('client_user_id')->count('client_user_id'),
                'debloquees'       => LoyaltyReward::where('hairdresser_id', $profile->id)->count(),
                'honorees'         => LoyaltyReward::where('hairdresser_id', $profile->id)
                    ->whereNotNull('redeemed_at')->count(),
            ];
        }

        return response()->json([
            'addon_active'    => $profile->hasLoyaltyAddon(),
            'program'         => $program,
            'stats'           => $stats,
            'pending_rewards' => LoyaltyReward::with('client:id,name,avatar')
                ->where('hairdresser_id', $profile->id)
                ->whereNull('redeemed_at')
                ->orderBy('unlocked_at')
                ->get(),
        ]);
    }

    /** PUT /loyalty/program — créer ou modifier le programme (add-on requis). */
    public function update(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }
        if (!$profile->hasLoyaltyAddon()) {
            return response()->json([
                'message' => "L'add-on Carte de fidélité n'est pas actif sur ce compte.",
            ], 403);
        }

        $validated = $request->validate([
            // 3 minimum : en dessous la « fidélité » n'en est pas une.
            // 20 maximum : au-delà personne n'y croit, donc personne ne joue.
            'visits_required' => 'required|integer|min:3|max:20',
            'reward_label'    => 'required|string|min:3|max:80',
            'is_active'       => 'required|boolean',
        ]);

        $program = LoyaltyProgram::firstOrNew(['hairdresser_id' => $profile->id]);
        // Le comptage démarre à la PREMIÈRE activation, et ne recule jamais :
        // les passages antérieurs ne comptent pas (les habitués débloqueraient
        // tout le premier jour), mais modifier le programme ne confisque pas
        // la progression en cours.
        if (!$program->exists) {
            $program->counting_since = now();
        }
        $program->fill($validated)->save();

        return response()->json($program->fresh());
    }

    /** POST /loyalty/rewards/{id}/redeem — le coiffeur honore la récompense au comptoir. */
    public function redeem(Request $request, int $id)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $reward = LoyaltyReward::where('id', $id)
            ->where('hairdresser_id', $profile->id)
            ->first();
        if (!$reward) {
            return response()->json(['message' => 'Récompense introuvable.'], 404);
        }
        if ($reward->redeemed_at) {
            return response()->json(['message' => 'Récompense déjà utilisée.'], 409);
        }

        $reward->forceFill(['redeemed_at' => now()])->save();

        return response()->json($reward->fresh());
    }

    /** GET /loyalty/my-card/{hairdresserId} — la carte du client connecté chez ce coiffeur. */
    public function myCard(Request $request, int $hairdresserId)
    {
        $profile = HairdresserProfile::find($hairdresserId);
        if (!$profile) {
            return response()->json(['message' => 'Coiffeur introuvable'], 404);
        }

        $carte = LoyaltyService::cardFor($profile, (int) $request->user()->id);

        // Pas de programme = pas de carte. 200 avec null plutôt qu'un 404 :
        // l'absence de programme n'est pas une erreur, c'est un état normal
        // que le front doit juste savoir ne pas afficher.
        return response()->json(['card' => $carte]);
    }
}
