<?php

namespace App\Services;

/**
 * Vérification SIRET via l'API publique data.gouv.fr (Annuaire des Entreprises)
 * — source unique, réutilisée par SalonController (salon) ET par la
 * vérification indépendante côté coiffeur (accès offres d'emploi / location
 * de fauteuil). Ne PAS dupliquer cet appel HTTP ailleurs.
 */
class SiretVerificationService
{
    /**
     * @return array{valid:bool,siret?:string,business_name?:string,city?:string,activity_code?:string,is_hairdresser?:bool,is_active?:bool,message?:string}
     */
    public static function lookup(string $siret): array
    {
        $ch = curl_init("https://api.annuaire-entreprises.data.gouv.fr/api/v3/etablissement/{$siret}");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 6,
            CURLOPT_HTTPHEADER     => ['Accept: application/json', 'User-Agent: CHAIR-App/1.0'],
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            return ['valid' => false, 'message' => 'SIRET introuvable.'];
        }

        $data         = json_decode($response, true);
        $activityCode = $data['activite_principale'] ?? '';

        return [
            'valid'          => true,
            'siret'          => $siret,
            'business_name'  => $data['nom_commercial'] ?? $data['nom_complet'] ?? '',
            'city'           => $data['libelle_commune'] ?? '',
            'activity_code'  => $activityCode,
            'is_hairdresser' => str_starts_with($activityCode, '9602A'),
            'is_active'      => ($data['etat_administratif'] ?? '') === 'A',
        ];
    }
}
