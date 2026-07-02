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
        'rating',
        'comment',
        'hairdresser_reply',
        'replied_at',
        'specialty',
        'is_verified',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class);
    }
}
