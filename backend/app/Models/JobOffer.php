<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'salon_id', 'title', 'job_type', 'level', 'contract_type',
        'description', 'city', 'status',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }
}
