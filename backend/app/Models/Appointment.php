<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'hairdresser_id', 'client_id',
        'client_name', 'client_email', 'client_phone',
        // Legacy fields (demande simple)
        'service', 'desired_date', 'desired_slot', 'message',
        // Realisation du coiffeur montree en reservant — « je voudrais ca ».
        'reference_post_id',
        // New real booking fields
        'service_id', 'appointment_date', 'appointment_time',
        'confirmation_requested_at', 'client_confirmed_at',
        'duration_minutes', 'price', 'payment_method',
        'status', 'review_token', 'review_unlocked',
    ];

    protected $casts = [
        'desired_date'     => 'date:Y-m-d',
        'appointment_date' => 'date:Y-m-d',
        'review_unlocked'  => 'boolean',
        'price'            => 'decimal:2',
        'confirmation_requested_at' => 'datetime',
        'client_confirmed_at'       => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /**
     * La realisation jointe a la demande. Toujours une realisation DU coiffeur
     * reserve : montrer le travail d'un confrere ne prouverait pas qu'il sait
     * le faire.
     */
    public function referencePost()
    {
        return $this->belongsTo(Post::class, 'reference_post_id');
    }

    public function serviceModel()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function review()
    {
        return $this->hasOne(Review::class, 'appointment_id');
    }
}
