<?php

namespace App\Services;

use App\Models\HairdresserProfile;
use App\Models\Review;
use App\Models\Salon;
use Illuminate\Support\Facades\DB;

/**
 * Le pouls du salon — les agrégats qui rendent CHAIR BUSINESS vivante
 * (sprint « intelligence gérant », 15/09/2026) :
 *
 *  - semaine()     : les 7 derniers jours de l'équipe (avis, note, top membre)
 *                    avec la semaine précédente en comparaison ;
 *  - alertes()     : étoile montante / perte de vitesse par membre
 *                    (30 jours vs les 30 jours précédents) ;
 *  - classementLocal() : la position du salon parmi ceux de sa ville ce
 *                    mois-ci (jamais affichée s'il n'y a pas au moins un
 *                    autre salon comparable — « n°1 sur 1 » n'est pas une
 *                    information, c'est de la flatterie) ;
 *  - notifierAvisNegatif() : le radar — un avis ≤ 3★ sur un membre de
 *                    l'équipe prévient le gérant immédiatement.
 *
 * Tout est calculé depuis les avis réels (table reviews) — aucune métrique
 * inventée, une section sans donnée renvoie null et le front la masque.
 */
class SalonPulseService
{
    /** En dessous de cette note, le gérant est prévenu immédiatement. */
    public const SEUIL_AVIS_NEGATIF = 3;

    /** Le pulse complet, tel que servi par GET /my-salon/pulse. */
    public static function pulse(Salon $salon): array
    {
        return [
            'semaine'          => self::semaine($salon),
            'alertes'          => self::alertes($salon),
            'classement_local' => self::classementLocal($salon),
        ];
    }

    /** Ids des profils de l'équipe (gérant coiffeur inclus s'il est rattaché). */
    private static function equipeIds(Salon $salon)
    {
        return HairdresserProfile::where('salon_id', $salon->id)->pluck('id');
    }

    /**
     * Les 7 derniers jours : nombre d'avis, note moyenne, meilleur membre,
     * et le même compte sur les 7 jours PRÉCÉDENTS pour donner la tendance.
     * null si l'équipe est vide (rien d'honnête à dire).
     */
    public static function semaine(Salon $salon): ?array
    {
        $ids = self::equipeIds($salon);
        if ($ids->isEmpty()) {
            return null;
        }

        $depuis  = now('Europe/Paris')->subDays(7);
        $avant   = now('Europe/Paris')->subDays(14);

        $semaine = Review::whereIn('hairdresser_id', $ids)
            ->where('created_at', '>=', $depuis)
            ->selectRaw('COUNT(*) as total, AVG(rating) as note')
            ->first();

        $precedente = Review::whereIn('hairdresser_id', $ids)
            ->whereBetween('created_at', [$avant, $depuis])
            ->count();

        // Le membre le plus actif de la semaine (au moins 1 avis).
        $top = Review::whereIn('hairdresser_id', $ids)
            ->where('created_at', '>=', $depuis)
            ->select('hairdresser_id', DB::raw('COUNT(*) as total'))
            ->groupBy('hairdresser_id')
            ->orderByDesc('total')
            ->first();

        $topNom = null;
        if ($top) {
            $profil = HairdresserProfile::with('user')->find($top->hairdresser_id);
            $topNom = $profil?->user?->name;
        }

        return [
            'avis'           => (int) ($semaine->total ?? 0),
            'note'           => $semaine->note !== null ? round((float) $semaine->note, 1) : null,
            'avis_precedent' => $precedente,
            'top'            => $topNom ? ['nom' => $topNom, 'avis' => (int) $top->total] : null,
        ];
    }

    /**
     * Alertes membre par membre — 30 jours glissants contre les 30 jours
     * d'avant :
     *  - 'etoile' : au moins 3 avis ET au moins le double de la période
     *    précédente — le membre qui décolle, à féliciter ;
     *  - 'baisse' : AUCUN avis alors que la période précédente en comptait
     *    au moins 2 — le signal d'un point à faire ensemble.
     */
    public static function alertes(Salon $salon): array
    {
        $ids = self::equipeIds($salon);
        if ($ids->isEmpty()) {
            return [];
        }

        $depuis = now('Europe/Paris')->subDays(30);
        $avant  = now('Europe/Paris')->subDays(60);

        $recents = Review::whereIn('hairdresser_id', $ids)
            ->where('created_at', '>=', $depuis)
            ->select('hairdresser_id', DB::raw('COUNT(*) as total'))
            ->groupBy('hairdresser_id')->pluck('total', 'hairdresser_id');

        $precedents = Review::whereIn('hairdresser_id', $ids)
            ->whereBetween('created_at', [$avant, $depuis])
            ->select('hairdresser_id', DB::raw('COUNT(*) as total'))
            ->groupBy('hairdresser_id')->pluck('total', 'hairdresser_id');

        $profils = HairdresserProfile::with('user')->whereIn('id', $ids)->get()->keyBy('id');

        $alertes = [];
        foreach ($ids as $id) {
            $r = (int) ($recents[$id] ?? 0);
            $p = (int) ($precedents[$id] ?? 0);
            $nom = $profils[$id]?->user?->name;
            if (!$nom) {
                continue;
            }

            if ($r >= 3 && $r >= $p * 2) {
                $alertes[] = ['type' => 'etoile', 'nom' => $nom, 'avis' => $r];
            } elseif ($r === 0 && $p >= 2) {
                $alertes[] = ['type' => 'baisse', 'nom' => $nom, 'avis_precedents' => $p];
            }
        }

        return $alertes;
    }

    /**
     * Position du salon dans sa ville sur le mois en cours, par note moyenne
     * des avis du mois (au moins 1 avis pour être classé). null si le salon
     * n'a pas de ville, n'est pas classé, ou est seul dans son classement.
     */
    public static function classementLocal(Salon $salon): ?array
    {
        if (!$salon->city) {
            return null;
        }

        $debutMois = now('Europe/Paris')->startOfMonth();

        $classement = Review::query()
            ->join('hairdresser_profiles', 'hairdresser_profiles.id', '=', 'reviews.hairdresser_id')
            ->join('salons', 'salons.id', '=', 'hairdresser_profiles.salon_id')
            ->where('salons.city', $salon->city)
            ->whereNull('salons.suspended_at')
            ->where('reviews.created_at', '>=', $debutMois)
            ->select('salons.id', DB::raw('AVG(reviews.rating) as note'), DB::raw('COUNT(*) as total'))
            ->groupBy('salons.id')
            ->orderByDesc('note')
            ->orderByDesc('total')
            ->get();

        if ($classement->count() < 2) {
            return null;
        }

        $rang = $classement->search(fn ($ligne) => (int) $ligne->id === (int) $salon->id);
        if ($rang === false) {
            return null;
        }

        return [
            'rang'  => $rang + 1,
            'total' => $classement->count(),
            'ville' => $salon->city,
        ];
    }

    /**
     * Le radar avis négatif — appelé APRÈS chaque création d'avis (les trois
     * points de dépôt : RDV client, RDV token, visite vérifiée). Un avis
     * ≤ 3★ sur un membre rattaché à un salon prévient le gérant, sauf si le
     * gérant EST le coiffeur noté (double casquette : il a déjà reçu la
     * notification coiffeur review_received).
     */
    public static function notifierAvisNegatif(Review $review): void
    {
        if ((int) $review->rating > self::SEUIL_AVIS_NEGATIF) {
            return;
        }

        $profil = HairdresserProfile::with('user')->find($review->hairdresser_id);
        if (!$profil || !$profil->salon_id) {
            return;
        }

        $salon = Salon::find($profil->salon_id);
        if (!$salon || !$salon->owner_id || (int) $salon->owner_id === (int) $profil->user_id) {
            return;
        }

        NotificationService::sendTyped(
            (int) $salon->owner_id,
            'salon_negative_review',
            [
                'coiffeur' => $profil->user?->name ?? 'Un membre de votre équipe',
                'note'     => (string) $review->rating,
            ],
            NotificationCopy::AUDIENCE_SALON,
            [
                'url'            => '/business/equipe',
                'review_id'      => $review->id,
                'hairdresser_id' => $profil->id,
            ]
        );
    }
}
