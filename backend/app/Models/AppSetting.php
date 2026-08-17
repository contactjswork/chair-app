<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Schéma seul pour l'instant — le CRUD admin arrive dans un sprint suivant. */
class AppSetting extends Model
{
    protected $fillable = [
        'key', 'value', 'group', 'type', 'min', 'max', 'default_value', 'description', 'updated_by',
    ];

    protected $casts = [
        'value'         => 'array',
        'default_value' => 'array',
    ];

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
