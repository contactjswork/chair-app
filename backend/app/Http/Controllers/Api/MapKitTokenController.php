<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

/**
 * GET /mapkit-token — jeton d'autorisation MapKit JS (Apple Plans, officiel).
 *
 * Signe un JWT ES256 de 30 minutes avec la clé MapKit JS du compte Apple
 * Developer. Configuration (.env) :
 *   MAPKIT_TEAM_ID=XXXXXXXXXX            (Team ID, portail Apple Developer)
 *   MAPKIT_KEY_ID=YYYYYYYYYY             (Key ID de la clé MapKit JS)
 *   MAPKIT_PRIVATE_KEY_PATH=storage/keys/mapkit.p8   (fichier .p8 téléchargé)
 *
 * Sans configuration → 501 : le frontend replie automatiquement sur Leaflet,
 * la carte ne casse jamais. Le token est public par nature (il part dans le
 * navigateur) — courte durée + possibilité de restreindre par origin.
 */
class MapKitTokenController extends Controller
{
    public function token()
    {
        $teamId  = config('services.mapkit.team_id');
        $keyId   = config('services.mapkit.key_id');
        $keyPath = config('services.mapkit.private_key_path');

        if (!$teamId || !$keyId || !$keyPath) {
            return response()->json(['message' => 'MapKit non configuré.'], 501);
        }

        $fullPath = str_starts_with($keyPath, '/') || preg_match('/^[A-Za-z]:/', $keyPath)
            ? $keyPath
            : base_path($keyPath);

        if (!is_readable($fullPath)) {
            report(new \RuntimeException("Clé MapKit introuvable : {$fullPath}"));
            return response()->json(['message' => 'MapKit non configuré.'], 501);
        }

        $privateKey = openssl_pkey_get_private(file_get_contents($fullPath));
        if ($privateKey === false) {
            report(new \RuntimeException('Clé MapKit illisible (format .p8 attendu).'));
            return response()->json(['message' => 'MapKit non configuré.'], 501);
        }

        $now = time();
        $ttl = 1800; // 30 min — MapKit re-demande un token via authorizationCallback à l'expiration

        $header  = $this->b64url(json_encode(['alg' => 'ES256', 'kid' => $keyId, 'typ' => 'JWT']));
        $claims  = ['iss' => $teamId, 'iat' => $now, 'exp' => $now + $ttl];

        // Restriction par origin (optionnelle) : ne l'activer QUE pour le web —
        // l'app Capacitor native a un origin différent (capacitor://localhost)
        // et serait bloquée par ce claim.
        if (config('services.mapkit.restrict_origin')) {
            $claims['origin'] = rtrim(config('app.frontend_url', env('FRONTEND_URL', '')), '/');
        }

        $payload = $this->b64url(json_encode($claims));
        $signingInput = $header . '.' . $payload;

        if (!openssl_sign($signingInput, $der, $privateKey, OPENSSL_ALGO_SHA256)) {
            report(new \RuntimeException('Signature MapKit impossible.'));
            return response()->json(['message' => 'MapKit non configuré.'], 501);
        }

        $signature = $this->derToRaw($der);
        if ($signature === null) {
            report(new \RuntimeException('Signature MapKit : conversion DER invalide.'));
            return response()->json(['message' => 'MapKit non configuré.'], 501);
        }

        return response()->json([
            'token'      => $signingInput . '.' . $this->b64url($signature),
            'expires_in' => $ttl,
        ]);
    }

    private function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * openssl_sign produit une signature ECDSA encodée DER (SEQUENCE de deux
     * INTEGER) ; le format JWT ES256 exige R||S bruts, 32 octets chacun,
     * padding à gauche. Retourne null si la structure DER est inattendue.
     */
    private function derToRaw(string $der): ?string
    {
        $offset = 0;
        $len = strlen($der);

        if ($len < 8 || ord($der[$offset++]) !== 0x30) return null;
        // Longueur de la séquence (forme courte ou longue 1 octet)
        $seqLen = ord($der[$offset++]);
        if ($seqLen === 0x81) $offset++;

        $readInt = function () use ($der, &$offset, $len): ?string {
            if ($offset >= $len || ord($der[$offset++]) !== 0x02) return null;
            $intLen = ord($der[$offset++]);
            if ($offset + $intLen > $len) return null;
            $bytes = substr($der, $offset, $intLen);
            $offset += $intLen;
            // Retire le 0x00 de tête (signe) puis pad à 32 octets
            $bytes = ltrim($bytes, "\x00");
            if (strlen($bytes) > 32) return null;
            return str_pad($bytes, 32, "\x00", STR_PAD_LEFT);
        };

        $r = $readInt();
        $s = $readInt();
        return ($r !== null && $s !== null) ? $r . $s : null;
    }
}
