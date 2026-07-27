<?php

namespace App\Services;

/**
 * Résolution ville → département → région à partir du code postal, pour les
 * classements géographiques (voir docs/REPUTATION_ARCHITECTURE.md — section
 * classements). Pas de nouvelle colonne DB : le département/la région sont
 * toujours dérivés à la volée du `postal_code` déjà stocké.
 */
class GeoLookupService
{
    // Code département (2 premiers chiffres du code postal) => [nom, région officielle 2016]
    const DEPARTMENTS = [
        '01' => ['Ain', 'Auvergne-Rhône-Alpes'],
        '02' => ['Aisne', 'Hauts-de-France'],
        '03' => ['Allier', 'Auvergne-Rhône-Alpes'],
        '04' => ['Alpes-de-Haute-Provence', "Provence-Alpes-Côte d'Azur"],
        '05' => ['Hautes-Alpes', "Provence-Alpes-Côte d'Azur"],
        '06' => ['Alpes-Maritimes', "Provence-Alpes-Côte d'Azur"],
        '07' => ['Ardèche', 'Auvergne-Rhône-Alpes'],
        '08' => ['Ardennes', 'Grand Est'],
        '09' => ['Ariège', 'Occitanie'],
        '10' => ['Aube', 'Grand Est'],
        '11' => ['Aude', 'Occitanie'],
        '12' => ['Aveyron', 'Occitanie'],
        '13' => ['Bouches-du-Rhône', "Provence-Alpes-Côte d'Azur"],
        '14' => ['Calvados', 'Normandie'],
        '15' => ['Cantal', 'Auvergne-Rhône-Alpes'],
        '16' => ['Charente', 'Nouvelle-Aquitaine'],
        '17' => ['Charente-Maritime', 'Nouvelle-Aquitaine'],
        '18' => ['Cher', 'Centre-Val de Loire'],
        '19' => ['Corrèze', 'Nouvelle-Aquitaine'],
        '21' => ["Côte-d'Or", 'Bourgogne-Franche-Comté'],
        '22' => ["Côtes-d'Armor", 'Bretagne'],
        '23' => ['Creuse', 'Nouvelle-Aquitaine'],
        '24' => ['Dordogne', 'Nouvelle-Aquitaine'],
        '25' => ['Doubs', 'Bourgogne-Franche-Comté'],
        '26' => ['Drôme', 'Auvergne-Rhône-Alpes'],
        '27' => ['Eure', 'Normandie'],
        '28' => ['Eure-et-Loir', 'Centre-Val de Loire'],
        '29' => ['Finistère', 'Bretagne'],
        '30' => ['Gard', 'Occitanie'],
        '31' => ['Haute-Garonne', 'Occitanie'],
        '32' => ['Gers', 'Occitanie'],
        '33' => ['Gironde', 'Nouvelle-Aquitaine'],
        '34' => ['Hérault', 'Occitanie'],
        '35' => ['Ille-et-Vilaine', 'Bretagne'],
        '36' => ['Indre', 'Centre-Val de Loire'],
        '37' => ['Indre-et-Loire', 'Centre-Val de Loire'],
        '38' => ['Isère', 'Auvergne-Rhône-Alpes'],
        '39' => ['Jura', 'Bourgogne-Franche-Comté'],
        '40' => ['Landes', 'Nouvelle-Aquitaine'],
        '41' => ['Loir-et-Cher', 'Centre-Val de Loire'],
        '42' => ['Loire', 'Auvergne-Rhône-Alpes'],
        '43' => ['Haute-Loire', 'Auvergne-Rhône-Alpes'],
        '44' => ['Loire-Atlantique', 'Pays de la Loire'],
        '45' => ['Loiret', 'Centre-Val de Loire'],
        '46' => ['Lot', 'Occitanie'],
        '47' => ['Lot-et-Garonne', 'Nouvelle-Aquitaine'],
        '48' => ['Lozère', 'Occitanie'],
        '49' => ['Maine-et-Loire', 'Pays de la Loire'],
        '50' => ['Manche', 'Normandie'],
        '51' => ['Marne', 'Grand Est'],
        '52' => ['Haute-Marne', 'Grand Est'],
        '53' => ['Mayenne', 'Pays de la Loire'],
        '54' => ['Meurthe-et-Moselle', 'Grand Est'],
        '55' => ['Meuse', 'Grand Est'],
        '56' => ['Morbihan', 'Bretagne'],
        '57' => ['Moselle', 'Grand Est'],
        '58' => ['Nièvre', 'Bourgogne-Franche-Comté'],
        '59' => ['Nord', 'Hauts-de-France'],
        '60' => ['Oise', 'Hauts-de-France'],
        '61' => ['Orne', 'Normandie'],
        '62' => ['Pas-de-Calais', 'Hauts-de-France'],
        '63' => ['Puy-de-Dôme', 'Auvergne-Rhône-Alpes'],
        '64' => ['Pyrénées-Atlantiques', 'Nouvelle-Aquitaine'],
        '65' => ['Hautes-Pyrénées', 'Occitanie'],
        '66' => ['Pyrénées-Orientales', 'Occitanie'],
        '67' => ['Bas-Rhin', 'Grand Est'],
        '68' => ['Haut-Rhin', 'Grand Est'],
        '69' => ['Rhône', 'Auvergne-Rhône-Alpes'],
        '70' => ['Haute-Saône', 'Bourgogne-Franche-Comté'],
        '71' => ['Saône-et-Loire', 'Bourgogne-Franche-Comté'],
        '72' => ['Sarthe', 'Pays de la Loire'],
        '73' => ['Savoie', 'Auvergne-Rhône-Alpes'],
        '74' => ['Haute-Savoie', 'Auvergne-Rhône-Alpes'],
        '75' => ['Paris', 'Île-de-France'],
        '76' => ['Seine-Maritime', 'Normandie'],
        '77' => ['Seine-et-Marne', 'Île-de-France'],
        '78' => ['Yvelines', 'Île-de-France'],
        '79' => ['Deux-Sèvres', 'Nouvelle-Aquitaine'],
        '80' => ['Somme', 'Hauts-de-France'],
        '81' => ['Tarn', 'Occitanie'],
        '82' => ['Tarn-et-Garonne', 'Occitanie'],
        '83' => ['Var', "Provence-Alpes-Côte d'Azur"],
        '84' => ['Vaucluse', "Provence-Alpes-Côte d'Azur"],
        '85' => ['Vendée', 'Pays de la Loire'],
        '86' => ['Vienne', 'Nouvelle-Aquitaine'],
        '87' => ['Haute-Vienne', 'Nouvelle-Aquitaine'],
        '88' => ['Vosges', 'Grand Est'],
        '89' => ['Yonne', 'Bourgogne-Franche-Comté'],
        '90' => ['Territoire de Belfort', 'Bourgogne-Franche-Comté'],
        '91' => ['Essonne', 'Île-de-France'],
        '92' => ['Hauts-de-Seine', 'Île-de-France'],
        '93' => ['Seine-Saint-Denis', 'Île-de-France'],
        '94' => ['Val-de-Marne', 'Île-de-France'],
        '95' => ["Val-d'Oise", 'Île-de-France'],
        '2A' => ['Corse-du-Sud', 'Corse'],
        '2B' => ['Haute-Corse', 'Corse'],
    ];

    // Anciennes provinces/régions (avant 2016) encore utilisées dans le langage
    // courant — ex. "Alsace" pour un coiffeur à Haguenau ou Strasbourg. Résolu
    // en priorité sur le nom de région officiel.
    const REGION_ALIASES = [
        'alsace'              => ['67', '68'],
        'lorraine'             => ['54', '55', '57', '88'],
        'champagne-ardenne'    => ['08', '10', '51', '52'],
        'nord-pas-de-calais'   => ['59', '62'],
        'picardie'             => ['02', '60', '80'],
        'bourgogne'            => ['21', '58', '71', '89'],
        'franche-comté'        => ['25', '39', '70', '90'],
        'auvergne'             => ['03', '15', '43', '63'],
        'rhône-alpes'          => ['01', '07', '26', '38', '42', '69', '73', '74'],
        'languedoc-roussillon' => ['11', '30', '34', '48', '66'],
        'midi-pyrénées'        => ['09', '12', '31', '32', '46', '65', '81', '82'],
        'aquitaine'            => ['24', '33', '40', '47', '64'],
        'poitou-charentes'     => ['16', '17', '79', '86'],
        'limousin'             => ['19', '23', '87'],
        'basse-normandie'      => ['14', '50', '61'],
        'haute-normandie'      => ['27', '76'],
    ];

    public static function departmentCodeFromPostal(?string $postalCode): ?string
    {
        if (!$postalCode || strlen($postalCode) < 2) return null;
        $prefix = substr($postalCode, 0, 2);
        // Corse : 20xxx se répartit entre 2A/2B, pas déductible du CP seul —
        // approximé sur 2A (Ajaccio), rare cas en pratique pour CHAIR aujourd'hui.
        if ($prefix === '20') return '2A';
        return isset(self::DEPARTMENTS[$prefix]) ? $prefix : null;
    }

    public static function departmentName(?string $postalCode): ?string
    {
        $code = self::departmentCodeFromPostal($postalCode);
        return $code ? self::DEPARTMENTS[$code][0] : null;
    }

    public static function regionName(?string $postalCode): ?string
    {
        $code = self::departmentCodeFromPostal($postalCode);
        return $code ? self::DEPARTMENTS[$code][1] : null;
    }

    /**
     * Département codes couvrant une valeur "department" fournie par
     * l'utilisateur — accepte le code (ex: "67") ou le nom (ex: "Bas-Rhin").
     */
    public static function departmentCodesFor(string $value): array
    {
        $value = trim($value);
        if (isset(self::DEPARTMENTS[strtoupper($value)])) return [strtoupper($value)];

        $needle = mb_strtolower($value);
        foreach (self::DEPARTMENTS as $code => [$name, ]) {
            // PHP caste les clés de tableau numériques ("67") en int — on force
            // la comparaison/le retour en string pour matcher
            // departmentCodeFromPostal(), qui renvoie toujours une string.
            if (mb_strtolower($name) === $needle) return [(string) $code];
        }
        return [];
    }

    /**
     * Département codes couvrant une valeur "region" fournie par
     * l'utilisateur — accepte le nom officiel (ex: "Grand Est") ou un alias
     * historique (ex: "Alsace").
     */
    public static function departmentCodesForRegion(string $value): array
    {
        $needle = mb_strtolower(trim($value));
        if (isset(self::REGION_ALIASES[$needle])) return self::REGION_ALIASES[$needle];

        $codes = [];
        foreach (self::DEPARTMENTS as $code => [, $region]) {
            if (mb_strtolower($region) === $needle) $codes[] = (string) $code;
        }
        return $codes;
    }

    /**
     * Liste des régions officielles 2016, triée alphabétiquement — source
     * pour le sélecteur en cascade Région → Département de l'inscription.
     */
    public static function allRegions(): array
    {
        $regions = [];
        foreach (self::DEPARTMENTS as [, $region]) {
            $regions[$region] = true;
        }
        $names = array_keys($regions);
        sort($names, SORT_STRING | SORT_FLAG_CASE);
        return $names;
    }

    /**
     * Départements {code, name} d'une région donnée, triés par nom — pour le
     * sélecteur en cascade une fois la région choisie.
     */
    public static function departmentsForRegion(string $region): array
    {
        $needle = mb_strtolower(trim($region));
        $out = [];
        foreach (self::DEPARTMENTS as $code => [$name, $regionName]) {
            if (mb_strtolower($regionName) === $needle) {
                $out[] = ['code' => (string) $code, 'name' => $name];
            }
        }
        usort($out, fn($a, $b) => strcasecmp($a['name'], $b['name']));
        return $out;
    }
}
