<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeatureFlag;
use App\Services\AdminAuditLogger;
use App\Services\FeatureFlagService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * CRUD admin des feature flags — gardé par 'admin.auth' + toutes les routes
 * exigent 'feature_flags.manage' (voir routes/api.php). Chaque écriture :
 * invalide le cache public (FeatureFlagService::flush()) ET journalise dans
 * admin_audit_logs (resource_type='feature_flag').
 */
class AdminFeatureFlagController extends Controller
{
    public function index()
    {
        return response()->json(['data' => FeatureFlag::orderBy('key')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key'         => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/', 'unique:feature_flags,key'],
            'enabled'     => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);
        $data['enabled'] = $data['enabled'] ?? false;

        $flag = FeatureFlag::create($data);
        FeatureFlagService::flush();

        AdminAuditLogger::log($request->user(), 'feature_flags.create', 'feature_flag', $flag->key, null, $flag->toArray(), $request);

        return response()->json($flag, 201);
    }

    public function update(Request $request, $id)
    {
        $flag = FeatureFlag::findOrFail($id);

        $data = $request->validate([
            'enabled'     => ['sometimes', 'boolean'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $old = $flag->toArray();
        $flag->update($data);
        FeatureFlagService::flush();

        AdminAuditLogger::log($request->user(), 'feature_flags.update', 'feature_flag', $flag->key, $old, $flag->fresh()->toArray(), $request);

        return response()->json($flag->fresh());
    }

    public function destroy(Request $request, $id)
    {
        $flag = FeatureFlag::findOrFail($id);
        $old = $flag->toArray();
        $flag->delete();
        FeatureFlagService::flush();

        AdminAuditLogger::log($request->user(), 'feature_flags.delete', 'feature_flag', $old['key'], $old, null, $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Mode Safe — tout remettre à `enabled=true` (l'état de livraison de
     * chaque flag, voir migration de seed). Journalise une entrée par flag
     * effectivement modifié, pas d'entrée pour ceux déjà à true.
     */
    public function resetAll(Request $request)
    {
        $flags = FeatureFlag::where('enabled', false)->get();

        foreach ($flags as $flag) {
            $old = $flag->toArray();
            $flag->update(['enabled' => true]);
            AdminAuditLogger::log($request->user(), 'feature_flags.reset', 'feature_flag', $flag->key, $old, $flag->fresh()->toArray(), $request);
        }

        FeatureFlagService::flush();

        return response()->json(['ok' => true, 'reset_count' => $flags->count()]);
    }
}
