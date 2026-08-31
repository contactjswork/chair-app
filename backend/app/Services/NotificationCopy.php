<?php

namespace App\Services;

/**
 * NotificationCopy — SOURCE UNIQUE des textes de notification CHAIR.
 * =================================================================
 *
 * Tout titre / message de notification (interne + push OneSignal) doit venir
 * d'ICI. Aucun nouveau texte ne doit être écrit en dur dans un contrôleur.
 *
 * Pourquoi : les textes push sont du marketing de rétention. Ils doivent être
 * relus, mesurés et modifiés en un seul endroit, pas chassés dans 28 fichiers.
 *
 * ---------------------------------------------------------------------------
 * RÈGLES D'ÉCRITURE (à respecter pour toute nouvelle entrée)
 * ---------------------------------------------------------------------------
 *  - Titre   : 40 caractères MAX (au-delà, iOS coupe sur l'écran verrouillé).
 *  - Message : 120 caractères MAX, variables incluses.
 *  - Tutoiement, phrases courtes, concret. Jamais de majuscules criardes,
 *    jamais de point d'exclamation multiple, jamais de promesse non tenue.
 *  - Vocabulaire maison : "réalisation" (jamais "post"), "avis vérifié",
 *    "niveau CHAIR", "Coup de cœur CHAIR", "spécialités", "CHAIR+".
 *  - Emoji : ZÉRO dans les titres. Un seul maximum dans un message, et
 *    uniquement s'il ajoute quelque chose. La grande majorité n'en a aucun.
 *  - Jamais de chiffre inventé : une valeur ne s'affiche que si elle est
 *    passée en variable par l'appelant.
 *
 * ---------------------------------------------------------------------------
 * STRUCTURE
 * ---------------------------------------------------------------------------
 * TEXTS[$type][$audience] = [
 *     'title'    => string,            // peut contenir des {variables}
 *     'message'  => string,            // peut contenir des {variables}
 *     'fallback' => string|null,       // message SANS variable, utilisé
 *                                      // automatiquement si une variable
 *                                      // attendue manque à l'appel
 * ]
 *
 * $audience vaut 'client' (utilisateur de l'app CHAIR), 'pro' (le coiffeur
 * dans CHAIR PRO) ou 'salon' (le gérant du salon). Un même type peut avoir
 * deux textes : un rendez-vous annulé ne se dit pas pareil au client et au
 * coiffeur. Le premier bloc déclaré fait office de défaut.
 *
 * ---------------------------------------------------------------------------
 * VARIABLES DISPONIBLES
 * ---------------------------------------------------------------------------
 *  {client}   nom du client              {coiffeur} nom du coiffeur
 *  {salon}    nom du salon               {service}  nom de la prestation
 *  {date}     date lisible (ex "12 mars")  {heure}  heure (ex "14h30")
 *  {badge}    nom du badge               {note}     note sur 5
 *  {annonce}  titre d'une annonce de location de fauteuil
 *  {offre}    titre d'une offre d'emploi / d'une promotion
 *
 * Les valeurs sont tronquées à 30 caractères pour que le budget de 120
 * caractères tienne même avec un nom de salon à rallonge.
 *
 * ---------------------------------------------------------------------------
 * UTILISATION
 * ---------------------------------------------------------------------------
 *   NotificationService::sendTyped($userId, 'appointment_confirmed', [
 *       'coiffeur' => $hairdresserName,
 *       'date'     => $dateLabel,
 *       'heure'    => $time,
 *   ], NotificationCopy::AUDIENCE_CLIENT, $data);
 */
class NotificationCopy
{
    public const AUDIENCE_CLIENT = 'client';
    public const AUDIENCE_PRO    = 'pro';
    public const AUDIENCE_SALON  = 'salon';

    /** Longueur max d'une valeur de variable injectée dans un texte. */
    private const VAR_MAX_LENGTH = 30;

    /** Contraintes d'affichage push iOS (filet de sécurité au rendu). */
    public const TITLE_MAX_LENGTH   = 40;
    public const MESSAGE_MAX_LENGTH = 120;

    /**
     * Le catalogue. Voir l'en-tête de classe pour la structure et les règles.
     */
    private const TEXTS = [

        // =====================================================================
        // RENDEZ-VOUS
        // =====================================================================

        // Le coiffeur reçoit une réservation (AppointmentController::store).
        'appointment_created' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Nouvelle réservation',
                'message'  => '{client} a réservé {service}, le {date} à {heure}. À confirmer.',
                'fallback' => 'Une nouvelle réservation attend ta confirmation.',
            ],
        ],

        'appointment_confirmed' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Rendez-vous confirmé',
                'message'  => "C'est confirmé avec {coiffeur} : {date} à {heure}. ✂️",
                'fallback' => 'Ton rendez-vous est confirmé. Les détails sont dans ton app.',
            ],
            self::AUDIENCE_PRO => [
                'title'    => 'Rendez-vous confirmé',
                'message'  => "C'est confirmé : {client}, {service}, le {date} à {heure}.",
                'fallback' => 'Un rendez-vous vient d\'être confirmé dans ton agenda.',
            ],
        ],

        'appointment_cancelled' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Rendez-vous annulé',
                'message'  => 'Ton rendez-vous du {date} à {heure} avec {coiffeur} est annulé.',
                'fallback' => 'Ton rendez-vous est annulé. Reprends un créneau quand tu veux.',
            ],
            self::AUDIENCE_PRO => [
                'title'    => 'Rendez-vous annulé',
                'message'  => '{client} a annulé le {date} à {heure}. Le créneau est libéré.',
                'fallback' => 'Un rendez-vous vient d\'être annulé. Ton créneau est libéré.',
            ],
        ],

        'appointment_rescheduled' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Rendez-vous déplacé',
                'message'  => 'Nouveau créneau avec {coiffeur} : {date} à {heure}. Ça te va ?',
                'fallback' => 'Ton rendez-vous a été déplacé. Vérifie le nouveau créneau.',
            ],
            self::AUDIENCE_PRO => [
                'title'    => 'Rendez-vous déplacé',
                'message'  => 'Le rendez-vous de {client} passe au {date} à {heure}. Agenda à jour.',
                'fallback' => 'Un rendez-vous a été déplacé. Ton agenda est à jour.',
            ],
        ],

        // Rappels : mapping de préférence déjà prêt, envoi pas encore branché.
        'appointment_reminder_24h' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Rendez-vous demain',
                'message'  => 'Demain {heure} chez {coiffeur}. Préviens en cas d\'imprévu.',
                'fallback' => 'Tu as un rendez-vous demain. Préviens ton coiffeur en cas d\'imprévu.',
            ],
            self::AUDIENCE_PRO => [
                'title'    => 'Ton agenda de demain',
                'message'  => 'Demain {heure} : {client} pour {service}. Ton agenda t\'attend.',
                'fallback' => 'Tu as des rendez-vous demain. Jette un œil à ton agenda.',
            ],
        ],

        'appointment_reminder_1h' => [
            self::AUDIENCE_CLIENT => [
                'title'    => "C'est dans une heure",
                'message'  => '{coiffeur} t\'attend à {heure}.',
                'fallback' => 'Ton rendez-vous est dans une heure.',
            ],
            self::AUDIENCE_PRO => [
                'title'    => 'Prochain client dans 1h',
                'message'  => '{client} arrive à {heure} pour {service}.',
                'fallback' => 'Ton prochain rendez-vous est dans une heure.',
            ],
        ],

        // =====================================================================
        // AVIS CERTIFIÉS — le différenciateur CHAIR, les textes comptent double
        // =====================================================================

        'review_request' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Ton avis compte',
                'message'  => 'Ton avis vérifié sur {coiffeur} fait la différence. 30 secondes suffisent.',
                'fallback' => 'Ton rendez-vous est terminé. Laisse un avis vérifié, 30 secondes suffisent.',
            ],
        ],

        'review_received' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Nouvel avis vérifié',
                'message'  => '{client} t\'a mis {note}/5. Va lire son avis.',
                'fallback' => 'Tu viens de recevoir un nouvel avis vérifié. Va le lire.',
            ],
        ],

        // Pas encore envoyé (ReviewController::reply ne notifie pas) — prêt.
        'review_reply' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Réponse à ton avis',
                'message'  => '{coiffeur} a répondu à ton avis vérifié. Va voir.',
                'fallback' => 'Ton avis vérifié a reçu une réponse. Va la lire.',
            ],
        ],

        // =====================================================================
        // RÉPUTATION / SOCIAL
        // =====================================================================

        'badge_unlocked' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Nouveau badge débloqué',
                'message'  => '{badge} est à toi. Ton niveau CHAIR avance.',
                'fallback' => 'Tu viens de débloquer un badge. Ton niveau CHAIR avance.',
            ],
        ],

        'new_follower' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Nouvel abonné',
                'message'  => '{client} suit ton profil. Publie une réalisation pour lui donner envie.',
                'fallback' => 'Quelqu\'un suit ton profil. Publie une réalisation pour lui donner envie.',
            ],
        ],

        // Un coiffeur suivi publie une réalisation (pas encore envoyé).
        'new_post' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Nouvelle réalisation',
                'message'  => '{coiffeur} vient de publier. Va voir le résultat.',
                'fallback' => 'Un coiffeur que tu suis vient de publier une réalisation.',
            ],
        ],

        // Alias historique de new_post (clé de préférence followed_post).
        'followed_post' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Nouvelle réalisation',
                'message'  => '{coiffeur} vient de publier. Va voir le résultat.',
                'fallback' => 'Un coiffeur que tu suis vient de publier une réalisation.',
            ],
        ],

        'new_hairdresser_nearby' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Un coiffeur près de chez toi',
                'message'  => '{coiffeur} vient d\'arriver sur CHAIR. Va voir ses réalisations.',
                'fallback' => 'Un nouveau coiffeur est arrivé près de chez toi. Va voir son profil.',
            ],
        ],

        'promotion' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Une offre pour toi',
                'message'  => '{coiffeur} propose {offre}. À voir sur son profil.',
                'fallback' => 'Une offre t\'attend dans l\'app. À voir avant qu\'elle se termine.',
            ],
        ],

        // Même texte, clé au pluriel (celle de la table de préférences).
        'promotions' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Une offre pour toi',
                'message'  => '{coiffeur} propose {offre}. À voir sur son profil.',
                'fallback' => 'Une offre t\'attend dans l\'app. À voir avant qu\'elle se termine.',
            ],
        ],

        // =====================================================================
        // SALON — rattachement, invitations, équipe
        // =====================================================================

        'join_request' => [
            self::AUDIENCE_SALON => [
                'title'    => 'Demande de rattachement',
                'message'  => '{coiffeur} veut rejoindre {salon}. Réponds depuis ton équipe.',
                'fallback' => 'Un coiffeur veut rejoindre ton salon. Réponds depuis ton équipe.',
            ],
        ],

        'join_accepted' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Demande acceptée',
                'message'  => 'Tu fais partie de l\'équipe {salon}. Ton profil est à jour.',
                'fallback' => 'Ta demande est acceptée. Ton profil est à jour.',
            ],
        ],

        'join_declined' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Demande non retenue',
                'message'  => '{salon} n\'a pas donné suite. D\'autres salons cherchent des coiffeurs.',
                'fallback' => 'Ta demande n\'a pas été retenue. D\'autres salons cherchent des coiffeurs.',
            ],
        ],

        'removed_from_salon' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Retiré de l\'équipe',
                'message'  => 'Tu ne fais plus partie de l\'équipe {salon}. Ton profil CHAIR reste actif.',
                'fallback' => 'Tu as été retiré d\'une équipe. Ton profil CHAIR reste actif.',
            ],
        ],

        'salon_invitation' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Invitation d\'un salon',
                'message'  => '{salon} t\'invite à rejoindre son équipe. À toi de voir.',
                'fallback' => 'Un salon t\'invite à rejoindre son équipe. À toi de voir.',
            ],
        ],

        'salon_invitation_cancelled' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Invitation annulée',
                'message'  => '{salon} a retiré son invitation.',
                'fallback' => 'Une invitation de salon a été retirée.',
            ],
        ],

        'invitation_accepted' => [
            self::AUDIENCE_SALON => [
                'title'    => 'Invitation acceptée',
                'message'  => '{coiffeur} rejoint ton équipe. Son profil apparaît sur ta page salon.',
                'fallback' => 'Un coiffeur a accepté ton invitation et rejoint ton équipe.',
            ],
        ],

        'invitation_declined' => [
            self::AUDIENCE_SALON => [
                'title'    => 'Invitation déclinée',
                'message'  => '{coiffeur} n\'a pas donné suite à ton invitation.',
                'fallback' => 'Ton invitation n\'a pas été acceptée.',
            ],
        ],

        // =====================================================================
        // RECRUTEMENT
        // =====================================================================

        'new_application' => [
            self::AUDIENCE_SALON => [
                'title'    => 'Nouvelle candidature',
                'message'  => '{coiffeur} a postulé pour {offre}. Son profil t\'attend.',
                'fallback' => 'Tu as reçu une nouvelle candidature. Le profil t\'attend.',
            ],
        ],

        'application_interview' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Entretien à venir',
                'message'  => '{salon} veut te rencontrer au sujet de {offre}.',
                'fallback' => 'Un salon veut te rencontrer. Il te recontacte directement.',
            ],
        ],

        'application_accepted' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Candidature retenue',
                'message'  => 'Ta candidature pour {offre} est retenue. {salon} te recontacte.',
                'fallback' => 'Ta candidature est retenue. Le salon te recontacte.',
            ],
        ],

        'application_declined' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Candidature non retenue',
                'message'  => 'Ta candidature pour {offre} n\'a pas été retenue. D\'autres offres sont ouvertes.',
                'fallback' => 'Ta candidature n\'a pas été retenue. D\'autres offres sont ouvertes.',
            ],
        ],

        // =====================================================================
        // LOCATION DE FAUTEUIL
        // =====================================================================

        'rental_request' => [
            self::AUDIENCE_SALON => [
                'title'    => 'Demande de fauteuil',
                'message'  => '{coiffeur} veut louer {annonce}. À toi de répondre.',
                'fallback' => 'Un coiffeur veut louer ton fauteuil. À toi de répondre.',
            ],
        ],

        'rental_accepted' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Fauteuil accepté',
                'message'  => 'Ta demande pour {annonce} est acceptée. Prends contact avec le salon.',
                'fallback' => 'Ta demande de fauteuil est acceptée. Prends contact avec le salon.',
            ],
        ],

        'rental_declined' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Demande non retenue',
                'message'  => 'Ta demande pour {annonce} n\'a pas été retenue. D\'autres fauteuils sont libres.',
                'fallback' => 'Ta demande n\'a pas été retenue. D\'autres fauteuils sont libres.',
            ],
        ],

        'rental_cancelled' => [
            self::AUDIENCE_SALON => [
                'title'    => 'Demande annulée',
                'message'  => 'Une demande pour {annonce} a été annulée. Le fauteuil reste libre.',
                'fallback' => 'Une demande de fauteuil a été annulée. Le fauteuil reste libre.',
            ],
        ],

        'rental_message' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Nouveau message',
                'message'  => 'Le salon t\'a répondu au sujet de {annonce}.',
                'fallback' => 'Tu as un nouveau message au sujet d\'un fauteuil.',
            ],
            self::AUDIENCE_SALON => [
                'title'    => 'Nouveau message',
                'message'  => 'Un coiffeur t\'a répondu au sujet de {annonce}.',
                'fallback' => 'Tu as un nouveau message au sujet d\'un fauteuil.',
            ],
        ],

        // =====================================================================
        // BOUCLES DE RETOUR — le récap qui ramène le coiffeur, le rappel qui
        // ramène le client. Voir chair:send-weekly-recap, chair:snapshot-
        // specialty-ranks et chair:send-rebook-reminders.
        // =====================================================================

        // Bilan hebdomadaire du coiffeur, envoyé le dimanche soir — le moment
        // où l'on planifie sa semaine. Jamais envoyé vide : la commande saute
        // les semaines où il n'y a rien à dire.
        'weekly_recap' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Ta semaine sur CHAIR',
                'message'  => '{vues} vue(s) de profil, {rdv} rendez-vous. {rang}',
                'fallback' => 'Ton bilan de la semaine est prêt.',
            ],
        ],

        // Le classement a bougé depuis la capture précédente. La montée se
        // savoure, la descente appelle une réaction — les deux font ouvrir.
        'rank_moved' => [
            self::AUDIENCE_PRO => [
                'title'    => 'Ton classement a bougé',
                'message'  => '{delta} en {specialite} : te voilà {rang} sur {total} à {zone}.',
                'fallback' => 'Ta place dans le classement a changé cette semaine.',
            ],
        ],

        // Rappel de re-réservation, calé sur le rythme réel du client. C'est
        // le seul push commercial de l'app côté client : il doit rester rare
        // et juste, sinon il grille la permission pour tous les autres.
        // La recompense de fidelite est debloquee. Cote client c est une
        // victoire ; cote coiffeur c est une dette a honorer au comptoir.
        'loyalty_unlocked' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Récompense débloquée 🎉',
                'message'  => 'Chez {coiffeur} : {recompense}. Montre cette notification au salon.',
                'fallback' => 'Ta carte de fidélité est pleine. Ta récompense t attend au salon.',
            ],
            self::AUDIENCE_PRO => [
                'title'    => 'Récompense à honorer',
                'message'  => 'Un client fidèle a débloqué : {recompense}. À voir dans Fidélité.',
                'fallback' => 'Un client vient de remplir sa carte de fidélité.',
            ],
        ],
        'rebook_reminder' => [
            self::AUDIENCE_CLIENT => [
                'title'    => 'Un petit rafraîchissement ?',
                'message'  => 'Ça fait {semaines} semaines depuis ta visite chez {coiffeur}. Un créneau ?',
                'fallback' => 'Ton coiffeur a des créneaux cette semaine.',
            ],
        ],
    ];

    /**
     * Texte d'un type + audience, variables substituées.
     *
     * @param  string      $type      type de notification (clé de TEXTS)
     * @param  array       $vars      ['coiffeur' => 'Sarah', 'heure' => '14h30', ...]
     * @param  string|null $audience  'client' | 'pro' | 'salon' (défaut : 1er bloc du type)
     * @return array|null  ['title' => string, 'message' => string] ou null si type inconnu
     */
    public static function for(string $type, array $vars = [], ?string $audience = null): ?array
    {
        $entry = self::entry($type, $audience);
        if ($entry === null) {
            return null;
        }

        $vars = self::normalizeVars($vars);

        $title = self::render($entry['title'], $vars);
        if ($title === null) {
            // Un titre à variable manquante ne doit jamais partir à moitié vide :
            // on retombe sur le titre nettoyé de ses variables.
            $title = self::stripVars($entry['title']);
        }

        $message = self::render($entry['message'], $vars);
        if ($message === null) {
            $message = $entry['fallback'] ?? self::stripVars($entry['message']);
        }

        return [
            'title'   => self::clamp($title, self::TITLE_MAX_LENGTH),
            'message' => self::clamp($message, self::MESSAGE_MAX_LENGTH),
        ];
    }

    /**
     * Comme for(), mais ne rend jamais null : un type absent du catalogue
     * retombe sur un texte générique plutôt que de bloquer une notification.
     * C'est ce que doit appeler NotificationService.
     */
    public static function resolve(string $type, array $vars = [], ?string $audience = null): array
    {
        return self::for($type, $vars, $audience) ?? [
            'title'   => 'CHAIR',
            'message' => 'Tu as une nouvelle notification.',
        ];
    }

    /** Ce type existe-t-il dans le catalogue ? */
    public static function has(string $type): bool
    {
        return isset(self::TEXTS[$type]);
    }

    /** Tous les types du catalogue (ordre de déclaration). */
    public static function types(): array
    {
        return array_keys(self::TEXTS);
    }

    /** Audiences déclarées pour un type (ex ['client', 'pro']). */
    public static function audiences(string $type): array
    {
        return array_keys(self::TEXTS[$type] ?? []);
    }

    /**
     * Jeu de variables d'exemple, pour prévisualiser un texte complet
     * (commande chair:test-push, documentation). Aucune donnée réelle.
     */
    public static function sampleVars(): array
    {
        return [
            'client'   => 'Camille',
            'coiffeur' => 'Sarah',
            'salon'    => 'Studio Nord',
            'service'  => 'Coupe + barbe',
            'date'     => '12 mars',
            'heure'    => '14h30',
            'badge'    => 'Coup de cœur CHAIR',
            'note'     => '5',
            'annonce'  => 'Fauteuil centre-ville',
            'offre'    => 'Coiffeur H/F',
        ];
    }

    // -------------------------------------------------------------------
    // Interne
    // -------------------------------------------------------------------

    /** Bloc de texte brut pour un type + audience (audience par défaut = 1er bloc). */
    private static function entry(string $type, ?string $audience): ?array
    {
        $blocks = self::TEXTS[$type] ?? null;
        if ($blocks === null || $blocks === []) {
            return null;
        }

        if ($audience !== null && isset($blocks[$audience])) {
            return $blocks[$audience];
        }

        return reset($blocks) ?: null;
    }

    /** Nettoie les variables : valeurs vides écartées, longueurs bornées. */
    private static function normalizeVars(array $vars): array
    {
        $clean = [];

        foreach ($vars as $key => $value) {
            if ($value === null || is_array($value) || is_object($value)) {
                continue;
            }

            $value = trim((string) $value);
            if ($value === '') {
                continue;
            }

            $clean[(string) $key] = self::clamp($value, self::VAR_MAX_LENGTH);
        }

        return $clean;
    }

    /**
     * Substitue les {variables}. Retourne null si au moins une variable
     * attendue par le gabarit n'a pas de valeur (→ l'appelant bascule sur
     * le texte de repli plutôt que d'afficher un trou).
     */
    private static function render(string $template, array $vars): ?string
    {
        $missing = false;

        $out = preg_replace_callback(
            '/\{([a-z_]+)\}/',
            function (array $m) use ($vars, &$missing) {
                if (!isset($vars[$m[1]])) {
                    $missing = true;
                    return '';
                }
                return $vars[$m[1]];
            },
            $template
        );

        return $missing ? null : $out;
    }

    /** Retire les {variables} d'un gabarit et recolle les espaces. */
    private static function stripVars(string $template): string
    {
        $out = preg_replace('/\{[a-z_]+\}/', '', $template);
        $out = preg_replace('/\s{2,}/', ' ', (string) $out);

        return trim((string) $out, " \t\n\r,;:-");
    }

    /** Coupe proprement à $max caractères (avec … si tronqué). */
    private static function clamp(string $text, int $max): string
    {
        if (mb_strlen($text) <= $max) {
            return $text;
        }

        return rtrim(mb_substr($text, 0, $max - 1), " \t.,;:") . '…';
    }
}
