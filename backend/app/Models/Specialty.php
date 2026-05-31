<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Specialty extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'icon', 'category', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function hairdressers()
    {
        return $this->belongsToMany(HairdresserProfile::class, 'hairdresser_specialties', 'specialty_id', 'hairdresser_id');
    }
}
