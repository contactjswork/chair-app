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
