<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalonInvitation extends Model
{
    protected $fillable = ['salon_id', 'hairdresser_id', 'message', 'status'];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }
}
