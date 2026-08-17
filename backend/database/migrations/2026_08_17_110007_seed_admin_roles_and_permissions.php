<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Données de référence (rôles + permissions + mapping). Seedées directement
 * dans une migration (idempotent via updateOrInsert) plutôt que dans un
 * Seeder classique, pour garantir que ces lignes existent sur tout
 * environnement qui a juste fait `php artisan migrate` — sans dépendre de
 * quelqu'un qui pense à lancer `db:seed` en plus.
 *
 * SUPER_ADMIN n'a AUCUNE ligne dans admin_role_permission : l'accès total
 * est un bypass en code (User::hasPermission(), voir le rapport), pas une
 * liste de permissions à tenir à jour à chaque nouvelle permission créée.
 * C'est un choix assumé — voir rapport partie (e).
 */
return new class extends Migration
{
    private function permissions(): array
    {
        return [
            ['key' => 'dashboard.view',        'module' => 'dashboard',     'description' => "Voir le tableau de bord (stats, activité récente, top coiffeurs)"],
            ['key' => 'users.read',             'module' => 'users',         'description' => "Voir la liste et le détail des utilisateurs"],
            ['key' => 'users.suspend',          'module' => 'users',         'description' => "Suspendre / réactiver un compte utilisateur"],
            ['key' => 'users.delete',           'module' => 'users',         'description' => "Supprimer définitivement un compte utilisateur"],
            ['key' => 'hairdressers.read',      'module' => 'hairdressers',  'description' => "Voir la liste des coiffeurs"],
            ['key' => 'hairdressers.verify',    'module' => 'hairdressers',  'description' => "Approuver / rejeter un diplôme"],
            ['key' => 'hairdressers.chair_pick','module' => 'hairdressers',  'description' => "Attribuer / retirer le Coup de cœur CHAIR"],
            ['key' => 'appointments.read',      'module' => 'appointments',  'description' => "Voir la liste des rendez-vous"],
            ['key' => 'content.moderate',       'module' => 'content',       'description' => "Masquer / réafficher / supprimer un avis"],
            ['key' => 'reports.manage',         'module' => 'content',       'description' => "Traiter les signalements"],
            ['key' => 'subscriptions.read',     'module' => 'subscriptions', 'description' => "Voir les abonnements CHAIR+/BUSINESS et le MRR"],
            ['key' => 'support.manage',         'module' => 'support',       'description' => "Voir et résoudre les demandes de support"],
            ['key' => 'notifications.send',     'module' => 'notifications', 'description' => "Envoyer une notification push / voir l'historique"],
            ['key' => 'analytics.read',         'module' => 'analytics',     'description' => "Voir les statistiques et analytics détaillés"],
            ['key' => 'badges.manage',          'module' => 'gamification',  'description' => "Gérer le catalogue de badges (réservé, pas encore de CRUD)"],
            ['key' => 'settings.update',        'module' => 'settings',      'description' => "Modifier les paramètres applicatifs (app_settings)"],
            ['key' => 'feature_flags.manage',   'module' => 'settings',      'description' => "Activer / désactiver un feature flag"],
            ['key' => 'admins.manage',          'module' => 'security',      'description' => "Créer / modifier / désactiver un compte admin, changer son rôle"],
            ['key' => 'audit_logs.read',        'module' => 'security',      'description' => "Consulter le journal d'audit admin"],
        ];
    }

    private function roles(): array
    {
        return [
            ['key' => 'super_admin', 'name' => 'Super Admin', 'description' => "Accès absolu — gère les autres admins et les paramètres critiques. Bypass total en code, aucune permission listée en base."],
            ['key' => 'admin',       'name' => 'Admin',       'description' => "Gestion quotidienne (utilisateurs, coiffeurs, contenu, support, abonnements). Pas de gestion des autres admins ni des paramètres de sécurité."],
            ['key' => 'moderator',   'name' => 'Modérateur',  'description' => "Utilisateurs, contenu, avis, signalements, suspensions uniquement."],
        ];
    }

    /** admin (non super_admin) — gestion quotidienne, pas la sécurité. */
    private function adminPermissionKeys(): array
    {
        return [
            'dashboard.view', 'users.read', 'users.suspend', 'users.delete',
            'hairdressers.read', 'hairdressers.verify', 'hairdressers.chair_pick',
            'appointments.read', 'content.moderate', 'reports.manage',
            'subscriptions.read', 'support.manage', 'notifications.send',
            'analytics.read', 'badges.manage', 'audit_logs.read',
        ];
    }

    /** moderator — strictement users/contenu/avis/signalements/suspensions. */
    private function moderatorPermissionKeys(): array
    {
        return [
            'dashboard.view', 'users.read', 'users.suspend',
            'content.moderate', 'reports.manage',
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

        foreach ($this->roles() as $role) {
            DB::table('admin_roles')->updateOrInsert(
                ['key' => $role['key']],
                array_merge($role, ['updated_at' => $now, 'created_at' => $now])
            );
        }

        $permissionIds = DB::table('permissions')->pluck('id', 'key');
        $roleIds = DB::table('admin_roles')->pluck('id', 'key');

        $map = [
            'admin'     => $this->adminPermissionKeys(),
            'moderator' => $this->moderatorPermissionKeys(),
            // super_admin volontairement absent : bypass code, voir docblock.
        ];

        foreach ($map as $roleKey => $keys) {
            foreach ($keys as $permissionKey) {
                if (!isset($roleIds[$roleKey]) || !isset($permissionIds[$permissionKey])) {
                    continue;
                }

                DB::table('admin_role_permission')->updateOrInsert(
                    [
                        'admin_role_id' => $roleIds[$roleKey],
                        'permission_id' => $permissionIds[$permissionKey],
                    ],
                    ['updated_at' => $now, 'created_at' => $now]
                );
            }
        }
    }

    public function down()
    {
        $roleIds = DB::table('admin_roles')->whereIn('key', ['super_admin', 'admin', 'moderator'])->pluck('id');
        DB::table('admin_role_permission')->whereIn('admin_role_id', $roleIds)->delete();
        DB::table('admin_roles')->whereIn('key', ['super_admin', 'admin', 'moderator'])->delete();

        $keys = array_column($this->permissions(), 'key');
        DB::table('permissions')->whereIn('key', $keys)->delete();
    }
};
