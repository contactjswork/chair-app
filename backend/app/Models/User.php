<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name', 'email', 'password', 'role', 'avatar', 'city', 'postal_code', 'latitude', 'longitude', 'bio', 'phone',
        'referral_code', 'referred_by_user_id', 'active_pro_mode',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function hairdresserProfile()
    {
        return $this->hasOne(HairdresserProfile::class);
    }

    public function salon()
    {
        return $this->hasOne(Salon::class, 'owner_id');
    }

    public function salons()
    {
        return $this->hasMany(Salon::class, 'owner_id');
    }

    public function follows()
    {
        return $this->belongsToMany(HairdresserProfile::class, 'follows', 'follower_id', 'hairdresser_id')
            ->withPivot('created_at');
    }

    public function savedProfiles()
    {
        return $this->belongsToMany(HairdresserProfile::class, 'saved_profiles', 'user_id', 'hairdresser_id');
    }

    public function isHairdresser(): bool
    {
        return $this->role === 'hairdresser';
    }

    public function isSalonOwner(): bool
    {
        return $this->role === 'salon_owner';
    }

    /** Double identité : ce compte possède-t-il un salon (Mode Gérant disponible) ? */
    public function canManageSalon(): bool
    {
        return $this->salon()->exists();
    }

    /** Double identité : ce compte a-t-il un profil coiffeur (Mode Coiffeur disponible) ? */
    public function hasHairdresserProfile(): bool
    {
        return $this->hairdresserProfile()->exists();
    }

    public function referredBy()
    {
        return $this->belongsTo(User::class, 'referred_by_user_id');
    }

    /** Utilisateurs que CE compte a parrainés (peu importe leur rôle). */
    public function referrals()
    {
        return $this->hasMany(User::class, 'referred_by_user_id');
    }
}
