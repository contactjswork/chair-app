<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Post;
use App\Models\ProfileView;
use App\Models\Review;
use App\Models\VerifiedVisit;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * « Votre année CHAIR » — le récap annuel du coiffeur.
 *
 * Uniquement des chiffres réellement mesurés, agrégés à la volée (un
 * appel par consultation, pas de table de cache : l'écran se regarde
 * quelques fois par an). Un compteur à zéro est renvoyé à zéro — le
 * front choisit quoi montrer, le backend ne gonfle rien.
 */
class YearRecapController extends Controller
{
    /** GET /my-year-recap?year=2026 (année en cours par défaut). */
    public function mine(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $year  = (int) $request->query('year', now('Europe/Paris')->year);
        $debut = Carbon::create($year, 1, 1, 0, 0, 0, 'Europe/Paris');
        $fin   = $debut->copy()->endOfYear();

        // RDV terminés de l'année (le CA ne compte que ce qui a eu lieu).
        $rdv = Appointment::where('hairdresser_id', $profile->id)
            ->where('status', 'completed')
            ->whereBetween('appointment_date', [$debut->toDateString(), $fin->toDateString()]);

        $rdvTermines = (clone $rdv)->count();
        $caTotal     = (float) (clone $rdv)->whereNotNull('price')->sum('price');

        // Passages vérifiés par QR (clients sans RDV inclus).
        $visites = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->whereBetween('created_at', [$debut, $fin])
            ->count();

        // Mois le plus chargé (RDV terminés + visites vérifiées).
        $parMois = array_fill(1, 12, 0);
        (clone $rdv)->get(['appointment_date'])->each(function ($a) use (&$parMois) {
            $parMois[(int) Carbon::parse($a->appointment_date)->format('n')]++;
        });
        VerifiedVisit::where('hairdresser_id', $profile->id)
            ->whereBetween('created_at', [$debut, $fin])
            ->get(['created_at'])
            ->each(function ($v) use (&$parMois) {
                $parMois[(int) $v->created_at->format('n')]++;
            });
        $moisTop = null;
        if (max($parMois) > 0) {
            $numero  = array_search(max($parMois), $parMois);
            $moisTop = [
                'mois'  => Carbon::create($year, $numero, 1)->locale('fr')->isoFormat('MMMM'),
                'total' => max($parMois),
            ];
        }

        // Nouveaux clients : premier passage (RDV complété OU visite) dans l'année.
        $premiersRdv = Appointment::where('hairdresser_id', $profile->id)
            ->where('status', 'completed')
            ->whereNotNull('client_id')
            ->selectRaw('client_id, MIN(appointment_date) as premiere')
            ->groupBy('client_id')
            ->pluck('premiere', 'client_id');
        $premieresVisites = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->whereNotNull('client_user_id')
            ->selectRaw('client_user_id, MIN(created_at) as premiere')
            ->groupBy('client_user_id')
            ->pluck('premiere', 'client_user_id');
        $premieres = [];
        foreach ($premiersRdv as $id => $date) {
            $premieres[$id] = Carbon::parse($date);
        }
        foreach ($premieresVisites as $id => $date) {
            $d = Carbon::parse($date);
            $premieres[$id] = isset($premieres[$id]) ? min($premieres[$id], $d) : $d;
        }
        $nouveauxClients = collect($premieres)->filter(fn ($d) => $d->between($debut, $fin))->count();

        // Avis de l'année.
        $avis = Review::where('hairdresser_id', $profile->id)
            ->whereBetween('created_at', [$debut, $fin]);
        $avisCount   = (clone $avis)->count();
        $avisMoyenne = $avisCount > 0 ? round((clone $avis)->avg('rating'), 1) : null;

        // Prestation la plus demandée (RDV terminés, libellé figé à la résa).
        $prestationTop = (clone $rdv)->whereNotNull('service')
            ->selectRaw('service, COUNT(*) as total')
            ->groupBy('service')
            ->orderByDesc('total')
            ->first();

        // Réalisations publiées + la plus aimée.
        $realisationsPubliees = Post::where('hairdresser_id', $profile->id)
            ->whereBetween('created_at', [$debut, $fin])
            ->count();
        $meilleurPost = Post::with('images')
            ->where('hairdresser_id', $profile->id)
            ->where('is_published', true)
            ->whereBetween('created_at', [$debut, $fin])
            ->orderByDesc('likes_count')
            ->first();

        // Vues du profil.
        $vuesProfil = ProfileView::where('hairdresser_profile_id', $profile->id)
            ->whereBetween('created_at', [$debut, $fin])
            ->count();

        return response()->json([
            'year'                  => $year,
            'rdv_termines'          => $rdvTermines,
            'visites_verifiees'     => $visites,
            'ca_total'              => round($caTotal, 2),
            'nouveaux_clients'      => $nouveauxClients,
            'avis_count'            => $avisCount,
            'avis_moyenne'          => $avisMoyenne,
            'mois_top'              => $moisTop,
            'prestation_top'        => $prestationTop ? ['nom' => $prestationTop->service, 'total' => $prestationTop->total] : null,
            'realisations_publiees' => $realisationsPubliees,
            'meilleur_post'         => $meilleurPost ? [
                'id'          => $meilleurPost->id,
                'likes_count' => $meilleurPost->likes_count,
                'cover_image' => $meilleurPost->cover_image,
            ] : null,
            'vues_profil'           => $vuesProfil,
        ]);
    }
}
