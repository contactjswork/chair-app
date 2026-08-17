<?php

namespace App\Console\Commands;

use App\Models\AdminRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

/**
 * Crée (ou met à jour le rôle d') un compte admin nommé. Remplace le
 * mot de passe partagé ADMIN_EMAIL/ADMIN_PASSWORD — chaque personne (Julien,
 * Camille, ...) doit avoir SON PROPRE compte.
 *
 * Usage :
 *   php artisan admin:create --name="Julien Schillinger" --email=julien@chair.app --password=... --role=super_admin
 *   php artisan admin:create --name="Camille" --email=camille@chair.app --password=... --role=admin
 *
 * Sans options, pose les questions en interactif. --role accepte
 * super_admin|admin|moderator (voir table admin_roles).
 */
class CreateAdminAccount extends Command
{
    protected $signature = 'admin:create
        {--name= : Nom complet}
        {--email= : Email de connexion}
        {--password= : Mot de passe (8 caractères minimum)}
        {--role=admin : super_admin|admin|moderator}';

    protected $description = "Crée un compte admin nommé (auth Sanctum) avec un rôle granulaire";

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Nom complet');
        $email = $this->option('email') ?: $this->ask('Email');
        $password = $this->option('password') ?: $this->secret('Mot de passe (8 caractères minimum)');
        $roleKey = $this->option('role') ?: $this->choice('Rôle admin', ['super_admin', 'admin', 'moderator'], 1);

        $validator = Validator::make(
            compact('name', 'email', 'password', 'roleKey'),
            [
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|max:255',
                'password' => 'required|string|min:8',
                'roleKey'  => 'required|in:super_admin,admin,moderator',
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $role = AdminRole::where('key', $roleKey)->first();
        if (!$role) {
            $this->error("Rôle admin '{$roleKey}' introuvable — as-tu bien lancé les migrations ?");
            return self::FAILURE;
        }

        $existing = User::where('email', $email)->first();

        if ($existing) {
            if ($existing->role !== 'admin') {
                $this->error("Un compte {$email} existe déjà avec le rôle '{$existing->role}' (non-admin) — pas touché, choisis un autre email.");
                return self::FAILURE;
            }

            $existing->name = $name;
            $existing->password = bcrypt($password);
            $existing->admin_role_id = $role->id;
            $existing->suspended_at = null;
            $existing->save();

            $this->info("Compte admin existant mis à jour : {$email} ({$role->name}).");
            return self::SUCCESS;
        }

        $admin = User::create([
            'name'     => $name,
            'email'    => $email,
            'password' => bcrypt($password),
            'role'     => 'admin',
        ]);
        $admin->admin_role_id = $role->id;
        $admin->save();

        $this->info("Compte admin créé : {$email} ({$role->name}).");

        return self::SUCCESS;
    }
}
