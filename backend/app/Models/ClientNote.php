<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * La fiche relationnelle d'un coiffeur sur un client.
 * note = privée (jamais montrée au client) ; advice = le conseil post-visite,
 * VISIBLE par le client ; rebook_weeks = rythme de rappel réglé par le
 * coiffeur ; relance_sent_at = anti-spam de la relance manuelle.
 */
class ClientNote extends Model
{
    protected $fillable = [
        'hairdresser_id', 'client_user_id', 'note',
        'advice', 'advice_updated_at', 'rebook_weeks', 'relance_sent_at',
    ];

    protected $casts = [
        'advice_updated_at' => 'datetime',
        'relance_sent_at'   => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }
}
