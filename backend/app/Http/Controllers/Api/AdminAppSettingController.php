<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AdminAuditLogger;
use App\Services\AppSettingsService;
use App\Services\HomeSectionsConfig;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * CRUD admin des réglages applicatifs (app_settings) — gardé par 'admin.auth'
 * + 'settings.update' sur toutes les routes (voir routes/api.php, seul
 * super_admin l'a par défaut). Chaque écriture : invalide le cache public
 * (AppSettingsService::flush() + le cache de AppConfigController) ET
 * journalise dans admin_audit_logs (resource_type='app_setting').
 */
class AdminAppSettingController extends Controller
{
    /** GET /admin/settings?group=recherche (optionnel) */
    public function index(Request $request)
    {
        $query = AppSetting::query();

        if ($request->filled('group')) {
            $query->where('group', $request->get('group'));
        }

        return response()->json(['data' => $query->orderBy('group')->orderBy('key')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key'           => ['required', 'string', 'max:150', 'regex:/^[a-z0-9_.]+$/', 'unique:app_settings,key'],
            'group'         => ['required', Rule::in(AppSettingsService::GROUPS)],
            'type'          => ['required', Rule::in(AppSettingsService::TYPES)],
            'value'         => ['required'],
            'min'           => ['nullable', 'numeric'],
            'max'           => ['nullable', 'numeric'],
            'default_value' => ['nullable'],
            'description'   => ['nullable', 'string', 'max:500'],
        ]);

        $this->assertValidValue($data['key'], $data['type'], $data['value'], $data['min'] ?? null, $data['max'] ?? null);

        $data['default_value'] = array_key_exists('default_value', $data) && $data['default_value'] !== null
            ? $data['default_value']
            : $data['value'];
        $data['updated_by'] = $request->user()->id;

        $setting = AppSetting::create($data);
        AppSettingsService::flush();
        AppConfigController::flush();

        AdminAuditLogger::log($request->user(), 'app_settings.create', 'app_setting', $setting->key, null, $setting->toArray(), $request);

        return response()->json($setting, 201);
    }

    public function update(Request $request, $id)
    {
        $setting = AppSetting::findOrFail($id);

        $data = $request->validate([
            'value'         => ['sometimes', 'required'],
            'min'           => ['sometimes', 'nullable', 'numeric'],
            'max'           => ['sometimes', 'nullable', 'numeric'],
            'group'         => ['sometimes', Rule::in(AppSettingsService::GROUPS)],
            'description'   => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $type = $setting->type; // le type d'un réglage existant ne change pas via update()
        $min  = array_key_exists('min', $data) ? $data['min'] : $setting->min;
        $max  = array_key_exists('max', $data) ? $data['max'] : $setting->max;
        $value = array_key_exists('value', $data) ? $data['value'] : $setting->value;

        $this->assertValidValue($setting->key, $type, $value, $min, $max);

        $old = $setting->toArray();
        $data['updated_by'] = $request->user()->id;
        $setting->update($data);
        AppSettingsService::flush();
        AppConfigController::flush();

        AdminAuditLogger::log($request->user(), 'app_settings.update', 'app_setting', $setting->key, $old, $setting->fresh()->toArray(), $request);

        return response()->json($setting->fresh());
    }

    public function destroy(Request $request, $id)
    {
        $setting = AppSetting::findOrFail($id);
        $old = $setting->toArray();
        $setting->delete();
        AppSettingsService::flush();
        AppConfigController::flush();

        AdminAuditLogger::log($request->user(), 'app_settings.delete', 'app_setting', $old['key'], $old, null, $request);

        return response()->json(['ok' => true]);
    }

    /**
     * Mode Safe, par groupe — remet CHAQUE réglage du groupe à sa
     * default_value. Une entrée d'audit par réglage effectivement modifié.
     */
    public function resetGroup(Request $request, string $group)
    {
        if (!in_array($group, AppSettingsService::GROUPS, true)) {
            return response()->json(['error' => 'Groupe inconnu.'], 422);
        }

        $settings = AppSetting::where('group', $group)->get();
        $resetCount = 0;

        foreach ($settings as $setting) {
            if ($setting->default_value === null) continue;
            if ($setting->value === $setting->default_value) continue;

            $old = $setting->toArray();
            $setting->update(['value' => $setting->default_value, 'updated_by' => $request->user()->id]);
            $resetCount++;

            AdminAuditLogger::log($request->user(), 'app_settings.reset', 'app_setting', $setting->key, $old, $setting->fresh()->toArray(), $request);
        }

        AppSettingsService::flush();
        AppConfigController::flush();

        return response()->json(['ok' => true, 'reset_count' => $resetCount]);
    }

    /** @throws ValidationException */
    private function assertValidValue(string $key, string $type, $value, $min, $max): void
    {
        $error = AppSettingsService::validateForWrite($type, $value, $min, $max);
        if ($error) {
            throw ValidationException::withMessages(['value' => [$error]]);
        }

        if ($key === 'recommendation_radius_tiers_km') {
            $this->assertValidRadiusTiers($value);
        }

        if ($key === 'ranking_radius_tiers_km') {
            $this->assertValidRankingRadiusTiers($value);
        }

        if ($key === 'home_sections' && !HomeSectionsConfig::isValid($value)) {
            throw ValidationException::withMessages(['value' => ["La config des sections home doit contenir exactement les clés : " . implode(', ', HomeSectionsConfig::ALLOWED_KEYS)]]);
        }
    }

    /**
     * Jamais un rayon négatif ou décroissant — casserait la cascade géo.
     * Exactement 5 valeurs : ce sont les km des 5 paliers fixes de
     * RecommendationService::RADIUS_TIERS (radius_10/25/50/100/region) —
     * les libellés/clés de palier restent en code, seuls les km bougent.
     */
    private function assertValidRadiusTiers($value): void
    {
        if (!is_array($value) || count($value) !== 5) {
            throw ValidationException::withMessages(['value' => ['Les paliers de rayon doivent contenir exactement 5 valeurs (radius_10, radius_25, radius_50, radius_100, region).']]);
        }

        $prev = 0;
        foreach ($value as $km) {
            if (!is_numeric($km) || $km <= 0 || $km > 2000) {
                throw ValidationException::withMessages(['value' => ['Chaque palier doit être un nombre de km strictement positif (max 2000).']]);
            }
            if ($km <= $prev) {
                throw ValidationException::withMessages(['value' => ['Les paliers de rayon doivent être strictement croissants.']]);
            }
            $prev = $km;
        }
    }

    /** Cascade du classement local home (frontend/lib/homeFilters.ts) — {km, label}[], km croissants. */
    private function assertValidRankingRadiusTiers($value): void
    {
        if (!is_array($value) || count($value) < 1 || count($value) > 6) {
            throw ValidationException::withMessages(['value' => ['Les paliers de classement doivent être une liste de 1 à 6 entrées {km, label}.']]);
        }

        $prev = 0;
        foreach ($value as $tier) {
            if (!is_array($tier) || !isset($tier['km'], $tier['label'])) {
                throw ValidationException::withMessages(['value' => ['Chaque palier doit avoir un km et un label.']]);
            }
            if (!is_numeric($tier['km']) || $tier['km'] <= 0 || $tier['km'] > 2000) {
                throw ValidationException::withMessages(['value' => ['Chaque km doit être un nombre strictement positif (max 2000).']]);
            }
            if (!is_string($tier['label']) || trim($tier['label']) === '') {
                throw ValidationException::withMessages(['value' => ['Chaque palier doit avoir un libellé non vide.']]);
            }
            if ($tier['km'] <= $prev) {
                throw ValidationException::withMessages(['value' => ['Les km doivent être strictement croissants.']]);
            }
            $prev = $tier['km'];
        }
    }
}
