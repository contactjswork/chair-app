<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Crée une notification interne en base pour l'utilisateur.
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
     * Crée une notification interne ET envoie un push.
     * Point d'entrée unique recommandé pour toute nouvelle notification.
     */
    public static function send(
        int    $userId,
        string $type,
        string $title,
        string $message,
        array  $data = []
    ): Notification {
        $notif = static::sendInternal($userId, $type, $title, $message, $data);
        static::sendPush($userId, $type, $title, $message, $data);
        return $notif;
    }
}
