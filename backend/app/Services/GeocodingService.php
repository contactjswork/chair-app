<?php

namespace App\Services;

/**
 * Géocodage local de villes françaises.
 *
 * Priorité :  dictionnaire local  →  (Nominatim en V2)
 *
 * Usage :
 *   GeocodingService::geocode('Haguenau')
 *   → ['lat' => 48.8161, 'lng' => 7.79, 'display' => 'Haguenau', 'source' => 'local']
 *
 *   GeocodingService::geocode('Ville inconnue')
 *   → null
 */
class GeocodingService
{
    /**
     * Dictionnaire ville normalisée → [lat, lng, affichage].
     * Les clés sont déjà normalisées (minuscules, sans accent, sans tiret superflu).
     */
    private static array $dict = [

        // ── Alsace / Bas-Rhin ────────────────────────────────────────────────
        'haguenau'                    => [48.8161,  7.7900, 'Haguenau'],
        'marienthal'                  => [48.7970,  7.8310, 'Marienthal'],   // commune de Haguenau
        'bischwiller'                 => [48.7700,  7.8556, 'Bischwiller'],
        'schweighouse sur moder'      => [48.8297,  7.7411, 'Schweighouse-sur-Moder'],
        'schweighouse-sur-moder'      => [48.8297,  7.7411, 'Schweighouse-sur-Moder'],
        'brumath'                     => [48.7308,  7.7106, 'Brumath'],
        'soufflenheim'                => [48.8322,  7.9789, 'Soufflenheim'],
        'niederbronn les bains'       => [48.9494,  7.6494, 'Niederbronn-les-Bains'],
        'niederbronn-les-bains'       => [48.9494,  7.6494, 'Niederbronn-les-Bains'],
        'wissembourg'                 => [49.0353,  7.9440, 'Wissembourg'],
        'saverne'                     => [48.7411,  7.3644, 'Saverne'],
        'strasbourg'                  => [48.5734,  7.7521, 'Strasbourg'],
        'schiltigheim'                => [48.6056,  7.7477, 'Schiltigheim'],
        'illkirch graffenstaden'      => [48.5200,  7.7233, 'Illkirch-Graffenstaden'],
        'illkirch-graffenstaden'      => [48.5200,  7.7233, 'Illkirch-Graffenstaden'],
        'obernai'                     => [48.4636,  7.4817, 'Obernai'],
        'selestat'                    => [48.2597,  7.4522, 'Sélestat'],
        'bischheim'                   => [48.6186,  7.7475, 'Bischheim'],
        'lingolsheim'                 => [48.5536,  7.6900, 'Lingolsheim'],
        'ostwald'                     => [48.5286,  7.7111, 'Ostwald'],
        'hoenheim'                    => [48.6258,  7.7564, 'Hoenheim'],
        'vendenheim'                  => [48.6678,  7.7161, 'Vendenheim'],
        'truchtersheim'               => [48.6581,  7.6239, 'Truchtersheim'],
        'erstein'                     => [48.4228,  7.6589, 'Erstein'],
        'benfeld'                     => [48.3711,  7.5889, 'Benfeld'],
        'molsheim'                    => [48.5403,  7.4928, 'Molsheim'],
        'mutzig'                      => [48.5386,  7.4572, 'Mutzig'],
        'wasselonne'                  => [48.6378,  7.4428, 'Wasselonne'],
        'wingen sur moder'            => [48.9231,  7.3822, 'Wingen-sur-Moder'],
        'ingwiller'                   => [48.8731,  7.4703, 'Ingwiller'],
        'lauterbourg'                 => [48.9731,  8.1822, 'Lauterbourg'],
        'drusenheim'                  => [48.7522,  7.9494, 'Drusenheim'],
        'herrlisheim'                 => [48.7306,  7.9025, 'Herrlisheim'],
        'gambsheim'                   => [48.6972,  7.9197, 'Gambsheim'],
        'reichstett'                  => [48.6447,  7.7733, 'Reichstett'],
        'lampertheim'                 => [48.6353,  7.7272, 'Lampertheim'],

        // ── Alsace / Haut-Rhin ───────────────────────────────────────────────
        'colmar'                      => [48.0794,  7.3580, 'Colmar'],
        'mulhouse'                    => [47.7508,  7.3359, 'Mulhouse'],
        'saint louis'                 => [47.5897,  7.5625, 'Saint-Louis'],
        'saint-louis'                 => [47.5897,  7.5625, 'Saint-Louis'],
        'cernay'                      => [47.8072,  7.1764, 'Cernay'],
        'guebwiller'                  => [47.9097,  7.2133, 'Guebwiller'],
        'ribeauville'                 => [48.1944,  7.3222, 'Ribeauvillé'],
        'thann'                       => [47.8097,  7.1025, 'Thann'],
        'wittelsheim'                 => [47.8008,  7.2428, 'Wittelsheim'],
        'wittenheim'                  => [47.8139,  7.3378, 'Wittenheim'],
        'kingersheim'                 => [47.7867,  7.3264, 'Kingersheim'],
        'riedisheim'                  => [47.7414,  7.3736, 'Riedisheim'],
        'illzach'                     => [47.7764,  7.3536, 'Illzach'],
        'sausheim'                    => [47.7756,  7.3514, 'Sausheim'],
        'rixheim'                     => [47.7308,  7.3847, 'Rixheim'],
        'habsheim'                    => [47.7350,  7.3800, 'Habsheim'],

        // ── Grand Est ────────────────────────────────────────────────────────
        'reims'                       => [49.2583,  4.0317, 'Reims'],
        'metz'                        => [49.1193,  6.1757, 'Metz'],
        'nancy'                       => [48.6921,  6.1844, 'Nancy'],
        'troyes'                      => [48.2973,  4.0744, 'Troyes'],
        'epinal'                      => [48.1736,  6.4514, 'Épinal'],
        'thionville'                  => [49.3581,  6.1681, 'Thionville'],
        'forbach'                     => [49.1867,  6.8994, 'Forbach'],
        'sarreguemines'               => [49.1089,  7.0681, 'Sarreguemines'],
        'saint avold'                 => [49.1022,  6.7028, 'Saint-Avold'],
        'saint-avold'                 => [49.1022,  6.7028, 'Saint-Avold'],

        // ── Île-de-France ─────────────────────────────────────────────────────
        'paris'                       => [48.8566,  2.3522, 'Paris'],
        'boulogne billancourt'        => [48.8350,  2.2400, 'Boulogne-Billancourt'],
        'boulogne-billancourt'        => [48.8350,  2.2400, 'Boulogne-Billancourt'],
        'saint denis'                 => [48.9362,  2.3574, 'Saint-Denis'],
        'saint-denis'                 => [48.9362,  2.3574, 'Saint-Denis'],
        'montreuil'                   => [48.8634,  2.4424, 'Montreuil'],
        'vincennes'                   => [48.8478,  2.4392, 'Vincennes'],
        'creteil'                     => [48.7773,  2.4561, 'Créteil'],
        'nanterre'                    => [48.8931,  2.2069, 'Nanterre'],
        'versailles'                  => [48.8014,  2.1301, 'Versailles'],
        'argenteuil'                  => [48.9472,  2.2467, 'Argenteuil'],
        'vitry sur seine'             => [48.7875,  2.3922, 'Vitry-sur-Seine'],
        'vitry-sur-seine'             => [48.7875,  2.3922, 'Vitry-sur-Seine'],
        'asnieres sur seine'          => [48.9147,  2.2831, 'Asnières-sur-Seine'],
        'asnieres-sur-seine'          => [48.9147,  2.2831, 'Asnières-sur-Seine'],
        'colombes'                    => [48.9225,  2.2556, 'Colombes'],
        'aubervilliers'               => [48.9136,  2.3828, 'Aubervilliers'],
        'courbevoie'                  => [48.8978,  2.2539, 'Courbevoie'],
        'aulnay sous bois'            => [48.9394,  2.4958, 'Aulnay-sous-Bois'],
        'aulnay-sous-bois'            => [48.9394,  2.4958, 'Aulnay-sous-Bois'],
        'rueil malmaison'             => [48.8782,  2.1878, 'Rueil-Malmaison'],
        'rueil-malmaison'             => [48.8782,  2.1878, 'Rueil-Malmaison'],
        'champigny sur marne'         => [48.8178,  2.5153, 'Champigny-sur-Marne'],
        'champigny-sur-marne'         => [48.8178,  2.5153, 'Champigny-sur-Marne'],
        'issy les moulineaux'         => [48.8233,  2.2714, 'Issy-les-Moulineaux'],
        'issy-les-moulineaux'         => [48.8233,  2.2714, 'Issy-les-Moulineaux'],
        'levallois perret'            => [48.8956,  2.2872, 'Levallois-Perret'],
        'levallois-perret'            => [48.8956,  2.2872, 'Levallois-Perret'],
        'noisy le grand'              => [48.8464,  2.5531, 'Noisy-le-Grand'],
        'noisy-le-grand'              => [48.8464,  2.5531, 'Noisy-le-Grand'],
        'pantin'                      => [48.8956,  2.4022, 'Pantin'],
        'ivry sur seine'              => [48.8089,  2.3839, 'Ivry-sur-Seine'],
        'ivry-sur-seine'              => [48.8089,  2.3839, 'Ivry-sur-Seine'],
        'bondy'                       => [48.9028,  2.4828, 'Bondy'],
        'fontenay sous bois'          => [48.8511,  2.4769, 'Fontenay-sous-Bois'],
        'fontenay-sous-bois'          => [48.8511,  2.4769, 'Fontenay-sous-Bois'],
        'neuilly sur seine'           => [48.8850,  2.2694, 'Neuilly-sur-Seine'],
        'neuilly-sur-seine'           => [48.8850,  2.2694, 'Neuilly-sur-Seine'],

        // ── Rhône-Alpes ───────────────────────────────────────────────────────
        'lyon'                        => [45.7640,  4.8357, 'Lyon'],
        'villeurbanne'                => [45.7716,  4.8897, 'Villeurbanne'],
        'grenoble'                    => [45.1885,  5.7245, 'Grenoble'],
        'saint etienne'               => [45.4397,  4.3872, 'Saint-Étienne'],
        'saint-etienne'               => [45.4397,  4.3872, 'Saint-Étienne'],
        'annecy'                      => [45.8992,  6.1294, 'Annecy'],
        'chambery'                    => [45.5646,  5.9178, 'Chambéry'],
        'valence'                     => [44.9333,  4.8917, 'Valence'],
        'bron'                        => [45.7397,  4.9183, 'Bron'],
        'venissieux'                  => [45.6956,  4.8878, 'Vénissieux'],
        'caluire et cuire'            => [45.7978,  4.8461, 'Caluire-et-Cuire'],
        'caluire-et-cuire'            => [45.7978,  4.8461, 'Caluire-et-Cuire'],
        'cournon d auvergne'          => [45.7261,  3.2108, 'Cournon-d\'Auvergne'],
        'clermont ferrand'            => [45.7772,  3.0870, 'Clermont-Ferrand'],
        'clermont-ferrand'            => [45.7772,  3.0870, 'Clermont-Ferrand'],

        // ── PACA ──────────────────────────────────────────────────────────────
        'marseille'                   => [43.2965,  5.3698, 'Marseille'],
        'nice'                        => [43.7102,  7.2620, 'Nice'],
        'toulon'                      => [43.1242,  5.9280, 'Toulon'],
        'aix en provence'             => [43.5297,  5.4474, 'Aix-en-Provence'],
        'aix-en-provence'             => [43.5297,  5.4474, 'Aix-en-Provence'],
        'avignon'                     => [43.9493,  4.8055, 'Avignon'],
        'cannes'                      => [43.5528,  7.0174, 'Cannes'],
        'antibes'                     => [43.5808,  7.1231, 'Antibes'],
        'grasse'                      => [43.6586,  6.9228, 'Grasse'],
        'menton'                      => [43.7764,  7.5028, 'Menton'],
        'cagnes sur mer'              => [43.6631,  7.1519, 'Cagnes-sur-Mer'],
        'cagnes-sur-mer'              => [43.6631,  7.1519, 'Cagnes-sur-Mer'],
        'aubagne'                     => [43.2928,  5.5703, 'Aubagne'],
        'martigues'                   => [43.4058,  5.0478, 'Martigues'],
        'arles'                       => [43.6767,  4.6278, 'Arles'],

        // ── Occitanie ─────────────────────────────────────────────────────────
        'toulouse'                    => [43.6047,  1.4442, 'Toulouse'],
        'montpellier'                 => [43.6108,  3.8767, 'Montpellier'],
        'nimes'                       => [43.8367,  4.3601, 'Nîmes'],
        'narbonne'                    => [43.1842,  3.0036, 'Narbonne'],
        'perpignan'                   => [42.6886,  2.8948, 'Perpignan'],
        'beziers'                     => [43.3442,  3.2197, 'Béziers'],
        'colomiers'                   => [43.6111,  1.3361, 'Colomiers'],
        'tournefeuille'               => [43.5853,  1.3417, 'Tournefeuille'],
        'sete'                        => [43.4022,  3.6961, 'Sète'],
        'agde'                        => [43.3097,  3.4736, 'Agde'],
        'lunel'                       => [43.6753,  4.1344, 'Lunel'],

        // ── Hauts-de-France ───────────────────────────────────────────────────
        'lille'                       => [50.6292,  3.0573, 'Lille'],
        'roubaix'                     => [50.6942,  3.1746, 'Roubaix'],
        'tourcoing'                   => [50.7233,  3.1603, 'Tourcoing'],
        'dunkerque'                   => [51.0342,  2.3772, 'Dunkerque'],
        'valenciennes'                => [50.3586,  3.5225, 'Valenciennes'],
        'amiens'                      => [49.8942,  2.2958, 'Amiens'],
        'lens'                        => [50.4325,  2.8317, 'Lens'],
        'arras'                       => [50.2908,  2.7794, 'Arras'],
        'calais'                      => [50.9519,  1.8589, 'Calais'],
        'boulogne sur mer'            => [50.7272,  1.6147, 'Boulogne-sur-Mer'],
        'boulogne-sur-mer'            => [50.7272,  1.6147, 'Boulogne-sur-Mer'],

        // ── Normandie ─────────────────────────────────────────────────────────
        'rouen'                       => [49.4431,  1.0993, 'Rouen'],
        'caen'                        => [49.1829, -0.3707, 'Caen'],
        'le havre'                    => [49.4936,  0.1078, 'Le Havre'],
        'le-havre'                    => [49.4936,  0.1078, 'Le Havre'],

        // ── Bretagne ──────────────────────────────────────────────────────────
        'rennes'                      => [48.1173, -1.6778, 'Rennes'],
        'brest'                       => [48.3900, -4.4861, 'Brest'],
        'quimper'                     => [47.9975, -4.0961, 'Quimper'],
        'lorient'                     => [47.7486, -3.3697, 'Lorient'],
        'vannes'                      => [47.6581, -2.7608, 'Vannes'],
        'saint malo'                  => [48.6492, -2.0261, 'Saint-Malo'],
        'saint-malo'                  => [48.6492, -2.0261, 'Saint-Malo'],

        // ── Pays de la Loire ──────────────────────────────────────────────────
        'nantes'                      => [47.2184, -1.5536, 'Nantes'],
        'angers'                      => [47.4784, -0.5632, 'Angers'],
        'le mans'                     => [47.9956,  0.1969, 'Le Mans'],
        'saint nazaire'               => [47.2736, -2.2136, 'Saint-Nazaire'],
        'saint-nazaire'               => [47.2736, -2.2136, 'Saint-Nazaire'],
        'la roche sur yon'            => [46.6700, -1.4264, 'La Roche-sur-Yon'],
        'la-roche-sur-yon'            => [46.6700, -1.4264, 'La Roche-sur-Yon'],

        // ── Centre-Val de Loire ───────────────────────────────────────────────
        'orleans'                     => [47.9029,  1.9039, 'Orléans'],
        'tours'                       => [47.3941,  0.6848, 'Tours'],
        'bourges'                     => [47.0814,  2.3978, 'Bourges'],
        'blois'                       => [47.5862,  1.3311, 'Blois'],
        'chartres'                    => [48.4469,  1.4889, 'Chartres'],

        // ── Nouvelle-Aquitaine ────────────────────────────────────────────────
        'bordeaux'                    => [44.8378, -0.5792, 'Bordeaux'],
        'limoges'                     => [45.8336,  1.2611, 'Limoges'],
        'poitiers'                    => [46.5800,  0.3400, 'Poitiers'],
        'pau'                         => [43.2951, -0.3708, 'Pau'],
        'bayonne'                     => [43.4933, -1.4750, 'Bayonne'],
        'angouleme'                   => [45.6500,  0.1561, 'Angoulême'],
        'merignac'                    => [44.8389, -0.6436, 'Mérignac'],
        'pessac'                      => [44.8061, -0.6306, 'Pessac'],
        'talence'                     => [44.8025, -0.5861, 'Talence'],

        // ── Bourgogne-Franche-Comté ───────────────────────────────────────────
        'dijon'                       => [47.3220,  5.0415, 'Dijon'],
        'besancon'                    => [47.2378,  6.0241, 'Besançon'],
        'belfort'                     => [47.6378,  6.8639, 'Belfort'],
        'auxerre'                     => [47.7994,  3.5675, 'Auxerre'],
        'macon'                       => [46.3069,  4.8317, 'Mâcon'],
        'montbeliard'                 => [47.5100,  6.7978, 'Montbéliard'],

        // ── Corse ─────────────────────────────────────────────────────────────
        'ajaccio'                     => [41.9192,  8.7386, 'Ajaccio'],
        'bastia'                      => [42.7028,  9.4503, 'Bastia'],
    ];

    /**
     * Géocode une ville.
     * Retourne ['lat', 'lng', 'display', 'source'] ou null si inconnue.
     */
    public static function geocode(string $city): ?array
    {
        $key = static::normalize($city);

        // 1. Correspondance exacte
        if (isset(static::$dict[$key])) {
            [$lat, $lng, $display] = static::$dict[$key];
            return compact('lat', 'lng', 'display') + ['source' => 'local'];
        }

        // 2. Correspondance partielle (début de clé)
        foreach (static::$dict as $dictKey => [$lat, $lng, $display]) {
            if (str_starts_with($dictKey, $key) || str_starts_with($key, $dictKey)) {
                return compact('lat', 'lng', 'display') + ['source' => 'local-partial'];
            }
        }

        return null;
    }

    /**
     * Normalise une chaîne pour la comparaison : minuscules, sans accent, trim.
     */
    public static function normalize(string $city): string
    {
        $city = mb_strtolower(trim($city));
        $city = str_replace(
            ['é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'ç', 'œ', 'æ'],
            ['e', 'e', 'e', 'e', 'a', 'a', 'a', 'i', 'i', 'o', 'o', 'u', 'u', 'u', 'c', 'oe', 'ae'],
            $city
        );
        // Supprimer les caractères restants non-ASCII
        $city = preg_replace('/[^\x20-\x7E]/', '', $city);
        // Normaliser les tirets multiples et espaces
        return preg_replace('/\s+/', ' ', trim($city));
    }

    /**
     * Retourne toutes les villes du dictionnaire (pour debug/suggestions).
     */
    public static function getAllCities(): array
    {
        return array_values(array_unique(array_column(static::$dict, 2)));
    }
}
