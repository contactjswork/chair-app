<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'hairdresser_id',
        'client_id',
        'appointment_id',
        'verified_visit_id',
        'rating',
        'comment',
        'hairdresser_reply',
        'replied_at',
        'specialty',
        'specialty_id',
        'is_verified',
        'is_certified',
    ];

    protected $casts = [
        'is_verified'  => 'boolean',
        'is_certified' => 'boolean',
    ];

    public function specialtyModel()
    {
        return $this->belongsTo(Specialty::class, 'specialty_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class);
    }
}
