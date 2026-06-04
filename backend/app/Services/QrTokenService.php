<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\QrToken;
use App\Models\VerifiedVisit;
use Illuminate\Support\Str;

class QrTokenService
{
    const TTL_MINUTES = 30;

    // Délai minimum entre deux visites du même client chez le même coiffeur
    const MIN_VISIT_INTERVAL_HOURS = 12;

    public static function getOrCreateToken(HairdresserProfile $hairdresser): QrToken
    {
        $existing = QrToken::where('hairdresser_id', $hairdresser->id)
            ->where('valid_until', '>', now())
            ->latest('valid_from')
            ->first();

        return $existing ?? self::createToken($hairdresser);
    }

    public static function createToken(HairdresserProfile $hairdresser): QrToken
    {
        $now   = now();
        $until = $now->copy()->addMinutes(self::TTL_MINUTES);

        $raw  = $hairdresser->id . '|' . $now->timestamp . '|' . Str::random(16);
        $hash = hash_hmac('sha256', $raw, config('app.key'));

        return QrToken::create([
            'hairdresser_id' => $hairdresser->id,
            'token_hash'     => $hash,
            'valid_from'     => $now,
            'valid_until'    => $until,
            'scan_count'     => 0,
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
        string  $serviceType
    ): VerifiedVisit {
        $visit = VerifiedVisit::create([
            'hairdresser_id'  => $token->hairdresser_id,
            'client_user_id'  => $clientUserId,
            'client_token'    => null,
            'qr_token_id'     => $token->id,
            'service_type'    => $serviceType,
            'scanned_at'      => now(),
        ]);

        $token->hairdresser->increment('verified_visits_count');
        $token->increment('scan_count');

        return $visit;
    }
}
