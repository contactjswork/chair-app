<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Stripe\Checkout\Session as CheckoutSession;
use Stripe\StripeClient;

/**
 * CHAIR+ / CHAIR BUSINESS — Stripe Checkout + webhooks. Voir docs/CHAIR_PLUS.md.
 *
 * Un seul point de vérité pour l'accès : HairdresserProfile::hasChairPlus()
 * et Salon::hasChairBusiness() lisent la table `subscriptions` que ce
 * service alimente — rien ici ne décide de l'accès, juste de synchroniser
 * l'état Stripe → notre base.
 */
class StripeService
{
    const TRIAL_DAYS = 30;

    private static function client(): StripeClient
    {
        return new StripeClient(config('services.stripe.secret'));
    }

    /**
     * Crée une session Stripe Checkout (abonnement + 30 jours d'essai) et
     * retourne son URL de redirection.
     */
    public static function createCheckoutSession(User $user, string $plan): string
    {
        if (!in_array($plan, ['chair_plus', 'chair_business'], true)) {
            abort(422, 'Plan invalide.');
        }

        $priceId = $plan === 'chair_business'
            ? config('services.stripe.price_chair_business')
            : config('services.stripe.price_chair_plus');

        $metadata = ['plan' => $plan, 'user_id' => (string) $user->id];

        if ($plan === 'chair_business') {
            $salon = $user->salon;
            if (!$salon) abort(422, 'Aucun salon associé à ce compte.');
            $metadata['salon_id'] = (string) $salon->id;
        } else {
            $profile = $user->hairdresserProfile;
            if (!$profile) abort(422, 'Aucun profil coiffeur associé à ce compte.');
            $metadata['hairdresser_profile_id'] = (string) $profile->id;
        }

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $returnPath  = $plan === 'chair_business' ? '/pro/salon/business' : '/pro/chair-plus';

        $session = self::client()->checkout->sessions->create([
            'mode'              => 'subscription',
            'customer_email'    => $user->email,
            'line_items'        => [['price' => $priceId, 'quantity' => 1]],
            'subscription_data' => [
                'trial_period_days' => self::TRIAL_DAYS,
                'metadata'           => $metadata,
            ],
            'metadata'    => $metadata,
            'success_url' => "{$frontendUrl}{$returnPath}?checkout=success",
            'cancel_url'  => "{$frontendUrl}{$returnPath}?checkout=cancel",
        ]);

        return $session->url;
    }

    /**
     * Lien Stripe Customer Portal — l'utilisateur y gère lui-même sa carte,
     * ses factures et son annulation. On ne construit pas cette UI nous-mêmes.
     */
    public static function createBillingPortalSession(string $stripeCustomerId): string
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        $session = self::client()->billingPortal->sessions->create([
            'customer'   => $stripeCustomerId,
            'return_url' => "{$frontendUrl}/pro/chair-plus",
        ]);

        return $session->url;
    }

    // ── Webhooks ─────────────────────────────────────────────────────────────

    public static function handleEvent(\Stripe\Event $event): void
    {
        $data = $event->data->object->toArray();

        match ($event->type) {
            'checkout.session.completed'   => self::onCheckoutCompleted($data),
            'customer.subscription.updated' => self::onSubscriptionUpdated($data),
            'customer.subscription.deleted' => self::onSubscriptionDeleted($data),
            'invoice.payment_failed'        => self::onPaymentFailed($data),
            default => null,
        };
    }

    private static function onCheckoutCompleted(array $session): void
    {
        $metadata = $session['metadata'] ?? [];
        $plan = $metadata['plan'] ?? null;
        $subscriptionId = $session['subscription'] ?? null;
        if (!$plan || !$subscriptionId) return;

        $stripeSub = self::client()->subscriptions->retrieve($subscriptionId);

        $attrs = [
            'plan'                   => $plan,
            'status'                 => $stripeSub->status,
            'stripe_customer_id'     => $session['customer'] ?? null,
            'stripe_subscription_id' => $subscriptionId,
            'trial_ends_at'          => $stripeSub->trial_end ? Carbon::createFromTimestamp($stripeSub->trial_end) : null,
            'current_period_end'     => $stripeSub->current_period_end ? Carbon::createFromTimestamp($stripeSub->current_period_end) : null,
            'cancel_at_period_end'   => (bool) ($stripeSub->cancel_at_period_end ?? false),
        ];

        $subscription = null;
        if ($plan === 'chair_business' && !empty($metadata['salon_id'])) {
            $subscription = Subscription::updateOrCreate(
                ['salon_id' => $metadata['salon_id'], 'plan' => 'chair_business'],
                $attrs
            );
        } elseif (!empty($metadata['hairdresser_profile_id'])) {
            $subscription = Subscription::updateOrCreate(
                ['hairdresser_profile_id' => $metadata['hairdresser_profile_id'], 'plan' => 'chair_plus'],
                $attrs
            );
        }

        // Bienvenue : checkout.session.completed ne se produit qu'à la première
        // souscription (pas aux renouvellements), c'est donc le bon moment.
        if ($subscription && $subscription->wasRecentlyCreated) {
            SubscriptionNotifier::started($subscription);
        }
    }

    private static function onSubscriptionUpdated(array $sub): void
    {
        $row = Subscription::where('stripe_subscription_id', $sub['id'])->first();
        if (!$row) return;

        $row->update([
            'status'                => $sub['status'],
            'current_period_end'    => !empty($sub['current_period_end']) ? Carbon::createFromTimestamp($sub['current_period_end']) : $row->current_period_end,
            'trial_ends_at'         => !empty($sub['trial_end']) ? Carbon::createFromTimestamp($sub['trial_end']) : $row->trial_ends_at,
            'cancel_at_period_end'  => (bool) ($sub['cancel_at_period_end'] ?? false),
        ]);
    }

    private static function onSubscriptionDeleted(array $sub): void
    {
        $row = Subscription::where('stripe_subscription_id', $sub['id'])->first();
        if (!$row) return;

        $row->update(['status' => 'canceled', 'canceled_at' => now()]);
        SubscriptionNotifier::expired($row);
    }

    private static function onPaymentFailed(array $invoice): void
    {
        $subscriptionId = $invoice['subscription'] ?? null;
        if (!$subscriptionId) return;

        $row = Subscription::where('stripe_subscription_id', $subscriptionId)->first();
        if (!$row) return;

        // Stripe retente automatiquement (Smart Retries) — on marque juste
        // l'état, coversToday() garde l'accès tant que current_period_end
        // n'est pas dépassé, laissant le temps au paiement de repasser.
        // On ne notifie qu'au PASSAGE en past_due (pas à chaque relance Stripe
        // qui ré-émet l'événement), pour ne pas répéter l'alerte.
        $wasPastDue = $row->status === 'past_due';
        $row->update(['status' => 'past_due']);
        if (!$wasPastDue) {
            SubscriptionNotifier::paymentFailed($row);
        }
    }
}
