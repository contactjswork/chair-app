<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Mapping type de notification → clé de préférence utilisateur
     * (table notification_preferences, mêmes clés que le frontend).
     *
     * Règles :
     *  - Un type ABSENT de ce mapping est TOUJOURS envoyé (transactionnel pro,
     *    badges, salon, location de fauteuil... aucune des 10 préférences ne
     *    le couvre — on ne bloque jamais silencieusement un type non mappé).
     *  - Les notifications de sécurité ('security', 'password_changed',
     *    'new_device_login') sont volontairement NON mappées : critiques,
     *    toujours envoyées même si le toggle "Sécurité du compte" est OFF —
     *    le toggle est conservé côté stockage mais ignoré à l'envoi (choix
     *    produit documenté : on n'autorise pas un utilisateur à se couper
     *    des alertes de sécurité).
     *  - Les types "futurs" (rappels planifiés, réponse à un avis, post d'un
     *    coiffeur suivi...) sont déjà mappés pour que le respect des
     *    préférences soit automatique le jour où l'envoi existe.
     */
    private const TYPE_TO_PREFERENCE = [
        // Réservations (client et coiffeur — la préférence est celle du destinataire)
        'appointment_confirmed'    => 'booking_confirmed',
        'appointment_cancelled'    => 'booking_cancelled',
        'appointment_rescheduled'  => 'booking_cancelled', // "annulé ou modifié" (libellé frontend)

        // Rappels (aucun envoi planifié aujourd'hui — mapping prêt)
        'appointment_reminder_24h' => 'reminder_24h',
        'appointment_reminder_1h'  => 'reminder_1h',

        // Avis
        'review_request'           => 'review_request',
        'review_reply'             => 'review_reply', // pas encore envoyé (ReviewController::reply ne notifie pas)

        // Social / découverte (pas encore envoyés — mapping prêt)
        'followed_post'            => 'followed_post',
        'new_post'                 => 'followed_post',
        'new_hairdresser_nearby'   => 'new_hairdresser_nearby',
        'promotion'                => 'promotions',
        'promotions'               => 'promotions',
    ];

    /**
     * L'utilisateur accepte-t-il ce type de notification ?
     *
     * Sans ligne notification_preferences (utilisateur n'ayant jamais ouvert
     * l'écran), on applique les défauts — aucune ligne n'est créée ici pour
     * ne pas écrire en base à chaque envoi.
     */
    public static function shouldSend(int $userId, string $type): bool
    {
        $prefKey = self::TYPE_TO_PREFERENCE[$type] ?? null;
        if ($prefKey === null) {
            return true; // type non couvert par les préférences → toujours envoyé
        }

        $prefs = NotificationPreference::where('user_id', $userId)->first();
        if ($prefs === null) {
            return (bool) (NotificationPreference::DEFAULTS[$prefKey] ?? true);
        }

        return (bool) $prefs->{$prefKey};
    }

    /**
     * Crée une notification interne en base pour l'utilisateur.
     *
     * NOTE : ne vérifie PAS les préférences — passer par send() (point
     * d'entrée unique) qui applique shouldSend() avant la notif interne
     * ET avant le push.
     */
    public static function sendInternal(
        int    $userId,
        string $type,
        string $title,
        string $message,
        array  $data = []
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => $data,
        ]);
    }

    /**
     * Le push APNs est-il configuré ? (clé .p8 + APNS_KEY_ID + APNS_TEAM_ID)
     *
     * Sans configuration, sendPush() est un no-op : les notifications
     * internes continuent d'être créées, mais aucun push ne part.
     * Diagnostic complet : php artisan chair:test-push {email}.
     */
    public static function isPushConfigured(): bool
    {
        return ApnsService::isConfigured();
    }

    /**
     * Envoie une notification push APNs à tous les appareils enregistrés de
     * l'utilisateur (table push_subscriptions, alimentée par POST /push/register).
     *
     * Délègue à PushService::sendToUser, qui vérifie la préférence du type,
     * cible chaque token actif, et désactive les tokens morts. Le deep link
     * (payload "url") est déduit du type et du rôle du destinataire, sauf si
     * $data['url'] le force — voir le contrat documenté dans PushService.
     *
     * No-op silencieux tant qu'APNs n'est pas configuré.
     *
     * @return bool true si au moins un appareil a accepté le push.
     *              La valeur de retour est purement informative (diagnostic,
     *              commande chair:test-push) : aucun appelant n'en dépend et
     *              un échec ne fait jamais échouer l'action déclenchante.
     */
    public static function sendPush(
        int    $userId,
        string $type,
        string $title,
        string $message,
        array  $data = []
    ): bool {
        try {
            $user = User::find($userId);
            if ($user === null) {
                return false;
            }

            return PushService::sendToUser($user, $type, $title, $message, $data) > 0;
        } catch (\Throwable $e) {
            // Une erreur push ne doit jamais faire échouer l'action qui a
            // déclenché la notification (déblocage de badge, RDV, etc.).
            Log::warning('APNs push failed', ['error' => $e->getMessage(), 'user_id' => $userId]);
            return false;
        }
    }

    /**
     * Crée une notification interne ET envoie un push, en respectant les
     * préférences du destinataire (vérifiées AVANT la notif interne ET avant
     * le push). Point d'entrée unique recommandé pour toute notification.
     *
     * @return Notification|null null si la préférence du destinataire bloque l'envoi.
     */
    public static function send(
        int    $userId,
        string $type,
        string $title,
        string $message,
        array  $data = []
    ): ?Notification {
        if (!static::shouldSend($userId, $type)) {
            return null;
        }

        $notif = static::sendInternal($userId, $type, $title, $message, $data);
        static::sendPush($userId, $type, $title, $message, $data);
        return $notif;
    }

    /**
     * Envoie une notification dont le texte vient du catalogue centralisé
     * (App\Services\NotificationCopy) au lieu d'être écrit en dur.
     *
     * C'est la méthode à utiliser pour TOUT nouvel envoi. Les appels
     * historiques à send() avec titre + message restent valides et
     * strictement inchangés.
     *
     * Exemple :
     *   NotificationService::sendTyped(
     *       $clientId,
     *       'appointment_confirmed',
     *       ['coiffeur' => $name, 'date' => $dateLabel, 'heure' => $time],
     *       NotificationCopy::AUDIENCE_CLIENT,
     *       ['appointment_id' => $appointment->id]
     *   );
     *
     * @param  int         $userId    destinataire
     * @param  string      $type      type de notification (clé du catalogue)
     * @param  array       $vars      variables du texte ({client}, {date}...)
     * @param  string|null $audience  'client' | 'pro' | 'salon' — un même type
     *                                n'a pas le même texte selon le destinataire
     * @param  array       $data      payload technique (ids de navigation...)
     * @return Notification|null null si la préférence du destinataire bloque l'envoi.
     */
    public static function sendTyped(
        int     $userId,
        string  $type,
        array   $vars = [],
        ?string $audience = null,
        array   $data = []
    ): ?Notification {
        $copy = NotificationCopy::resolve($type, $vars, $audience);

        return static::send($userId, $type, $copy['title'], $copy['message'], $data);
    }
}
