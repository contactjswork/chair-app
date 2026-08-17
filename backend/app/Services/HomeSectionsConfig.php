<?php

namespace App\Services;

/**
 * Config par défaut des sections de la home client (frontend/app/app/page.tsx).
 * Utilisée (a) pour seeder le réglage app_settings 'home_sections' au premier
 * `migrate`, (b) comme repli si ce réglage est absent/invalide côté
 * AppConfigController — l'ordre/état affichés aujourd'hui en dur dans
 * page.tsx, jamais désactivé par erreur.
 *
 * Chaque clé correspond à un composant déjà développé (voir mission) — CE
 * TABLEAU NE PILOTE QUE présence/ordre/titre/limite, jamais le rendu lui-même.
 */
class HomeSectionsConfig
{
    const ALLOWED_KEYS = [
        'home_personalized',
        'specialty_quick_links',
        'coup_de_coeur',
        'ranking',
        'nearby_map',
        'realisations',
        'new_talents',
    ];

    public static function defaults(): array
    {
        return [
            ['key' => 'home_personalized',     'enabled' => true, 'order' => 1, 'title' => null,                     'limit' => 12],
            ['key' => 'specialty_quick_links',  'enabled' => true, 'order' => 2, 'title' => null,                     'limit' => 6],
            ['key' => 'coup_de_coeur',          'enabled' => true, 'order' => 3, 'title' => 'Coup de cœur CHAIR',     'limit' => 10],
            ['key' => 'ranking',                'enabled' => true, 'order' => 4, 'title' => 'Les meilleurs coiffeurs CHAIR', 'limit' => 5],
            ['key' => 'nearby_map',             'enabled' => true, 'order' => 5, 'title' => 'Sur la carte',           'limit' => 20],
            ['key' => 'realisations',           'enabled' => true, 'order' => 6, 'title' => 'Réalisations du moment', 'limit' => 9],
            ['key' => 'new_talents',            'enabled' => true, 'order' => 7, 'title' => 'Nouveaux talents',       'limit' => 8],
        ];
    }

    /**
     * Valide une liste candidate (issue d'un PATCH admin ou d'une lecture
     * base) : doit contenir exactement les 7 clés connues, chacune avec un
     * type correct — sinon on retombe sur defaults() plutôt que de risquer
     * une home cassée (section manquante, ordre non numérique...).
     */
    public static function isValid($sections): bool
    {
        if (!is_array($sections)) return false;

        $seenKeys = [];
        foreach ($sections as $section) {
            if (!is_array($section)) return false;
            if (!isset($section['key']) || !in_array($section['key'], self::ALLOWED_KEYS, true)) return false;
            if (!isset($section['enabled']) || !is_bool($section['enabled'])) return false;
            if (!isset($section['order']) || !is_numeric($section['order'])) return false;
            if (array_key_exists('title', $section) && $section['title'] !== null && !is_string($section['title'])) return false;
            if (array_key_exists('limit', $section) && $section['limit'] !== null && !is_numeric($section['limit'])) return false;

            $seenKeys[] = $section['key'];
        }

        $seenKeys = array_unique($seenKeys);
        sort($seenKeys);
        $expected = self::ALLOWED_KEYS;
        sort($expected);

        return $seenKeys === $expected;
    }
}
