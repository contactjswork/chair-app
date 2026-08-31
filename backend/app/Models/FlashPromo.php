<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FlashPromo extends Model
{
    protected $fillable = ['hairdresser_id', 'date', 'discount_percent', 'notified_at'];

    protected $casts = [
        'date'        => 'date:Y-m-d',
        'notified_at' => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    /** La promo active pour un coiffeur à une date donnée, sinon null. */
    public static function activeFor(int $hairdresserId, string $date): ?self
    {
        return static::where('hairdresser_id', $hairdresserId)
            ->whereDate('date', $date)
            ->first();
    }
}
