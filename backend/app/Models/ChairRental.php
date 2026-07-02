<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChairRental extends Model
{
    protected $fillable = [
        'salon_id', 'title', 'description',
        'price_per_day', 'price_per_week', 'price_per_month',
        'available_days', 'start_date', 'end_date',
        'equipment', 'conditions', 'photos', 'status',
    ];

    protected $casts = [
        'available_days' => 'array',
        'photos'         => 'array',
        'price_per_day'   => 'float',
        'price_per_week'  => 'float',
        'price_per_month' => 'float',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function requests()
    {
        return $this->hasMany(ChairRentalRequest::class);
    }
}
