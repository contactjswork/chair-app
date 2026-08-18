<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\FeatureFlagService;
use App\Services\StripeService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /**
     * GET /my-subscription — état d'abonnement du compte connecté (coiffeur
     * indépendant ou salarié) + du salon s'il y a lieu.
     */
    public function mine(Request $request)
    {
        $user = $request->user();
        $profile = $user->hairdresserProfile;

        $own = $profile
            ? Subscription::where('hairdresser_profile_id', $profile->id)->where('plan', 'chair_plus')->latest('id')->first()
            : null;

        $salon = $profile?->salon_id ? \App\Models\Salon::find($profile->salon_id) : $user->salon;

        $salonSub = null;
        if ($salon) {
            $salonSub = Subscription::where('salon_id', $salon->id)->where('plan', 'chair_business')->latest('id')->first();
        }

        return response()->json([
            'has_chair_plus'     => $profile?->hasChairPlus() ?? false,
            'has_chair_business' => $salon?->hasChairBusiness() ?? false,
            'subscription'       => $own ? $this->format($own) : null,
            'salon_subscription' => $salonSub ? $this->format($salonSub) : null,
        ]);
    }

    /** POST /subscribe — {plan: chair_plus|chair_business} → URL Stripe Checkout. */
    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:chair_plus,chair_business',
        ]);

        if ($validated['plan'] === 'chair_plus' && !FeatureFlagService::isEnabled('chair_plus_enabled')) {
            return response()->json(['message' => "CHAIR+ n'est pas encore disponible."], 403);
        }

        try {
            $url = StripeService::createCheckoutSession($request->user(), $validated['plan']);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            report($e);
            return response()->json(['message' => 'Le service de paiement est momentanément indisponible. Réessayez dans quelques instants.'], 502);
        }

        return response()->json(['checkout_url' => $url]);
    }

    /** POST /subscribe/manage — URL du Stripe Customer Portal (gérer carte, factures, annulation). */
    public function manage(Request $request)
    {
        $user = $request->user();
        $profile = $user->hairdresserProfile;

        $sub = $profile
            ? Subscription::where('hairdresser_profile_id', $profile->id)->whereNotNull('stripe_customer_id')->latest('id')->first()
            : null;

        if (!$sub && $user->salon) {
            $sub = Subscription::where('salon_id', $user->salon->id)->whereNotNull('stripe_customer_id')->latest('id')->first();
        }

        if (!$sub) {
            return response()->json(['message' => 'Aucun abonnement Stripe trouvé.'], 404);
        }

        try {
            $url = StripeService::createBillingPortalSession($sub->stripe_customer_id);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            report($e);
            return response()->json(['message' => 'Le service de paiement est momentanément indisponible. Réessayez dans quelques instants.'], 502);
        }

        return response()->json(['portal_url' => $url]);
    }

    private function format(Subscription $sub): array
    {
        return [
            'plan'                  => $sub->plan,
            'status'                => $sub->status,
            'trial_ends_at'         => $sub->trial_ends_at?->toIso8601String(),
            'current_period_end'    => $sub->current_period_end?->toIso8601String(),
            'canceled_at'           => $sub->canceled_at?->toIso8601String(),
            'cancel_at_period_end'  => $sub->cancel_at_period_end,
            'covers_today'          => $sub->coversToday(),
        ];
    }
}
