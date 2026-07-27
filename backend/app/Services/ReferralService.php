<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\ReferralReward;
use App\Models\ShareEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Programme ambassadeur — voir docs/GROWTH.md. Réutilise les briques déjà
 * construites (BadgeService pour les badges, is_featured/chair_plus_until
 * pour les récompenses concrètes) plutôt qu'un système parallèle.
 */
class ReferralService
{
    // Points/récompenses par action — voir docs/GROWTH.md pour le détail.
    // once_per_user : ne peut plus jamais être récompensé une fois obtenu.
    // daily_cap : nombre max de fois récompensé PAR JOUR (anti-spam simple).
    const ACTIONS = [
        'share_profile'      => ['points' => 5,   'daily_cap' => 3],
        'share_post'         => ['points' => 5,   'daily_cap' => 3],
        'social_post'        => ['points' => 30,  'daily_cap' => 1],
        'invite_hairdresser' => ['points' => 80,  'daily_cap' => null, 'boost_days' => 3],
        'invite_salon'       => ['points' => 150, 'daily_cap' => null, 'boost_days' => 7],
        'invite_client'      => ['points' => 40,  'daily_cap' => null],
        'first_review'       => ['points' => 10,  'once_per_user' => true],
        'first_favorite'     => ['points' => 5,   'once_per_user' => true],
    ];

    // Actions qui comptent comme un "filleul" pour les paliers milestone —
    // celles où une AUTRE personne s'est réellement inscrite grâce à ce compte.
    const REFERRAL_ACTIONS = ['invite_hairdresser', 'invite_salon', 'invite_client'];

    // Paliers filleuls (voir CLAUDE.md — décision fondatrice, ne pas modifier
    // sans repasser par Julien) : 5 → 1 mois CHAIR+, 20 → badge ambassadeur,
    // 50 → mise en avant locale, 100 → accès anticipé.
    const MILESTONES = [
        5   => ['chair_plus_days' => 30],
        20  => ['badge_code' => 'ambassador_program'],
        50  => ['boost_days' => 30],
        100 => ['beta_access' => true],
    ];

    public static function codeFor(User $user): string
    {
        if ($user->referral_code) return $user->referral_code;

        $base = Str::upper(Str::slug(explode(' ', $user->name)[0] ?? 'CHAIR', ''));
        $base = substr($base ?: 'CHAIR', 0, 8);
        do {
            $code = $base . Str::upper(Str::random(3));
        } while (User::where('referral_code', $code)->exists());

        $user->update(['referral_code' => $code]);
        return $code;
    }

    /** Posé une seule fois, à l'inscription — jamais réécrit ensuite. */
    public static function attributeSignup(User $newUser, string $referralCode): void
    {
        $referrer = User::where('referral_code', $referralCode)->first();
        if (!$referrer || $referrer->id === $newUser->id) return;

        $newUser->update(['referred_by_user_id' => $referrer->id]);

        $actionType = match ($newUser->role) {
            'hairdresser' => 'invite_hairdresser',
            'salon_owner' => 'invite_salon',
            default       => 'invite_client',
        };

        self::recordAndReward($referrer, $actionType, 'user', $newUser->id, null);
    }

    /**
     * Enregistre une action de partage/parrainage et accorde la récompense
     * si les garde-fous anti-spam (plafond quotidien, once_per_user) le
     * permettent. Retourne la récompense accordée (ou null si aucune —
     * l'action a été loguée pour les statistiques, sans crédit cette fois).
     */
    public static function recordAndReward(
        User $user,
        string $actionType,
        ?string $targetType = null,
        ?int $targetId = null,
        ?string $channel = null
    ): ?ReferralReward {
        if (!isset(self::ACTIONS[$actionType])) return null;
        $config = self::ACTIONS[$actionType];

        ShareEvent::create([
            'user_id'     => $user->id,
            'action_type' => $actionType,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'channel'     => $channel,
            'created_at'  => now(),
        ]);

        if (!empty($config['once_per_user'])) {
            $already = ReferralReward::where('user_id', $user->id)->where('reason', $actionType)->exists();
            if ($already) return null;
        } elseif (!empty($config['daily_cap'])) {
            $todayCount = ReferralReward::where('user_id', $user->id)
                ->where('reason', $actionType)
                ->where('created_at', '>=', now()->startOfDay())
                ->count();
            if ($todayCount >= $config['daily_cap']) return null;
        }

        $reward = ReferralReward::create([
            'user_id'         => $user->id,
            'reason'          => $actionType,
            'points'          => $config['points'] ?? 0,
            'chair_plus_days' => $config['chair_plus_days'] ?? 0,
            'boost_days'      => $config['boost_days'] ?? 0,
            'badge_code'      => null,
            'created_at'      => now(),
        ]);

        self::applyReward($user, $reward);

        if (in_array($actionType, self::REFERRAL_ACTIONS, true)) {
            self::checkMilestones($user);
        }

        return $reward;
    }

    private static function applyReward(User $user, ReferralReward $reward): void
    {
        $profile = $user->hairdresserProfile;
        if (!$profile) return; // récompenses "concrètes" (boost, CHAIR+) réservées aux profils coiffeur

        if ($reward->boost_days > 0) {
            self::extendBoost($profile, $reward->boost_days);
        }
        if ($reward->chair_plus_days > 0) {
            self::extendChairPlus($profile, $reward->chair_plus_days);
        }
    }

    private static function extendBoost(HairdresserProfile $profile, int $days): void
    {
        $base = ($profile->featured_until && $profile->featured_until->isFuture()) ? $profile->featured_until : now();
        $profile->update(['featured_until' => $base->copy()->addDays($days)]);
    }

    private static function extendChairPlus(HairdresserProfile $profile, int $days): void
    {
        $base = ($profile->chair_plus_until && $profile->chair_plus_until->isFuture()) ? $profile->chair_plus_until : now();
        $profile->update(['chair_plus_until' => $base->copy()->addDays($days)]);
    }

    /** Filleuls réels = comptes créés avec ce referral_code, peu importe leur rôle. */
    public static function referralCount(User $user): int
    {
        return User::where('referred_by_user_id', $user->id)->count();
    }

    private static function checkMilestones(User $referrer): void
    {
        $count = self::referralCount($referrer);
        $profile = $referrer->hairdresserProfile;

        foreach (self::MILESTONES as $threshold => $reward) {
            if ($count < $threshold) continue;

            $reason = "milestone_{$threshold}";
            if (ReferralReward::where('user_id', $referrer->id)->where('reason', $reason)->exists()) continue;

            $row = ReferralReward::create([
                'user_id'         => $referrer->id,
                'reason'          => $reason,
                'points'          => 0,
                'chair_plus_days' => $reward['chair_plus_days'] ?? 0,
                'boost_days'      => $reward['boost_days'] ?? 0,
                'badge_code'      => $reward['badge_code'] ?? null,
                'created_at'      => now(),
            ]);

            if ($profile) self::applyReward($referrer, $row);
        }
    }
}
