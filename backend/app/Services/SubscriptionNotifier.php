<?php

namespace App\Services;

use App\Models\Subscription;

/**
 * Notifications de cycle de vie d'un abonnement CHAIR+ / CHAIR BUSINESS,
 * partagées entre Stripe (web) et l'achat intégré Apple.
 *
 * Un seul endroit pour résoudre le destinataire (le coiffeur d'un chair_plus,
 * ou le gérant du salon d'un chair_business) et pour choisir le texte, afin
 * que les deux fournisseurs de paiement notifient exactement pareil.
 *
 * Toutes les méthodes sont best-effort : une notification ne doit jamais
 * faire échouer la synchro d'abonnement qui l'a déclenchée.
 */
class SubscriptionNotifier
{
    /** Utilisateur à prévenir pour cet abonnement (coiffeur ou gérant), ou null. */
    private static function recipientId(Subscription $sub): ?int
    {
        if ($sub->hairdresser_profile_id) {
            return optional($sub->hairdresserProfile)->user_id;
        }
        if ($sub->salon_id) {
            return optional($sub->salon)->owner_id;
        }
        return null;
    }

    /** Entitlement ouvert pour la première fois (essai lancé). */
    public static function started(Subscription $sub): void
    {
        self::emit($sub, 'chair_plus_started');
    }

    /** Paiement refusé — accès conservé le temps des relances, action requise. */
    public static function paymentFailed(Subscription $sub): void
    {
        self::emit($sub, 'chair_plus_payment_failed');
    }

    /** Abonnement réellement terminé (annulation ou non-paiement). */
    public static function expired(Subscription $sub): void
    {
        self::emit($sub, 'chair_plus_expired');
    }

    private static function emit(Subscription $sub, string $type): void
    {
        try {
            $userId = self::recipientId($sub);
            if (!$userId) return;

            NotificationService::sendTyped(
                $userId,
                $type,
                [],
                NotificationCopy::AUDIENCE_PRO,
                ['plan' => $sub->plan, 'provider' => $sub->provider ?? 'stripe']
            );
        } catch (\Throwable $e) {
            \Log::warning('Notification abonnement impossible', [
                'subscription_id' => $sub->id ?? null,
                'type'            => $type,
                'erreur'          => $e->getMessage(),
            ]);
        }
    }
}
