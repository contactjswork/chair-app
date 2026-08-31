<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SlotWaitlist;
use Illuminate\Http\Request;

/**
 * « Prévenez-moi si ça se libère » — l'inscription en liste d'attente.
 *
 * Idempotente (firstOrCreate) : taper deux fois le bouton n'inscrit qu'une
 * fois, et re-taper après coup ne réarme PAS une inscription déjà notifiée —
 * le client qui veut retenter sa chance après un push raté re-tape, et là
 * seulement on réarme.
 */
class WaitlistController extends Controller
{
    public function join(Request $request)
    {
        $validated = $request->validate([
            'hairdresser_id' => 'required|integer|exists:hairdresser_profiles,id',
            'date'           => 'required|date|after_or_equal:today',
        ]);

        $inscription = SlotWaitlist::firstOrCreate(
            [
                'hairdresser_id' => $validated['hairdresser_id'],
                'client_user_id' => $request->user()->id,
                'date'           => $validated['date'],
            ]
        );

        // Déjà notifié puis revenu s'inscrire : il veut une nouvelle chance,
        // on réarme son inscription pour la prochaine annulation.
        if (!$inscription->wasRecentlyCreated && $inscription->notified_at) {
            $inscription->forceFill(['notified_at' => null])->save();
        }

        return response()->json(['joined' => true], $inscription->wasRecentlyCreated ? 201 : 200);
    }
}
