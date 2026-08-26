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
