<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserPreference;
use Illuminate\Support\Collection;

/**
 * Service de scoring PARTAGÉ — un seul moteur de pertinence pour la page
 * Recherche (ExploreController) ET la Home (RecommendationController). Les
 * deux doivent produire le même classement pour un même contexte, sinon un
 * coiffeur "pertinent" sur l'une et absent de l'autre casse la confiance.
 *
 * Hiérarchie de poids (volontairement dans cet ordre, jamais inversée) :
 *   1. Spécialité/service EXACTEMENT demandé   (dominant)
 *   2. Proximité géographique
 *   3. Réputation (note moyenne + volume d'avis)
 *   4. Disponibilité si connue (signal optionnel, voir $context['available_ids'])
 *   5. CHAIR+ — départage à mérite égal SEULEMENT, jamais un boost qui fait
 *      dépasser un profil plus pertinent. Même philosophie produit que
 *      HairdresserController::batchChairPlusMap() (boost borné, additif,
 *      volontairement petit) — voir ce fichier pour le précédent.
 */
class RecommendationService
{
    // ── Poids de scoring (valeurs par défaut / repli) ───────────────────
    // Ces constantes restent la SOURCE DE VÉRITÉ du repli : si app_settings
    // est absent, invalide ou hors-bornes, c'est TOUJOURS ces valeurs qui
    // s'appliquent (voir weights() ci-dessous) — jamais 0, jamais négatif.
    //
    // Le spécialité/service exact domine tout le reste : à correspondance
    // égale (0 ou 100%), l'écart qu'il crée doit rester plus grand que
    // n'importe quelle combinaison proximité+réputation+CHAIR+.
    const WEIGHT_SPECIALTY_MAX = 220;

    // Proximité : dégressif linéaire, 0km = bonus plein, 100km = 0. Toujours
    // strictement inférieur à WEIGHT_SPECIALTY_MAX pour respecter le ">>".
    const WEIGHT_PROXIMITY_MAX = 60;
    const PROXIMITY_DECAY_PER_KM = 0.6;

    // Réputation — note (0-5) et volume d'avis (plafonné pour ne pas laisser
    // un compte très ancien écraser un profil récent mais excellent).
    const WEIGHT_RATING_MULT   = 4;
    const WEIGHT_REVIEWS_CAP   = 200;
    const WEIGHT_REVIEWS_MULT  = 0.15;

    // Disponibilité si connue — signal optionnel, voir note de méthode score().
    const WEIGHT_AVAILABILITY = 12;

    // CHAIR+ — départage uniquement. Volontairement plus petit que le poids
    // "featured" (50) et proche du boost géoloc CHAIR+ (15) déjà en place
    // ailleurs (HairdresserController) : un coup de pouce, jamais un rachat
    // de classement.
    const WEIGHT_CHAIR_PLUS = 6;

    // ── Cascade géographique honnête ────────────────────────────────────
    // Chaque palier retourne son propre libellé — jamais un profil à 150km
    // affiché comme s'il était "près de vous". Le dernier palier tenté avant
    // le national est volontairement large (250km ≈ taille d'une région
    // française) plutôt qu'un vrai découpage administratif : suffisant pour
    // rester honnête sans dépendre d'une résolution région par lat/lng.
    //
    // 'km' ici = repli par défaut ; radiusTiers() peut le remplacer par la
    // valeur configurée en admin (app_settings 'recommendation_radius_tiers_km'),
    // 'tier'/'label' restent TOUJOURS fixés en code (jamais éditables via
    // l'admin — voir AdminAppSettingController::assertValidRadiusTiers()).
    const RADIUS_TIERS = [
        ['km' => 10,  'tier' => 'radius_10',  'label' => 'Près de chez vous'],
        ['km' => 25,  'tier' => 'radius_25',  'label' => 'Dans votre secteur'],
        ['km' => 50,  'tier' => 'radius_50',  'label' => 'Autour de chez vous'],
        ['km' => 100, 'tier' => 'radius_100', 'label' => 'Plus loin de vous'],
        ['km' => 250, 'tier' => 'region',     'label' => 'Dans votre région'],
    ];
    const NATIONAL_TIER = ['tier' => 'national', 'label' => 'Partout en France'];

    /**
     * RADIUS_TIERS avec les km éventuellement remplacés par la config admin
     * (app_settings 'recommendation_radius_tiers_km' : 5 valeurs croissantes,
     * validées à l'écriture par AdminAppSettingController). Repli intégral
     * sur les km codés en dur si absent/invalide/mauvais nombre de valeurs —
     * ne casse JAMAIS la cascade (rayon négatif ou décroissant impossible).
     */
    public static function radiusTiers(): array
    {
        $configured = \App\Services\AppSettingsService::get('recommendation_radius_tiers_km');

        if (!is_array($configured) || count($configured) !== count(self::RADIUS_TIERS)) {
            return self::RADIUS_TIERS;
        }

        $values = array_values($configured);
        $prev = 0;
        foreach ($values as $km) {
            if (!is_numeric($km) || $km <= $prev || $km > 2000) {
                return self::RADIUS_TIERS; // config invalide -> repli intégral
            }
            $prev = $km;
        }

        $tiers = self::RADIUS_TIERS;
        foreach ($tiers as $i => &$tier) {
            $tier['km'] = (float) $values[$i];
        }
        unset($tier);

        return $tiers;
    }

    /**
     * Poids de scoring effectifs — chaque poids lu individuellement depuis
     * app_settings, avec repli sur la constante si absent/invalide/négatif
     * (voir app_settings.min = 0 sur chacun, ceinture + bretelles).
     */
    public static function weights(): array
    {
        return [
            'specialty_max'       => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_specialty_max', self::WEIGHT_SPECIALTY_MAX)),
            'proximity_max'       => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_proximity_max', self::WEIGHT_PROXIMITY_MAX)),
            'proximity_decay_km'  => max(0, (float) \App\Services\AppSettingsService::get('recommendation_proximity_decay_per_km', self::PROXIMITY_DECAY_PER_KM)),
            'rating_mult'         => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_rating_mult', self::WEIGHT_RATING_MULT)),
            'reviews_cap'         => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_reviews_cap', self::WEIGHT_REVIEWS_CAP)),
            'reviews_mult'        => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_reviews_mult', self::WEIGHT_REVIEWS_MULT)),
            'availability'        => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_availability', self::WEIGHT_AVAILABILITY)),
            'chair_plus'          => max(0, (float) \App\Services\AppSettingsService::get('recommendation_weight_chair_plus', self::WEIGHT_CHAIR_PLUS)),
        ];
    }

    // Repli par genre — MÊMES listes que frontend/lib/homeFilters.ts
    // (FEMME_SLUGS/HOMME_SLUGS). Dupliqué volontairement (PHP ne peut pas
    // importer un module TS) : à maintenir en synchro manuelle si l'une
    // bouge. Utilisé uniquement quand l'utilisateur a un genre connu
    // (user_preferences.profile_type) mais aucun intérêt explicite — jamais
    // pour inventer un intérêt à un utilisateur totalement inconnu (voir
    // resolveContext(), cas "aucune préférence").
    const FEMME_SLUGS = ['couleur-balayage', 'coupe-femme', 'boucles-curly', 'texture-lissage', 'evenementiel', 'extensions'];
    const HOMME_SLUGS = ['coupe-homme', 'barbe', 'afro-locks', 'texture-lissage', 'couleur-balayage', 'extensions'];

    // ── Contexte ─────────────────────────────────────────────────────────

    /**
     * Construit le contexte de recommandation à partir de l'utilisateur
     * connecté (user_preferences serveur) et/ou des paramètres explicites de
     * la requête (recherche active, relais localStorage pour les visiteurs).
     * Priorité : explicite (recherche active) > user_preferences serveur >
     * relais localStorage transmis par le frontend > repli genre > rien.
     * Ne fabrique JAMAIS un intérêt pour un utilisateur totalement inconnu —
     * scenario "aucune préférence" = specialty_slugs vide, classement neutre
     * (proximité + réputation), voir score().
     */
    public static function resolveContext(?User $user, array $params = []): array
    {
        $specialtySlugs = array_values(array_filter($params['specialty'] ?? []));
        $source = !empty($specialtySlugs) ? 'explicit' : 'none';

        $lat = $params['lat'] ?? null;
        $lng = $params['lng'] ?? null;

        if (empty($specialtySlugs) && $user) {
            $pref = UserPreference::where('user_id', $user->id)->first();
            if ($pref) {
                if (!empty($pref->interests)) {
                    $specialtySlugs = $pref->interests;
                    $source = 'user_preferences';
                } elseif (!empty($pref->profile_type)) {
                    $specialtySlugs = self::slugsForGender($pref->profile_type);
                    $source = $specialtySlugs ? 'user_preferences_gender' : 'none';
                }
            }
            if ($lat === null && $user->latitude !== null && $user->longitude !== null) {
                $lat = (float) $user->latitude;
                $lng = (float) $user->longitude;
            }
        }

        // Relais localStorage — le visiteur non connecté (ou dont le cache
        // serveur n'a pas encore ces intérêts) transmet ses choix onboarding
        // déjà faits côté client. Ce n'est PAS un deuxième système de
        // préférences : juste un passe-plat de la même donnée, jamais
        // persistée ici.
        if (empty($specialtySlugs) && !empty($params['interests_relay'])) {
            $specialtySlugs = array_values(array_filter($params['interests_relay']));
            $source = $specialtySlugs ? 'client_relay' : 'none';
        }

        return [
            'specialty_slugs' => array_values(array_unique($specialtySlugs)),
            'pref_source'     => $source,
            'lat'             => $lat !== null ? (float) $lat : null,
            'lng'             => $lng !== null ? (float) $lng : null,
            'min_rating'      => isset($params['min_rating']) ? (float) $params['min_rating'] : null,
            // Hook optionnel — non alimenté par défaut aujourd'hui (voir score()).
            'available_ids'   => $params['available_ids'] ?? [],
            'chair_plus_map'  => $params['chair_plus_map'] ?? [],
        ];
    }

    private static function slugsForGender(?string $gender): array
    {
        if ($gender === 'femme') return self::FEMME_SLUGS;
        if ($gender === 'homme') return self::HOMME_SLUGS;
        return [];
    }

    // ── Scoring ──────────────────────────────────────────────────────────

    /**
     * Poids "correspondance spécialité" — utilisé à la fois par score() et
     * directement par ExploreController pour son boost d'intérêts (même
     * calcul, pas de logique divergente entre recherche et home).
     */
    public static function specialtyMatchScore(array $wantedSlugs, array $haveSlugs): int
    {
        if (empty($wantedSlugs)) return 0;
        $matches = count(array_intersect($wantedSlugs, $haveSlugs));
        if ($matches === 0) return 0;
        return (int) round(($matches / count($wantedSlugs)) * self::weights()['specialty_max']);
    }

    /**
     * Score d'un coiffeur (modèle HairdresserProfile avec `specialties`
     * chargée, et `distance_km` attaché si géo connue — voir rank()).
     *
     * Disponibilité : signal optionnel seulement, $context['available_ids']
     * doit être pré-calculé par l'appelant (ex: via
     * AvailableHairdressersController::hasAvailableSlot()) — ce service ne
     * lance jamais lui-même cette vérification coûteuse (N+1 potentiel sur
     * un lot de résultats de recherche). Aucun appelant ne l'alimente
     * aujourd'hui ; documenté comme gap dans le rapport de mission.
     */
    public static function score(HairdresserProfile $h, array $context): int
    {
        $w = self::weights();
        $score = 0;

        $wanted = $context['specialty_slugs'] ?? [];
        if (!empty($wanted)) {
            $have = $h->relationLoaded('specialties') ? $h->specialties->pluck('slug')->all() : [];
            $score += self::specialtyMatchScore($wanted, $have);
        }

        $distance = $h->distance_km ?? null;
        if ($distance !== null) {
            $score += (int) max(0, round($w['proximity_max'] - $distance * $w['proximity_decay_km']));
        }

        $score += (int) round(((float) ($h->avg_rating ?? 0)) * $w['rating_mult']);
        $score += (int) round(min((int) ($h->reviews_count ?? 0), (int) $w['reviews_cap']) * $w['reviews_mult']);

        if (!empty($context['available_ids']) && in_array($h->id, $context['available_ids'], true)) {
            $score += (int) $w['availability'];
        }

        if (!empty($context['chair_plus_map'][$h->id])) {
            $score += (int) $w['chair_plus'];
        }

        return $score;
    }

    // ── Cascade géographique + classement ───────────────────────────────

    /**
     * Classe une collection de HairdresserProfile selon le contexte, avec
     * repli géographique honnête si une position est connue. Retourne :
     *   - items         : Collection triée (distance_km + match_score attachés)
     *   - tier           : 'no_geo' | 'radius_10' | 'radius_25' | 'radius_50'
     *                      | 'radius_100' | 'region' | 'national' | 'empty'
     *   - is_fallback    : true dès qu'on a dû sortir du premier palier tenté
     *                      (radius_10) — le frontend s'en sert pour afficher
     *                      "Plus loin de vous" plutôt que de laisser croire
     *                      à de la proximité.
     *   - fallback_label : libellé honnête du palier atteint (null si tier
     *                      radius_10/no_geo, pas besoin d'avertir dans ce cas)
     *   - radius_km      : rayon du palier atteint (null pour no_geo/national/empty)
     *
     * $minResults : nombre minimum de résultats pour accepter un palier
     * avant d'élargir — 1 par défaut (ne jamais renvoyer vide si quelque
     * chose d'honnête existe plus loin).
     */
    public static function rank(Collection $candidates, array $context, int $minResults = 1): array
    {
        $lat = $context['lat'] ?? null;
        $lng = $context['lng'] ?? null;

        if ($lat === null || $lng === null) {
            // Pas de position connue : jamais de repli géo inventé — tri
            // qualité pure (spécialité si connue, sinon réputation seule).
            $items = $candidates->map(function ($h) use ($context) {
                $h->distance_km = null;
                $h->match_score = self::score($h, $context);
                return $h;
            })->sortByDesc('match_score')->values();

            return [
                'items' => $items, 'tier' => 'no_geo', 'is_fallback' => false,
                'fallback_label' => null, 'radius_km' => null,
            ];
        }

        $withDistance = $candidates
            ->filter(fn ($h) => $h->latitude !== null && $h->longitude !== null)
            ->map(function ($h) use ($lat, $lng) {
                $h->distance_km = round(Geo::haversineKm($lat, $lng, (float) $h->latitude, (float) $h->longitude), 1);
                return $h;
            });

        foreach (self::radiusTiers() as $i => $tierDef) {
            $subset = $withDistance->filter(fn ($h) => $h->distance_km <= $tierDef['km'])->values();
            if ($subset->count() >= $minResults) {
                return self::finalizeTier($subset, $context, $tierDef, $i > 0);
            }
        }

        if ($withDistance->count() >= 1) {
            $tierDef = array_merge(self::NATIONAL_TIER, ['km' => null]);
            return self::finalizeTier($withDistance, $context, $tierDef, true);
        }

        return [
            'items' => collect(), 'tier' => 'empty', 'is_fallback' => true,
            'fallback_label' => 'Aucun profil disponible pour le moment', 'radius_km' => null,
        ];
    }

    private static function finalizeTier(Collection $items, array $context, array $tierDef, bool $isFallback): array
    {
        $items = $items->map(function ($h) use ($context) {
            $h->match_score = self::score($h, $context);
            return $h;
        })->sortByDesc('match_score')->values();

        return [
            'items'           => $items,
            'tier'            => $tierDef['tier'],
            'is_fallback'     => $isFallback,
            'fallback_label'  => $isFallback ? $tierDef['label'] : null,
            'radius_km'       => $tierDef['km'] ?? null,
        ];
    }

    // ── CHAIR+ (partagé) ─────────────────────────────────────────────────

    /**
     * Même logique que HairdresserController::batchChairPlusMap() /
     * ExploreController::batchChairPlusMap() (banqué, abonnement individuel,
     * CHAIR BUSINESS salon) — centralisée ici pour que les deux contrôleurs
     * appellent la même règle plutôt que de la dupliquer une troisième fois.
     */
    public static function chairPlusMap(Collection $hairdressers): array
    {
        $ids = $hairdressers->pluck('id')->all();
        if (empty($ids)) return [];

        $now = now();
        $map = [];

        foreach ($hairdressers as $h) {
            if ($h->chair_plus_until && $now->lt($h->chair_plus_until)) $map[$h->id] = true;
        }

        $remaining = array_diff($ids, array_keys($map));
        if (!empty($remaining)) {
            Subscription::whereIn('hairdresser_profile_id', $remaining)
                ->where('plan', 'chair_plus')
                ->whereIn('status', ['trialing', 'active', 'past_due'])
                ->get()
                ->groupBy('hairdresser_profile_id')
                ->each(function ($subs, $hid) use (&$map) {
                    if ($subs->first(fn ($s) => $s->coversToday())) $map[$hid] = true;
                });
        }

        $salonIds = $hairdressers->pluck('salon_id')->filter()->unique()->all();
        if (!empty($salonIds)) {
            $businessSalonIds = Subscription::whereIn('salon_id', $salonIds)
                ->where('plan', 'chair_business')
                ->whereIn('status', ['trialing', 'active', 'past_due'])
                ->get()
                ->groupBy('salon_id')
                ->filter(fn ($subs) => $subs->first(fn ($s) => $s->coversToday()))
                ->keys();
            foreach ($hairdressers as $h) {
                if ($h->salon_id && $businessSalonIds->contains($h->salon_id)) $map[$h->id] = true;
            }
        }

        return $map;
    }
}
