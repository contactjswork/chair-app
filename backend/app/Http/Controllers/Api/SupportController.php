<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use Illuminate\Http\Request;

/**
 * Support prioritaire CHAIR+ — les demandes des abonnés sont marquées
 * priority=true et remontent en tête côté admin (voir tri dans index()).
 * Pas de file d'attente/SLA automatisé ici, juste le tri — le vrai
 * traitement reste humain, côté équipe CHAIR.
 */
class SupportController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:150',
            'message' => 'required|string|max:2000',
        ]);

        $user = $request->user();
        $profile = $user->hairdresserProfile;
        $isPremium = $profile
            ? $profile->hasChairPlus()
            : ($user->salon?->hasChairBusiness() ?? false);

        $ticket = SupportRequest::create([
            'user_id' => $user->id,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'priority' => $isPremium,
        ]);

        return response()->json($ticket, 201);
    }

    public function mine(Request $request)
    {
        return response()->json(
            SupportRequest::where('user_id', $request->user()->id)->orderByDesc('created_at')->get()
        );
    }
}
