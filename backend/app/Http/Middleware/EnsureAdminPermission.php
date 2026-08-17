<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Vérification de permission granulaire. Usage sur une route :
 *   ->middleware('admin.permission:users.suspend')
 *
 * Toujours placé APRÈS 'auth:sanctum' et 'admin.auth' dans la chaîne (ces
 * deux-là garantissent déjà $request->user() = un compte admin actif).
 */
class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        $user = $request->user();

        if (!$user || !$user->hasPermission($permission)) {
            return response()->json([
                'error'    => 'Permission refusée',
                'required' => $permission,
            ], 403);
        }

        return $next($request);
    }
}
