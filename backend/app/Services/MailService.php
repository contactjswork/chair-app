<?php

namespace App\Services;

use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Point d'entrée unique pour TOUS les emails CHAIR.
 *
 * Trois garanties, dans cet ordre :
 *  1. Préférences — un email transactionnel dont le type correspond à une
 *     préférence (notification_preferences) n'est envoyé que si la préférence
 *     du destinataire l'autorise. La décision n'est PAS dupliquée ici : on
 *     appelle NotificationService::shouldSend(), exactement la même logique
 *     (et le même mapping type → clé) que les notifications in-app et push.
 *     Les types de sécurité ne sont pas mappés côté NotificationService, donc
 *     ils passent toujours (cf. commentaire du mapping là-bas).
 *  2. Configuration — si le mailer n'est pas réellement configuré (host de dev
 *     type mailhog, adresse d'expédition d'exemple...), on log et on s'arrête
 *     proprement au lieu de laisser remonter une exception SMTP.
 *  3. Non-bloquant — toute erreur d'envoi est attrapée et loguée. Un email qui
 *     échoue ne doit JAMAIS faire échouer l'action métier qui l'a déclenché
 *     (inscription, confirmation de RDV, annulation...).
 *
 * Une seule exception à la règle 3 : la réinitialisation de mot de passe, où
 * l'action métier EST l'email. AuthController::forgotPassword() interroge donc
 * isConfigured() AVANT d'appeler le broker et répond une indisponibilité
 * honnête plutôt qu'un faux « lien envoyé » (cf. le commentaire là-bas).
 */
class MailService
{
    /** Hosts SMTP qui n'existent qu'en développement local. */
    private const DEV_HOSTS = ['mailhog', 'mailpit', 'localhost', '127.0.0.1', '::1'];

    /** Adresses d'expédition livrées par défaut avec Laravel — jamais valides en prod. */
    private const PLACEHOLDER_FROM = ['hello@example.com', 'null', 'example@example.com'];

    /** Noms d'expéditeur livrés par défaut avec Laravel — jamais voulus en prod. */
    private const PLACEHOLDER_FROM_NAME = ['example', 'laravel', 'null'];

    /**
     * URL absolue côté frontend (app cliente et espace pro sont sur le même
     * domaine, cf. config('app.frontend_url') / FRONTEND_URL).
     */
    public static function frontendUrl(string $path = ''): string
    {
        $base = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
        $path = ltrim($path, '/');

        return $path === '' ? $base : $base . '/' . $path;
    }

    /**
     * URL de la page frontend qui consomme un token de réinitialisation.
     *
     * Source de vérité unique, utilisée à la fois par le callback
     * ResetPassword::createUrlUsing() (AppServiceProvider) et par
     * User::sendPasswordResetNotification() — pour qu'un changement de route
     * frontend n'ait à être fait qu'à un seul endroit.
     */
    public static function passwordResetUrl(string $email, string $token): string
    {
        return self::frontendUrl('/reinitialiser-mot-de-passe')
            . '?token=' . urlencode($token)
            . '&email=' . urlencode($email);
    }

    /** Durée de validité d'un lien de réinitialisation, en minutes. */
    public static function passwordResetExpireMinutes(): int
    {
        return (int) config('auth.passwords.users.expire', 60);
    }

    /**
     * Décrit pourquoi l'envoi d'email est impossible, ou null si tout est bon.
     * Utilisé aussi par la commande chair:test-mail pour afficher un message clair.
     */
    public static function configurationProblem(): ?string
    {
        $mailer = (string) config('mail.default');

        $from = trim((string) config('mail.from.address'));
        if ($from === '' || in_array(strtolower($from), self::PLACEHOLDER_FROM, true)) {
            return 'MAIL_FROM_ADDRESS n\'est pas renseignée (valeur actuelle : ' . ($from === '' ? 'vide' : $from) . ').';
        }

        // 'log' et 'array' sont des mailers de test volontaires : pas d'envoi
        // réel, mais aucune erreur non plus — on les considère configurés.
        if (in_array($mailer, ['log', 'array'], true)) {
            return null;
        }

        if ($mailer === 'smtp') {
            $host = strtolower(trim((string) config('mail.mailers.smtp.host')));
            if ($host === '') {
                return 'MAIL_HOST n\'est pas renseigné.';
            }
            if (in_array($host, self::DEV_HOSTS, true)) {
                return 'MAIL_HOST vaut "' . $host . '" : c\'est un serveur de développement local, aucun email ne partira. Procédure : docs/app-store/ACTION_GERANT_SMTP.md.';
            }
        }

        return null;
    }

    public static function isConfigured(): bool
    {
        return self::configurationProblem() === null;
    }

    /**
     * Problèmes qui n'empêchent PAS l'envoi mais abîment le résultat : nom
     * d'expéditeur resté sur la valeur d'exemple de Laravel, FRONTEND_URL non
     * renseignée — auquel cas tous les liens des emails pointent sur localhost
     * et sont morts pour le destinataire.
     *
     * Volontairement séparé de configurationProblem() : ce sont des alertes,
     * elles ne doivent jamais bloquer un envoi (en local, FRONTEND_URL sur
     * localhost est le comportement normal). Affichées par chair:test-mail.
     *
     * @return string[]
     */
    public static function configurationWarnings(): array
    {
        $warnings = [];

        $fromName = trim((string) config('mail.from.name'));
        if ($fromName === '' || in_array(strtolower($fromName), self::PLACEHOLDER_FROM_NAME, true)) {
            $warnings[] = 'MAIL_FROM_NAME vaut "' . ($fromName === '' ? '(vide)' : $fromName)
                . '" — c\'est le nom affiché comme expéditeur dans la boîte du destinataire. Mettre MAIL_FROM_NAME=CHAIR.';
        }

        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $host     = strtolower((string) parse_url($frontend, PHP_URL_HOST));
        $scheme   = strtolower((string) parse_url($frontend, PHP_URL_SCHEME));

        if ($frontend === '' || $host === '' || in_array($host, self::DEV_HOSTS, true)) {
            $warnings[] = 'FRONTEND_URL vaut "' . ($frontend === '' ? '(vide)' : $frontend)
                . '" — TOUS les liens des emails (réinitialisation de mot de passe, demande d\'avis,'
                . ' rendez-vous) pointeraient vers cette adresse et seraient morts pour le destinataire.';
        } elseif ($scheme !== 'https') {
            $warnings[] = 'FRONTEND_URL n\'est pas en https ("' . $frontend
                . '") — les liens des emails doivent être en https.';
        }

        return $warnings;
    }

    /**
     * Masque une adresse pour les logs : l'incident doit rester exploitable
     * (« quel compte n'a pas reçu son lien de réinitialisation ? ») sans
     * écrire d'adresse complète en clair dans storage/logs.
     */
    public static function maskEmail(string $email): string
    {
        $at = strrpos($email, '@');
        if ($at === false || $at === 0) {
            return '***';
        }

        $local  = substr($email, 0, $at);
        $domain = substr($email, $at);
        $len    = strlen($local);

        if ($len <= 2) {
            return str_repeat('*', $len) . $domain;
        }

        return $local[0] . str_repeat('*', $len - 2) . $local[$len - 1] . $domain;
    }

    /**
     * Envoie un email. Ne lève jamais d'exception.
     *
     * @param  string      $email             destinataire
     * @param  Mailable    $mailable
     * @param  string|null $name              nom du destinataire (facultatif)
     * @param  int|null    $userId            id du compte destinataire, s'il en a un
     * @param  string|null $notificationType  type de notification (mêmes clés que
     *                                        NotificationService) pour appliquer la
     *                                        préférence du destinataire. null = email
     *                                        non couvert par une préférence.
     * @return bool true si l'email a été remis au mailer.
     */
    public static function send(
        string    $email,
        Mailable  $mailable,
        ?string   $name = null,
        ?int      $userId = null,
        ?string   $notificationType = null
    ): bool {
        $email = trim($email);
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Log::warning('CHAIR mail non envoyé — adresse destinataire invalide', [
                'mailable' => get_class($mailable),
                'user_id'  => $userId,
            ]);
            return false;
        }

        // Préférence du destinataire — uniquement s'il a un compte. Un client
        // invité (réservation sans compte) n'a pas de préférences : l'email
        // transactionnel qu'il a lui-même déclenché en réservant part quand même.
        if ($notificationType !== null && $userId !== null) {
            if (!NotificationService::shouldSend($userId, $notificationType)) {
                return false;
            }
        }

        $problem = self::configurationProblem();
        if ($problem !== null) {
            // error et non warning : en production c'est une panne complète —
            // plus aucun email ne part, réinitialisation de mot de passe comprise.
            Log::error('CHAIR mail non envoyé — mailer non configuré', [
                'reason'    => $problem,
                'mailable'  => get_class($mailable),
                'recipient' => self::maskEmail($email),
                'user_id'   => $userId,
                'mailer'    => (string) config('mail.default'),
            ]);
            return false;
        }

        try {
            // Mail::to() ne transmet PAS de second argument « nom » en Laravel 8 :
            // Illuminate\Mail\Mailer::to($users) n'accepte qu'un paramètre, celui
            // qu'on passait en deuxième position était silencieusement ignoré et
            // l'en-tête To ne contenait que l'adresse. On passe donc le
            // destinataire sous la forme attendue par Mailable::setAddress().
            $recipient = $name !== null && trim($name) !== ''
                ? [['name' => trim($name), 'email' => $email]]
                : $email;

            $pending = Mail::to($recipient);

            // File d'attente si une vraie queue est configurée, envoi direct sinon.
            if ((string) config('queue.default') !== 'sync') {
                $pending->queue($mailable);
            } else {
                $pending->send($mailable);
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('CHAIR mail échoué', [
                'mailable'  => get_class($mailable),
                'recipient' => self::maskEmail($email),
                'user_id'   => $userId,
                'mailer'    => (string) config('mail.default'),
                'error'     => $e->getMessage(),
            ]);
            return false;
        }
    }
}
