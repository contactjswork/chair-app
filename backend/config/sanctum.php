<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the following domains / hosts will receive stateful API
    | authentication cookies. Typically, these should include your local
    | and production domains which access your API via a frontend SPA.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is trying to authenticate a request. If none of these guards
    | are able to authenticate the request, Sanctum will use the bearer
    | token that's present on an incoming request for authentication.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. If this value is null, personal access tokens do
    | not expire. This won't tweak the lifetime of first-party sessions.
    |
    | ── CHAIR ────────────────────────────────────────────────────────────
    | Cette valeur était à `null`, donc des jetons ÉTERNELS. Or ils vivent
    | dans le localStorage d'une WebView iOS : un téléphone perdu, revendu ou
    | prêté conservait un accès complet au compte pour toujours, et une
    | déconnexion à distance était impossible.
    |
    | Défaut : 43200 minutes = 30 jours. Prudent des deux côtés — assez long
    | pour qu'un usage normal (ouvrir l'app une fois par semaine) ne bute
    | jamais dessus, assez court pour qu'un jeton volé se périme seul.
    |
    | ATTENTION : Sanctum compare `created_at`, PAS `last_used_at` (voir
    | vendor/laravel/sanctum/src/Guard.php). L'expiration est donc absolue :
    | l'utilisateur se reconnecte tous les 30 jours même s'il est actif tous
    | les jours. Il n'y a pas de renouvellement glissant dans Sanctum 2.x.
    |
    | Le front gère proprement le 401 qui en résulte : lib/api.ts purge le
    | localStorage et émet `chair:session-expired`, AuthContext vide l'état
    | React et redirige vers /connexion?expired=1 avec un message explicite.
    |
    | SANCTUM_TOKEN_EXPIRATION=0 (ou vide) rétablit des jetons sans
    | expiration — à n'utiliser qu'en dépannage.
    |
    */

    'expiration' => (int) env('SANCTUM_TOKEN_EXPIRATION', 43200) ?: null,

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party SPA with Sanctum you may need to
    | customize some of the middleware Sanctum uses while processing the
    | request. You may change the middleware listed below as required.
    |
    */

    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],

];
