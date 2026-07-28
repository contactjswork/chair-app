<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // Cette API n'a aucune route web nommée "password.reset" (backend
        // API-only) — sans ce callback, la notification par défaut de
        // Laravel appelle route('password.reset', ...) et lève une
        // RouteNotFoundException au moment d'envoyer l'email. Pointe
        // directement vers la page frontend qui consomme le lien.
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
            return $frontendUrl . '/reinitialiser-mot-de-passe?token=' . $token
                . '&email=' . urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
