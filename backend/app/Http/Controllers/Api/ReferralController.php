<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReferralReward;
use App\Models\ShareEvent;
use App\Services\ReferralService;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    /**
     * GET /my-referral — code, lien, QR (même pattern que le QR d'avis
     * certifié) et statistiques du programme ambassadeur.
     */
    public function mine(Request $request)
    {
        $user = $request->user();
        $code = ReferralService::codeFor($user);

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $link = "{$frontendUrl}/parrainage/{$code}";

        $referralCount = ReferralService::referralCount($user);
        $totalPoints   = (int) ReferralReward::where('user_id', $user->id)->sum('points');
        // Compteur purement informatif ("invitations envoyées") — ne reflète
        // aucun crédit, seulement les fois où l'utilisateur a partagé/copié
        // son lien. Sert à afficher l'entonnoir complet sans jamais laisser
        // croire qu'un partage rapporte des points.
        $sharesCount   = ShareEvent::where('user_id', $user->id)
            ->whereIn('action_type', ReferralService::TELEMETRY_ACTIONS)
            ->count();

        $nextMilestone = null;
        foreach (ReferralService::MILESTONES as $threshold => $reward) {
            if ($referralCount < $threshold) { $nextMilestone = $threshold; break; }
        }

        $profile = $user->hairdresserProfile;

        return response()->json([
            'code'            => $code,
            'link'            => $link,
            'shares_count'    => $sharesCount,
            'referral_count'  => $referralCount,
            'points_earned'   => $totalPoints,
            'next_milestone'  => $nextMilestone,
            'milestones'      => array_keys(ReferralService::MILESTONES),
            'chair_plus_until'=> $profile?->chair_plus_until?->toIso8601String(),
            'boost_until'     => $profile?->featured_until?->toIso8601String(),
        ]);
    }

    /**
     * POST /share-events — {action_type, target_type?, target_id?, channel?}
     * Pure télémétrie ("invitations envoyées") : ne crédite JAMAIS de points.
     * action_type est validé contre TELEMETRY_ACTIONS uniquement — les reasons
     * de ACTIONS (invite_hairdresser/invite_salon/invite_client) ne sont pas
     * dans cette liste et sont donc rejetés ici avec un 422, quoi qu'il
     * arrive. Les points de parrainage ne sont attribués que côté serveur, à
     * l'inscription réelle d'un filleul — voir ReferralService::attributeSignup().
     */
    public function share(Request $request)
    {
        $validated = $request->validate([
            'action_type' => 'required|string|in:' . implode(',', ReferralService::TELEMETRY_ACTIONS),
            'target_type' => 'nullable|string|max:40',
            'target_id'   => 'nullable|integer',
            'channel'     => 'nullable|string|in:copy_link,qr,instagram,whatsapp,snapchat,tiktok,native',
        ]);

        ReferralService::logShare(
            $request->user(),
            $validated['action_type'],
            $validated['target_type'] ?? null,
            $validated['target_id'] ?? null,
            $validated['channel'] ?? null
        );

        return response()->json(['rewarded' => false, 'points' => 0], 201);
    }
}
