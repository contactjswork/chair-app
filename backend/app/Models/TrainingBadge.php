<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingBadge extends Model
{
    use HasFactory;

    protected $fillable = ['institution', 'name', 'slug', 'category', 'logo_url'];
}
