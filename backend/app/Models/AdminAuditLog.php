<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Journal d'audit immuable — pas d'updated_at (une entrée ne se modifie
 * jamais après coup). Écriture uniquement via
 * App\Services\AdminAuditLogger::log(), jamais directement.
 */
class AdminAuditLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'admin_id', 'action', 'resource_type', 'resource_id', 'old_value', 'new_value', 'ip',
    ];

    protected $casts = [
        'old_value'  => 'array',
        'new_value'  => 'array',
        'created_at' => 'datetime',
    ];

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
