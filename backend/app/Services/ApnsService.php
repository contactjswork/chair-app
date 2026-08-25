<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Client APNs (Apple Push Notification service) en PHP pur — curl HTTP/2,
 * authentification par jeton ES256 signé avec la clé .p8 du compte Apple
 * Developer. Aucun SDK tiers.
 *
 * Configuration (.env → config/services.php, clé 'apns') :
 *   APNS_KEY_PATH      chemin du fichier .p8 (absolu, ou relatif à base_path).
 *                      À poser HORS webroot — jamais dans Git.
 *   APNS_KEY_ID        Key ID de la clé APNs (portail Apple, Certificates → Keys)
 *   APNS_TEAM_ID       Team ID du compte Apple Developer
 *   APNS_BUNDLE_ID     topic par défaut (app.getchair.client)
 *   APNS_BUNDLE_ID_PRO topic du binaire pro (app.getchair.pro)
 *   APNS_ENVIRONMENT   sandbox | production
 *                      (TestFlight et App Store utilisent PRODUCTION ; sandbox
 *                      ne sert qu'aux builds Xcode de développement direct.)
 *
 * La même clé .p8 signe pour tous les bundles du Team : un seul fichier suffit
 * pour CHAIR CLIENT et CHAIR PRO.
 *
 * Le JWT provider est mis en cache 30 minutes (Apple exige entre 20 et 60 min ;
 * le régénérer à chaque envoi provoque TooManyProviderTokenUpdates).
 */
class ApnsService
{
    private const JWT_CACHE_KEY = 'apns_provider_jwt';
    private const JWT_TTL       = 1800; // 30 min

    /** Toute la configuration nécessaire est-elle présente et utilisable ? */
    public static function isConfigured(): bool
    {
        $d = self::diagnostics();
        return $d['key_id'] && $d['team_id'] && $d['key_path'] && $d['key_readable'] && $d['key_parseable'];
    }

    /**
     * État détaillé de la configuration — consommé par chair:test-push pour
     * dire précisément ce qui manque.
     *
     * @return array{key_path: ?string, key_id: bool, team_id: bool,
     *               key_readable: bool, key_parseable: bool,
     *               curl_http2: bool, environment: string, bundle_id: string}
     */
    public static function diagnostics(): array
    {
        $keyPath  = config('services.apns.key_path');
        $fullPath = $keyPath ? self::resolvePath($keyPath) : null;
        $readable = $fullPath !== null && is_readable($fullPath);

        $parseable = false;
        if ($readable) {
            $pkey = openssl_pkey_get_private((string) file_get_contents($fullPath));
            $parseable = $pkey !== false;
        }

        return [
            'key_path'      => $fullPath,
            'key_id'        => !empty(config('services.apns.key_id')),
            'team_id'       => !empty(config('services.apns.team_id')),
            'key_readable'  => $readable,
            'key_parseable' => $parseable,
            'curl_http2'    => self::supportsHttp2(),
            'environment'   => (string) config('services.apns.environment', 'production'),
            'bundle_id'     => (string) config('services.apns.bundle_id', 'app.getchair.client'),
        ];
    }

    /**
     * L'extension curl locale sait-elle parler HTTP/2 ? APNs l'exige.
     * Sans HTTP/2 : aucun envoi n'est tenté (dégradation propre, journalisée),
     * les notifications internes continuent normalement.
     */
    public static function supportsHttp2(): bool
    {
        if (!function_exists('curl_version') || !defined('CURL_VERSION_HTTP2')) {
            return false;
        }
        $v = curl_version();
        return (bool) (($v['features'] ?? 0) & CURL_VERSION_HTTP2);
    }

    /** Topic APNs pour un binaire donné ('client' | 'pro' | null → défaut). */
    public static function topicForApp(?string $app): string
    {
        if ($app === 'pro') {
            return (string) config('services.apns.bundle_id_pro', 'app.getchair.pro');
        }
        return (string) config('services.apns.bundle_id', 'app.getchair.client');
    }

    /**
     * JWT provider ES256, mis en cache 30 min. Null si la configuration est
     * absente ou la clé illisible (jamais d'exception).
     */
    public static function jwt(): ?string
    {
        try {
            $cached = Cache::get(self::JWT_CACHE_KEY);
            if (is_string($cached) && $cached !== '') {
                return $cached;
            }

            $token = self::signJwt();
            if ($token !== null) {
                Cache::put(self::JWT_CACHE_KEY, $token, self::JWT_TTL);
            }
            return $token;
        } catch (\Throwable $e) {
            Log::warning('APNs JWT generation failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Signe un JWT provider neuf (sans cache) — même motif ES256 que
     * MapKitTokenController (openssl_sign + conversion DER → R||S).
     */
    public static function signJwt(): ?string
    {
        $keyId  = config('services.apns.key_id');
        $teamId = config('services.apns.team_id');
        $path   = config('services.apns.key_path');

        if (!$keyId || !$teamId || !$path) {
            return null;
        }

        $fullPath = self::resolvePath($path);
        if (!is_readable($fullPath)) {
            Log::warning('APNs key file not readable', ['path' => $fullPath]);
            return null;
        }

        $privateKey = openssl_pkey_get_private((string) file_get_contents($fullPath));
        if ($privateKey === false) {
            Log::warning('APNs key file not parseable (.p8 attendu)', ['path' => $fullPath]);
            return null;
        }

        $header  = self::b64url((string) json_encode(['alg' => 'ES256', 'kid' => $keyId]));
        $claims  = self::b64url((string) json_encode(['iss' => $teamId, 'iat' => time()]));
        $signingInput = $header . '.' . $claims;

        if (!openssl_sign($signingInput, $der, $privateKey, OPENSSL_ALGO_SHA256)) {
            Log::warning('APNs JWT signature failed');
            return null;
        }

        $signature = self::derToRaw($der);
        if ($signature === null) {
            Log::warning('APNs JWT: conversion DER invalide');
            return null;
        }

        return $signingInput . '.' . self::b64url($signature);
    }

    /**
     * Envoie UN push à UN token. Best-effort : ne lève jamais d'exception,
     * timeouts courts (2 s connexion, 5 s total) pour ne jamais bloquer la
     * requête HTTP appelante.
     *
     * @param  string      $deviceToken token APNs hexadécimal de l'appareil
     * @param  array       $payload     payload JSON complet (clé 'aps' + data)
     * @param  string|null $topic       bundle id ; null → APNS_BUNDLE_ID
     * @return array{ok: bool, status: ?int, reason: ?string, body: string, error: ?string}
     *         reason = champ "reason" APNs (BadDeviceToken, Unregistered...)
     */
    public static function send(string $deviceToken, array $payload, ?string $topic = null): array
    {
        $result = ['ok' => false, 'status' => null, 'reason' => null, 'body' => '', 'error' => null];

        try {
            if (!self::supportsHttp2()) {
                $result['error'] = 'curl sans support HTTP/2 — envoi APNs impossible sur ce serveur';
                Log::warning('APNs skipped: no HTTP/2 in curl');
                return $result;
            }

            $jwt = self::jwt();
            if ($jwt === null) {
                $result['error'] = 'APNs non configuré (clé .p8 / KEY_ID / TEAM_ID)';
                return $result;
            }

            // services.apns.host : surcharge réservée aux TESTS (mock local) —
            // ne jamais la définir en production.
            $host = config('services.apns.host')
                ?: (config('services.apns.environment', 'production') === 'sandbox'
                    ? 'https://api.sandbox.push.apple.com'
                    : 'https://api.push.apple.com');

            $topic = $topic ?: (string) config('services.apns.bundle_id', 'app.getchair.client');

            $ch = curl_init($host . '/3/device/' . $deviceToken);
            curl_setopt_array($ch, [
                CURLOPT_HTTP_VERSION   => defined('CURL_HTTP_VERSION_2TLS')
                    ? CURL_HTTP_VERSION_2TLS
                    : CURL_HTTP_VERSION_2_0,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT        => 5,
                CURLOPT_HTTPHEADER     => [
                    'authorization: bearer ' . $jwt,
                    'apns-topic: ' . $topic,
                    'apns-push-type: alert',
                    'apns-priority: 10',
                    'apns-expiration: ' . (time() + 3600),
                    'content-type: application/json',
                ],
            ]);

            $body   = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $errno  = curl_errno($ch);
            $error  = curl_error($ch);
            curl_close($ch);

            if ($body === false || $errno !== 0) {
                $result['error'] = 'curl: ' . ($error ?: ('errno ' . $errno));
                Log::warning('APNs network error', ['error' => $result['error']]);
                return $result;
            }

            $result['status'] = (int) $status;
            $result['body']   = (string) $body;
            $result['ok']     = $status === 200;

            if (!$result['ok']) {
                $decoded = json_decode((string) $body, true);
                $result['reason'] = is_array($decoded) ? ($decoded['reason'] ?? null) : null;

                if ($result['reason'] === 'TooManyProviderTokenUpdates') {
                    // On régénère les JWT trop souvent — le cache a dû sauter.
                    Log::warning('APNs TooManyProviderTokenUpdates — vérifier le cache du JWT provider');
                } elseif (!self::isDeadToken((int) $status, $result['reason'])) {
                    Log::warning('APNs push rejected', [
                        'status' => $status,
                        'reason' => $result['reason'],
                        'topic'  => $topic,
                    ]);
                }
            }

            return $result;
        } catch (\Throwable $e) {
            $result['error'] = $e->getMessage();
            Log::warning('APNs send failed', ['error' => $e->getMessage()]);
            return $result;
        }
    }

    /**
     * Ce refus signifie-t-il que le token ne désignera plus jamais cet
     * appareil ? (→ désactiver la ligne en base, ne plus lui envoyer)
     */
    public static function isDeadToken(int $status, ?string $reason): bool
    {
        return $status === 410
            || in_array($reason, ['BadDeviceToken', 'Unregistered', 'ExpiredToken', 'DeviceTokenNotForTopic'], true);
    }

    /** Chemin absolu du .p8 (accepte un chemin relatif à base_path). */
    private static function resolvePath(string $path): string
    {
        return str_starts_with($path, '/') || preg_match('/^[A-Za-z]:/', $path)
            ? $path
            : base_path($path);
    }

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * openssl_sign produit une signature ECDSA encodée DER ; JWT ES256 exige
     * R||S bruts (32 octets chacun, padding à gauche). Motif identique à
     * MapKitTokenController::derToRaw (éprouvé en production).
     */
    private static function derToRaw(string $der): ?string
    {
        $offset = 0;
        $len = strlen($der);

        if ($len < 8 || ord($der[$offset++]) !== 0x30) return null;
        $seqLen = ord($der[$offset++]);
        if ($seqLen === 0x81) $offset++;

        $readInt = function () use ($der, &$offset, $len): ?string {
            if ($offset >= $len || ord($der[$offset++]) !== 0x02) return null;
            $intLen = ord($der[$offset++]);
            if ($offset + $intLen > $len) return null;
            $bytes = substr($der, $offset, $intLen);
            $offset += $intLen;
            $bytes = ltrim($bytes, "\x00");
            if (strlen($bytes) > 32) return null;
            return str_pad($bytes, 32, "\x00", STR_PAD_LEFT);
        };

        $r = $readInt();
        $s = $readInt();
        return ($r !== null && $s !== null) ? $r . $s : null;
    }
}
