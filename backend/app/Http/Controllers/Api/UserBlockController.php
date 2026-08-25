<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Http\Request;

/**
 * Blocage d'utilisateur — exigence App Store Review Guideline 1.2 (UGC) :
 * "The ability to block abusive users from the service".
 *
 * PORTÉE RÉELLE du blocage (documentée ici pour qu'elle ne dérive pas) :
 *  - CE QUE ÇA FAIT : toutes les réalisations du compte bloqué disparaissent
 *    du feed du bloqueur (GET /feed, tous les tris — voir le filtrage dans
 *    HairdresserController::feed).
 *  - CE QUE ÇA NE FAIT PAS (encore) : la fiche publique du coiffeur reste
 *    atteignable par URL directe, les résultats de recherche/exploration
 *    (GET /search, /explore, /recommendations) et les avis déjà publiés ne
 *    sont pas filtrés. Ces endpoints sont hors du périmètre de ce lot.
 *
 * Le blocage est unidirectionnel et silencieux : la personne bloquée n'est
 * jamais notifiée.
 */
class UserBlockController extends Controller
{
    /** POST /users/{id}/block — idempotent. */
    public function store(Request $request, int $id)
    {
        $user = $request->user();

        if ((int) $id === (int) $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas vous bloquer vous-même.'], 422);
        }

        if (!User::whereKey($id)->exists()) {
            return response()->json(['message' => 'Ce compte n\'existe plus.'], 404);
        }

        // firstOrCreate = SELECT puis INSERT : deux requêtes simultanées
        // (double-tap) peuvent toutes deux passer le SELECT puis tenter
        // l'INSERT — la contrainte unique user_blocks_pair_unique fait
        // échouer la seconde en QueryException (donc 500). Le blocage étant
        // annoncé idempotent, un doublon concurrent est un succès, pas une
        // erreur : on rattrape la violation d'unicité et on répond pareil.
        try {
            UserBlock::firstOrCreate([
                'blocker_id'      => $user->id,
                'blocked_user_id' => $id,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // 23000 = violation de contrainte d'intégrité (doublon) : l'autre
            // requête vient de créer la ligne, l'état voulu est déjà atteint.
            if ((string) $e->getCode() !== '23000') {
                throw $e;
            }
        }

        return response()->json([
            'blocked' => true,
            'message' => 'Ce compte est bloqué. Son contenu n\'apparaîtra plus dans votre fil.',
        ], 201);
    }

    /** DELETE /users/{id}/block — idempotent. */
    public function destroy(Request $request, int $id)
    {
        UserBlock::where('blocker_id', $request->user()->id)
            ->where('blocked_user_id', $id)
            ->delete();

        return response()->json([
            'blocked' => false,
            'message' => 'Ce compte est débloqué.',
        ]);
    }

    /**
     * GET /my-blocks — liste des comptes bloqués, avec le slug de la fiche
     * coiffeur quand il en existe une (permet un lien "voir la fiche" et
     * surtout un débloquage depuis les réglages du compte).
     */
    public function index(Request $request)
    {
        $blocks = UserBlock::where('blocker_id', $request->user()->id)
            ->with('blockedUser:id,name,avatar')
            ->orderByDesc('created_at')
            ->get();

        $userIds = $blocks->pluck('blocked_user_id')->all();
        $slugs   = HairdresserProfile::whereIn('user_id', $userIds)
            ->pluck('slug', 'user_id')
            ->all();

        return response()->json($blocks->map(fn(UserBlock $b) => [
            'user_id'    => $b->blocked_user_id,
            'name'       => $b->blockedUser->name ?? 'Compte supprimé',
            'avatar'     => $b->blockedUser->avatar ?? null,
            'slug'       => $slugs[$b->blocked_user_id] ?? null,
            'blocked_at' => $b->created_at,
        ])->values());
    }
}
