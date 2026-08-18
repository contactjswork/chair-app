<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Story extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'media_url', 'type', 'video_duration_seconds', 'expires_at', 'views_count', 'created_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function views()
    {
        return $this->hasMany(StoryView::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }
}
