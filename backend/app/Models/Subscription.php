<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = [
        'hairdresser_profile_id', 'salon_id', 'plan', 'status',
        'stripe_customer_id', 'stripe_subscription_id',
        'trial_ends_at', 'current_period_end', 'canceled_at',
        'cancel_at_period_end',
    ];

    protected $casts = [
        'trial_ends_at'       => 'datetime',
        'current_period_end'  => 'datetime',
        'canceled_at'         => 'datetime',
        'cancel_at_period_end' => 'boolean',
    ];

    public function hairdresserProfile()
    {
        return $this->belongsTo(HairdresserProfile::class);
    }

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    /** Couvre encore la période payée/essai, quel que soit le statut Stripe exact. */
    public function coversToday(): bool
    {
        if ($this->status === 'canceled') return false;

        if ($this->status === 'trialing') {
            return $this->trial_ends_at !== null && now()->lt($this->trial_ends_at);
        }

        // active ou past_due : Stripe retente le paiement automatiquement
        // pendant la période déjà payée — on ne coupe pas l'accès avant que
        // current_period_end soit réellement dépassé.
        return $this->current_period_end !== null && now()->lt($this->current_period_end);
    }
}
