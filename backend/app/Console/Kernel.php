<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // $schedule->command('inspire')->hourly();
        $schedule->command('chair:purge-expired-stories')->hourly();

        // Rappels de RDV (24h et 1h) — fenêtres de ±15 min, donc la commande
        // DOIT passer toutes les 15 min pour qu'aucun RDV ne tombe entre deux
        // passes. Idempotent (reminded_24h_at / reminded_1h_at) : un cron qui
        // rejoue ne double jamais un rappel.
        $schedule->command('chair:send-appointment-reminders')->everyFifteenMinutes();

        // Capture hebdomadaire des classements. Le lundi tôt : la phrase
        // affichée est « cette semaine », il faut donc un repère par semaine,
        // pris au même moment. Idempotente (updateOrCreate sur le jour) : un
        // planificateur qui rejoue n'ajoute pas une seconde mesure, ce qui
        // fausserait la comparaison suivante.
        $schedule->command('chair:snapshot-specialty-ranks')->weeklyOn(1, '04:30');

        // Le bilan du dimanche soir — le moment ou un coiffeur planifie sa
        // semaine. Jamais envoye vide, idempotent par jour (voir la commande).
        $schedule->command('chair:send-weekly-recap')->weeklyOn(0, '19:00')->timezone('Europe/Paris');

        // Le rappel de re-reservation, cale sur le rythme reel de chaque
        // client. Un seul par rendez-vous termine, jamais si un rendez-vous
        // futur existe deja.
        $schedule->command('chair:send-rebook-reminders')->dailyAt('11:00')->timezone('Europe/Paris');

        // Abonnements Apple (achat intégré CHAIR+) : les renouvellements et
        // annulations App Store arrivent sans que l'app soit ouverte — on
        // re-valide chaque jour les reçus proches de l'échéance.
        $schedule->command('chair:sync-apple-subscriptions')->dailyAt('05:15')->timezone('Europe/Paris');

        // Alerte honnête « ton essai gratuit se termine dans 3 jours » (évite
        // le prélèvement surprise). Idempotent par abonnement.
        $schedule->command('chair:notify-trial-ending')->dailyAt('10:00')->timezone('Europe/Paris');
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
