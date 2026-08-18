<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Étend le catalogue de permissions (même mécanique idempotente que
 * 2026_08_17_110007 / 2026_08_17_140002) pour le mode test CHAIR+ (spec
 * CHAIR+ §3) — activer/désactiver CHAIR+ manuellement sur un compte, sans
 * Stripe, réservé admin. Mappée à 'admin' uniquement (pas 'moderator', hors
 * de son périmètre users/contenu/avis/signalements) — 'super_admin' l'a via
 * le bypass de code existant.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('permissions')->updateOrInsert(
            ['key' => 'hairdressers.chair_plus_test'],
            [
                'module'      => 'hairdressers',
                'description' => "Activer / désactiver CHAIR+ en mode test (sans Stripe)",
                'updated_at'  => $now,
                'created_at'  => $now,
            ]
        );

        $adminRoleId = DB::table('admin_roles')->where('key', 'admin')->value('id');
        $permissionId = DB::table('permissions')->where('key', 'hairdressers.chair_plus_test')->value('id');

        if ($adminRoleId && $permissionId) {
            DB::table('admin_role_permission')->updateOrInsert(
                ['admin_role_id' => $adminRoleId, 'permission_id' => $permissionId],
                ['updated_at' => $now, 'created_at' => $now]
            );
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('key', 'hairdressers.chair_plus_test')->value('id');
        if ($permissionId) {
            DB::table('admin_role_permission')->where('permission_id', $permissionId)->delete();
        }
        DB::table('permissions')->where('key', 'hairdressers.chair_plus_test')->delete();
    }
};
