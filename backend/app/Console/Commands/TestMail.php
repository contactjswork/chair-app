<?php

namespace App\Console\Commands;

use App\Mail\AppointmentCancelledMail;
use App\Mail\AppointmentConfirmedMail;
use App\Mail\ResetPasswordMail;
use App\Mail\ReviewRequestMail;
use App\Mail\WelcomeClientMail;
use App\Mail\WelcomeHairdresserMail;
use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Vérification et test de la chaîne email CHAIR.
 *
 * Deux usages, une seule commande :
 *
 *   php artisan chair:test-mail
 *       Diagnostic seul. Affiche la configuration lue par l'application,
 *       teste la connexion au serveur SMTP (sans envoyer d'email), et sort
 *       en code 0 si tout est prêt, 1 sinon. C'est LA commande à lancer
 *       après avoir rempli le .env de production.
 *
 *   php artisan chair:test-mail moi@mondomaine.fr
 *       Même diagnostic, puis envoi réel d'un exemplaire de chaque email
 *       pour vérifier le rendu dans une vraie boîte (Gmail, Outlook, Apple
 *       Mail — les trois rendus qui comptent).
 *
 *   php artisan chair:test-mail moi@mondomaine.fr --type=reset-password
 *       Un seul type.
 *
 * Les données utilisées sont des données de test explicites (« Coiffeur de
 * test », « Client de test ») : rien n'est lu ni écrit en base, aucun compte
 * réel n'est touché.
 */
class TestMail extends Command
{
    protected $signature = 'chair:test-mail
                            {email? : adresse de destination — sans elle, diagnostic seul, aucun envoi}
                            {--type= : un seul type (voir la liste ci-dessous), tous par défaut}';

    protected $description = 'Vérifie la configuration email CHAIR, et envoie des emails de test si une adresse est fournie';

    private const TYPES = [
        'welcome-client',
        'welcome-hairdresser',
        'appointment-confirmed',
        'appointment-cancelled',
        'review-request',
        'reset-password',
    ];

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error("Adresse invalide : {$email}");
            return 1;
        }

        $type = $this->option('type');
        if ($type !== null && !in_array($type, self::TYPES, true)) {
            $this->error("Type inconnu : {$type}");
            $this->line('Types disponibles : ' . implode(', ', self::TYPES));
            return 1;
        }

        $this->configurationTable();

        // 1. Blocage : sans ça, aucun email ne peut partir.
        $problem = MailService::configurationProblem();
        if ($problem !== null) {
            $this->line('');
            $this->error('BLOQUANT — aucun email ne peut partir.');
            $this->line('  ' . $problem);
            $this->line('');
            $this->line('  Procédure complète (Infomaniak / Brevo, variables à remplir, DNS) :');
            $this->line('  docs/app-store/ACTION_GERANT_SMTP.md');
            $this->line('');
            $this->line('  Après modification du .env : php artisan config:clear');
            $this->line('  Pour relire le rendu HTML sans serveur SMTP : MAIL_MAILER=log,');
            $this->line('  relancer cette commande, puis lire storage/logs/laravel.log.');
            return 1;
        }

        // 2. Alertes : l'envoi fonctionne, mais le résultat sera abîmé.
        $warnings = MailService::configurationWarnings();
        if ($warnings !== []) {
            $this->line('');
            $this->warn('À CORRIGER — l\'envoi fonctionne, mais les emails seront abîmés :');
            foreach ($warnings as $w) {
                $this->line('  - ' . $w);
            }
        }

        // 3. Connexion réelle au serveur SMTP, sans envoyer d'email : c'est ce
        //    qui valide host / port / chiffrement / identifiants.
        if (!$this->smtpHandshake()) {
            return 1;
        }

        if ($email === '') {
            $this->line('');
            if ($warnings === []) {
                $this->info('Configuration email complète. Pour vérifier le rendu, relancez avec une adresse :');
                $this->line('  php artisan chair:test-mail votre-adresse@exemple.fr');
                return 0;
            }

            $this->warn('Les emails partiront, mais la configuration est incomplète (voir ci-dessus).');
            return 1;
        }

        $types = $type !== null ? [$type] : self::TYPES;

        $this->line('');
        $this->line('Envoi vers ' . $email . ' :');

        $failures = 0;
        foreach ($types as $t) {
            $sent = MailService::send($email, $this->makeMailable($t, $email), 'Test CHAIR');
            if ($sent) {
                $this->line('  [ok]     ' . $t);
            } else {
                $this->line('  [échec]  ' . $t . ' — voir storage/logs/laravel.log');
                $failures++;
            }
        }

        $this->line('');
        if ($failures > 0) {
            $this->error($failures . ' email(s) non envoyé(s) sur ' . count($types) . '.');
            return 1;
        }

        $this->info(count($types) . ' email(s) remis au mailer.');
        return $warnings === [] ? 0 : 1;
    }

    /** Ce que l'application lit RÉELLEMENT (config chargée, pas le fichier .env). */
    private function configurationTable(): void
    {
        $mailer = (string) config('mail.default');

        $rows = [
            ['MAIL_MAILER',       $mailer],
            ['MAIL_FROM_ADDRESS', $this->orEmpty(config('mail.from.address'))],
            ['MAIL_FROM_NAME',    $this->orEmpty(config('mail.from.name'))],
            ['FRONTEND_URL',      $this->orEmpty(config('app.frontend_url'))],
            ['QUEUE_CONNECTION',  $this->orEmpty(config('queue.default'))],
        ];

        if ($mailer === 'smtp') {
            $rows = array_merge($rows, [
                ['MAIL_HOST',       $this->orEmpty(config('mail.mailers.smtp.host'))],
                ['MAIL_PORT',       $this->orEmpty(config('mail.mailers.smtp.port'))],
                ['MAIL_ENCRYPTION', $this->orEmpty(config('mail.mailers.smtp.encryption'))],
                ['MAIL_USERNAME',   $this->orEmpty(config('mail.mailers.smtp.username'))],
                // Jamais la valeur : une commande de diagnostic ne doit pas
                // afficher un mot de passe SMTP dans un terminal ou un log.
                ['MAIL_PASSWORD',   config('mail.mailers.smtp.password') ? '(renseigné)' : '(vide)'],
            ]);
        }

        $this->line('Configuration lue par l\'application :');
        $this->table(['Variable', 'Valeur'], $rows);
    }

    private function orEmpty($value): string
    {
        $value = trim((string) $value);

        return $value === '' ? '(vide)' : $value;
    }

    /**
     * Ouvre puis referme une connexion SMTP sans envoyer de message.
     * Valide host, port, chiffrement et identifiants d'un coup.
     */
    private function smtpHandshake(): bool
    {
        if ((string) config('mail.default') !== 'smtp') {
            return true;
        }

        $this->line('');
        $this->line('Connexion au serveur SMTP ' . config('mail.mailers.smtp.host')
            . ':' . config('mail.mailers.smtp.port') . ' ...');

        try {
            $transport = Mail::mailer('smtp')->getSwiftMailer()->getTransport();
            $transport->start();
            $transport->stop();
        } catch (\Throwable $e) {
            $this->error('Connexion SMTP refusée.');
            $this->line('  ' . $e->getMessage());
            $this->line('');
            $this->line('  Vérifiez MAIL_HOST / MAIL_PORT / MAIL_ENCRYPTION / MAIL_USERNAME /');
            $this->line('  MAIL_PASSWORD auprès de votre fournisseur, puis php artisan config:clear.');
            $this->line('  Détail par fournisseur : docs/app-store/ACTION_GERANT_SMTP.md');
            return false;
        }

        $this->info('Connexion SMTP acceptée (identifiants valides).');
        return true;
    }

    /** Construit le Mailable demandé avec des données de test non persistées. */
    private function makeMailable(string $type, string $email)
    {
        switch ($type) {
            case 'welcome-client':
                return new WelcomeClientMail('Client de test');

            case 'welcome-hairdresser':
                return new WelcomeHairdresserMail('Coiffeur de test');

            case 'appointment-confirmed':
                return new AppointmentConfirmedMail($this->fakeAppointment());

            case 'appointment-cancelled':
                return new AppointmentCancelledMail($this->fakeAppointment());

            case 'review-request':
                return new ReviewRequestMail($this->fakeAppointment('token-de-test-non-valide'));

            case 'reset-password':
            default:
                return new ResetPasswordMail(
                    'Utilisateur de test',
                    MailService::passwordResetUrl($email, 'token-de-test-non-valide'),
                    MailService::passwordResetExpireMinutes()
                );
        }
    }

    /**
     * Rendez-vous de démonstration — jamais sauvegardé, relations montées à la
     * main pour ne toucher ni la base ni un compte réel.
     */
    private function fakeAppointment(?string $reviewToken = null): Appointment
    {
        $user = new User();
        $user->name = 'Coiffeur de test';

        $profile = new HairdresserProfile();
        $profile->slug = 'coiffeur-de-test';
        $profile->setRelation('user', $user);

        $appointment = new Appointment([
            'client_name'      => 'Client de test',
            'client_email'     => 'client@exemple.test',
            'service'          => 'Coupe + barbe',
            'appointment_date' => now()->addDays(3)->format('Y-m-d'),
            'appointment_time' => '14:30:00',
            'duration_minutes' => 45,
            'price'            => 32.00,
            'status'           => 'confirmed',
            // Uniquement pour que le bouton "Voir mes rendez-vous" (réservé aux
            // clients ayant un compte) apparaisse dans l'email de test. Rien
            // n'est lu en base : aucun compte réel n'est concerné.
            'client_id'        => 1,
        ]);
        $appointment->review_token = $reviewToken;
        $appointment->setRelation('hairdresser', $profile);

        return $appointment;
    }
}
