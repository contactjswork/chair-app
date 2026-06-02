<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceCategory extends Model
{
    protected $fillable = [
        'hairdresser_id', 'name', 'description', 'image_url', 'display_order', 'visits_count',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function services()
    {
        return $this->hasMany(Service::class, 'category_id')->where('is_active', true)->orderBy('name');
    }

    public function allServices()
    {
        return $this->hasMany(Service::class, 'category_id')->orderBy('name');
    }
}
