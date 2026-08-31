<?php

namespace App\Console\Commands;

use App\Models\HairdresserProfile;
use App\Models\Notification;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\SpecialtyReputationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Le bilan hebdomadaire du coiffeur — le rituel qui fait rouvrir l'app.
 *
 * Usage : php artisan chair:send-weekly-recap
 * Planifiée le dimanche à 19h (voir Console\Kernel) : le moment où un
 * coiffeur planifie sa semaine, pas le lundi matin où il la subit.
 *
 * Une notification par semaine et par coiffeur, qui tient en une phrase :
 * vues du profil, rendez-vous, et le mouvement de classement s'il y en a un.
 *
 * Deux règles d'honnêteté :
 * - jamais envoyée vide. Une semaine à 0 vue et 0 rendez-vous ne produit
 *   pas de push « 0 vues » — un bilan qui dit « rien » n'est pas un bilan,
 *   c'est un reproche.
 * - idempotente par jour : si un récap weekly_recap existe déjà aujourd'hui
 *   pour ce coiffeur, on passe. Un planificateur qui rejoue ne spamme pas.
 */
class SendWeeklyRecap extends Command
{
    protected $signature   = 'chair:send-weekly-recap';
    protected $description = 'Envoie le bilan hebdomadaire aux coiffeurs (vues, RDV, classement)';

    public function handle(): int
    {
        $ilYaSeptJours = now('Europe/Paris')->subDays(7);
        $envoyes = 0;

        HairdresserProfile::query()
            ->with('user')
            ->whereHas('user')
            ->chunkById(100, function ($lot) use ($ilYaSeptJours, &$envoyes) {
                foreach ($lot as $profile) {
                    if ($this->dejaEnvoyeAujourdhui($profile->user_id)) {
                        continue;
                    }

                    $vues = DB::table('profile_views')
                        ->where('hairdresser_profile_id', $profile->id)
                        ->where('created_at', '>=', $ilYaSeptJours)
                        ->count();

                    $rdv = DB::table('appointments')
                        ->where('hairdresser_id', $profile->id)
                        ->whereIn('status', ['confirmed', 'completed'])
                        ->where('created_at', '>=', $ilYaSeptJours)
                        ->count();

                    $rang = $this->phraseClassement($profile);

                    // Rien à dire = rien envoyé. Un récap vide est un reproche.
                    if ($vues === 0 && $rdv === 0 && $rang === null) {
                        continue;
                    }

                    NotificationService::sendTyped(
                        (int) $profile->user_id,
                        'weekly_recap',
                        [
                            'vues' => (string) $vues,
                            'rdv'  => (string) $rdv,
                            'rang' => $rang ?? 'Continue comme ça.',
                        ],
                        NotificationCopy::AUDIENCE_PRO,
                        ['url' => '/pro']
                    );
                    $envoyes++;
                }
            });

        $this->info("{$envoyes} récap(s) hebdomadaire(s) envoyé(s).");
        return 0;
    }

    private function dejaEnvoyeAujourdhui(int $userId): bool
    {
        return Notification::where('user_id', $userId)
            ->where('type', 'weekly_recap')
            ->whereDate('created_at', now('Europe/Paris')->toDateString())
            ->exists();
    }

    /**
     * Le mouvement de la spécialité principale, en une demi-phrase.
     * Null quand il n'y a ni classement ni mouvement — le récap dit alors
     * seulement ce qui s'est passé, sans meubler.
     */
    private function phraseClassement(HairdresserProfile $profile): ?string
    {
        $highlights = SpecialtyReputationService::publicHighlights($profile, true);
        $premier = $highlights[0] ?? null;
        if (!$premier || $premier['local_rank'] === null) {
            return null;
        }

        $delta = $premier['rank_delta'] ?? null;
        if ($delta !== null && $delta > 0) {
            return "+{$delta} place" . ($delta > 1 ? 's' : '') . " en {$premier['specialty_name']} 📈";
        }
        if ($delta !== null && $delta < 0) {
            $abs = abs($delta);
            return "{$abs} place" . ($abs > 1 ? 's' : '') . " perdue" . ($abs > 1 ? 's' : '') . " en {$premier['specialty_name']}.";
        }

        return "Toujours {$premier['local_rank']}e en {$premier['specialty_name']}.";
    }
}
