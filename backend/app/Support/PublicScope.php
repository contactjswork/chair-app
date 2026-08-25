<?php

namespace App\Support;

use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Point UNIQUE de masquage des champs privés avant sérialisation publique.
 *
 * Contexte (audit produit du 2026-08-20) : les endpoints publics renvoyaient
 * le modèle Eloquent brut (`->toArray()`), donc TOUTES les colonnes — dont
 * l'email et le téléphone du coiffeur, son code de parrainage, ses
 * coordonnées GPS exactes, son SIRET, l'URL de son diplôme et des drapeaux
 * internes (mode test CHAIR+, motif de masquage, ajustement de score).
 * Constaté sur GET /hairdressers, GET /hairdressers/{slug} et sur la fiche
 * publique de location de fauteuil (qui exposait en plus toute l'équipe).
 *
 * Règle : tout ce qui n'est pas nécessaire à l'affichage public est retiré
 * ICI, jamais champ par champ dans les contrôleurs (c'est exactement ainsi
 * que la fuite s'est propagée à quatre endpoints).
 *
 * Les surfaces privées (mon propre profil, back-office admin) n'utilisent
 * PAS ce helper et continuent de voir leurs données — elles en ont besoin.
 */
class PublicScope
{
    /** Colonnes du profil coiffeur jamais destinées au public. */
    public const PROFILE_PRIVATE = [
        'siret',
        'siret_verification_status',
        'diploma_document_url',
        'chair_plus_test_mode',
        'hidden_reason',
        'hidden_at',
        'chair_score_adjustment',
        'pro_goals',
        'daily_appointment_goal',
        'booking_window_days',
        'keywords',
    ];

    /** Colonnes du compte utilisateur jamais destinées au public. */
    public const USER_PRIVATE = [
        'email',
        'email_verified_at',
        'phone',
        'referral_code',
        'referred_by_user_id',
        'admin_role_id',
        'active_pro_mode',
        'suspended_at',
        'postal_code',
        // Position exacte du domicile : la ville suffit publiquement, la
        // proximité est calculée côté serveur (jamais besoin du point GPS).
        'latitude',
        'longitude',
    ];

    /** Colonnes du salon jamais destinées au public. */
    public const SALON_PRIVATE = [
        'siret',
        'verification_status',
        'suspended_at',
        'suspended_reason',
        'owner_id',
    ];

    /** Masque un profil coiffeur + son user imbriqué, en place. */
    public static function hairdresser(?HairdresserProfile $profile): ?HairdresserProfile
    {
        if (!$profile) {
            return null;
        }

        $profile->makeHidden(self::PROFILE_PRIVATE);

        if ($profile->relationLoaded('user') && $profile->user) {
            self::user($profile->user);
        }
        if ($profile->relationLoaded('salon') && $profile->salon) {
            self::salon($profile->salon);
        }

        return $profile;
    }

    /** Masque une collection/paginator de profils coiffeurs. */
    public static function hairdressers(iterable $profiles): iterable
    {
        foreach ($profiles as $profile) {
            if ($profile instanceof HairdresserProfile) {
                self::hairdresser($profile);
            }
        }

        return $profiles;
    }

    public static function user(?User $user): ?User
    {
        return $user?->makeHidden(self::USER_PRIVATE);
    }

    /** Masque un salon + son équipe imbriquée si elle est chargée. */
    public static function salon(?Salon $salon): ?Salon
    {
        if (!$salon) {
            return null;
        }

        $salon->makeHidden(self::SALON_PRIVATE);

        if ($salon->relationLoaded('hairdressers')) {
            $team = $salon->getRelation('hairdressers');
            if ($team instanceof Collection) {
                self::hairdressers($team);
            }
        }

        return $salon;
    }
}
