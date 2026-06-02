<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HairdresserProfile;
use App\Models\Specialty;
use App\Models\Service;

class SearchController extends Controller
{
    // Région/département → villes (référencement géographique)
    private static $geoMap = [
        'alsace'                       => ['Strasbourg', 'Mulhouse', 'Colmar', 'Haguenau', 'Illkirch-Graffenstaden', 'Obernai', 'Sélestat', 'Saverne', 'Schiltigheim'],
        'bas-rhin'                     => ['Strasbourg', 'Haguenau', 'Illkirch-Graffenstaden', 'Obernai', 'Sélestat', 'Saverne', 'Schiltigheim', 'Bischwiller'],
        'haut-rhin'                    => ['Mulhouse', 'Colmar', 'Cernay', 'Guebwiller', 'Ribeauvillé', 'Thann', 'Saint-Louis', 'Wittelsheim'],
        'grand est'                    => ['Strasbourg', 'Reims', 'Metz', 'Nancy', 'Mulhouse', 'Colmar', 'Troyes', 'Épinal', 'Haguenau'],
        'île-de-france'                => ['Paris', 'Versailles', 'Boulogne-Billancourt', 'Saint-Denis', 'Montreuil', 'Vincennes', 'Créteil', 'Nanterre'],
        'paris'                        => ['Paris'],
        'hauts-de-seine'               => ['Boulogne-Billancourt', 'Nanterre', 'Rueil-Malmaison', 'Colombes', 'Issy-les-Moulineaux'],
        'seine-saint-denis'            => ['Saint-Denis', 'Montreuil', 'Aubervilliers', 'Noisy-le-Grand', 'Pantin'],
        'val-de-marne'                 => ['Créteil', 'Vincennes', 'Vitry-sur-Seine', 'Ivry-sur-Seine'],
        'rhône'                        => ['Lyon', 'Villeurbanne', 'Bron', 'Vénissieux', 'Décines-Charpieu', 'Caluire-et-Cuire'],
        'auvergne-rhône-alpes'         => ['Lyon', 'Grenoble', 'Clermont-Ferrand', 'Saint-Étienne', 'Annecy', 'Chambéry'],
        "provence-alpes-côte d'azur"  => ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence', 'Avignon', 'Cannes', 'Antibes'],
        'bouches-du-rhône'             => ['Marseille', 'Aix-en-Provence', 'Arles', 'Aubagne', 'Martigues'],
        'alpes-maritimes'              => ['Nice', 'Cannes', 'Antibes', 'Grasse', 'Menton', 'Cagnes-sur-Mer'],
        'nord'                         => ['Lille', 'Roubaix', 'Tourcoing', 'Dunkerque', 'Valenciennes'],
        'hauts-de-france'              => ['Lille', 'Roubaix', 'Tourcoing', 'Amiens', 'Dunkerque', 'Lens'],
        'nouvelle-aquitaine'           => ['Bordeaux', 'Limoges', 'Poitiers', 'Pau', 'Bayonne', 'Angoulême'],
        'gironde'                      => ['Bordeaux', 'Mérignac', 'Pessac', 'Talence', "Villenave-d'Ornon"],
        'occitanie'                    => ['Toulouse', 'Montpellier', 'Nîmes', 'Narbonne', 'Perpignan', 'Béziers'],
        'haute-garonne'                => ['Toulouse', 'Colomiers', 'Tournefeuille', 'Muret', 'Balma'],
        'hérault'                      => ['Montpellier', 'Sète', 'Béziers', 'Agde', 'Lunel'],
        'bretagne'                     => ['Rennes', 'Brest', 'Quimper', 'Lorient', 'Vannes', 'Saint-Malo'],
        'pays de la loire'             => ['Nantes', 'Angers', 'Le Mans', 'Saint-Nazaire', 'La Roche-sur-Yon'],
        'normandie'                    => ['Rouen', 'Caen', 'Le Havre', 'Cherbourg', 'Alençon', 'Évreux'],
        'centre-val de loire'          => ['Orléans', 'Tours', 'Bourges', 'Blois', 'Chartres'],
        'bourgogne-franche-comté'      => ['Dijon', 'Besançon', 'Belfort', 'Auxerre', 'Mâcon'],
        'corse'                        => ['Ajaccio', 'Bastia', 'Porto-Vecchio', 'Corte'],
    ];

    /**
     * GET /api/search
     * Recherche full-text multi-champs avec score de pertinence.
     * Params : q, city, specialty, min_rating, page, per_page
     */
    public function search(Request $request)
    {
        $q         = trim($request->get('q', ''));
        $city      = trim($request->get('city', ''));
        $specialty = $request->get('specialty', '');
        $minRating = (float) $request->get('min_rating', 0);
        $perPage   = min((int) $request->get('per_page', 20), 50);
        $page      = max(1, (int) $request->get('page', 1));
        $lat       = $request->has('lat') && $request->lat !== '' ? (float) $request->lat : null;
        $lng       = $request->has('lng') && $request->lng !== '' ? (float) $request->lng : null;
        $radius    = ($request->has('radius') && $request->radius !== '') ? (float) $request->radius : null;

        $query = HairdresserProfile::with([
            'user',
            'specialties',
            'services.category',
            'posts',
            'salon',
        ]);

        // Filtres durs (SQL) — réduit le jeu avant scoring PHP
        if ($specialty) {
            $query->whereHas('specialties', fn($q2) => $q2->where('slug', $specialty));
        }

        // Filtre ville SQL uniquement si pas de recherche libre (sinon géré côté scoring)
        if ($city && !$q) {
            $query->where('city', 'LIKE', "%{$city}%");
        }

        if ($minRating > 0) {
            $query->where(function ($q2) use ($minRating) {
                $q2->where('reviews_count', '>', 0)->where('avg_rating', '>=', $minRating);
            });
        }

        $hairdressers = $query->get();

        if ($q) {
            $tokens      = $this->tokenize($q);
            $expandedGeo = $this->expandGeo($q);

            $hairdressers = $hairdressers
                ->map(function ($h) use ($tokens, $expandedGeo) {
                    $h->_score = $this->scoreHairdresser($h, $tokens, $expandedGeo);
                    return $h;
                })
                ->filter(function ($h) use ($city, $minRating) {
                    if ($h->_score <= 0) return false;
                    if ($city && stripos($h->city ?? '', $city) === false) return false;
                    if ($minRating > 0 && ($h->reviews_count === 0 || floatval($h->avg_rating) < $minRating)) return false;
                    return true;
                })
                ->sortByDesc('_score')
                ->values();
        } else {
            $hairdressers = $hairdressers
                ->map(function ($h) {
                    $h->_score = $this->socialScore($h);
                    return $h;
                })
                ->sortByDesc('_score')
                ->values();
        }

        // Filtre géographique : si lat/lng/radius fournis, exclure les coiffeurs hors rayon
        if ($lat !== null && $lng !== null) {
            $hairdressers = $hairdressers->map(function ($h) use ($lat, $lng) {
                if ($h->latitude && $h->longitude) {
                    $h->_distance_km = $this->haversineDistance($lat, $lng, (float) $h->latitude, (float) $h->longitude);
                } else {
                    $h->_distance_km = null;
                }
                return $h;
            });

            if ($radius !== null) {
                $hairdressers = $hairdressers->filter(function ($h) use ($radius) {
                    // Exclure si pas de coords ou au-delà du rayon
                    return $h->_distance_km !== null && $h->_distance_km <= $radius;
                })->values();
            }
        }

        $total  = $hairdressers->count();
        $offset = ($page - 1) * $perPage;
        $items  = $hairdressers->slice($offset, $perPage)->values();

        // Expose distance_km et nettoie les champs internes
        $items->each(function ($h) {
            if (isset($h->_distance_km) && $h->_distance_km !== null) {
                $h->distance_km = round($h->_distance_km, 1);
            }
            unset($h->_score, $h->_distance_km);
        });

        return response()->json([
            'data'         => $items,
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
        ]);
    }

    /**
     * GET /api/search/suggestions?q=...
     * Autocomplétion intelligente avec détection d'intention.
     * Priorité : service → ville → nom → région selon ce qui correspond le mieux.
     */
    public function suggestions(Request $request)
    {
        $q = trim($request->get('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $qLow = mb_strtolower($q);

        // ── Collecte des candidats ──────────────────────────────────────────

        // Spécialités (correspondance début de mot en priorité)
        $specialtiesExact = Specialty::where('is_active', true)
            ->whereRaw('LOWER(name) LIKE ?', [$qLow . '%'])
            ->orderBy('name')->limit(4)->get();

        $specialtiesPartial = Specialty::where('is_active', true)
            ->whereRaw('LOWER(name) LIKE ?', ['% ' . $qLow . '%'])
            ->whereNotIn('id', $specialtiesExact->pluck('id'))
            ->orderBy('name')->limit(2)->get();

        $allSpecialties = $specialtiesExact->merge($specialtiesPartial);

        // Noms de coiffeurs
        $profiles = HairdresserProfile::with('user')
            ->whereHas('user', fn($q2) => $q2->whereRaw('LOWER(name) LIKE ?', ["%{$qLow}%"]))
            ->limit(3)->get();

        // Villes (début de mot en priorité)
        $citiesExact = HairdresserProfile::whereNotNull('city')
            ->whereRaw('LOWER(city) LIKE ?', [$qLow . '%'])
            ->select('city')->distinct()->orderBy('city')->limit(3)->pluck('city');

        $citiesPartial = HairdresserProfile::whereNotNull('city')
            ->whereRaw('LOWER(city) LIKE ?', ['%' . $qLow . '%'])
            ->whereRaw('LOWER(city) NOT LIKE ?', [$qLow . '%'])
            ->select('city')->distinct()->orderBy('city')->limit(2)->pluck('city');

        $allCities = $citiesExact->merge($citiesPartial)->unique()->values();

        // Zones géographiques
        $geoMatches = [];
        foreach (self::$geoMap as $key => $keyCities) {
            $keyLow = mb_strtolower($key);
            // Priorité : début de mot
            if (str_starts_with($keyLow, $qLow)) {
                array_unshift($geoMatches, ['label' => ucwords($key), 'value' => ucwords($key), 'priority' => 0]);
            } elseif (str_contains($keyLow, $qLow)) {
                $geoMatches[] = ['label' => ucwords($key), 'value' => ucwords($key), 'priority' => 1];
            }
            if (count($geoMatches) >= 3) break;
        }

        // Services créés par les coiffeurs
        $serviceNames = Service::where('is_active', true)
            ->whereRaw('LOWER(name) LIKE ?', ["%{$qLow}%"])
            ->select('name')->distinct()->limit(2)->pluck('name');

        // ── Détection d'intention ───────────────────────────────────────────
        $intent = $this->detectIntent($qLow, $allSpecialties, $allCities, $profiles, $geoMatches);

        // ── Construction ordonnée selon l'intention ─────────────────────────
        $groups = [
            'specialty'   => [],
            'hairdresser' => [],
            'city'        => [],
            'location'    => [],
            'service'     => [],
        ];

        foreach ($allSpecialties as $s) {
            $groups['specialty'][] = ['type' => 'specialty', 'label' => $s->name, 'value' => $s->name, 'slug' => $s->slug];
        }
        foreach ($profiles as $h) {
            $groups['hairdresser'][] = ['type' => 'hairdresser', 'label' => $h->user->name, 'value' => $h->user->name, 'slug' => $h->slug];
        }
        foreach ($allCities as $city) {
            $groups['city'][] = ['type' => 'city', 'label' => $city, 'value' => $city];
        }
        foreach ($geoMatches as $g) {
            $groups['location'][] = ['type' => 'location', 'label' => $g['label'], 'value' => $g['value']];
        }
        foreach ($serviceNames as $sn) {
            $groups['service'][] = ['type' => 'service', 'label' => $sn, 'value' => $sn];
        }

        // Ordre selon l'intention détectée
        $order = $this->orderByIntent($intent);

        $suggestions = [];
        foreach ($order as $groupKey) {
            foreach ($groups[$groupKey] as $item) {
                $suggestions[] = $item;
                if (count($suggestions) >= 7) break 2;
            }
        }

        return response()->json(['suggestions' => $suggestions, 'intent' => $intent]);
    }

    /**
     * Détecte l'intention de l'utilisateur d'après la correspondance des candidats.
     */
    private function detectIntent(string $qLow, $specialties, $cities, $profiles, array $geoMatches): string
    {
        // Si au moins une spécialité commence exactement par la requête → intention service
        $specialtyStartMatch = $specialties->first(fn($s) => str_starts_with(mb_strtolower($s->name), $qLow));
        if ($specialtyStartMatch) return 'specialty';

        // Si au moins une ville commence exactement par la requête → intention ville
        $cityStartMatch = $cities->first(fn($c) => str_starts_with(mb_strtolower($c), $qLow));
        if ($cityStartMatch) return 'city';

        // Si une zone géo correspond exactement en début → intention région
        $geoStartMatch = array_filter($geoMatches, fn($g) => ($g['priority'] ?? 1) === 0);
        if (!empty($geoStartMatch)) return 'location';

        // Si un coiffeur correspond → intention nom
        if ($profiles->isNotEmpty()) return 'hairdresser';

        // Sinon : service en fallback si au moins une spécialité match (partiel)
        if ($specialties->isNotEmpty()) return 'specialty';

        // Ville partielle
        if ($cities->isNotEmpty()) return 'city';

        return 'general';
    }

    /**
     * Retourne l'ordre des groupes de suggestions selon l'intention.
     */
    private function orderByIntent(string $intent): array
    {
        return match($intent) {
            'specialty'   => ['specialty', 'service', 'hairdresser', 'city', 'location'],
            'city'        => ['city', 'location', 'specialty', 'hairdresser', 'service'],
            'location'    => ['location', 'city', 'specialty', 'hairdresser', 'service'],
            'hairdresser' => ['hairdresser', 'specialty', 'city', 'location', 'service'],
            default       => ['specialty', 'hairdresser', 'city', 'location', 'service'],
        };
    }

    // ─── Helpers privés ───────────────────────────────────────────────────────

    private function tokenize(string $q): array
    {
        $q = mb_strtolower($q);
        $words = preg_split('/[\s\-_\/,;]+/', $q);
        return array_values(array_filter($words, fn($w) => mb_strlen($w) >= 2));
    }

    private function expandGeo(string $q): array
    {
        $qLow = mb_strtolower($q);
        $cities = [];
        foreach (self::$geoMap as $key => $keyCities) {
            $keyLow = mb_strtolower($key);
            if (str_contains($qLow, $keyLow) || str_contains($keyLow, $qLow)) {
                $cities = array_merge($cities, $keyCities);
            }
        }
        return array_unique($cities);
    }

    private function scoreHairdresser($h, array $tokens, array $expandedGeo): int
    {
        $score = 0;

        $name    = mb_strtolower($h->user->name ?? '');
        $tagline = mb_strtolower($h->tagline ?? '');
        $bio     = mb_strtolower($h->bio ?? '');
        $city    = mb_strtolower($h->city ?? '');
        // Nom du salon (référencement "Chez Koehler Coiffeur")
        $salonName = $h->salon ? mb_strtolower($h->salon->name ?? '') : '';

        foreach ($tokens as $token) {
            // Champs du profil
            if (str_contains($name, $token))      $score += 15;
            if (str_contains($tagline, $token))   $score += 10;
            if (str_contains($bio, $token))       $score += 8;
            if (str_contains($city, $token))      $score += 12;
            if ($salonName && str_contains($salonName, $token)) $score += 10;

            // Spécialités (signal fort)
            foreach ($h->specialties as $sp) {
                $spName = mb_strtolower($sp->name);
                if (str_contains($spName, $token))  $score += 12;
                if ($token !== $spName && str_contains($token, $spName)) $score += 5;
            }

            // Services — signal principal du référencement (même poids pour indépendants et salons)
            foreach ($h->services as $sv) {
                $svName  = mb_strtolower($sv->name ?? '');
                $svDesc  = mb_strtolower($sv->description ?? '');
                $catName = $sv->category ? mb_strtolower($sv->category->name ?? '') : '';
                $catDesc = $sv->category ? mb_strtolower($sv->category->description ?? '') : '';

                if (str_contains($svName, $token))  $score += 14;
                if (str_contains($svDesc, $token))  $score += 7;
                if (str_contains($catName, $token)) $score += 11;
                if (str_contains($catDesc, $token)) $score += 5;
            }

            // Descriptions de réalisations
            foreach ($h->posts as $post) {
                $postDesc = mb_strtolower($post->description ?? '');
                if (str_contains($postDesc, $token)) $score += 4;
            }
        }

        // Expansion géographique (région/dept saisi → villes correspondantes en base)
        if (!empty($expandedGeo) && $h->city) {
            foreach ($expandedGeo as $expCity) {
                if (
                    stripos($h->city, $expCity) !== false ||
                    stripos($expCity, $h->city) !== false
                ) {
                    $score += 10;
                    break;
                }
            }
        }

        // Signaux sociaux (ajoutés uniquement si un match textuel existe)
        if ($score > 0) {
            $score += $this->socialScore($h);
        }

        return $score;
    }

    private function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function socialScore($h): int
    {
        $score  = (int) (floatval($h->avg_rating) * 3);         // 0–15
        $score += (int) (min($h->followers_count, 1000) / 40);  // 0–25
        $score += (int) (min($h->visits_count, 500) / 50);      // 0–10
        $score += ($h->reviews_count > 0) ? 3 : 0;
        $score += ($h->is_verified) ? 5 : 0;
        return $score;
    }
}
