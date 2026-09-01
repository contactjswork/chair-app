<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlashPromo;
use App\Services\NotificationCopy;
use App\Services\NotificationService;
use App\Services\PushService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Promo flash : brader un jour creux pour le remplir.
 *
 * Le coiffeur pose une remise (-10 à -50 %) sur UN jour, depuis son agenda.
 * Les clients qui l'ont en favori ou le suivent reçoivent une notification
 * (une seule par promo, plafonnée, anti-rafale via social_push_logs — même
 * mécanique que la publication d'une réalisation). Le prix remisé s'applique
 * automatiquement à la réservation de ce jour-là.
 */
class FlashPromoController extends Controller
{
    /** Même plafond et même refroidissement que le fan-out des réalisations. */
    private const PUSH_CAP = 100;
    private const SOCIAL_PUSH_COOLDOWN_HOURS = 6;

    /** GET /flash-promos — mes promos à venir (les passées ont expiré d'elles-mêmes). */
    public function index(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        return response()->json(
            FlashPromo::with('specialty:id,name')
                ->where('hairdresser_id', $profile->id)
                ->whereDate('date', '>=', now('Europe/Paris')->toDateString())
                ->orderBy('date')
                ->get()
                ->map(fn ($p) => [
                    'id'               => $p->id,
                    'date'             => $p->date->format('Y-m-d'),
                    'discount_percent' => $p->discount_percent,
                    'specialty_id'     => $p->specialty_id,
                    'specialty_name'   => $p->specialty->name ?? null,
                    'notified_at'      => $p->notified_at,
                ])
        );
    }

    /** GET /hairdressers/{slug}/flash-promos — lecture publique (réservation). */
    public function publicIndex(string $slug)
    {
        $profile = \App\Models\HairdresserProfile::where('slug', $slug)
            ->where('is_hidden', false)
            ->firstOrFail();

        return response()->json(
            FlashPromo::with('specialty:id,name')
                ->where('hairdresser_id', $profile->id)
                ->whereDate('date', '>=', now('Europe/Paris')->toDateString())
                ->orderBy('date')
                ->get()
                ->map(fn ($p) => [
                    'date'             => $p->date->format('Y-m-d'),
                    'discount_percent' => $p->discount_percent,
                    'specialty_id'     => $p->specialty_id,
                    'specialty_name'   => $p->specialty->name ?? null,
                ])
        );
    }

    /** POST /flash-promos {date, discount_percent} — créer ou ajuster la promo d'un jour. */
    public function store(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'date'             => 'required|date_format:Y-m-d',
            'discount_percent' => 'required|integer|min:10|max:50',
            // null = toutes les prestations ; sinon une de SES spécialités.
            'specialty_id'     => 'nullable|integer|exists:specialties,id',
        ]);

        if (!empty($validated['specialty_id'])) {
            $aSpecialite = $profile->specialties()->where('specialties.id', $validated['specialty_id'])->exists();
            if (!$aSpecialite) {
                return response()->json(['message' => 'Cette spécialité n’est pas sur votre profil.'], 422);
            }
        }

        $aujourdhui = now('Europe/Paris')->toDateString();
        if ($validated['date'] < $aujourdhui) {
            return response()->json(['message' => 'Ce jour est déjà passé.'], 422);
        }
        if ($validated['date'] > Carbon::parse($aujourdhui)->addDays(14)->toDateString()) {
            return response()->json(['message' => 'Une promo flash se pose au plus 14 jours à l’avance.'], 422);
        }

        $promo = FlashPromo::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'date' => $validated['date']],
            [
                'discount_percent' => $validated['discount_percent'],
                'specialty_id'     => $validated['specialty_id'] ?? null,
            ]
        );

        // Une seule vague de notifications par promo, même si le coiffeur
        // ajuste ensuite le pourcentage : drapeau posé AVANT l'envoi.
        if ($promo->notified_at === null) {
            $promo->update(['notified_at' => now()]);
            $this->notifierClients($promo, $profile);
        }

        return response()->json([
            'id'               => $promo->id,
            'date'             => $promo->date->format('Y-m-d'),
            'discount_percent' => $promo->discount_percent,
            'specialty_id'     => $promo->specialty_id,
            'specialty_name'   => $promo->specialty_id ? ($promo->specialty->name ?? null) : null,
            'notified_at'      => $promo->notified_at,
        ], 201);
    }

    /** DELETE /flash-promos/{id} */
    public function destroy(Request $request, int $id)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $promo = FlashPromo::where('hairdresser_id', $profile->id)->find($id);
        if (!$promo) {
            return response()->json(['message' => 'Promo introuvable'], 404);
        }

        $promo->delete();

        return response()->json(['message' => 'Promo retirée']);
    }

    /**
     * Favoris + abonnés, dédupliqués — les gens qui ont manifesté de
     * l'intérêt pour ce coiffeur, personne d'autre.
     */
    private function notifierClients(FlashPromo $promo, $profile): void
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

            $jour = Carbon::parse($promo->date)->locale('fr')->isoFormat('dddd D MMMM');
            // Une promo ciblée nomme sa spécialité — « -30% sur Coupe
            // Classique » vaut mieux qu'un rabais anonyme.
            $cible = $promo->specialty_id ? ($promo->specialty->name ?? null) : null;
            $vars = [
                'coiffeur' => $profile->user->name ?? 'Votre coiffeur',
                'pct'      => $promo->discount_percent . '%' . ($cible ? ' sur ' . $cible : ''),
                'jour'     => $jour,
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
                            $userId, 'flash_promo', $vars, NotificationCopy::AUDIENCE_CLIENT, $data
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
                            $userId, 'flash_promo', $vars, NotificationCopy::AUDIENCE_CLIENT, $data
                        );
                    }
                }
            }
        } catch (\Throwable $e) {
            // La promo est posée ; un raté de notification ne l'annule pas.
            Log::warning('flash_promo fan-out failed', [
                'promo_id' => $promo->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }
}
