<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salon extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id', 'name', 'slug', 'description', 'address', 'city',
        'postal_code', 'latitude', 'longitude', 'phone', 'website',
        'instagram_url', 'cover_image', 'logo', 'is_verified',
        'siret', 'verification_status',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function hairdressers()
    {
        return $this->hasMany(HairdresserProfile::class);
    }
}
