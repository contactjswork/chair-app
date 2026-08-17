<?php

namespace App\Services;

use App\Models\FeatureFlag;
use Illuminate\Support\Facades\Cache;

/**
 * Point d'accès UNIQUE à l'état des feature flags — jamais de requête directe
 * sur le modèle FeatureFlag ailleurs dans le code (ni pour lire, ni pour
 * savoir si une fonctionnalité est active). Cache court (voir CACHE_TTL),
 * invalidé explicitement à CHAQUE écriture admin (create/update/delete) —
 * jamais de cache qui ment plus de quelques secondes après un changement.
 */
class FeatureFlagService
{
    const CACHE_KEY = 'feature_flags:all';

    // Filet de sécurité seulement — toute écriture appelle flush() donc ce
    // TTL ne sert qu'en cas d'oubli ou de commande artisan hors HTTP.
    const CACHE_TTL = 60;

    /**
     * Clés livrées par défaut à true (voir migration de seed) — utilisées en
     * repli si la table est vide/inaccessible, pour ne JAMAIS désactiver une
     * fonctionnalité qui marche aujourd'hui juste parce que la DB flanche.
     */
    const DEFAULT_KEYS = [
        'chair_plus_enabled',
        'referrals_enabled',
        'chair_rental_enabled',
        'recruitment_enabled',
        'rankings_enabled',
        'objectives_enabled',
    ];

    /** key => bool pour TOUS les flags connus en base. */
    public static function all(): array
    {
        try {
            return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
                return FeatureFlag::query()->pluck('enabled', 'key')->map(fn ($v) => (bool) $v)->all();
            });
        } catch (\Throwable $e) {
            // DB/cache indisponible : tout activé par défaut plutôt que de
            // casser une fonctionnalité en prod à cause d'une panne annexe.
            return array_fill_keys(self::DEFAULT_KEYS, true);
        }
    }

    /** Un flag précis — $default s'applique si la clé n'existe pas encore en base. */
    public static function isEnabled(string $key, bool $default = true): bool
    {
        $flags = self::all();
        return array_key_exists($key, $flags) ? $flags[$key] : $default;
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
