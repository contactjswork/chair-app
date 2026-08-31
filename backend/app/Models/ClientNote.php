<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** La note privée d'un coiffeur sur un client — voir la migration create_client_notes. */
class ClientNote extends Model
{
    protected $fillable = ['hairdresser_id', 'client_user_id', 'note'];
}
