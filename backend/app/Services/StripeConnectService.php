<?php

namespace App\Services;

use App\Models\ChairRental;
use App\Models\ChairRentalPayment;
use App\Models\ChairRentalRequest;
use App\Models\Salon;
use Stripe\StripeClient;

/**
 * Paiement des locations de fauteuil via Stripe CONNECT (modèle marketplace,
 * décision Julien 15/09/2026) :
 *
 *  - chaque salon ouvre un compte Connect EXPRESS (KYC géré par Stripe —
 *    CHAIR ne collecte jamais de pièce d'identité ni d'IBAN) ;
 *  - le coiffeur paie une période (jour/semaine/mois) via Checkout ;
 *  - les fonds vont au salon (transfer_data.destination), la commission
 *    CHAIR est prélevée automatiquement (application_fee_amount,
 *    taux unique : ChairRental::COMMISSION_RATE) ;
 *  - CHAIR ne détient JAMAIS les fonds : c'est Stripe, agréé PSP, qui
 *    encaisse et reverse — conformité DSP2 sans agrément ACPR propre.
 *
 * Tant que STRIPE_SECRET est un placeholder, chaque méthode échoue proprement
 * en 503 côté contrôleur — la plomberie est prête, elle s'allume avec les
 * vraies clés le jour J.
 */
class StripeConnectService
{
    private static function client(): StripeClient
    {
        return new StripeClient(config('services.stripe.secret'));
    }

    /** Les paiements sont-ils configurés côté CHAIR (clés réelles) ? */
    public static function enabled(): bool
    {
        $secret = (string) config('services.stripe.secret');
        return $secret !== '' && !str_contains($secret, 'placeholder');
    }

    /**
     * Lien d'onboarding Connect Express du salon — crée le compte au premier
     * appel, puis renvoie toujours un account_link (reprenable : Stripe sait
     * où le gérant s'est arrêté dans son KYC).
     */
    public static function onboardingUrl(Salon $salon): string
    {
        $stripe = self::client();

        if (!$salon->stripe_account_id) {
            $account = $stripe->accounts->create([
                'type'    => 'express',
                'country' => 'FR',
                'email'   => $salon->owner?->email,
                'business_type' => 'company',
                'capabilities'  => [
                    'card_payments' => ['requested' => true],
                    'transfers'     => ['requested' => true],
                ],
                'metadata' => ['salon_id' => (string) $salon->id],
            ]);
            $salon->forceFill(['stripe_account_id' => $account->id])->save();
        }

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        $link = $stripe->accountLinks->create([
            'account'     => $salon->stripe_account_id,
            'type'        => 'account_onboarding',
            'refresh_url' => "{$frontendUrl}/business/fauteuils?connect=reprendre",
            'return_url'  => "{$frontendUrl}/business/fauteuils?connect=retour",
        ]);

        return $link->url;
    }

    /** État du compte Connect du salon — ce que le front affiche au gérant. */
    public static function accountStatus(Salon $salon): array
    {
        if (!$salon->stripe_account_id) {
            return ['connected' => false, 'charges_enabled' => false, 'payouts_enabled' => false];
        }

        $account = self::client()->accounts->retrieve($salon->stripe_account_id);

        return [
            'connected'         => true,
            'charges_enabled'   => (bool) $account->charges_enabled,
            'payouts_enabled'   => (bool) $account->payouts_enabled,
            'details_submitted' => (bool) $account->details_submitted,
        ];
    }

    /**
     * Checkout d'une période de location pour une demande ACCEPTÉE.
     * Montant = tarif de l'annonce pour la période ; commission = taux
     * plateforme, arrondie au centime.
     */
    public static function createRentalCheckout(ChairRentalRequest $rentalReq, string $period): string
    {
        $rental = $rentalReq->chairRental;
        $salon  = $rental->salon;

        $prix = match ($period) {
            'day'   => $rental->price_per_day,
            'week'  => $rental->price_per_week,
            'month' => $rental->price_per_month,
            default => null,
        };
        if ($prix === null || $prix <= 0) {
            abort(422, 'Cette période n\'a pas de tarif sur cette annonce.');
        }

        $amountCents = (int) round($prix * 100);
        $feeCents    = (int) round($amountCents * ChairRental::COMMISSION_RATE);

        $periodLabel = ['day' => '1 jour', 'week' => '1 semaine', 'month' => '1 mois'][$period];
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        $session = self::client()->checkout->sessions->create([
            'mode'       => 'payment',
            'line_items' => [[
                'quantity'   => 1,
                'price_data' => [
                    'currency'     => 'eur',
                    'unit_amount'  => $amountCents,
                    'product_data' => [
                        'name'        => "Location de fauteuil — {$rental->title}",
                        'description' => "{$periodLabel} · {$salon->name}" . ($rental->city ? " · {$rental->city}" : ''),
                    ],
                ],
            ]],
            'payment_intent_data' => [
                'application_fee_amount' => $feeCents,
                'transfer_data'          => ['destination' => $salon->stripe_account_id],
            ],
            'metadata' => [
                'type'       => 'chair_rental_payment',
                'request_id' => (string) $rentalReq->id,
                'period'     => $period,
            ],
            'success_url' => "{$frontendUrl}/pro/fauteuils-a-louer?paiement=succes",
            'cancel_url'  => "{$frontendUrl}/pro/fauteuils-a-louer?paiement=annule",
        ]);

        ChairRentalPayment::create([
            'chair_rental_request_id' => $rentalReq->id,
            'period'                  => $period,
            'amount_cents'            => $amountCents,
            'application_fee_cents'   => $feeCents,
            'stripe_session_id'       => $session->id,
            'status'                  => 'pending',
        ]);

        return $session->url;
    }

    /**
     * Webhook checkout.session.completed (metadata.type=chair_rental_payment)
     * — marque le paiement, prévient les deux parties. Idempotent : un
     * webhook rejoué ne re-notifie pas.
     */
    public static function onRentalPaid(array $session): void
    {
        $payment = ChairRentalPayment::where('stripe_session_id', $session['id'] ?? '')->first();
        if (!$payment || $payment->status === 'paid') {
            return;
        }

        $payment->update([
            'status'                   => 'paid',
            'paid_at'                  => now(),
            'stripe_payment_intent_id' => $session['payment_intent'] ?? null,
        ]);

        $req = ChairRentalRequest::with(['chairRental.salon', 'hairdresser.user'])->find($payment->chair_rental_request_id);
        if (!$req) {
            return;
        }

        $montant = number_format($payment->amount_cents / 100, 2, ',', ' ');
        $salon   = $req->chairRental?->salon;

        if ($salon?->owner_id) {
            NotificationService::send(
                (int) $salon->owner_id,
                'chair_rental_paid',
                'Location payée',
                "{$req->hairdresser?->user?->name} a payé {$montant} € pour « {$req->chairRental?->title} ». Le virement Stripe suit.",
                ['url' => '/business/fauteuils', 'request_id' => $req->id]
            );
        }
        if ($req->hairdresser?->user_id) {
            NotificationService::send(
                (int) $req->hairdresser->user_id,
                'chair_rental_paid',
                'Paiement confirmé',
                "Votre paiement de {$montant} € pour « {$req->chairRental?->title} » est confirmé. Bonne installation !",
                ['url' => '/pro/fauteuils-a-louer', 'request_id' => $req->id]
            );
        }
    }
}
