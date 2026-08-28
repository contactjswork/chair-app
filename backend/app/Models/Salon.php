<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salon extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id', 'name', 'slug', 'description', 'address', 'city',
        'postal_code', 'department', 'region', 'latitude', 'longitude', 'phone', 'website', 'booking_url',
        'instagram_url', 'cover_image', 'logo', 'is_verified',
        'siret', 'verification_status',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        // Mêmes colonnes DECIMAL, même piège que HairdresserProfile : aucune
        // carte ne lit encore ces valeurs, mais la mine est armée pour le jour
        // où on en branchera une. On la désamorce maintenant.
        'latitude'    => 'float',
        'longitude'   => 'float',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function hairdressers()
    {
        return $this->hasMany(HairdresserProfile::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Suspension admin (AdminSalonController) — HORS $fillable, jamais
     * modifiable par le gérant lui-même. Un salon suspendu reste en base
     * intact (équipe, historique) mais disparaît du listing public.
     */
    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /** CHAIR BUSINESS actif — voir HairdresserProfile::hasChairPlus() pour comment ça se propage à l'équipe. */
    public function hasChairBusiness(): bool
    {
        $sub = $this->subscriptions()
            ->where('plan', 'chair_business')
            ->whereIn('status', ['trialing', 'active', 'past_due'])
            ->latest('id')
            ->first();

        return $sub !== null && $sub->coversToday();
    }

    /** Même principe que HairdresserProfile::getIsChairPlusAttribute() — à append() explicitement, jamais global. */
    public function getIsChairBusinessAttribute(): bool
    {
        return $this->hasChairBusiness();
    }
}
