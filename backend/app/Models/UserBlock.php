<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Blocage d'utilisateur (App Store Review Guideline 1.2).
 * Unidirectionnel : blocker_id ne voit plus le contenu de blocked_user_id.
 * Voir UserBlockController pour la portée exacte des effets.
 */
class UserBlock extends Model
{
    protected $fillable = ['blocker_id', 'blocked_user_id'];

    public function blocker()
    {
        return $this->belongsTo(User::class, 'blocker_id');
    }

    public function blockedUser()
    {
        return $this->belongsTo(User::class, 'blocked_user_id');
    }

    /**
     * Ids des utilisateurs bloqués par $userId. Point d'entrée unique utilisé
     * par tous les filtrages (feed, etc.) — ne pas dupliquer la requête.
     *
     * @return array<int>
     */
    public static function blockedIdsFor(?int $userId): array
    {
        if (!$userId) return [];
        return static::where('blocker_id', $userId)->pluck('blocked_user_id')->all();
    }
}
