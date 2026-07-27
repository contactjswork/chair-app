<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReferralReward;
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

        $nextMilestone = null;
        foreach (ReferralService::MILESTONES as $threshold => $reward) {
            if ($referralCount < $threshold) { $nextMilestone = $threshold; break; }
        }

        $profile = $user->hairdresserProfile;

        return response()->json([
            'code'            => $code,
            'link'            => $link,
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
     * Log une action de partage/parrainage, accorde la récompense si les
     * garde-fous anti-spam le permettent.
     */
    public function share(Request $request)
    {
        $validated = $request->validate([
            'action_type' => 'required|string|in:' . implode(',', array_keys(ReferralService::ACTIONS)),
            'target_type' => 'nullable|string|max:40',
            'target_id'   => 'nullable|integer',
            'channel'     => 'nullable|string|in:copy_link,qr,instagram,whatsapp,snapchat,tiktok,native',
        ]);

        $reward = ReferralService::recordAndReward(
            $request->user(),
            $validated['action_type'],
            $validated['target_type'] ?? null,
            $validated['target_id'] ?? null,
            $validated['channel'] ?? null
        );

        return response()->json([
            'rewarded' => $reward !== null,
            'points'   => $reward->points ?? 0,
        ], 201);
    }
}
