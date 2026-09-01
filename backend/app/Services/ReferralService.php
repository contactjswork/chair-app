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
    // Récompenses de parrainage réel — voir docs/GROWTH.md. IMPORTANT : ces
    // entrées ne sont plus JAMAIS déclenchables depuis une requête cliente.
    // Le seul appelant autorisé est attributeSignup() ci-dessous, exécuté
    // côté serveur au moment où un filleul termine réellement son inscription.
    // (Avant le 2026-07-29, ReferralController::share() acceptait n'importe
    // quel action_type de cette liste depuis le frontend — un utilisateur
    // pouvait donc s'auto-créditer des points/du boost à l'infini en rejouant
    // POST /share-events. Voir git blame pour l'ancien comportement.)
    const ACTIONS = [
        'invite_hairdresser' => ['points' => 80,  'boost_days' => 3],
        'invite_salon'       => ['points' => 150, 'boost_days' => 7],
        'invite_client'      => ['points' => 40],
    ];

    // Actions de partage : pur télémétrie (compteur "invitations envoyées"),
    // ne rapportent et n'ont jamais rapporté de points par elles-mêmes. Seule
    // une inscription réelle via le lien crédite des points — voir ACTIONS.
    const TELEMETRY_ACTIONS = ['share_profile', 'share_post', 'social_post'];

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

    /**
     * Seul point d'entrée qui crédite un parrain — appelé exclusivement par
     * AuthController::register(), côté serveur, quand un filleul termine
     * réellement son inscription. Jamais depuis une route déclenchable par
     * une simple action de partage/copie côté client.
     *
     * Garde-fous anti-fraude :
     * - auto-parrainage impossible (référent == filleul) ;
     * - un compte ne peut être rattaché qu'à UN SEUL parrain, une seule fois
     *   (referred_by_user_id n'est jamais réécrit s'il est déjà posé) ;
     * - un parrain suspendu ne peut plus être crédité ;
     * - contrainte unique en base (reason, target_type, target_id) sur
     *   referral_rewards : même si deux requêtes concurrentes arrivaient ici
     *   pour le même filleul, une seule insertion peut réussir.
     */
    public static function attributeSignup(User $newUser, string $referralCode): void
    {
        if ($newUser->referred_by_user_id) return; // déjà rattaché, ne jamais réécrire

        $referrer = User::where('referral_code', $referralCode)->first();
        if (!$referrer) return;
        if ($referrer->id === $newUser->id) return; // auto-parrainage
        if ($referrer->suspended_at) return; // compte suspendu : aucun crédit

        $newUser->update(['referred_by_user_id' => $referrer->id]);

        $actionType = match ($newUser->role) {
            'hairdresser' => 'invite_hairdresser',
            'salon_owner' => 'invite_salon',
            default       => 'invite_client',
        };

        self::recordAndReward($referrer, $actionType, 'user', $newUser->id);
    }

    /**
     * Enregistre une action de partage — pure télémétrie ("invitations
     * envoyées"), ne crédite jamais de points. La liste des action_type
     * acceptés (TELEMETRY_ACTIONS) exclut volontairement les reasons de
     * ACTIONS : impossible de faire créditer un invite_* via cette voie.
     */
    public static function logShare(User $user, string $actionType, ?string $targetType, ?int $targetId, ?string $channel): void
    {
        if (!in_array($actionType, self::TELEMETRY_ACTIONS, true)) return;

        ShareEvent::create([
            'user_id'     => $user->id,
            'action_type' => $actionType,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'channel'     => $channel,
            'created_at'  => now(),
        ]);
    }

    /**
     * Crée la récompense pour un parrain, de façon idempotente : la
     * contrainte unique (reason, target_type, target_id) fait échouer toute
     * seconde tentative pour la même cible (même sous course concurrente),
     * on l'attrape simplement et on retourne null.
     */
    private static function recordAndReward(User $user, string $actionType, ?string $targetType, ?int $targetId): ?ReferralReward
    {
        if (!isset(self::ACTIONS[$actionType])) return null;
        $config = self::ACTIONS[$actionType];

        try {
            $reward = DB::transaction(function () use ($user, $actionType, $targetType, $targetId, $config) {
                return ReferralReward::create([
                    'user_id'         => $user->id,
                    'reason'          => $actionType,
                    'target_type'     => $targetType,
                    'target_id'       => $targetId,
                    'points'          => $config['points'] ?? 0,
                    'chair_plus_days' => $config['chair_plus_days'] ?? 0,
                    'boost_days'      => $config['boost_days'] ?? 0,
                    'badge_code'      => null,
                    'created_at'      => now(),
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Violation de la contrainte unique = ce filleul a déjà été
            // crédité (course concurrente) : comportement attendu, pas une erreur.
            if (str_contains($e->getMessage(), 'referral_rewards_reason_target_unique')) return null;
            throw $e;
        }

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
        $profile->forceFill(['featured_until' => $base->copy()->addDays($days)])->save();
    }

    private static function extendChairPlus(HairdresserProfile $profile, int $days): void
    {
        $base = ($profile->chair_plus_until && $profile->chair_plus_until->isFuture()) ? $profile->chair_plus_until : now();
        $profile->forceFill(['chair_plus_until' => $base->copy()->addDays($days)])->save();
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
