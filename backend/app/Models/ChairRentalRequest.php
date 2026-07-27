<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChairRentalRequest extends Model
{
    /** Nouveau → Discussion → Accepté/Refusé ; Annulé accessible depuis Nouveau/Discussion (initiative du coiffeur). */
    public const STATUSES = ['pending', 'in_discussion', 'accepted', 'declined', 'cancelled'];

    protected $fillable = ['chair_rental_id', 'hairdresser_id', 'message', 'status'];

    public function chairRental()
    {
        return $this->belongsTo(ChairRental::class);
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function messages()
    {
        return $this->hasMany(ChairRentalRequestMessage::class)->orderBy('created_at');
    }
}
