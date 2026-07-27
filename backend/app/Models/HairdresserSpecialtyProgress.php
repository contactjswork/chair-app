<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HairdresserSpecialtyProgress extends Model
{
    protected $table = 'hairdresser_specialty_progress';

    protected $fillable = [
        'hairdresser_id', 'specialty_id', 'score', 'level',
        'posts_count', 'reviews_count', 'avg_rating', 'visits_count', 'is_reference',
    ];

    protected $casts = [
        'is_reference' => 'boolean',
        'avg_rating'   => 'decimal:2',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function specialty()
    {
        return $this->belongsTo(Specialty::class, 'specialty_id');
    }
}
