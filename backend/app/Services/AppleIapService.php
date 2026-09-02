<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * Achats intégrés Apple (StoreKit) — les DEUX abonnements CHAIR :
 *   • CHAIR+ (coiffeur)      — vendu dans le binaire CHAIR PRO ;
 *   • CHAIR BUSINESS (salon) — vendu dans le binaire CHAIR BUSINESS.
 *
 * Miroir Apple de StripeService : ce service ne décide JAMAIS de l'accès —
 * il synchronise l'état App Store → la table `subscriptions`, que
 * HairdresserProfile::hasChairPlus() / Salon::hasChairBusiness() lisent
 * comme points de vérité uniques.
 *
 * Flux : l'app achète via la feuille de paiement Apple, envoie le reçu
 * base64 à POST /iap/verify, et ce service le fait valider par Apple
 * (/verifyReceipt + clé secrète partagée). Le PRODUIT trouvé dans le reçu
 * décide du plan et de la cible (profil coiffeur ou salon du gérant).
 *
 * Renouvellements/annulations : la commande chair:sync-apple-subscriptions
 * re-valide chaque jour les reçus proches de l'échéance.
 */
class AppleIapService
{
    const PROD_URL    = 'https://buy.itunes.apple.com/verifyReceipt';
    const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

    /** product_id App Store → plan interne. */
    private static function products(): array
    {
        return array_filter([
            (string) config('services.apple_iap.product_chair_plus')     => 'chair_plus',
            (string) config('services.apple_iap.product_chair_business') => 'chair_business',
        ], fn ($plan, $product) => $product !== '', ARRAY_FILTER_USE_BOTH);
    }

    /**
     * Valide un reçu auprès d'Apple et retourne la réponse décodée.
     * Statut 21007 = reçu sandbox envoyé en prod (build TestFlight/Xcode) —
     * Apple impose de retenter sur l'environnement sandbox, jamais l'inverse.
     */
    public static function verifyReceipt(string $receiptData): array
    {
        $payload = [
            'receipt-data'             => $receiptData,
            'password'                 => config('services.apple_iap.shared_secret'),
            'exclude-old-transactions' => true,
        ];

        $response = Http::timeout(15)->post(self::PROD_URL, $payload)->json();

        if (($response['status'] ?? -1) === 21007) {
            $response = Http::timeout(15)->post(self::SANDBOX_URL, $payload)->json();
        }

        return $response ?? ['status' => -1];
    }

    /**
     * Valide le reçu et synchronise la ligne `subscriptions` correspondante.
     * Le produit trouvé dans le reçu décide de tout : CHAIR+ → profil
     * coiffeur de $user ; CHAIR BUSINESS → salon dont $user est gérant.
     * Lève une HttpException métier (422/409) — messages faits pour être affichés.
     */
    public static function syncFromReceipt(User $user, string $receiptData): Subscription
    {
        $response = self::verifyReceipt($receiptData);

        if (($response['status'] ?? -1) !== 0) {
            // 21002 = malformé, 21003 = non authentifié, 21004 = mauvaise clé
            // partagée... Le détail est logué, l'utilisateur reçoit un message
            // unique — il ne peut rien faire de plus précis de son côté.
            \Log::warning('Apple verifyReceipt a échoué', ['status' => $response['status'] ?? null]);
            abort(422, "Apple n'a pas reconnu cet achat. Réessaie, ou utilise « Restaurer mes achats »." );
        }

        // Défense en profondeur (audit 01/09/2026) : le reçu doit venir d'un
        // binaire CHAIR (PRO ou BUSINESS) — jamais d'une autre app.
        $allowedBundles = array_filter([
            config('services.apple_iap.bundle_id'),
            config('services.apple_iap.bundle_id_business'),
        ]);
        $receiptBundle = $response['receipt']['bundle_id'] ?? null;
        if ($allowedBundles && $receiptBundle && !in_array($receiptBundle, $allowedBundles, true)) {
            \Log::warning('Reçu Apple : bundle_id inattendu', ['recu' => $receiptBundle]);
            abort(422, "Ce reçu ne correspond pas à une application CHAIR.");
        }

        $products = self::products();
        $entries = collect($response['latest_receipt_info'] ?? [])
            ->filter(fn ($e) => isset($products[$e['product_id'] ?? '']));

        if ($entries->isEmpty()) {
            abort(422, 'Aucun abonnement CHAIR trouvé sur ce compte App Store.');
        }

        // La ligne la plus récente du reçu porte l'état courant de l'abonnement
        // (chaque renouvellement ajoute une entrée ; l'original_transaction_id,
        // lui, ne change jamais).
        $latest = $entries->sortByDesc(fn ($e) => (int) ($e['expires_date_ms'] ?? 0))->first();
        $productId = $latest['product_id'];
        $plan = $products[$productId];
        $originalTxId = $latest['original_transaction_id'] ?? null;
        $expiresAt = !empty($latest['expires_date_ms'])
            ? Carbon::createFromTimestampMs((int) $latest['expires_date_ms'])
            : null;

        if (!$originalTxId || !$expiresAt) {
            abort(422, 'Reçu Apple incomplet — réessaie dans un instant.');
        }

        // Cible de l'entitlement selon le plan.
        $profileId = null;
        $salonId = null;
        if ($plan === 'chair_plus') {
            $profile = $user->hairdresserProfile;
            if (!$profile) abort(422, 'Aucun profil coiffeur associé à ce compte.');
            $profileId = $profile->id;
        } else {
            $salon = $user->salon;
            if (!$salon) abort(422, 'Aucun salon associé à ce compte.');
            $salonId = $salon->id;
        }

        // Un abonnement Apple ne peut nourrir qu'UNE cible CHAIR : si ce même
        // abonnement (partage familial, changement de compte...) est déjà
        // rattaché ailleurs, on refuse au lieu de le déplacer en silence.
        $existing = Subscription::where('apple_original_transaction_id', $originalTxId)->first();
        if ($existing && ($existing->hairdresser_profile_id !== $profileId || $existing->salon_id !== $salonId)) {
            abort(409, 'Cet abonnement App Store est déjà rattaché à un autre compte CHAIR.');
        }

        $isTrial = ($latest['is_trial_period'] ?? 'false') === 'true';
        // pending_renewal_info dit si le renouvellement automatique est coupé
        // (annulation programmée dans les réglages App Store) — l'accès court
        // jusqu'à expires_date, comme cancel_at_period_end chez Stripe.
        $autoRenew = collect($response['pending_renewal_info'] ?? [])
            ->firstWhere('product_id', $productId)['auto_renew_status'] ?? '1';

        if ($expiresAt->isFuture()) {
            $status = $isTrial ? 'trialing' : 'active';
            $canceledAt = null;
        } else {
            $status = 'canceled';
            $canceledAt = $expiresAt;
        }

        // Statut AVANT cette synchro (null si la ligne n'existe pas encore),
        // pour ne notifier qu'aux vraies transitions — voir plus bas.
        $previousStatus = $existing?->status;

        $subscription = Subscription::updateOrCreate(
            ['apple_original_transaction_id' => $originalTxId],
            [
                'hairdresser_profile_id' => $profileId,
                'salon_id'               => $salonId,
                'plan'                   => $plan,
                'provider'               => 'apple',
                'status'                 => $status,
                'trial_ends_at'          => $isTrial ? $expiresAt : null,
                'current_period_end'     => $expiresAt,
                'canceled_at'            => $canceledAt,
                'cancel_at_period_end'   => $autoRenew === '0',
                // Apple renvoie un reçu à jour à chaque validation — c'est
                // celui-là qu'on garde pour les resynchronisations serveur.
                'apple_latest_receipt'   => $response['latest_receipt'] ?? $receiptData,
            ]
        );

        // Notifications de cycle de vie (une seule fois par transition) :
        //   • première ouverture de l'entitlement → bienvenue ;
        //   • passage d'un statut couvrant à « canceled » → fin d'abonnement.
        if ($previousStatus === null && in_array($status, ['trialing', 'active'], true)) {
            SubscriptionNotifier::started($subscription);
        } elseif ($previousStatus !== 'canceled' && $status === 'canceled') {
            SubscriptionNotifier::expired($subscription);
        }

        return $subscription;
    }

    /**
     * Resynchronise une ligne Apple existante depuis son dernier reçu stocké
     * (renouvellement encaissé, annulation, réabonnement direct App Store).
     * Best-effort : une erreur est loguée, jamais propagée — la commande
     * quotidienne repassera.
     */
    public static function resync(Subscription $subscription): void
    {
        if ($subscription->provider !== 'apple' || !$subscription->apple_latest_receipt) return;

        // L'utilisateur « propriétaire » de l'entitlement : le coiffeur pour
        // CHAIR+, le gérant du salon pour CHAIR BUSINESS.
        $user = $subscription->hairdresser_profile_id
            ? optional($subscription->hairdresserProfile)->user
            : optional($subscription->salon)->owner;
        if (!$user) return;

        try {
            self::syncFromReceipt($user, $subscription->apple_latest_receipt);
        } catch (\Throwable $e) {
            \Log::warning('Resync abonnement Apple impossible', [
                'subscription_id' => $subscription->id,
                'erreur'          => $e->getMessage(),
            ]);
        }
    }
}
