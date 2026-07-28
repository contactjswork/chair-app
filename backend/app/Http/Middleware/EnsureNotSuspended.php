<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Bloque l'accès API à un compte suspendu par un admin. Sans ce middleware,
 * suspendUser() posait bien suspended_at en base mais l'utilisateur restait
 * connecté (token Sanctum toujours valide) — la suspension n'avait aucun
 * effet réel. Voir aussi AdminController::suspendUser() qui révoque
 * désormais aussi les tokens existants au moment de la suspension.
 */
class EnsureNotSuspended
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && $user->suspended_at) {
            return response()->json(['message' => 'Ce compte est suspendu.'], 403);
        }

        return $next($request);
    }
}
