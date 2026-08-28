<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\QrToken;
use App\Models\VerifiedVisit;
use Illuminate\Support\Str;

class QrTokenService
{
    // 30min laissait une fenêtre de rejeu trop large pour un QR photographié/
    // partagé — réduit à 8min (le rafraîchissement auto reste transparent
    // côté UI, voir mon-qr/page.tsx).
    const TTL_MINUTES = 8;

    // Délai minimum entre deux visites du même client chez le même coiffeur
    const MIN_VISIT_INTERVAL_HOURS = 12;

    /**
     * Plafond de visites vérifiables par coiffeur et par jour.
     *
     * Le blocage d'auto-scan et l'intervalle de 12 h protègent contre le rejeu
     * d'UN compte, mais pas contre PLUSIEURS : un coiffeur qui crée cinq
     * comptes et les scanne tour à tour obtient cinq avis certifiés. Rien ne
     * l'en empêchait.
     *
     * Un coiffeur reçoit 8 à 15 clients par jour. Quarante visites dans la
     * journée n'est pas une activité, c'est une anomalie. Le plafond ne rend
     * pas la fraude impossible — rien ne prouvera jamais qu'une coupe a eu
     * lieu — mais il la borne et la rend visible.
     *
     * Posé maintenant, alors que les volumes sont faibles et que tricher n'a
     * encore aucun intérêt : c'est le seul moment où l'on peut fixer une
     * limite sans pénaliser personne.
     */
    const MAX_VISITS_PER_DAY = 15;

    /**
     * Ce coiffeur a-t-il atteint son plafond de visites pour aujourd'hui ?
     *
     * Journée civile en Europe/Paris — celle du coiffeur, pas celle du serveur.
     */
    public static function dailyQuotaReached(int $hairdresserId): bool
    {
        return self::visitsToday($hairdresserId) >= self::MAX_VISITS_PER_DAY;
    }

    /** Nombre de visites vérifiées enregistrées aujourd'hui pour ce coiffeur. */
    public static function visitsToday(int $hairdresserId): int
    {
        return VerifiedVisit::where('hairdresser_id', $hairdresserId)
            ->where('scanned_at', '>=', now()->timezone('Europe/Paris')->startOfDay())
            ->count();
    }

    public static function getOrCreateToken(HairdresserProfile $hairdresser, ?int $specialtyId = null): QrToken
    {
        $existing = QrToken::where('hairdresser_id', $hairdresser->id)
            ->where('valid_until', '>', now())
            ->latest('valid_from')
            ->first();

        return $existing ?? self::createToken($hairdresser, $specialtyId);
    }

    public static function createToken(
        HairdresserProfile $hairdresser,
        ?int $specialtyId = null,
        ?int $ttlMinutes = null,
        ?int $issuedByUserId = null
    ): QrToken {
        $now   = now();
        $until = $now->copy()->addMinutes($ttlMinutes ?? self::TTL_MINUTES);

        // Un nouveau QR doit rendre l'ancien inutilisable immédiatement —
        // sinon "Nouveau QR" ne raccourcit pas vraiment la fenêtre de rejeu
        // d'un QR déjà photographié/partagé (l'UI l'affirme, ce n'était pas
        // vrai avant ce correctif).
        QrToken::where('hairdresser_id', $hairdresser->id)
            ->where('valid_until', '>', $now)
            ->update(['valid_until' => $now]);

        $raw  = $hairdresser->id . '|' . $now->timestamp . '|' . Str::random(16);
        $hash = hash_hmac('sha256', $raw, config('app.key'));

        return QrToken::create([
            'hairdresser_id'    => $hairdresser->id,
            'specialty_id'      => $specialtyId,
            'issued_by_user_id' => $issuedByUserId,
            'token_hash'        => $hash,
            'valid_from'        => $now,
            'valid_until'       => $until,
            'scan_count'        => 0,
        ]);
    }

    public static function findValidToken(string $tokenHash): ?QrToken
    {
        return QrToken::where('token_hash', $tokenHash)
            ->where('valid_from',  '<=', now())
            ->where('valid_until', '>',  now())
            ->with('hairdresser.user')
            ->first();
    }

    public static function canVisit(QrToken $token, int $clientUserId): bool
    {
        $since = now()->subHours(self::MIN_VISIT_INTERVAL_HOURS);

        return !VerifiedVisit::where('hairdresser_id', $token->hairdresser_id)
            ->where('client_user_id', $clientUserId)
            ->where('scanned_at', '>=', $since)
            ->exists();
    }

    public static function recordVisit(
        QrToken $token,
        int     $clientUserId,
        string  $serviceType,
        ?int    $specialtyId = null
    ): VerifiedVisit {
        $visit = VerifiedVisit::create([
            'hairdresser_id'  => $token->hairdresser_id,
            'client_user_id'  => $clientUserId,
            'client_token'    => null,
            'qr_token_id'     => $token->id,
            // Priorité à la spécialité de la prestation réellement choisie par
            // le client — le specialty_id du QR (fixé une fois par le coiffeur
            // à la génération) ne sert plus que de repli.
            'specialty_id'    => $specialtyId ?? $token->specialty_id,
            'service_type'    => $serviceType,
            'scanned_at'      => now(),
        ]);

        $token->hairdresser->increment('verified_visits_count');
        $token->increment('scan_count');

        return $visit;
    }
}
