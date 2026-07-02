<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = ['job_offer_id', 'hairdresser_id', 'message', 'status'];

    public function jobOffer()
    {
        return $this->belongsTo(JobOffer::class);
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }
}
