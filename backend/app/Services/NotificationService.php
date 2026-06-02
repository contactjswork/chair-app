<?php

namespace App\Services;

use App\Models\Notification;

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
     * Envoie une notification push (Firebase / OneSignal).
     * TODO: brancher un provider réel quand nécessaire.
     */
    public static function sendPush(
        int    $userId,
        string $type,
        string $title,
        string $message,
        array  $data = []
    ): void {
        // TODO: intégrer Firebase ou OneSignal ici.
        // Les tokens sont stockés dans push_subscriptions.
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
