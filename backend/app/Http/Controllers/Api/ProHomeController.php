<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Review;
use App\Models\VerifiedVisit;
use Illuminate\Http\Request;

/**
 * Petits agrégats de la home et de la page Performance.
 *
 * - /my-week : la semaine du coiffeur en chiffres — pensé D'ABORD pour le
 *   salarié, qui n'a ni agenda ni CA : ses passages scannés et ses avis
 *   sont SES chiffres à lui (lot « coiffeurs salariés », 01/09/2026).
 * - /my-goal : l'objectif de CA mensuel que le coiffeur SE fixe. Personnel,
 *   jamais comparé à qui que ce soit.
 */
class ProHomeController extends Controller
{
    /** GET /my-week — passages vérifiés et avis des 7 derniers jours. */
    public function week(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $depuis = now('Europe/Paris')->subDays(7);

        $scans = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->where('created_at', '>=', $depuis)
            ->count();

        $avis = Review::where('hairdresser_id', $profile->id)
            ->where('created_at', '>=', $depuis);
        $avisCount = (clone $avis)->count();
        $avisMoyenne = $avisCount > 0 ? round((clone $avis)->avg('rating'), 1) : null;

        return response()->json([
            'scans_7j'        => $scans,
            'avis_7j'         => $avisCount,
            'avis_moyenne_7j' => $avisMoyenne,
        ]);
    }

    /** GET /my-goal — objectif du mois + CA réalisé (RDV terminés). */
    public function goal(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $debutMois = now('Europe/Paris')->startOfMonth()->toDateString();
        $realise = (float) Appointment::where('hairdresser_id', $profile->id)
            ->where('status', 'completed')
            ->whereDate('appointment_date', '>=', $debutMois)
            ->whereNotNull('price')
            ->sum('price');

        return response()->json([
            'goal'    => $profile->monthly_goal_amount,
            'current' => round($realise, 2),
        ]);
    }

    /** PUT /my-goal {amount: int|null} — null retire l'objectif. */
    public function saveGoal(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'amount' => 'nullable|integer|min:100|max:50000',
        ]);

        $profile->update(['monthly_goal_amount' => $validated['amount'] ?? null]);

        return response()->json(['goal' => $profile->monthly_goal_amount]);
    }
}
