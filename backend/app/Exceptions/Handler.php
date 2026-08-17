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
        // App 100% API (Next.js + mobile) — aucune vue web de login n'existe.
        // Sans cet override, le comportement par défaut de Laravel pour une
        // AuthenticationException (route protégée par auth:sanctum sans
        // token, ou token invalide) essaie encore route('login') dès que la
        // requête n'envoie pas explicitement Accept: application/json (curl
        // brut, bot, client mal configuré) → RouteNotFoundException non
        // rattrapée → 500 avec stacktrace complète au lieu d'un 401 propre.
        // Trouvé en testant EnsureAdminAuthenticated ; touche TOUTES les
        // routes protégées de l'app, pas seulement /admin.
        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Même famille de bug que ci-dessus, découverte en testant la
        // config dynamique (settings/feature flags) : sans Accept:
        // application/json explicite, Laravel traite une ValidationException
        // comme un formulaire web classique et tente une redirection 302
        // (session flash) au lieu d'un 422 JSON — cassant silencieusement
        // TOUT appel API qui valide une requête (validate()) sans cet
        // en-tête. App 100% API, jamais de vue web de formulaire : toujours
        // JSON ici, quel que soit l'Accept envoyé.
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors'  => $e->errors(),
            ], $e->status);
        }

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
