<?php

namespace App\Services;

/**
 * Filtrage du contenu au dépôt.
 *
 * App Store Review Guideline 1.2 exige d'une app à contenu généré par les
 * utilisateurs « a method for filtering objectionable material from being
 * posted to the app » — c'est-à-dire un contrôle AVANT publication, distinct
 * du signalement (qui, lui, agit après coup).
 *
 * Ce que fait ce filtre, et ce qu'il ne fait pas — à dire tel quel dans les
 * notes de review, sans le survendre :
 *   - il refuse les insultes et termes haineux les plus explicites en
 *     français et en anglais, y compris quand ils sont maquillés (espaces,
 *     points, chiffres à la place des lettres : « c*o-n-n4rd ») ;
 *   - il refuse les coordonnées personnelles en clair (e-mail, téléphone,
 *     URL), qui sont le vecteur habituel du spam et du démarchage sur une
 *     place de marché ;
 *   - il ne prétend PAS comprendre le contexte, ni détecter le harcèlement
 *     implicite, ni analyser les images. Ces cas relèvent du signalement et
 *     de la modération humaine (ReportController + back-office admin).
 *
 * Choix délibéré : la correspondance se fait sur des mots entiers après
 * normalisation. Un filtre par sous-chaîne produirait des faux positifs
 * absurdes sur un vocabulaire de coiffure (« bordure », « pénétrant »,
 * « queue de cheval »), et rien n'est plus nuisible qu'un filtre qui bloque
 * un avis légitime.
 */
class ContentFilter
{
    /**
     * Termes refusés. Volontairement court et sans ambiguïté : chaque entrée
     * doit être indéfendable dans un avis de coiffure ou une légende de
     * réalisation. Les variantes (pluriel, féminin) sont couvertes par le
     * suffixe optionnel appliqué à la construction du motif.
     */
    private const BLOCKED = [
        // Insultes françaises explicites
        'connard', 'connasse', 'enculé', 'encule', 'salope', 'pute', 'putain',
        'batard', 'ducon', 'enfoire', 'fdp', 'ntm', 'tapette',
        // Termes haineux / discriminatoires
        'bougnoule', 'negro', 'negre', 'youpin', 'pede', 'pedale', 'gouine',
        'nigger', 'faggot', 'chinetoque', 'raton',
        // Insultes anglaises explicites
        'fuck', 'fucking', 'motherfucker', 'cunt', 'whore', 'bitch',
    ];

    /** Motifs de coordonnées personnelles en clair. */
    private const CONTACT_PATTERNS = [
        // E-mail
        '/[\w.+-]+@[\w-]+\.[\w.]{2,}/u',
        // Téléphone français, avec ou sans séparateurs
        '/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}/u',
        // URL explicite (http(s):// ou www.)
        '/(?:https?:\/\/|www\.)\S+/iu',
    ];

    /**
     * Normalise le texte pour déjouer les maquillages courants :
     * accents retirés, chiffres et symboles remplacés par la lettre qu'ils
     * imitent, puis répétitions et séparateurs internes écrasés.
     */
    private static function normalize(string $text): string
    {
        $t = mb_strtolower($text, 'UTF-8');

        // Translittération des accents sans dépendre de l'extension intl.
        $t = strtr($t, [
            'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a',
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c', 'ñ' => 'n', 'ÿ' => 'y',
        ]);

        // Substitutions « leet » les plus répandues.
        $t = strtr($t, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '@' => 'a', '$' => 's']);

        // Tout ce qui n'est ni lettre ni espace devient un séparateur : cela
        // transforme « c.o-n*n4rd » en « c o n n a rd », que l'écrasement
        // ci-dessous recolle.
        $t = preg_replace('/[^a-z\s]+/u', ' ', $t) ?? '';

        // Fragments maquillés recollés, en trois passes prudentes :
        //  1. ≥ 2 lettres isolées suivies d'un fragment (« c o n nard ») ;
        //  2. un fragment suivi de ≥ 2 lettres isolées (« conn a r d ») ;
        //  3. mot entièrement épelé (« c o n n a r d »).
        // Le seuil de DEUX lettres isolées est délibéré : en français
        // normalisé, une lettre seule est banale (« c est », « l equipe »,
        // « d accord ») et la recoller au mot voisin casserait la détection
        // du mot voisin lui-même (« l encule » doit rester « encule »).
        // Le fragment recollé est borné à 4 lettres : un fragment de mot
        // maquillé est court (« nard », « cule ») alors qu'un vrai mot qui
        // suit des lettres épelées est en général plus long — sans la borne,
        // « f u c k cette » deviendrait « fuckcette » et échapperait à la
        // correspondance par mot entier. Le fragment tolère toutefois un « s »
        // final AU-DELÀ de la borne : sans lui, le pluriel maquillé
        // (« c.o-n*n4rds » → fragment « nards », 5 lettres) passait sous le
        // radar — constaté en test HTTP réel sur PUT /profile. Seul « s » est
        // toléré (pas « e ») : un fragment+e recollerait des mots français
        // banals (« cette », « notre ») après des lettres épelées.
        $glue = fn($m) => str_replace(' ', '', $m[0]);
        $t = preg_replace_callback('/\b(?:[a-z]\s+){2,}[a-z]{2,4}s?\b/u', $glue, $t) ?? $t;
        $t = preg_replace_callback('/\b[a-z]{2,4}(?:\s+[a-z]\b){2,}/u', $glue, $t) ?? $t;
        $t = preg_replace_callback('/\b(?:[a-z]\s+){2,}[a-z]\b/u', $glue, $t) ?? $t;

        return preg_replace('/\s+/u', ' ', $t) ?? $t;
    }

    /**
     * Retourne la raison du refus, ou null si le texte est acceptable.
     * Les raisons sont des clés stables, traduites par message().
     */
    public static function check(?string $text): ?string
    {
        if ($text === null || trim($text) === '') return null;

        foreach (self::CONTACT_PATTERNS as $pattern) {
            if (preg_match($pattern, $text)) return 'contact';
        }

        return self::checkOffensiveOnly($text);
    }

    /**
     * Volet insultes/haine SEUL, sans le volet coordonnées.
     *
     * À utiliser sur les champs de présentation d'un PRO (bio, tagline) : un
     * coiffeur met légitimement son téléphone, son e-mail ou son Instagram
     * dans sa bio — c'est son outil de travail, pas du spam. Le volet
     * coordonnées de check() reste réservé aux contenus où un inconnu
     * s'adresse à d'autres utilisateurs (avis, légendes de réalisation).
     */
    public static function checkOffensiveOnly(?string $text): ?string
    {
        if ($text === null || trim($text) === '') return null;

        $normalized = self::normalize($text);
        foreach (self::BLOCKED as $word) {
            // Mot entier, avec suffixe court toléré (pluriel, féminin).
            if (preg_match('/\b' . preg_quote($word, '/') . '(?:e|s|es)?\b/u', $normalized)) {
                return 'offensive';
            }
        }

        return null;
    }

    public static function isClean(?string $text): bool
    {
        return self::check($text) === null;
    }

    /**
     * @param string $audience 'client' (tutoiement, défaut — avis, légendes)
     *                         ou 'pro' (vouvoiement — champs de profil pro).
     */
    public static function message(string $reason, string $audience = 'client'): string
    {
        switch ($reason) {
            case 'offensive':
                return $audience === 'pro'
                    ? "Ce texte contient des termes que nos règles de communauté n'autorisent pas. Reformulez-le sans insulte ni propos discriminatoire."
                    : "Ce texte contient des termes que nos règles de communauté n'autorisent pas. Reformule-le sans insulte ni propos discriminatoire.";
            case 'contact':
                return "Ce texte contient des coordonnées (e-mail, téléphone ou lien). Pour la sécurité de tous, les échanges de coordonnées ne sont pas publiés.";
            default:
                return "Ce texte ne respecte pas nos règles de communauté.";
        }
    }
}
