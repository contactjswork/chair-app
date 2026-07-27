<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalonInvitation extends Model
{
    protected $fillable = ['salon_id', 'hairdresser_id', 'email', 'token', 'message', 'status', 'expires_at'];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // Coût nul (comparaison de date sur des colonnes déjà chargées) — safe en
    // $appends global, exactement comme is_chair_pick sur HairdresserProfile.
    protected $appends = ['effective_status'];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Statut réel affiché : une invitation 'pending' dont l'échéance est
     * dépassée est présentée comme 'expired' sans attendre qu'une action
     * (accept/decline/resend) ne persiste réellement la transition en base.
     */
    public function getEffectiveStatusAttribute(): string
    {
        if ($this->status === 'pending' && $this->isExpired()) {
            return 'expired';
        }
        return $this->status;
    }

    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }
}
