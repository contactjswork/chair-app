<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Laravel/Symfony renvoie "Too Many Attempts." en anglais, codé en dur,
     * pour toute route throttled (limite globale 60/min incluse — voir
     * RouteServiceProvider) — ce message ne passe jamais par lang/fr/, donc
     * il s'affichait tel quel dans une UI 100% française. Repéré en test
     * réel : bannière d'erreur brute sur /pro/profil.
     */
    public function render($request, Throwable $e)
    {
        if ($e instanceof TooManyRequestsHttpException && $request->expectsJson()) {
            $retryAfter = $e->getHeaders()['Retry-After'] ?? null;
            return response()->json([
                'message' => $retryAfter
                    ? "Trop de requêtes — merci de patienter {$retryAfter} secondes avant de réessayer."
                    : 'Trop de requêtes — merci de patienter quelques instants avant de réessayer.',
            ], 429, $e->getHeaders());
        }

        return parent::render($request, $e);
    }
}
