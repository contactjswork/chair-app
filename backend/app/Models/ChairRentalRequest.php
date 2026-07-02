<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChairRentalRequest extends Model
{
    protected $fillable = ['chair_rental_id', 'hairdresser_id', 'message', 'status'];

    public function chairRental()
    {
        return $this->belongsTo(ChairRental::class);
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }
}
