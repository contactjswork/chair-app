<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Préférences de notifications d'un utilisateur (une ligne par user).
 *
 * Les défauts PHP ($attributes) sont la source de vérité quand aucune ligne
 * n'existe encore : NotificationService::shouldSend() les utilise sans créer
 * de ligne, et le contrôleur crée la ligne au premier GET/PUT.
 * Ils doivent rester alignés sur les défauts DB de la migration ET sur ceux
 * du frontend (app/app/notifications/preferences/page.tsx).
 */
class NotificationPreference extends Model
{
    /** Les 10 clés de préférences exposées au frontend. */
    public const KEYS = [
        'reminder_24h',
        'reminder_1h',
        'booking_confirmed',
        'booking_cancelled',
        'review_request',
        'review_reply',
        'followed_post',
        'new_hairdresser_nearby',
        'promotions',
        'security',
    ];

    /** Défauts identiques au frontend historique. */
    public const DEFAULTS = [
        'reminder_24h'           => true,
        'reminder_1h'            => true,
        'booking_confirmed'      => true,
        'booking_cancelled'      => true,
        'review_request'         => true,
        'review_reply'           => false,
        'followed_post'          => false,
        'new_hairdresser_nearby' => false,
        'promotions'             => false,
        'security'               => true,
    ];

    protected $fillable = [
        'user_id',
        'reminder_24h',
        'reminder_1h',
        'booking_confirmed',
        'booking_cancelled',
        'review_request',
        'review_reply',
        'followed_post',
        'new_hairdresser_nearby',
        'promotions',
        'security',
    ];

    protected $casts = [
        'reminder_24h'           => 'boolean',
        'reminder_1h'            => 'boolean',
        'booking_confirmed'      => 'boolean',
        'booking_cancelled'      => 'boolean',
        'review_request'         => 'boolean',
        'review_reply'           => 'boolean',
        'followed_post'          => 'boolean',
        'new_hairdresser_nearby' => 'boolean',
        'promotions'             => 'boolean',
        'security'               => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Représentation API : uniquement les 10 clés booléennes. */
    public function toPrefsArray(): array
    {
        $out = [];
        foreach (self::KEYS as $key) {
            $out[$key] = (bool) $this->{$key};
        }
        return $out;
    }
}
