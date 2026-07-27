<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Garde route pour les endpoints entièrement réservés CHAIR+ (ex: upload
 * vidéo courte, plage analytics étendue). Les fonctionnalités où l'accès est
 * partiel (ex: contenu gratuit visible mais action bloquée au milieu d'une
 * méthode) restent en check inline via hasChairPlus(), comme StoryService —
 * ce middleware ne remplace pas ce pattern, il le complète pour les cas
 * "tout ou rien" où toute la route est premium.
 */
class EnsureChairPlus
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $profile = $user?->hairdresserProfile;

        $hasAccess = $profile
            ? $profile->hasChairPlus()
            : ($user?->salon?->hasChairBusiness() ?? false);

        if (!$hasAccess) {
            return response()->json([
                'message'        => 'Cette fonctionnalité est réservée aux abonnés CHAIR+.',
                'chair_plus_required' => true,
            ], 403);
        }

        return $next($request);
    }
}
