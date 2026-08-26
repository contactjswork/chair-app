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
     * Types SOCIAUX (voir docs/PUSH_NOTIFICATIONS.md § Stratégie d'envoi) :
     * jamais de push la nuit, plafonnés à la source. Le transactionnel
     * (RDV, rappels, avis) n'est PAS dans cette liste — il part à toute heure.
     */
    public const SOCIAL_TYPES = [
        'new_post',
        'followed_post',
        'new_hairdresser_nearby',
        'promotion',
        'promotions',
    ];

    /** Fenêtre calme des pushes sociaux : de 21 h (inclus) à 9 h (exclu), Europe/Paris. */
    public const QUIET_HOURS_START = 21;
    public const QUIET_HOURS_END   = 9;

    /** Ce type est-il social (soumis à la fenêtre calme) ? */
    public static function isSocialType(string $type): bool
    {
        return in_array($type, self::SOCIAL_TYPES, true);
    }

    /**
     * Sommes-nous dans la fenêtre calme (21 h → 9 h, Europe/Paris) ?
     * Les émetteurs sociaux peuvent l'interroger AVANT d'envoyer (pour ne pas
     * consommer leur plafond) — et sendToUser l'applique de toute façon en
     * dernier rempart : aucun push social ne part la nuit, quel que soit
     * l'appelant.
     */
    public static function inQuietHours(?\Carbon\Carbon $at = null): bool
    {
        $hour = (int) ($at ?? \Carbon\Carbon::now(SlotGuard::TZ))->copy()->setTimezone(SlotGuard::TZ)->format('G');

        return $hour >= self::QUIET_HOURS_START || $hour < self::QUIET_HOURS_END;
    }

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

            // 1 bis. Fenêtre calme : un type social ne pousse JAMAIS entre
            //        21 h et 9 h (Europe/Paris). La notification interne, elle,
            //        a déjà été créée par l'appelant — seul le push est sauté.
            if (self::isSocialType($type) && self::inQuietHours()) {
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
