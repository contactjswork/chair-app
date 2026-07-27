<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChairRental extends Model
{
    /** Taux plateforme appliqué à l'estimation de revenu affichée dans le wizard — hypothèse produit, aucun paiement réel ne transite (Stripe Connect non branché). */
    public const COMMISSION_RATE = 0.10;

    public const SPACE_TYPES = ['chair', 'barber_post', 'private_cabin', 'coloring_corner', 'independent_post'];

    /** Grosses cartes équipements du wizard — clé stable, jamais de texte libre. */
    public const EQUIPMENT_OPTIONS = [
        'mirror', 'premium_chair', 'sink', 'wifi', 'ac', 'heating', 'parking',
        'break_room', 'products_included', 'card_terminal', 'city_center', 'near_station', 'pmr',
    ];

    protected $fillable = [
        'salon_id', 'space_type', 'title', 'slug', 'description',
        'address', 'city', 'latitude', 'longitude', 'access_instructions',
        'price_per_day', 'price_per_week', 'price_per_month', 'deposit_amount',
        'available_days', 'start_date', 'end_date', 'blocked_dates',
        'equipment', 'conditions', 'insurance_required', 'insurance_notes', 'products_policy',
        'photos', 'status', 'published_at',
    ];

    protected $casts = [
        'available_days'     => 'array',
        'blocked_dates'       => 'array',
        'equipment'           => 'array',
        'photos'              => 'array',
        'price_per_day'       => 'float',
        'price_per_week'      => 'float',
        'price_per_month'     => 'float',
        'deposit_amount'      => 'float',
        'latitude'            => 'float',
        'longitude'           => 'float',
        'insurance_required'  => 'boolean',
        'published_at'        => 'datetime',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function requests()
    {
        return $this->hasMany(ChairRentalRequest::class);
    }

    /** Estimation de revenu mensuel affichée au gérant — jamais une vraie transaction. */
    public function estimatedMonthlyRevenue(): ?float
    {
        $gross = $this->price_per_month
            ?? ($this->price_per_week ? $this->price_per_week * 4 : null)
            ?? ($this->price_per_day ? $this->price_per_day * 20 : null);

        return $gross === null ? null : round($gross * (1 - self::COMMISSION_RATE), 2);
    }

    public static function generateUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = \Illuminate\Support\Str::slug($title) ?: 'fauteuil';
        $slug = $base;
        $i = 2;

        while (static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
