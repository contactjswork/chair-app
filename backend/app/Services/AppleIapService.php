<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\Subscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * CHAIR+ acheté dans l'app iOS (achat intégré Apple / StoreKit).
 *
 * Miroir Apple de StripeService : ce service ne décide JAMAIS de l'accès —
 * il synchronise l'état App Store → la table `subscriptions`, que
 * HairdresserProfile::hasChairPlus() lit comme point de vérité unique.
 *
 * Flux : l'app achète via la feuille de paiement Apple (plugin
 * @capgo/native-purchases), envoie le reçu base64 à POST /iap/verify, et ce
 * service le fait valider par Apple (/verifyReceipt + clé secrète partagée).
 * Les 30 jours gratuits sont l'offre d'essai configurée dans App Store
 * Connect — le reçu les signale via is_trial_period.
 *
 * Renouvellements/annulations : l'appareil n'est pas fiable pour ça (app
 * fermée, désinstallée...). La commande chair:sync-apple-subscriptions
 * re-valide chaque jour les reçus proches de l'échéance avec le
 * latest_receipt stocké — Apple renvoie l'état à jour à chaque validation.
 */
class AppleIapService
{
    const PROD_URL    = 'https://buy.itunes.apple.com/verifyReceipt';
    const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

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
     * Valide le reçu et synchronise la ligne `subscriptions` du profil.
     * Lève une HttpException métier (422/409) sur reçu invalide ou reçu
     * appartenant à un autre compte — messages faits pour être affichés.
     */
    public static function syncFromReceipt(HairdresserProfile $profile, string $receiptData): Subscription
    {
        $response = self::verifyReceipt($receiptData);

        if (($response['status'] ?? -1) !== 0) {
            // 21002 = malformé, 21003 = non authentifié, 21004 = mauvaise clé
            // partagée... Le détail est logué, l'utilisateur reçoit un message
            // unique — il ne peut rien faire de plus précis de son côté.
            \Log::warning('Apple verifyReceipt a échoué', ['status' => $response['status'] ?? null]);
            abort(422, "Apple n'a pas reconnu cet achat. Réessaie, ou utilise « Restaurer mes achats »." );
        }

        // Défense en profondeur (audit 01/09/2026) : le reçu doit appartenir à
        // CHAIR PRO. Sans ce contrôle, un reçu valide d'une AUTRE app (même
        // basé sur la même clé n'est pas censé arriver, mais on ne fait pas
        // confiance) pourrait théoriquement ouvrir l'entitlement.
        $expectedBundle = config('services.apple_iap.bundle_id');
        $receiptBundle = $response['receipt']['bundle_id'] ?? null;
        if ($expectedBundle && $receiptBundle && $receiptBundle !== $expectedBundle) {
            \Log::warning('Reçu Apple : bundle_id inattendu', ['recu' => $receiptBundle, 'attendu' => $expectedBundle]);
            abort(422, "Ce reçu ne correspond pas à l'application CHAIR PRO.");
        }

        $productId = config('services.apple_iap.product_chair_plus');
        $entries = collect($response['latest_receipt_info'] ?? [])
            ->filter(fn ($e) => ($e['product_id'] ?? null) === $productId);

        if ($entries->isEmpty()) {
            abort(422, 'Aucun abonnement CHAIR+ trouvé sur ce compte App Store.');
        }

        // La ligne la plus récente du reçu porte l'état courant de l'abonnement
        // (chaque renouvellement ajoute une entrée ; l'original_transaction_id,
        // lui, ne change jamais).
        $latest = $entries->sortByDesc(fn ($e) => (int) ($e['expires_date_ms'] ?? 0))->first();
        $originalTxId = $latest['original_transaction_id'] ?? null;
        $expiresAt = !empty($latest['expires_date_ms'])
            ? Carbon::createFromTimestampMs((int) $latest['expires_date_ms'])
            : null;

        if (!$originalTxId || !$expiresAt) {
            abort(422, 'Reçu Apple incomplet — réessaie dans un instant.');
        }

        // Un abonnement Apple ne peut nourrir qu'UN profil CHAIR : si ce même
        // abonnement (partage familial, changement de compte...) est déjà
        // rattaché à un autre profil, on refuse au lieu de le déplacer en
        // silence — déplacer couperait l'accès du premier compte sans un mot.
        $existing = Subscription::where('apple_original_transaction_id', $originalTxId)->first();
        if ($existing && $existing->hairdresser_profile_id !== $profile->id) {
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

        return Subscription::updateOrCreate(
            ['apple_original_transaction_id' => $originalTxId],
            [
                'hairdresser_profile_id' => $profile->id,
                'plan'                   => 'chair_plus',
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

        $profile = $subscription->hairdresserProfile;
        if (!$profile) return;

        try {
            self::syncFromReceipt($profile, $subscription->apple_latest_receipt);
        } catch (\Throwable $e) {
            \Log::warning('Resync abonnement Apple impossible', [
                'subscription_id' => $subscription->id,
                'erreur'          => $e->getMessage(),
            ]);
        }
    }
}
