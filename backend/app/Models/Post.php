<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'hairdresser_id', 'specialty_id', 'type', 'description',
        'duration_minutes', 'price_indication', 'is_published',
        'views_count', 'likes_count', 'cover_image',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'price_indication' => 'decimal:2',
    ];

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function specialty()
    {
        return $this->belongsTo(Specialty::class);
    }

    public function images()
    {
        return $this->hasMany(PostImage::class)->orderBy('order');
    }
}
