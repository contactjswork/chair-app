<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\PushService;
use Illuminate\Console\Command;

/**
 * Envoie TOUT le catalogue de notifications à un compte, une par une.
 *
 * À quoi ça sert : lire les textes dans un tableau et les recevoir sur un
 * vrai téléphone sont deux choses différentes. Sur l'écran verrouillé, un
 * titre trop long se coupe, un message trop vague ne donne envie de rien, et
 * deux notifications voisines se ressemblent parfois trop. Cette commande
 * permet de juger la copie en conditions réelles, d'un coup.
 *
 * Deux choix volontaires :
 *
 *  - Le PUSH part avec le type 'admin_test', pas le type réel. Sinon la
 *    moitié du catalogue n'arriverait jamais : les types sociaux
 *    (promotions, nouveau coiffeur, nouvelle réalisation) sont désactivés
 *    par défaut, plafonnés, et bloqués entre 21 h et 9 h. Le TEXTE, lui,
 *    reste rigoureusement celui du catalogue — c'est tout l'intérêt.
 *
 *  - La notification interne, elle, est créée avec le VRAI type : dans la
 *    page Notifications, chaque ligne garde donc son icône et sa couleur
 *    d'origine.
 *
 * Outil de test : n'écrit rien d'autre en base et ne touche à aucune
 * préférence. Le compte destinataire doit avoir au moins un appareil
 * enregistré pour recevoir les push (les notifications internes, elles,
 * apparaissent dans tous les cas).
 */
class PushCatalogue extends Command
{
    protected $signature = 'chair:push-catalogue
        {email : Email du compte destinataire}
        {--audience=client : client, pro ou salon}
        {--delay=2 : Secondes entre deux envois}
        {--dry : Affiche les textes sans rien envoyer}';

    protected $description = 'Envoie tout le catalogue de notifications à un compte, pour juger les textes sur un vrai téléphone';

    /** Type utilisé pour le push — non mappé aux préférences, non social. */
    private const PUSH_TYPE = 'admin_test';

    public function handle(): int
    {
        $email    = (string) $this->argument('email');
        $audience = (string) $this->option('audience');
        $delay    = max(0, (int) $this->option('delay'));
        $dry      = (bool) $this->option('dry');

        if (!in_array($audience, [NotificationCopy::AUDIENCE_CLIENT, NotificationCopy::AUDIENCE_PRO, NotificationCopy::AUDIENCE_SALON], true)) {
            $this->error("Audience inconnue : {$audience}. Valeurs possibles : client, pro, salon.");
            return 1;
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("Aucun compte avec l'email {$email}.");
            return 1;
        }

        // 'offre' sert aussi aux annonces de recrutement, où l'exemple est un
        // intitulé de poste. Pour une démonstration côté client, une vraie
        // promotion parle beaucoup plus.
        $vars = array_merge(NotificationCopy::sampleVars(), ['offre' => '-20 % sur les colorations']);

        // Plusieurs types partagent volontairement le même texte : new_post et
        // followed_post, promotion et promotions. Les envoyer tous les deux
        // afficherait deux bannières identiques à la suite — on ne garde que
        // la première de chaque texte, celle dont le type sert de référence.
        $types = [];
        $seen  = [];
        foreach (NotificationCopy::types() as $type) {
            if (!in_array($audience, NotificationCopy::audiences($type), true)) {
                continue;
            }
            $copy        = NotificationCopy::resolve($type, $vars, $audience);
            $fingerprint = $copy['title'] . "\u{0}" . $copy['message'];
            if (isset($seen[$fingerprint])) {
                continue;
            }
            $seen[$fingerprint] = true;
            $types[]            = $type;
        }

        if ($types === []) {
            $this->warn("Aucun texte déclaré pour l'audience « {$audience} ».");
            return 0;
        }

        $this->line('');
        $this->info(sprintf(
            '%d notification%s « %s » %s %s',
            count($types),
            count($types) > 1 ? 's' : '',
            $audience,
            $dry ? 'à destination de' : 'vers',
            $user->name ? "{$user->name} ({$email})" : $email
        ));
        if (!$dry) {
            $this->line("Intervalle : {$delay} s. Verrouille ton téléphone pour voir les vraies bannières.");
        }
        $this->line('');

        $pushed = 0;
        $silent = [];

        foreach ($types as $index => $type) {
            $copy    = NotificationCopy::resolve($type, $vars, $audience);
            $title   = $copy['title'];
            $message = $copy['message'];

            $this->line(sprintf('  %2d. <options=bold>%s</> — %s', $index + 1, $title, $message));

            if ($dry) {
                continue;
            }

            NotificationService::sendInternal((int) $user->id, $type, $title, $message, []);
            $sent = PushService::sendToUser($user, self::PUSH_TYPE, $title, $message, []);

            $pushed += $sent;
            if ($sent === 0) {
                $silent[] = $type;
            }

            // Pas d'attente après la dernière : elle ne servirait à rien.
            if ($delay > 0 && $index < count($types) - 1) {
                sleep($delay);
            }
        }

        $this->line('');

        if ($dry) {
            $this->info('Aucun envoi (--dry).');
            return 0;
        }

        $this->info("{$pushed} push envoyé" . ($pushed > 1 ? 's' : '') . ', ' . count($types) . ' notification' . (count($types) > 1 ? 's' : '') . " ajoutée" . (count($types) > 1 ? 's' : '') . ' dans la page Notifications.');

        if ($silent !== []) {
            $this->warn("Aucun appareil joint pour : " . implode(', ', $silent));
            $this->line("Vérifie que ce compte a bien activé les notifications sur un iPhone (Compte → Notifications).");
        }

        return 0;
    }
}
