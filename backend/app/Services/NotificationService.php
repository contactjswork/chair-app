<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationPreference;
use Illuminate\Support\Facades\Http;
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
     * Envoie une notification push via OneSignal.
     *
     * Cible l'External User ID OneSignal = notre user_id (voir OneSignal.login()
     * côté app mobile après authentification — pas de gestion de token côté nous).
     *
     * No-op silencieux tant que ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY ne sont
     * pas configurés (voir services.onesignal dans config/services.php).
     */
    public static function sendPush(
        int    $userId,
        string $type,
        string $title,
        string $message,
        array  $data = []
    ): void {
        $appId  = config('services.onesignal.app_id');
        $apiKey = config('services.onesignal.rest_api_key');

        if (empty($appId) || empty($apiKey)) {
            return;
        }

        try {
            Http::withHeaders([
                'Authorization' => 'Basic ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])->post('https://onesignal.com/api/v1/notifications', [
                'app_id'                   => $appId,
                'include_external_user_ids' => [(string) $userId],
                'headings'                 => ['en' => $title, 'fr' => $title],
                'contents'                 => ['en' => $message, 'fr' => $message],
                'data'                     => array_merge($data, ['type' => $type]),
            ]);
        } catch (\Throwable $e) {
            // Une erreur push ne doit jamais faire échouer l'action qui a
            // déclenché la notification (déblocage de badge, RDV, etc.).
            Log::warning('OneSignal push failed', ['error' => $e->getMessage(), 'user_id' => $userId]);
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
}
