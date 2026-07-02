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
        'latitude', 'longitude', 'is_independent', 'work_status', 'work_address', 'work_availability', 'is_verified',
        'followers_count', 'posts_count', 'avg_rating', 'reviews_count', 'visits_count', 'verified_visits_count',
        'instagram_url', 'tiktok_url', 'booking_url', 'keywords',
        'identity_verified', 'pro_active_badge',
    ];

    protected $casts = [
        'is_independent'    => 'boolean',
        'is_verified'       => 'boolean',
        'identity_verified' => 'boolean',
        'pro_active_badge'  => 'boolean',
        'avg_rating'        => 'decimal:2',
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

    public function serviceCategories()
    {
        return $this->hasMany(ServiceCategory::class, 'hairdresser_id')->orderBy('display_order');
    }

    public function services()
    {
        return $this->hasMany(Service::class, 'hairdresser_id');
    }

    public function schedules()
    {
        return $this->hasMany(HairdresserSchedule::class, 'hairdresser_id')->orderBy('day_of_week');
    }

    public function unavailabilities()
    {
        return $this->hasMany(HairdresserUnavailability::class, 'hairdresser_id');
    }

    public function verifiedVisits()
    {
        return $this->hasMany(VerifiedVisit::class, 'hairdresser_id');
    }

    public function qrTokens()
    {
        return $this->hasMany(QrToken::class, 'hairdresser_id');
    }

    public function trainingBadges()
    {
        return $this->belongsToMany(TrainingBadge::class, 'hairdresser_training_badges', 'hairdresser_profile_id', 'training_badge_id')
                    ->withPivot('year', 'is_verified', 'created_at');
    }
}
