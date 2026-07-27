<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'hairdresser_id', 'specialty_id', 'type', 'description', 'gender',
        'duration_minutes', 'price_indication', 'is_published',
        'views_count', 'likes_count', 'cover_image',
        'is_pinned', 'display_order',
        'video_url', 'video_thumbnail_url', 'video_duration_seconds',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'is_pinned'    => 'boolean',
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

    /**
     * Tags multi-spécialités de la réalisation (pivot post_tags).
     * Permet le matching Utilisateur ↔ Réalisation dans le feed intelligent.
     */
    public function tags()
    {
        return $this->belongsToMany(Specialty::class, 'post_tags', 'post_id', 'specialty_id');
    }
}
