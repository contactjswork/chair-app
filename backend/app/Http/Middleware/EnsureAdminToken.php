<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Garde structurelle pour tout le groupe /admin/* — avant ce middleware, la
 * protection reposait uniquement sur chaque méthode d'AdminController
 * appelant elle-même checkAdmin() (facile à oublier sur une nouvelle route),
 * avec un jeton par défaut codé en dur (chair_admin_secret_2026) utilisé dès
 * que ADMIN_API_TOKEN n'était pas positionné — y compris en .env ici, où il
 * avait été recopié tel quel. Échoue fermé : sans jeton réel configuré,
 * aucune requête ne passe, plutôt que d'accepter un secret connu publiquement.
 */
class EnsureAdminToken
{
    public function handle(Request $request, Closure $next)
    {
        $configured = env('ADMIN_API_TOKEN');

        if (!$configured || $configured === 'chair_admin_secret_2026') {
            return response()->json(['error' => 'Admin access is not configured.'], 503);
        }

        $token = (string) $request->bearerToken();

        if (!hash_equals($configured, $token)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
