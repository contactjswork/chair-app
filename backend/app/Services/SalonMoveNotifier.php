<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\Salon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * « J'ai changé de salon » — LE cœur de la promesse CHAIR.
 *
 * Quand un coiffeur se rattache à un salon, ses abonnés et favoris sont
 * prévenus : « Théo est maintenant chez Studio K, Strasbourg ». Sa
 * clientèle le suit physiquement — c'est exactement le pitch de la
 * vitrine (« un coiffeur change de salon, sa clientèle reste au salon —
 * CHAIR lui donne une marque à son nom »).
 *
 * Même mécanique de fan-out que la promo flash : plafond de pushes,
 * anti-rafale social_push_logs, fenêtre calme respectée. Un échec de
 * notification ne casse jamais le rattachement lui-même.
 */
class SalonMoveNotifier
{
    private const PUSH_CAP = 100;
    private const SOCIAL_PUSH_COOLDOWN_HOURS = 6;

    public static function annoncer(HairdresserProfile $profile, Salon $salon): void
    {
        try {
            $userIds = DB::table('saved_profiles')
                ->where('hairdresser_id', $profile->id)
                ->pluck('user_id')
                ->merge(
                    DB::table('follows')
                        ->where('hairdresser_id', $profile->id)
                        ->pluck('follower_id')
                )
                ->unique()
                ->values();

            if ($userIds->isEmpty()) {
                return;
            }

            $profile->loadMissing('user');
            $vars = [
                'coiffeur' => $profile->user->name ?? 'Votre coiffeur',
                'salon'    => $salon->name . ($salon->city ? ', ' . $salon->city : ''),
            ];
            $data = ['url' => '/app/coiffeur/' . $profile->slug];

            $quietHours = PushService::inQuietHours();
            $pushBudget = self::PUSH_CAP;
            $now        = now();

            foreach ($userIds->chunk(50) as $chunk) {
                $throttled = DB::table('social_push_logs')
                    ->whereIn('user_id', $chunk)
                    ->where('hairdresser_id', $profile->id)
                    ->where('last_pushed_at', '>', $now->copy()->subHours(self::SOCIAL_PUSH_COOLDOWN_HOURS))
                    ->pluck('user_id')
                    ->all();

                foreach ($chunk as $userId) {
                    $userId   = (int) $userId;
                    $withPush = !$quietHours && $pushBudget > 0 && !in_array($userId, $throttled, true);

                    if ($withPush) {
                        $notif = NotificationService::sendTyped(
                            $userId, 'salon_changed', $vars, NotificationCopy::AUDIENCE_CLIENT, $data
                        );
                        if ($notif !== null) {
                            $pushBudget--;
                            DB::table('social_push_logs')->upsert(
                                [['user_id' => $userId, 'hairdresser_id' => $profile->id, 'last_pushed_at' => $now]],
                                ['user_id', 'hairdresser_id'],
                                ['last_pushed_at']
                            );
                        }
                    } else {
                        NotificationService::sendTypedWithoutPush(
                            $userId, 'salon_changed', $vars, NotificationCopy::AUDIENCE_CLIENT, $data
                        );
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('salon_changed fan-out failed', [
                'hairdresser_id' => $profile->id,
                'error'          => $e->getMessage(),
            ]);
        }
    }
}
