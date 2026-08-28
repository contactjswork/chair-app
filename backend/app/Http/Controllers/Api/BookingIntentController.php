<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookingIntent;
use App\Models\HairdresserProfile;
use Illuminate\Http\Request;

/**
 * Intentions de réservation — voir le modèle BookingIntent pour le pourquoi.
 *
 * Aucun de ces endpoints ne demande quoi que ce soit au client : le premier
 * est déclenché par un tap qu'il faisait déjà, le deuxième alimente une carte
 * de rappel, le troisième la fait taire.
 */
class BookingIntentController extends Controller
{
    /**
     * POST /api/booking-intents
     *
     * Enregistré au moment où le client ouvre l'agenda externe d'un coiffeur.
     * Silencieux et sans conséquence visible : le client part sur Planity
     * comme avant.
     *
     * Anti-doublon : rouvrir le même agenda trois fois dans la journée ne doit
     * pas produire trois intentions, ni donc gonfler la statistique montrée au
     * coiffeur.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'hairdresser_id' => 'required|integer|exists:hairdresser_profiles,id',
        ]);

        $user = $request->user();

        $existing = BookingIntent::where('user_id', $user->id)
            ->where('hairdresser_id', $data['hairdresser_id'])
            ->whereNull('resolved_at')
            ->where('opened_at', '>=', now()->subDay())
            ->first();

        if ($existing) {
            return response()->json(['intent_id' => $existing->id, 'created' => false], 200);
        }

        $hairdresser = HairdresserProfile::find($data['hairdresser_id']);

        $intent = BookingIntent::create([
            'user_id'        => $user->id,
            'hairdresser_id' => $hairdresser->id,
            'salon_id'       => $hairdresser->salon_id,
            'opened_at'      => now(),
        ]);

        return response()->json(['intent_id' => $intent->id, 'created' => true], 201);
    }

    /**
     * GET /api/booking-intents/pending
     *
     * La plus récente intention encore en attente, pour la carte de rappel.
     * Renvoie null plutôt qu'un 404 : l'absence de rappel est le cas NORMAL,
     * pas une erreur, et l'app ne doit pas avoir à traiter un échec pour ça.
     */
    public function pending(Request $request)
    {
        $intent = BookingIntent::with('hairdresser.user:id,name')
            ->where('user_id', $request->user()->id)
            ->whereNull('resolved_at')
            ->where('opened_at', '>=', now()->subDays(BookingIntent::RELEVANCE_DAYS))
            ->latest('opened_at')
            ->first();

        if (!$intent) {
            return response()->json(['intent' => null]);
        }

        return response()->json([
            'intent' => [
                'id'               => $intent->id,
                'hairdresser_slug' => $intent->hairdresser?->slug,
                'hairdresser_name' => $intent->hairdresser?->user?->name,
                'opened_at'        => $intent->opened_at?->toISOString(),
            ],
        ]);
    }

    /**
     * POST /api/booking-intents/{id}/dismiss
     *
     * Le client écarte le rappel. On ne lui redemandera pas pour cette
     * intention — un rappel qu'on ne peut pas faire taire devient une gêne.
     */
    public function dismiss(Request $request, int $id)
    {
        $intent = BookingIntent::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $intent->update([
            'resolved_at' => now(),
            'resolution'  => BookingIntent::RESOLUTION_DISMISSED,
        ]);

        return response()->json(['ok' => true]);
    }
}
