<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalonJoinRequest extends Model
{
    use HasFactory;

    protected $fillable = ['hairdresser_id', 'salon_id', 'status', 'message'];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }
}
