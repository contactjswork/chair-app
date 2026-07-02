<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobOffer;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    // ── SALON OWNER — candidatures reçues ────────────────────────────────────

    /** GET /my-salon/applications — toutes les candidatures */
    public function myApplications(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $apps = JobApplication::with(['hairdresser.user', 'jobOffer'])
            ->whereHas('jobOffer', fn ($q) => $q->where('salon_id', $salon->id))
            ->orderByDesc('created_at')
            ->get();

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

        $validated = $request->validate(['status' => 'required|in:viewed,accepted,declined']);
        $app->update(['status' => $validated['status']]);

        if (in_array($validated['status'], ['accepted', 'declined'])) {
            $msg = $validated['status'] === 'accepted'
                ? "Votre candidature pour \"{$app->jobOffer->title}\" a été retenue."
                : "Votre candidature pour \"{$app->jobOffer->title}\" n'a pas été retenue.";

            NotificationService::send(
                $app->hairdresser->user_id,
                'application_' . $validated['status'],
                $validated['status'] === 'accepted' ? 'Candidature retenue' : 'Candidature non retenue',
                $msg,
                ['job_offer_id' => $app->job_offer_id, 'salon_id' => $salon->id]
            );
        }

        return response()->json($app->fresh());
    }

    // ── COIFFEUR — postuler ───────────────────────────────────────────────────

    /** POST /job-offers/{id}/apply */
    public function apply(Request $request, int $id)
    {
        $offer   = JobOffer::where('id', $id)->where('status', 'open')->firstOrFail();
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();

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
