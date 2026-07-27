<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use App\Services\StripeService;

class StripeWebhookController extends Controller
{
    /**
     * POST /stripe/webhook — endpoint PUBLIC (pas de Sanctum, Stripe n'a pas
     * de token utilisateur), sécurisé uniquement par la vérification de
     * signature Stripe-Signature. Idempotent : chaque stripe_event_id n'est
     * traité qu'une fois (Stripe peut renvoyer le même événement plusieurs
     * fois — retries réseau).
     */
    public function handle(Request $request)
    {
        $payload   = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $secret    = config('services.stripe.webhook_secret');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $secret);
        } catch (\UnexpectedValueException $e) {
            return response()->json(['message' => 'Payload invalide.'], 400);
        } catch (SignatureVerificationException $e) {
            return response()->json(['message' => 'Signature invalide.'], 400);
        }

        // Idempotence — insertOrIgnore via une contrainte unique sur
        // stripe_event_id : si déjà traité, on répond 200 sans retraiter
        // (Stripe considère un non-200 comme un échec et réessaie).
        $inserted = DB::table('stripe_webhook_events')->insertOrIgnore([
            'stripe_event_id' => $event->id,
            'type'            => $event->type,
            'processed_at'    => now(),
        ]);

        if ($inserted === 0) {
            return response()->json(['received' => true, 'idempotent' => true]);
        }

        try {
            StripeService::handleEvent($event);
        } catch (\Throwable $e) {
            Log::error('Stripe webhook processing failed', ['event' => $event->type, 'error' => $e->getMessage()]);
            // On a déjà marqué l'event comme reçu (idempotence) — ne pas
            // renvoyer d'erreur qui ferait retenter Stripe indéfiniment sur
            // un event qu'on ne pourra de toute façon jamais traiter.
        }

        return response()->json(['received' => true]);
    }
}
