<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Point d'accès UNIQUE aux réglages applicatifs dynamiques (app_settings).
 * Toute lecture ailleurs dans le code DOIT passer par get()/typed getters
 * ici — jamais un AppSetting::where(...) direct — pour que la validation
 * (type + min/max) et le repli sur la valeur par défaut du code appelant
 * soient appliqués de façon uniforme partout.
 *
 * Règle d'or : une valeur invalide ou hors-limites en base n'est JAMAIS
 * utilisée telle quelle — get() retourne alors $default (fourni par
 * l'appelant, typiquement la constante historique du code). Aucun réglage
 * ne peut donc "casser" l'algo, même si quelqu'un modifie la ligne SQL à la
 * main.
 */
class AppSettingsService
{
    const CACHE_KEY = 'app_settings:all';

    // Filet de sécurité seulement — toute écriture appelle flush().
    const CACHE_TTL = 60;

    const GROUPS = ['recherche', 'home', 'gamification', 'professionnels', 'moderation', 'general'];
    const TYPES  = ['string', 'integer', 'float', 'boolean', 'json'];

    /** key => AppSetting, pour tous les réglages en base. */
    public static function all(): array
    {
        try {
            return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
                return AppSetting::query()->get()->keyBy('key')->all();
            });
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Valeur typée+validée d'un réglage, ou $default si absent/invalide/
     * hors-bornes. Ne lève jamais d'exception — un appelant algorithmique ne
     * doit jamais planter à cause d'un réglage mal formé.
     */
    public static function get(string $key, $default = null)
    {
        $row = self::all()[$key] ?? null;
        if (!$row) return $default;

        $value = self::coerce($row->type, $row->value, $row->min, $row->max);

        return $value ?? $default;
    }

    /**
     * Coerce+clamp une valeur déjà décodée (cast Eloquent 'array' sur JSON
     * scalaire ou tableau) selon type/min/max. Retourne null si invalide —
     * charge à l'appelant de retomber sur son propre défaut.
     */
    public static function coerce(string $type, $value, $min = null, $max = null)
    {
        if ($value === null) return null;

        switch ($type) {
            case 'integer':
                if (!is_numeric($value)) return null;
                $v = (int) $value;
                if ($min !== null && $v < (float) $min) return null;
                if ($max !== null && $v > (float) $max) return null;
                return $v;

            case 'float':
                if (!is_numeric($value)) return null;
                $v = (float) $value;
                if ($min !== null && $v < (float) $min) return null;
                if ($max !== null && $v > (float) $max) return null;
                return $v;

            case 'boolean':
                if (is_bool($value)) return $value;
                if ($value === 0 || $value === 1 || $value === '0' || $value === '1') return (bool) $value;
                return null;

            case 'json':
                // Structure libre — validée par l'appelant selon son propre
                // besoin (ex: liste de rayons croissants), pas ici.
                return $value;

            case 'string':
            default:
                return is_string($value) ? $value : null;
        }
    }

    /**
     * Valide une valeur candidate pour l'écriture admin (store/update).
     * Retourne un message d'erreur (string) si invalide, null si valide —
     * plus explicite qu'un simple bool pour renvoyer une 422 parlante.
     */
    public static function validateForWrite(string $type, $value, $min = null, $max = null): ?string
    {
        if (!in_array($type, self::TYPES, true)) {
            return "Type de réglage inconnu : {$type}";
        }

        switch ($type) {
            case 'integer':
            case 'float':
                if (!is_numeric($value)) return 'La valeur doit être numérique pour ce type.';
                $v = (float) $value;
                if ($min !== null && $v < (float) $min) return "La valeur doit être >= {$min}.";
                if ($max !== null && $v > (float) $max) return "La valeur doit être <= {$max}.";
                return null;

            case 'boolean':
                if (!is_bool($value) && $value !== 0 && $value !== 1 && $value !== '0' && $value !== '1') {
                    return 'La valeur doit être un booléen pour ce type.';
                }
                return null;

            case 'string':
                if (!is_string($value)) return 'La valeur doit être une chaîne pour ce type.';
                return null;

            case 'json':
                if (!is_array($value) && !is_string($value) && !is_numeric($value) && !is_bool($value)) {
                    return 'La valeur JSON est invalide.';
                }
                return null;

            default:
                return null;
        }
    }
}
