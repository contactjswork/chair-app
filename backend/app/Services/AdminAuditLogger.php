<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Point d'entrée UNIQUE pour écrire dans admin_audit_logs. Tous les
 * contrôleurs admin (existants et à venir) doivent appeler
 * AdminAuditLogger::log() sur CHAQUE action qui modifie une donnée
 * (suspension, suppression, changement de statut, changement de
 * paramètre...). Ne pas logger les simples lectures (index/show).
 *
 * Exemple :
 *   AdminAuditLogger::log(
 *       $request->user(),
 *       'users.suspend',
 *       'user',
 *       $user->id,
 *       ['suspended_at' => null],
 *       ['suspended_at' => now()->toISOString()],
 *       $request
 *   );
 */
class AdminAuditLogger
{
    public static function log(
        User $admin,
        string $action,
        ?string $resourceType = null,
        $resourceId = null,
        $oldValue = null,
        $newValue = null,
        ?Request $request = null
    ): AdminAuditLog {
        $ip = $request?->ip();

        if ($ip === null && !app()->runningInConsole()) {
            $ip = request()?->ip();
        }

        return AdminAuditLog::create([
            'admin_id'      => $admin->id,
            'action'        => $action,
            'resource_type' => $resourceType,
            'resource_id'   => $resourceId !== null ? (string) $resourceId : null,
            'old_value'     => $oldValue,
            'new_value'     => $newValue,
            'ip'            => $ip,
        ]);
    }
}
