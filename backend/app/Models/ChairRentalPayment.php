<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Un paiement de location de fauteuil passé par CHAIR (Stripe Connect).
 * Chaque ligne payée est aussi la matière première du récapitulatif annuel
 * des revenus du salon (obligations DAC7 / article 242 bis CGI).
 */
class ChairRentalPayment extends Model
{
    public const PERIODS = ['day', 'week', 'month'];

    protected $fillable = [
        'chair_rental_request_id', 'period', 'amount_cents', 'application_fee_cents',
        'stripe_session_id', 'stripe_payment_intent_id', 'status', 'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
    ];

    public function request()
    {
        return $this->belongsTo(ChairRentalRequest::class, 'chair_rental_request_id');
    }
}
