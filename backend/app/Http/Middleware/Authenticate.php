<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * API pur — aucune route web nommée 'login' n'existe (voir routes/web.php).
     * L'implémentation d'origine appelait route('login') dès que la requête
     * n'envoyait pas Accept: application/json (ex: curl brut, un bot, un
     * client mal configuré) → RouteNotFoundException non rattrapée → 500
     * avec la stacktrace complète au lieu d'un 401 propre, sur TOUTE route
     * protégée par auth:sanctum de l'application (pas spécifique à
     * l'admin — trouvé en testant EnsureAdminAuthenticated). Toujours
     * renvoyer null : Laravel bascule alors sur une réponse JSON 401
     * standard, ce qui est le comportement correct pour une API.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        return null;
    }
}
