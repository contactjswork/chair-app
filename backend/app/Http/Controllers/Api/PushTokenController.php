<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ApnsService;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

/**
 * Enregistrement des tokens push APNs des appareils.
 *
 * POST   /push/register   {token, platform:'ios', device_name?, app?:'client'|'pro'}
 * DELETE /push/register   {token}
 *
 * - Upsert par token (unique en base) : un appareil qui se reconnecte avec un
 *   autre compte est rattaché au nouvel utilisateur ; un token renouvelé par
 *   iOS crée une nouvelle ligne, l'ancien sera désactivé au premier refus APNs.
 * - Plusieurs appareils par utilisateur : une ligne chacun.
 * - 'app' identifie le binaire (CHAIR CLIENT ou CHAIR PRO) : le token APNs
 *   n'est valable QUE pour le bundle qui l'a obtenu, on mémorise donc le topic.
 * - Le frontend doit appeler DELETE avant de se déconnecter (et logout()
 *   accepte aussi un push_token en filet de sécurité).
 */
class PushTokenController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'token'       => 'required|string|min:16|max:200|regex:/^[0-9a-fA-F]+$/',
            'platform'    => 'required|string|in:ios',
            'device_name' => 'nullable|string|max:100',
            'app'         => 'nullable|string|in:client,pro',
        ]);

        PushSubscription::updateOrCreate(
            ['token' => strtolower($validated['token'])],
            [
                'user_id'      => $request->user()->id,
                'platform'     => $validated['platform'],
                'provider'     => 'apns',
                'bundle_id'    => ApnsService::topicForApp($validated['app'] ?? null),
                'device_name'  => $validated['device_name'] ?? null,
                'enabled'      => true,
                'last_used_at' => now(),
            ]
        );

        return response()->json(['message' => 'Appareil enregistré pour les notifications.']);
    }

    public function unregister(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string|max:200',
        ]);

        // Idempotent : on ne supprime que ses propres tokens, et un token
        // déjà absent renvoie le même succès (le but est atteint).
        PushSubscription::where('user_id', $request->user()->id)
            ->where('token', strtolower($validated['token']))
            ->delete();

        return response()->json(['message' => 'Appareil désinscrit des notifications.']);
    }
}
