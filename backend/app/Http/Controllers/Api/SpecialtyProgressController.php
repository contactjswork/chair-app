<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BadgeService;
use App\Services\SpecialtyReputationService;
use Illuminate\Http\Request;

class SpecialtyProgressController extends Controller
{
    /**
     * GET /my-specialty-progress — score/niveau du coiffeur connecté pour
     * chacune de ses spécialités, plus le détail de comment elles se
     * combinent dans le niveau CHAIR global (voir docs/REPUTATION_ARCHITECTURE.md).
     */
    public function mine(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        SpecialtyReputationService::refreshAll($profile);
        $rows = SpecialtyReputationService::forProfile($profile);

        $specialties = $rows->map(function ($row) use ($profile) {
            $level = SpecialtyReputationService::levelFor($profile, $row);
            // Rang dans SA ville — même méthode que le classement public et
            // les highlights du profil, pas un calcul parallèle.
            $rank = SpecialtyReputationService::rankFor($profile, $row->specialty_id, 'city', $profile->city);

            return [
                'specialty_id'   => $row->specialty_id,
                'specialty_name' => $row->specialty->name ?? null,
                'score'          => $row->score,
                'level'          => $level['level'],
                'level_name'     => $level['name'],
                'level_color'    => $level['color'],
                'rarity'         => $level['rarity'],
                'is_reference'   => $level['level'] >= 4,
                'is_national_reference' => $level['level'] >= 6,
                'posts_count'    => $row->posts_count,
                'reviews_count'  => $row->reviews_count,
                'avg_rating'     => (float) $row->avg_rating,
                'visits_count'   => $row->visits_count,
                'local_rank'      => $rank['rank'] ?? null,
                'local_total'     => $rank['total'] ?? null,
                'points_to_next'  => $rank['points_to_next'] ?? null,
                'next_step'      => SpecialtyReputationService::nextStepFor($profile, $row),
            ];
        })->values();

        return response()->json([
            'specialties'         => $specialties,
            'weighted_aggregate'  => SpecialtyReputationService::weightedAggregate($profile),
            'chair_score'         => BadgeService::computePoints($profile),
        ]);
    }
}
