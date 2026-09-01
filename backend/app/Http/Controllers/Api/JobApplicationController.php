<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobOffer;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Services\NotificationService;
use App\Support\PublicScope;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    // ── SALON OWNER — candidatures reçues ────────────────────────────────────

    /**
     * Prépare une candidature pour le gérant qui l'a reçue.
     *
     * Le gérant a besoin de deux choses que l'API ne renvoyait pas : le slug du
     * candidat (pour ouvrir son profil public) et de quoi le contacter. Le
     * candidat a postulé de lui-même chez CE salon : partager son email et son
     * téléphone avec ce gérant-là est le sens même de la candidature.
     *
     * Tout le reste du profil reste masqué (SIRET, URL du diplôme, drapeaux
     * internes) — c'est exactement la fuite corrigée par PublicScope, on ne la
     * rouvre pas ici sous prétexte que le destinataire est un pro.
     */
    private function shapeForOwner(JobApplication $app): JobApplication
    {
        if ($app->relationLoaded('hairdresser') && $app->hairdresser) {
            PublicScope::hairdresser($app->hairdresser);

            if ($app->hairdresser->relationLoaded('user') && $app->hairdresser->user) {
                $app->hairdresser->user->makeVisible(['email', 'phone']);
            }
        }

        return $app;
    }

    /** GET /my-salon/applications — toutes les candidatures */
    public function myApplications(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $apps = JobApplication::with(['hairdresser.user', 'jobOffer'])
            ->whereHas('jobOffer', fn ($q) => $q->where('salon_id', $salon->id))
            ->orderByDesc('created_at')
            ->get();

        $apps->each(fn ($app) => $this->shapeForOwner($app));

        // Le « CV CHAIR » du candidat : sa meilleure spécialité et son palier
        // accompagnent la candidature (avec avis/portfolio déjà présents).
        \App\Services\BadgeService::attachGamification(
            $apps->pluck('hairdresser')->filter()
        );

        return response()->json($apps);
    }

    /** GET /my-salon/applications/pending-count */
    public function pendingCount(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $count = JobApplication::whereHas('jobOffer', fn ($q) => $q->where('salon_id', $salon->id))
            ->where('status', 'pending')
            ->count();

        return response()->json(['count' => $count]);
    }

    /** PUT /my-salon/applications/{id} — changer le statut */
    public function updateStatus(Request $request, int $id)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $app   = JobApplication::with(['hairdresser.user', 'jobOffer'])
            ->whereHas('jobOffer', fn ($q) => $q->where('salon_id', $salon->id))
            ->findOrFail($id);

        $validated = $request->validate(['status' => 'required|in:viewed,interview,accepted,declined']);
        $app->update(['status' => $validated['status']]);

        // Le candidat n'est notifié qu'aux étapes qui le concernent réellement
        // (contacté / retenu / non retenu) — 'viewed' reste une note interne
        // au gérant, 'interview' déclenche un contact humain hors app.
        if (in_array($validated['status'], ['interview', 'accepted', 'declined'])) {
            $msg = match ($validated['status']) {
                'interview' => "{$app->jobOffer->title} : un entretien va vous être proposé.",
                'accepted'  => "Votre candidature pour \"{$app->jobOffer->title}\" a été retenue.",
                'declined'  => "Votre candidature pour \"{$app->jobOffer->title}\" n'a pas été retenue.",
            };
            $title = match ($validated['status']) {
                'interview' => 'Entretien à venir',
                'accepted'  => 'Candidature retenue',
                'declined'  => 'Candidature non retenue',
            };

            NotificationService::send(
                $app->hairdresser->user_id,
                'application_' . $validated['status'],
                $title,
                $msg,
                ['job_offer_id' => $app->job_offer_id, 'salon_id' => $salon->id]
            );
        }

        // fresh() sans argument perd les relations eager-loadées ci-dessus
        // (hairdresser.user, jobOffer) — le nom du candidat et le titre de
        // l'offre disparaissaient de la réponse après chaque changement de statut.
        return response()->json($this->shapeForOwner($app->fresh(['hairdresser.user', 'jobOffer'])));
    }

    // ── COIFFEUR — postuler ───────────────────────────────────────────────────

    /** POST /job-offers/{id}/apply */
    public function apply(Request $request, int $id)
    {
        $offer   = JobOffer::where('id', $id)->where('status', 'open')->firstOrFail();
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();

        // Pas de garde-fou SIRET ici : une candidature à une offre d'emploi
        // (poste salarié) n'a pas besoin d'entreprise déclarée, contrairement
        // à la location de fauteuil (ChairRentalController::sendRequest) qui
        // engage une relation commerciale entre indépendants.
        $validated = $request->validate(['message' => 'nullable|string|max:1000']);

        $app = JobApplication::updateOrCreate(
            ['job_offer_id' => $offer->id, 'hairdresser_id' => $profile->id],
            ['status' => 'pending', 'message' => $validated['message'] ?? null]
        );

        NotificationService::send(
            $offer->salon->owner_id,
            'new_application',
            'Nouvelle candidature',
            "{$request->user()->name} a postulé pour \"{$offer->title}\".",
            ['offer_id' => $offer->id, 'hairdresser_id' => $profile->id, 'application_id' => $app->id]
        );

        return response()->json($app, 201);
    }

    /** GET /my-applications — candidatures du coiffeur connecté */
    public function myApplications_hairdresser(Request $request)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();

        $apps = JobApplication::with(['jobOffer.salon'])
            ->where('hairdresser_id', $profile->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($apps);
    }
}
