<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\User;
use App\Services\ApnsService;
use Illuminate\Console\Command;

/**
 * Diagnostic et test du push APNs natif.
 *
 * C'est LA commande à lancer après avoir posé la clé .p8 sur le serveur :
 *
 *   php artisan chair:test-push julien@getchair.app
 *
 * Elle vérifie la configuration (variables .env, fichier .p8 lisible, JWT
 * signable, curl HTTP/2), liste les appareils enregistrés de l'utilisateur,
 * envoie un push de test à chacun et affiche la réponse APNs BRUTE.
 *
 * Sans configuration : dit précisément ce qui manque et sort en erreur (1).
 * Avec --check : s'arrête après le diagnostic, n'envoie rien.
 */
class TestPush extends Command
{
    protected $signature = 'chair:test-push
        {email? : Email de l\'utilisateur destinataire}
        {--check : Diagnostic de configuration uniquement, aucun envoi}';

    protected $description = 'Diagnostique la configuration APNs et envoie un push de test';

    public function handle(): int
    {
        // ---- 1. Diagnostic de configuration -----------------------------
        $d = ApnsService::diagnostics();

        $this->line('');
        $this->line('  Diagnostic APNs');
        $this->line('  ---------------');
        $this->statusLine('APNS_KEY_ID', $d['key_id'], 'absent du .env (Key ID, portail Apple > Keys)');
        $this->statusLine('APNS_TEAM_ID', $d['team_id'], 'absent du .env (Team ID, portail Apple > Membership)');
        $this->statusLine('APNS_KEY_PATH', (bool) $d['key_path'], 'absent du .env (chemin du fichier .p8, hors webroot)');

        if ($d['key_path']) {
            $this->statusLine('Fichier .p8 lisible', $d['key_readable'], 'introuvable ou illisible : ' . $d['key_path']);
            if ($d['key_readable']) {
                $this->statusLine('Clé privée valide', $d['key_parseable'], 'openssl ne peut pas lire ce fichier (format .p8 attendu)');
            }
        }

        $this->statusLine('curl HTTP/2', $d['curl_http2'], 'extension curl sans HTTP/2 — APNs impossible sur ce PHP');
        $this->line('  Environnement       : ' . $d['environment']
            . ($d['environment'] === 'sandbox' ? '  (attention : TestFlight utilise PRODUCTION)' : ''));
        $this->line('  Topic client        : ' . config('services.apns.bundle_id', 'app.getchair.client'));
        $this->line('  Topic pro           : ' . config('services.apns.bundle_id_pro', 'app.getchair.pro'));

        if (!ApnsService::isConfigured() || !$d['curl_http2']) {
            $this->line('');
            $this->error('APNs non opérationnel — corriger les points ci-dessus puis relancer.');
            $this->line('Variables attendues dans .env : APNS_KEY_PATH, APNS_KEY_ID, APNS_TEAM_ID,');
            $this->line('APNS_BUNDLE_ID, APNS_BUNDLE_ID_PRO, APNS_ENVIRONMENT (voir .env.example).');
            return 1;
        }

        $jwt = ApnsService::signJwt();
        $this->statusLine('JWT ES256 signable', $jwt !== null, 'la signature échoue (clé corrompue ?)');
        if ($jwt === null) {
            return 1;
        }
        $this->line('  JWT (30 premiers)   : ' . substr($jwt, 0, 30) . '...');

        if ($this->option('check')) {
            $this->line('');
            $this->info('Configuration APNs valide. (--check : aucun envoi effectué)');
            return 0;
        }

        // ---- 2. Destinataire et ses appareils ---------------------------
        $email = $this->argument('email');
        if ($email === null) {
            $this->line('');
            $this->error('Email manquant. Exemple : php artisan chair:test-push julien@getchair.app');
            return 1;
        }

        $user = User::where('email', $email)->first();
        if ($user === null) {
            $this->error("Aucun utilisateur avec l'email {$email}.");
            return 1;
        }

        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        $this->line('');
        $this->line('  Destinataire : ' . $user->name . ' (#' . $user->id . ', ' . $user->email . ')');
        $this->line('  Appareils    : ' . $subscriptions->count());

        if ($subscriptions->isEmpty()) {
            $this->line('');
            $this->error('Aucun appareil enregistré pour cet utilisateur.');
            $this->line("L'app native appelle POST /push/register après connexion, une fois que");
            $this->line("l'utilisateur a accepté les notifications iOS. Vérifier que le build");
            $this->line('TestFlight installé intègre bien cet appel.');
            return 1;
        }

        $this->table(
            ['ID', 'Plateforme', 'Appareil', 'Topic', 'Actif', 'Dernier envoi'],
            $subscriptions->map(function ($s) {
                return [
                    $s->id,
                    $s->platform ?? '—',
                    $s->device_name ?? '—',
                    $s->bundle_id ?? '—',
                    $s->enabled ? 'oui' : 'NON (token mort)',
                    $s->last_used_at ? $s->last_used_at->format('d/m/Y H:i') : 'jamais',
                ];
            })->all()
        );

        // ---- 3. Envoi de test, réponse APNs brute par appareil ----------
        $payload = [
            'aps' => [
                'alert' => [
                    'title' => 'CHAIR — test push',
                    'body'  => 'Si vous lisez ceci sur votre appareil, le push APNs fonctionne.',
                ],
                'sound' => 'default',
            ],
            'type' => 'push_test',
            'url'  => '/app/notifications',
        ];

        $failures = 0;
        foreach ($subscriptions as $s) {
            if (!$s->enabled) {
                $this->warn("  Appareil #{$s->id} ignoré (token désactivé après refus APNs).");
                continue;
            }

            $topic  = $s->bundle_id ?: ApnsService::topicForApp(null);
            $result = ApnsService::send((string) $s->token, $payload, $topic);

            $this->line('');
            $this->line("  Appareil #{$s->id} (topic {$topic})");
            $this->line('    HTTP    : ' . ($result['status'] ?? '—'));
            $this->line('    Réponse : ' . ($result['body'] !== '' ? $result['body'] : '(vide — normal pour 200 OK)'));
            if ($result['reason'] !== null) {
                $this->line('    Raison  : ' . $result['reason']);
            }
            if ($result['error'] !== null) {
                $this->line('    Erreur  : ' . $result['error']);
            }

            if ($result['ok']) {
                $this->info('    Push accepté par APNs — il doit arriver sur l\'appareil.');
                $s->forceFill(['last_used_at' => now()])->save();
            } else {
                $failures++;
                if (ApnsService::isDeadToken((int) ($result['status'] ?? 0), $result['reason'])) {
                    $s->forceFill(['enabled' => false])->save();
                    $this->warn('    Token mort — désactivé en base (l\'app le ré-enregistrera au prochain lancement).');
                }
            }
        }

        $this->line('');
        return $failures === 0 ? 0 : 1;
    }

    private function statusLine(string $label, bool $ok, string $hint): void
    {
        $pad = str_pad($label, 20);
        if ($ok) {
            $this->line("  {$pad}: OK");
        } else {
            $this->line("  {$pad}: MANQUANT — {$hint}");
        }
    }
}
