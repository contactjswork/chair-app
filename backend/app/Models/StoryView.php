<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoryView extends Model
{
    public $timestamps = false;

    protected $fillable = ['story_id', 'user_id', 'created_at'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function story()
    {
        return $this->belongsTo(Story::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
