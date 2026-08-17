<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Remplace EnsureAdminToken (jeton statique partagé, conservé en fichier
 * pour mémoire mais plus branché sur aucune route). S'appuie sur
 * 'auth:sanctum' — DOIT tourner avant ce middleware sur le groupe de
 * routes — pour identifier un compte réel, puis vérifie qu'il s'agit d'un
 * compte admin actif : role='admin', un admin_role assigné, non suspendu.
 *
 * La permission fine par action (ex: 'users.suspend') est vérifiée
 * séparément par EnsureAdminPermission sur chaque route — ce middleware ne
 * fait que la porte d'entrée générale de l'espace admin.
 */
class EnsureAdminAuthenticated
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if ($user->suspended_at) {
            return response()->json(['error' => 'Compte suspendu'], 403);
        }

        if (!$user->admin_role_id) {
            return response()->json(['error' => "Aucun rôle admin n'est assigné à ce compte"], 403);
        }

        return $next($request);
    }
}
