<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QrToken extends Model
{
    protected $fillable = [
        'hairdresser_id',
        'token_hash',
        'valid_from',
        'valid_until',
        'scan_count',
    ];

    protected $casts = [
        'valid_from'  => 'datetime',
        'valid_until' => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function visits()
    {
        return $this->hasMany(VerifiedVisit::class, 'qr_token_id');
    }

    public function isValid(): bool
    {
        return now()->between($this->valid_from, $this->valid_until);
    }
}
