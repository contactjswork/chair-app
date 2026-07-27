<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Historique horodaté des vues de profil public — voir migration pour le pourquoi. */
class ProfileView extends Model
{
    public $timestamps = false;

    protected $fillable = ['hairdresser_profile_id', 'created_at'];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
