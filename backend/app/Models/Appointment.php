<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'hairdresser_id', 'client_id',
        'client_name', 'client_email', 'client_phone',
        'service', 'desired_date', 'desired_slot', 'message',
        'status', 'review_token', 'review_unlocked',
    ];

    protected $casts = [
        'desired_date'    => 'date',
        'review_unlocked' => 'boolean',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function review()
    {
        return $this->hasOne(Review::class, 'appointment_id');
    }
}
