<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminAuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Authentification admin — compte réel + mot de passe (Sanctum), PLUS de
 * secret partagé. Volontairement séparé de AuthController::login : un login
 * admin a des règles propres (role='admin' + admin_role requis) et ne doit
 * jamais être confondu avec le login client/pro grand public.
 */
class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Identifiants invalides'], 401);
        }

        $user = User::where('email', $request->email)->first();

        if ($user->role !== 'admin' || !$user->admin_role_id) {
            Auth::logout();
            return response()->json(['message' => "Ce compte n'a pas accès à l'administration."], 403);
        }

        if ($user->suspended_at) {
            Auth::logout();
            return response()->json(['message' => 'Ce compte est suspendu.'], 403);
        }

        $token = $user->createToken('admin_auth_token')->plainTextToken;

        AdminAuditLogger::log($user, 'admin.login', 'user', $user->id, null, null, $request);

        return response()->json([
            'user'  => $this->presentAdmin($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin' || !$user->admin_role_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['user' => $this->presentAdmin($user)]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            AdminAuditLogger::log($user, 'admin.logout', 'user', $user->id, null, null, $request);
            $token = $user->currentAccessToken();
            if ($token) {
                $token->delete();
            }
        }

        return response()->json(['ok' => true]);
    }

    private function presentAdmin(User $user): array
    {
        $role = $user->adminRole;

        return [
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'admin_role'      => $role?->key,
            'admin_role_name' => $role?->name,
            'permissions'     => $user->adminPermissionKeys(),
        ];
    }
}
