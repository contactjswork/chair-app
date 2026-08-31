<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\LoyaltyProgram;
use App\Models\LoyaltyReward;
use App\Models\VerifiedVisit;

/**
 * La mécanique de la carte de fidélité.
 *
 * Une seule règle de comptage, appliquée partout : la progression d'un
 * client = ses passages vérifiés chez CE coiffeur depuis le début du cycle
 * en cours. Le cycle commence à l'activation du programme, puis repart à
 * chaque récompense débloquée. Compter « depuis toujours » ferait tout
 * débloquer le premier jour aux habitués ; compter modulo casserait dès que
 * le coiffeur change son seuil en cours de route.
 */
class LoyaltyService
{
    /** Le programme actif d'un coiffeur, ou null (pas d'add-on = pas de programme). */
    public static function activeProgram(HairdresserProfile $profile): ?LoyaltyProgram
    {
        if (!$profile->hasLoyaltyAddon()) {
            return null;
        }

        return LoyaltyProgram::where('hairdresser_id', $profile->id)
            ->where('is_active', true)
            ->first();
    }

    /**
     * L'état de la carte d'un client chez un coiffeur.
     * Null si aucun programme actif — la carte n'existe pas, on n'affiche rien.
     */
    public static function cardFor(HairdresserProfile $profile, int $clientUserId): ?array
    {
        $program = self::activeProgram($profile);
        if (!$program) {
            return null;
        }

        $debutCycle = LoyaltyReward::where('hairdresser_id', $profile->id)
            ->where('client_user_id', $clientUserId)
            ->latest('unlocked_at')
            ->value('unlocked_at') ?? $program->counting_since;

        $progress = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->where('client_user_id', $clientUserId)
            ->where('scanned_at', '>', $debutCycle)
            ->count();

        $enAttente = LoyaltyReward::where('hairdresser_id', $profile->id)
            ->where('client_user_id', $clientUserId)
            ->whereNull('redeemed_at')
            ->orderBy('unlocked_at')
            ->get(['id', 'reward_label', 'unlocked_at']);

        return [
            'visits_required' => $program->visits_required,
            'reward_label'    => $program->reward_label,
            // La progression affichée ne dépasse jamais le seuil : au-delà,
            // c'est une récompense, pas une barre plus pleine que pleine.
            'progress'        => min($progress, $program->visits_required),
            'pending_rewards' => $enAttente,
        ];
    }

    /**
     * Appelé à CHAQUE visite vérifiée (VisitController::confirmVisit).
     * Fait avancer la carte et débloque la récompense au palier. Renvoie
     * l'état de la carte après coup, pour l'écran de scan — c'est LE moment
     * où montrer « plus que 2 passages » a de l'effet.
     */
    public static function onVerifiedVisit(HairdresserProfile $profile, int $clientUserId): ?array
    {
        $program = self::activeProgram($profile);
        if (!$program) {
            return null;
        }

        $carte = self::cardFor($profile, $clientUserId);
        if (!$carte) {
            return null;
        }

        if ($carte['progress'] >= $program->visits_required) {
            // Le libellé et le seuil sont FIGÉS au déblocage : le coiffeur
            // qui change son programme ensuite ne réécrit pas sa dette.
            LoyaltyReward::create([
                'hairdresser_id'  => $profile->id,
                'client_user_id'  => $clientUserId,
                'reward_label'    => $program->reward_label,
                'visits_required' => $program->visits_required,
                'unlocked_at'     => now(),
            ]);

            NotificationService::sendTyped(
                $clientUserId,
                'loyalty_unlocked',
                [
                    'coiffeur'   => $profile->user->name ?? 'ton coiffeur',
                    'recompense' => $program->reward_label,
                ],
                NotificationCopy::AUDIENCE_CLIENT,
                ['url' => "/app/coiffeur/{$profile->slug}"]
            );
            if ($profile->user_id) {
                NotificationService::sendTyped(
                    (int) $profile->user_id,
                    'loyalty_unlocked',
                    ['recompense' => $program->reward_label],
                    NotificationCopy::AUDIENCE_PRO,
                    ['url' => '/pro/fidelite']
                );
            }

            // La carte repart de zéro pour le cycle suivant.
            return array_merge(self::cardFor($profile, $clientUserId) ?? [], ['just_unlocked' => true]);
        }

        return array_merge($carte, ['just_unlocked' => false]);
    }
}
