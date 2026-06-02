<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HairdresserUnavailability extends Model
{
    protected $fillable = [
        'hairdresser_id', 'start_datetime', 'end_datetime', 'reason',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime'   => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }
}
