<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HairdresserSchedule extends Model
{
    protected $fillable = [
        'hairdresser_id', 'day_of_week', 'start_time', 'end_time',
        'break_start', 'break_end', 'is_open',
    ];

    protected $casts = [
        'is_open' => 'boolean',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    // Noms des jours en français
    public static function dayName(int $day): string
    {
        return ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][$day] ?? '';
    }
}
