<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppleIapService;
use Illuminate\Http\Request;

/**
 * Achat intégré Apple — pendant natif de SubscriptionController::subscribe
 * (qui, lui, crée un Stripe Checkout pour le web). L'app iOS a déjà encaissé
 * le paiement via la feuille Apple quand elle appelle ici : ce endpoint ne
 * vend rien, il VÉRIFIE le reçu auprès d'Apple et ouvre l'entitlement.
 */
class IapController extends Controller
{
    /** POST /iap/verify — {receipt: base64} → valide chez Apple, synchronise l'abonnement. */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            // Un reçu StoreKit base64 fait couramment plusieurs dizaines de Ko.
            'receipt' => 'required|string|max:1000000',
        ]);

        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Aucun profil coiffeur associé à ce compte.'], 422);
        }

        try {
            $subscription = AppleIapService::syncFromReceipt($profile, $validated['receipt']);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e) {
            // abort(422/409) du service — messages métier prêts à afficher.
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'La vérification avec Apple a échoué. Réessaie dans quelques instants.'], 502);
        }

        return response()->json([
            'has_chair_plus' => $profile->fresh()->hasChairPlus(),
            'subscription'   => [
                'plan'                 => $subscription->plan,
                'provider'             => $subscription->provider,
                'status'               => $subscription->status,
                'trial_ends_at'        => $subscription->trial_ends_at?->toIso8601String(),
                'current_period_end'   => $subscription->current_period_end?->toIso8601String(),
                'canceled_at'          => $subscription->canceled_at?->toIso8601String(),
                'cancel_at_period_end' => $subscription->cancel_at_period_end,
                'covers_today'         => $subscription->coversToday(),
            ],
        ]);
    }
}
