<?php

namespace App\Providers;

use App\Services\MailService;
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
        // La construction de l'URL vit dans MailService::passwordResetUrl() :
        // User::sendPasswordResetNotification() (qui envoie l'email CHAIR)
        // utilise exactement la même, une seule route à maintenir.
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            return MailService::passwordResetUrl($notifiable->getEmailForPasswordReset(), $token);
        });
    }
}
