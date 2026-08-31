<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Une récompense débloquée — la dette du coiffeur envers son client.
 * Libellé et seuil figés au déblocage : changer le programme ensuite ne
 * réécrit pas ce qui est dû.
 */
class LoyaltyReward extends Model
{
    protected $fillable = ['hairdresser_id', 'client_user_id', 'reward_label', 'visits_required', 'unlocked_at', 'redeemed_at'];

    protected $casts = [
        'unlocked_at' => 'datetime',
        'redeemed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }
}
