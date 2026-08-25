<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Token push APNs d'un appareil.
 *
 * Une ligne = un couple (appareil, binaire CHAIR). Un utilisateur peut avoir
 * plusieurs lignes (iPhone + iPad, ou app client + app pro sur le même
 * téléphone). Le token est UNIQUE : l'enregistrement (POST /push/register)
 * fait un upsert par token, donc un appareil qui change de compte est
 * automatiquement rattaché au nouvel utilisateur.
 *
 * enabled=false : token refusé par APNs (410 Unregistered / BadDeviceToken) —
 * on le garde en base pour le diagnostic mais on ne lui envoie plus rien.
 */
class PushSubscription extends Model
{
    protected $fillable = [
        'user_id',
        'platform',
        'device_name',
        'provider',
        'bundle_id',
        'token',
        'enabled',
        'last_used_at',
    ];

    protected $casts = [
        'enabled'      => 'boolean',
        'last_used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Tokens auxquels on peut encore envoyer. */
    public function scopeActive($query)
    {
        return $query->where('enabled', true);
    }
}
