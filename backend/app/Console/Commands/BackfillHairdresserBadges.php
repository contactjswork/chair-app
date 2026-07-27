<?php

namespace App\Console\Commands;

use App\Models\HairdresserProfile;
use App\Services\BadgeService;
use App\Services\SpecialtyReputationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Backfill à lancer UNE SEULE FOIS après le déploiement du système de
 * notifications de déblocage de badge.
 *
 * Sans ce backfill, la table `hairdresser_badges` démarre vide : la première
 * action d'un coiffeur existant (post, avis, RDV) ferait passer TOUS ses
 * badges déjà acquis pour "nouveaux" et déclencherait une rafale de
 * notifications sur des badges obtenus depuis des mois.
 *
 * Ce script enregistre silencieusement (sans notification) les badges déjà
 * débloqués + persiste chair_score/chair_level pour chaque profil existant.
 *
 * Usage :
 *   php artisan chair:backfill-badges
 */
class BackfillHairdresserBadges extends Command
{
    protected $signature   = 'chair:backfill-badges';
    protected $description = 'Backfill silencieux des badges déjà débloqués (à lancer une fois après déploiement)';

    public function handle(): int
    {
        $profiles = HairdresserProfile::with('user')->get();

        if ($profiles->isEmpty()) {
            $this->info('Aucun profil coiffeur à traiter.');
            return 0;
        }

        $this->info("Profils à traiter : {$profiles->count()}");
        $this->newLine();

        foreach ($profiles as $profile) {
            BadgeService::syncCounters($profile);
            SpecialtyReputationService::refreshAll($profile);
            $unlocked = BadgeService::getUnlockedBadges($profile);

            $rows = array_map(fn($badge) => [
                'hairdresser_profile_id' => $profile->id,
                'badge_code'             => $badge['code'],
                'unlocked_at'            => now(),
            ], $unlocked);

            if (!empty($rows)) {
                DB::table('hairdresser_badges')->insertOrIgnore($rows);
            }

            $points = BadgeService::computePoints($profile);
            $level  = BadgeService::getLevel($points);

            DB::table('hairdresser_profiles')->where('id', $profile->id)->update([
                'chair_score' => $points,
                'chair_level' => $level['level'],
            ]);

            $this->line(" <info>OK</info>  [{$profile->slug}] {$points} pts — niveau {$level['name']} — " . count($unlocked) . ' badge(s)');
        }

        $this->newLine();
        $this->info('Backfill terminé. Les prochains déblocages déclencheront des notifications normalement.');

        return 0;
    }
}
