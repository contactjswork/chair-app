<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Étend le catalogue de permissions posé par 2026_08_17_110007 pour les 3
 * modules construits dans cette passe (Utilisateurs enrichis, Professionnels
 * enrichis, Salons — module neuf). Même mécanique idempotente
 * (updateOrInsert dans la migration elle-même, pas un Seeder séparé) pour
 * les mêmes raisons que le rapport d'origine (partie (b)).
 *
 * Toutes mappées au rôle 'admin' uniquement (pas 'moderator' — hors de son
 * périmètre volontairement restreint : users/contenu/avis/signalements,
 * voir seed migration d'origine partie (e)). 'super_admin' les a via le
 * bypass de code existant, aucune ligne à ajouter pour lui.
 */
return new class extends Migration
{
    private function permissions(): array
    {
        return [
            ['key' => 'users.points_adjust',      'module' => 'users',        'description' => "Corriger manuellement le score CHAIR (points) d'un coiffeur"],
            ['key' => 'hairdressers.badges_manage','module' => 'hairdressers','description' => "Attribuer / retirer manuellement un badge à un coiffeur"],
            ['key' => 'hairdressers.visibility',   'module' => 'hairdressers','description' => "Masquer / réafficher un profil coiffeur dans les listings publics"],
            ['key' => 'salons.read',               'module' => 'salons',       'description' => "Voir la liste et la fiche des salons"],
            ['key' => 'salons.manage',             'module' => 'salons',       'description' => "Vérifier / suspendre / modifier un salon, retirer un membre d'équipe"],
        ];
    }

    public function up()
    {
        $now = now();

        foreach ($this->permissions() as $permission) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $permission['key']],
                array_merge($permission, ['updated_at' => $now, 'created_at' => $now])
            );
        }

        $adminRoleId = DB::table('admin_roles')->where('key', 'admin')->value('id');
        if (!$adminRoleId) {
            return;
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_column($this->permissions(), 'key'))
            ->pluck('id');

        foreach ($permissionIds as $permissionId) {
            DB::table('admin_role_permission')->updateOrInsert(
                ['admin_role_id' => $adminRoleId, 'permission_id' => $permissionId],
                ['updated_at' => $now, 'created_at' => $now]
            );
        }
    }

    public function down()
    {
        $keys = array_column($this->permissions(), 'key');

        $permissionIds = DB::table('permissions')->whereIn('key', $keys)->pluck('id');
        DB::table('admin_role_permission')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('key', $keys)->delete();
    }
};
