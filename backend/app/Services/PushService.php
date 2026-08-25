<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de notifications push APNs à un utilisateur (tous ses appareils).
 *
 * Chaîne vérifiée, DANS L'ORDRE :
 *   1. préférence CHAIR du type (NotificationService::shouldSend — même
 *      mécanisme et mêmes clés que les notifications internes, AUCUNE
 *      taxonomie parallèle) ;
 *   2. tokens actifs de l'utilisateur (table push_subscriptions) ;
 *   3. envoi APNs token par token (topic = binaire d'origine du token) ;
 *   4. désactivation des tokens morts (410 / BadDeviceToken / Unregistered).
 *
 * Best-effort : ne lève JAMAIS d'exception — un échec push ne doit jamais
 * faire échouer la transaction métier appelante (RDV, avis, badge...).
 *
 * CONTRAT AVEC LE FRONTEND (payload) :
 *   {
 *     "aps":  { "alert": { "title", "body" }, "sound": "default", "badge": n },
 *     "type": "<type CHAIR>",           // ex. appointment_confirmed
 *     "url":  "/app/compte"             // chemin INTERNE CHAIR à ouvrir au tap
 *   }
 *   "url" est toujours un chemin relatif du site (jamais d'URL absolue) :
 *   le binaire client ouvre /app/..., le binaire pro /pro/... — c'est le
 *   deep link que le frontend doit router au tap sur la notification.
 *   "badge" = nombre de notifications internes non lues du destinataire.
 */
class PushService
{
    /**
     * Envoie un push à tous les appareils actifs de l'utilisateur.
     *
     * @param  User   $user  destinataire
     * @param  string $type  type CHAIR (mêmes clés que NotificationService)
     * @param  string $title titre français (celui de la notification interne)
     * @param  string $body  message français
     * @param  array  $data  payload technique ; $data['url'] force le deep
     *                       link, sinon il est déduit du type + rôle
     * @return int nombre de pushes acceptés par APNs (0 = rien d'envoyé)
     */
    public static function sendToUser(User $user, string $type, string $title, string $body, array $data = []): int
    {
        try {
            // 1. Préférence CHAIR du type — même mécanisme que les
            //    notifications internes. Un type non mappé est envoyé.
            if (!NotificationService::shouldSend((int) $user->id, $type)) {
                return 0;
            }

            if (!ApnsService::isConfigured()) {
                return 0; // pas de clé .p8 → no-op silencieux (comme MailService sans SMTP)
            }

            // 2. Tokens actifs de l'utilisateur (plusieurs appareils possibles).
            $subscriptions = PushSubscription::where('user_id', $user->id)->active()->get();
            if ($subscriptions->isEmpty()) {
                return 0;
            }

            $url   = isset($data['url']) && is_string($data['url']) && $data['url'] !== ''
                ? $data['url']
                : self::defaultUrl($type, $user);
            $badge = Notification::where('user_id', $user->id)->whereNull('read_at')->count();

            $payload = array_merge($data, [
                'aps' => [
                    'alert' => ['title' => $title, 'body' => $body],
                    'sound' => 'default',
                    'badge' => $badge,
                ],
                'type' => $type,
                'url'  => $url,
            ]);

            // 3. Envoi par token, topic du binaire d'origine.
            $sent = 0;
            foreach ($subscriptions as $subscription) {
                $topic  = $subscription->bundle_id ?: ApnsService::topicForApp(null);
                $result = ApnsService::send((string) $subscription->token, $payload, $topic);

                if ($result['ok']) {
                    $sent++;
                    $subscription->forceFill(['last_used_at' => now()])->save();
                } elseif (ApnsService::isDeadToken((int) ($result['status'] ?? 0), $result['reason'])) {
                    // 4. Token mort : APNs ne le reconnaîtra plus jamais.
                    $subscription->forceFill(['enabled' => false])->save();
                    Log::info('APNs token disabled', [
                        'subscription_id' => $subscription->id,
                        'user_id'         => $user->id,
                        'reason'          => $result['reason'] ?? $result['status'],
                    ]);
                }
            }

            return $sent;
        } catch (\Throwable $e) {
            Log::warning('PushService::sendToUser failed', [
                'user_id' => $user->id ?? null,
                'type'    => $type,
                'error'   => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Deep link par défaut selon le type et le rôle du destinataire.
     * Chaque chemin existe dans le frontend (frontend/app/...).
     */
    public static function defaultUrl(string $type, User $user): string
    {
        $isPro = in_array($user->role, ['hairdresser', 'salon_owner'], true);

        switch ($type) {
            // RDV — l'agenda côté pro, l'espace compte (mes rendez-vous) côté client
            case 'appointment_created':
            case 'appointment_confirmed':
            case 'appointment_cancelled':
            case 'appointment_rescheduled':
            case 'appointment_reminder_24h':
            case 'appointment_reminder_1h':
                return $isPro ? '/pro/agenda' : '/app/compte';

            // Avis — le coiffeur les consulte dans ses réservations
            case 'review_received':
            case 'review_request':
                return $isPro ? '/pro/reservations' : '/app/compte';

            // Tout le reste : le centre de notifications du bon espace
            default:
                return $isPro ? '/pro/notifications' : '/app/notifications';
        }
    }
}
