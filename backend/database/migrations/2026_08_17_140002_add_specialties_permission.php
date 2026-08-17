<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Étend le catalogue de permissions (même mécanique idempotente que
 * 2026_08_17_110007 / 2026_08_17_130000) pour le CRUD admin des
 * spécialités. Mappée à 'admin' uniquement (pas 'moderator', hors de son
 * périmètre users/contenu/avis/signalements) — 'super_admin' l'a via le
 * bypass de code existant.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('permissions')->updateOrInsert(
            ['key' => 'specialties.manage'],
            [
                'module'      => 'content',
                'description' => "Créer / modifier / réordonner / masquer une spécialité",
                'updated_at'  => $now,
                'created_at'  => $now,
            ]
        );

        $adminRoleId = DB::table('admin_roles')->where('key', 'admin')->value('id');
        $permissionId = DB::table('permissions')->where('key', 'specialties.manage')->value('id');

        if ($adminRoleId && $permissionId) {
            DB::table('admin_role_permission')->updateOrInsert(
                ['admin_role_id' => $adminRoleId, 'permission_id' => $permissionId],
                ['updated_at' => $now, 'created_at' => $now]
            );
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('key', 'specialties.manage')->value('id');
        if ($permissionId) {
            DB::table('admin_role_permission')->where('permission_id', $permissionId)->delete();
        }
        DB::table('permissions')->where('key', 'specialties.manage')->delete();
    }
};
