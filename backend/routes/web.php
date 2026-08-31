<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

/*
|--------------------------------------------------------------------------
| Déclencheur du planificateur (hébergement mutualisé)
|--------------------------------------------------------------------------
|
| Le planificateur de tâches d'Infomaniak n'exécute que des URL, jamais des
| commandes shell : impossible d'y mettre le `php artisan schedule:run` que
| Laravel attend normalement dans un cron. Cette route fait le pont — le
| planificateur l'appelle toutes les minutes, elle exécute les tâches dues
| (rappels de rendez-vous, purge des stories expirées).
|
| Sécurité : la route est publique par nature (le planificateur ne peut pas
| s'authentifier), elle est donc protégée par un jeton secret comparé en
| temps constant. Sans SCHEDULER_TOKEN dans le .env, elle répond 404 —
| jamais activée par défaut, y compris en local.
|
| Réponse volontairement minimale : un déclencheur ne doit rien divulguer.
|
*/
Route::get('/scheduler/run', function (\Illuminate\Http\Request $request) {
    $expected = env('SCHEDULER_TOKEN');

    // Pas de jeton configuré = fonctionnalité désactivée. On répond 404 (et
    // non 403) pour ne pas révéler l'existence de la route.
    if (!$expected) {
        abort(404);
    }

    if (!hash_equals($expected, (string) $request->query('token'))) {
        abort(404);
    }

    \Illuminate\Support\Facades\Artisan::call('schedule:run');

    return response()->json(['ok' => true], 200);
});

/*
|--------------------------------------------------------------------------
| QR imprimé — /q/{slug}
|--------------------------------------------------------------------------
| La cible du chevalet de comptoir. Un QR imprimé ne peut pas porter le
| token tournant (TTL 8 min) : cette URL permanente émet le token courant
| et redirige vers l'écran de scan.
|
| Sécurité : le TTL n'était que la troisième serrure. Les deux vraies
| tiennent toujours au scan — un seul scan par client et par coiffeur
| toutes les 12 h, et le plafond quotidien par coiffeur. L'anti auto-scan
| aussi. Un chevalet physique exige ce compromis, il ne l'affaiblit
| qu'à la marge.
*/
Route::get('/q/{slug}', function (string $slug) {
    $profile = \App\Models\HairdresserProfile::where('slug', $slug)->first();
    if (!$profile) {
        abort(404);
    }
    $token = \App\Services\QrTokenService::getOrCreateToken($profile, null);
    $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
    return redirect()->away($frontendUrl . '/scan/' . $token->token_hash);
});
