<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Une inscription « prévenez-moi si ça se libère » — voir la migration create_slot_waitlists. */
class SlotWaitlist extends Model
{
    protected $fillable = ['hairdresser_id', 'client_user_id', 'date', 'notified_at'];

    protected $casts = [
        'date'        => 'date',
        'notified_at' => 'datetime',
    ];
}
