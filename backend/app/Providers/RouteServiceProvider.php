<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * This is used by Laravel authentication to redirect users after login.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * The controller namespace for the application.
     *
     * When present, controller route declarations will automatically be prefixed with this namespace.
     *
     * @var string|null
     */
    // protected $namespace = 'App\\Http\\Controllers';

    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::prefix('api')
                ->middleware('api')
                ->namespace($this->namespace)
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->namespace($this->namespace)
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        // 60/min touché en usage normal : une seule page pro (ex: /pro/profil)
        // déclenche déjà 4-5 requêtes (profil, spécialités, services, géo...),
        // et naviguer entre plusieurs pages /pro/* en une minute (test réel,
        // usage rapide) suffit à l'atteindre. 120/min garde une vraie limite
        // anti-abus tout en laissant la marge nécessaire à une app qui
        // charge plusieurs endpoints par écran.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(optional($request->user())->id ?: $request->ip());
        });

        // Login : double limite (audit sécurité 01/09/2026). Le throttle par IP
        // seul (6/min) ne freine pas un brute-force ciblé sur UN compte mené
        // depuis un pool d'IP. On limite donc AUSSI par email visé — 5 essais
        // par minute sur un même identifiant, quelle que soit l'IP d'origine.
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');
            return [
                Limit::perMinute(6)->by('login-ip:' . $request->ip()),
                Limit::perMinute(5)->by('login-email:' . mb_strtolower($email)),
            ];
        });
    }
}
