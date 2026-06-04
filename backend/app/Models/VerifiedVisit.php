<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VerifiedVisit extends Model
{
    protected $fillable = [
        'hairdresser_id',
        'client_user_id',
        'client_token',
        'qr_token_id',
        'service_type',
        'scanned_at',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }

    public function qrToken()
    {
        return $this->belongsTo(QrToken::class, 'qr_token_id');
    }

    public function review()
    {
        return $this->hasOne(Review::class, 'verified_visit_id');
    }
}
