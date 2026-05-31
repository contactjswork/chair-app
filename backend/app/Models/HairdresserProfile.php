<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HairdresserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'salon_id', 'slug', 'banner_image', 'tagline',
        'years_experience', 'diploma', 'city', 'postal_code',
        'latitude', 'longitude', 'is_independent', 'is_verified',
        'followers_count', 'posts_count', 'avg_rating', 'reviews_count',
        'instagram_url', 'tiktok_url', 'booking_url',
    ];

    protected $casts = [
        'is_independent' => 'boolean',
        'is_verified' => 'boolean',
        'avg_rating' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function specialties()
    {
        return $this->belongsToMany(Specialty::class, 'hairdresser_specialties', 'hairdresser_id', 'specialty_id');
    }

    public function posts()
    {
        return $this->hasMany(Post::class, 'hairdresser_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'hairdresser_id');
    }

    public function followers()
    {
        return $this->belongsToMany(User::class, 'follows', 'hairdresser_id', 'follower_id');
    }
}
