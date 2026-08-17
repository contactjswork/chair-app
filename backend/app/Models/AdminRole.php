<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminRole extends Model
{
    protected $fillable = ['key', 'name', 'description'];

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'admin_role_permission');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->key === 'super_admin';
    }
}
