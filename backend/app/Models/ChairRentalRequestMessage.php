<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChairRentalRequestMessage extends Model
{
    protected $fillable = ['chair_rental_request_id', 'sender_type', 'body'];

    public function request()
    {
        return $this->belongsTo(ChairRentalRequest::class, 'chair_rental_request_id');
    }
}
