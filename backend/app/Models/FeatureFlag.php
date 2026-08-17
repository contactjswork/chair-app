<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Schéma seul pour l'instant — le CRUD admin arrive dans un sprint suivant. */
class FeatureFlag extends Model
{
    protected $fillable = ['key', 'enabled', 'description'];

    protected $casts = [
        'enabled' => 'boolean',
    ];
}
