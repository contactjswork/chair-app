<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'type', 'content_id', 'reported_user_id', 'reporter_id',
        'reason', 'details', 'resolved_at', 'resolved_by', 'resolution',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function reportedUser()
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
