<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['key', 'module', 'description'];

    public function adminRoles()
    {
        return $this->belongsToMany(AdminRole::class, 'admin_role_permission');
    }
}
