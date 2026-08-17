<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminRole;
use App\Models\User;
use App\Services\AdminAuditLogger;
use Illuminate\Http\Request;

/**
 * Gestion des comptes admin (créer/modifier/désactiver un admin, changer
 * son rôle). Toutes les routes ici sont gardées par la permission
 * 'admins.manage' (réservée Super Admin dans le mapping par défaut — voir
 * seed migration).
 */
class AdminAccountController extends Controller
{
    public function index(Request $request)
    {
        $admins = User::where('role', 'admin')
            ->with('adminRole')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => $this->present($u));

        return response()->json(['data' => $admins]);
    }

    public function roles(Request $request)
    {
        return response()->json(['data' => AdminRole::orderBy('id')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|string|email|max:255|unique:users',
            'password'      => 'required|string|min:8',
            'admin_role_key'=> 'required|string|exists:admin_roles,key',
        ]);

        $role = AdminRole::where('key', $validated['admin_role_key'])->firstOrFail();

        $admin = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role'     => 'admin',
        ]);
        $admin->admin_role_id = $role->id;
        $admin->save();

        AdminAuditLogger::log(
            $request->user(),
            'admins.create',
            'user',
            $admin->id,
            null,
            ['name' => $admin->name, 'email' => $admin->email, 'admin_role' => $role->key],
            $request
        );

        return response()->json(['data' => $this->present($admin->fresh('adminRole'))], 201);
    }

    public function update(Request $request, $id)
    {
        $admin = User::where('role', 'admin')->findOrFail($id);

        $validated = $request->validate([
            'admin_role_key' => 'sometimes|required|string|exists:admin_roles,key',
            'name'           => 'sometimes|required|string|max:255',
        ]);

        $old = ['name' => $admin->name, 'admin_role' => $admin->adminRole?->key];

        if (isset($validated['admin_role_key'])) {
            if ($admin->id === $request->user()->id && $validated['admin_role_key'] !== 'super_admin') {
                // Un Super Admin ne peut pas se rétrograder lui-même — évite
                // qu'un compte se retrouve accidentellement sans accès à
                // admins.manage alors qu'il est le seul Super Admin restant.
                return response()->json(['error' => 'Vous ne pouvez pas modifier votre propre rôle admin.'], 422);
            }

            $role = AdminRole::where('key', $validated['admin_role_key'])->firstOrFail();
            $admin->admin_role_id = $role->id;
        }

        if (isset($validated['name'])) {
            $admin->name = $validated['name'];
        }

        $admin->save();
        $admin->refresh()->load('adminRole');

        AdminAuditLogger::log(
            $request->user(),
            'admins.update',
            'user',
            $admin->id,
            $old,
            ['name' => $admin->name, 'admin_role' => $admin->adminRole?->key],
            $request
        );

        return response()->json(['data' => $this->present($admin)]);
    }

    /** Désactive un compte admin (suspend + révoque ses tokens) — pas de suppression définitive. */
    public function deactivate(Request $request, $id)
    {
        $admin = User::where('role', 'admin')->findOrFail($id);

        if ($admin->id === $request->user()->id) {
            return response()->json(['error' => 'Vous ne pouvez pas désactiver votre propre compte.'], 422);
        }

        $admin->suspended_at = now();
        $admin->save();
        $admin->tokens()->delete();

        AdminAuditLogger::log(
            $request->user(),
            'admins.deactivate',
            'user',
            $admin->id,
            ['suspended_at' => null],
            ['suspended_at' => $admin->suspended_at->toISOString()],
            $request
        );

        return response()->json(['ok' => true]);
    }

    private function present(User $admin): array
    {
        return [
            'id'         => $admin->id,
            'name'       => $admin->name,
            'email'      => $admin->email,
            'admin_role' => $admin->adminRole?->key,
            'suspended'  => (bool) $admin->suspended_at,
            'created_at' => $admin->created_at,
        ];
    }
}
