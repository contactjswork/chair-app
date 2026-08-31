<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Le programme de fidélité d'un coiffeur — voir la migration create_loyalty_tables. */
class LoyaltyProgram extends Model
{
    protected $fillable = ['hairdresser_id', 'visits_required', 'reward_label', 'is_active', 'counting_since'];

    protected $casts = [
        'is_active'      => 'boolean',
        'counting_since' => 'datetime',
    ];
}
