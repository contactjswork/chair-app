<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralReward extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'reason', 'points', 'chair_plus_days', 'boost_days', 'badge_code', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
