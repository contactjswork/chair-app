<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShareEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'action_type', 'target_type', 'target_id', 'channel', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
