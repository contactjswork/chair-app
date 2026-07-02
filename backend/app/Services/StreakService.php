<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use Illuminate\Support\Facades\DB;

class StreakService
{
    /**
     * Enregistre une activité du coiffeur et met à jour le streak.
     * Appelé depuis PostController, ReviewController, ProfileController, AppointmentController.
     */
    public static function record(HairdresserProfile $profile): void
    {
        $today = now()->toDateString();

        $row = DB::table('hairdresser_streaks')
            ->where('hairdresser_id', $profile->id)
            ->first();

        if (!$row) {
            DB::table('hairdresser_streaks')->insert([
                'hairdresser_id'   => $profile->id,
                'current_streak'   => 1,
                'longest_streak'   => 1,
                'weekly_streak'    => 1,
                'total_active_days'=> 1,
                'last_activity_date' => $today,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
            return;
        }

        $last = $row->last_activity_date;

        // Déjà enregistré aujourd'hui — rien à faire
        if ($last === $today) return;

        $yesterday = now()->subDay()->toDateString();
        $lastWeek  = now()->subDays(7)->toDateString();

        $currentStreak = $row->current_streak;
        $weeklyStreak  = $row->weekly_streak;

        // Streak de jours : cassé si dernier actif avant hier
        if ($last === $yesterday) {
            $currentStreak++;
        } else {
            $currentStreak = 1;
        }

        // Streak de semaines : actif cette semaine ET la semaine dernière
        $lastWeekMonday  = now()->startOfWeek()->subWeek()->toDateString();
        $thisWeekMonday  = now()->startOfWeek()->toDateString();

        $wasActiveLastWeek = !is_null($last) && $last >= $lastWeekMonday && $last < $thisWeekMonday;
        if ($wasActiveLastWeek || $last >= $thisWeekMonday) {
            // Déjà actif cette semaine ou était actif la semaine passée
            $weeklyStreak = ($last < $thisWeekMonday) ? $weeklyStreak + 1 : $weeklyStreak;
        } else {
            $weeklyStreak = 1;
        }

        $longestStreak = max($row->longest_streak, $currentStreak);

        DB::table('hairdresser_streaks')
            ->where('hairdresser_id', $profile->id)
            ->update([
                'current_streak'    => $currentStreak,
                'longest_streak'    => $longestStreak,
                'weekly_streak'     => $weeklyStreak,
                'total_active_days' => $row->total_active_days + 1,
                'last_activity_date'=> $today,
                'updated_at'        => now(),
            ]);
    }

    public static function get(int $hairdresserId): array
    {
        $row = DB::table('hairdresser_streaks')
            ->where('hairdresser_id', $hairdresserId)
            ->first();

        if (!$row) {
            return [
                'current_streak'    => 0,
                'longest_streak'    => 0,
                'weekly_streak'     => 0,
                'total_active_days' => 0,
                'last_activity_date'=> null,
                'is_active_today'   => false,
            ];
        }

        return [
            'current_streak'    => $row->current_streak,
            'longest_streak'    => $row->longest_streak,
            'weekly_streak'     => $row->weekly_streak,
            'total_active_days' => $row->total_active_days,
            'last_activity_date'=> $row->last_activity_date,
            'is_active_today'   => $row->last_activity_date === now()->toDateString(),
        ];
    }
}
