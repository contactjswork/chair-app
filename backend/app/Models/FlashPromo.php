<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FlashPromo extends Model
{
    protected $fillable = ['hairdresser_id', 'date', 'specialty_id', 'discount_percent', 'notified_at'];

    protected $casts = [
        'date'        => 'date:Y-m-d',
        'notified_at' => 'datetime',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function specialty()
    {
        return $this->belongsTo(Specialty::class);
    }

    /** La promo active pour un coiffeur à une date donnée, sinon null. */
    public static function activeFor(int $hairdresserId, string $date): ?self
    {
        return static::where('hairdresser_id', $hairdresserId)
            ->whereDate('date', $date)
            ->first();
    }

    /**
     * La promo s'applique-t-elle à CE service ? Une promo sans spécialité
     * couvre tout ; une promo ciblée ne couvre que les services rattachés
     * à sa spécialité.
     */
    public function couvreService(?Service $service): bool
    {
        if ($this->specialty_id === null) return true;
        return $service !== null && (int) $service->specialty_id === (int) $this->specialty_id;
    }
}
