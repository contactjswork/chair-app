<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClientNote;
use App\Models\User;
use App\Models\VerifiedVisit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Le carnet de clients — le CRM minimal d'un coiffeur.
 *
 * Un client « existe » pour un coiffeur dès qu'il a un rendez-vous chez lui
 * OU un passage vérifié : les deux flux se rejoignent ici, parce qu'un
 * salarié n'a que des scans et un indépendant surtout des rendez-vous.
 *
 * La note est STRICTEMENT privée : visible par son auteur uniquement,
 * jamais par le client. C'est le carnet de l'artisan, pas un profil public.
 */
class ClientBookController extends Controller
{
    /** GET /my-clients — tous les clients connus, dernier passage en premier. */
    public function index(Request $request)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        // Deux sources, un seul carnet : la date retenue est le passage le
        // plus récent, tous flux confondus.
        $viaRdv = Appointment::where('hairdresser_id', $profile->id)
            ->whereNotNull('client_id')
            ->whereIn('status', ['confirmed', 'completed'])
            ->select('client_id', DB::raw('MAX(appointment_date) as derniere'), DB::raw('COUNT(*) as rdv'))
            ->groupBy('client_id')
            ->get()
            ->keyBy('client_id');

        $viaScan = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->select('client_user_id', DB::raw('MAX(scanned_at) as derniere'), DB::raw('COUNT(*) as visites'))
            ->groupBy('client_user_id')
            ->get()
            ->keyBy('client_user_id');

        $ids = $viaRdv->keys()->merge($viaScan->keys())->unique()->values();
        if ($ids->isEmpty()) {
            return response()->json(['clients' => []]);
        }

        $users = User::whereIn('id', $ids)->get(['id', 'name', 'avatar'])->keyBy('id');
        $notes = ClientNote::where('hairdresser_id', $profile->id)
            ->whereIn('client_user_id', $ids)
            ->get()
            ->keyBy('client_user_id');

        $clients = $ids->map(function ($id) use ($users, $viaRdv, $viaScan, $notes) {
            $u = $users->get($id);
            if (!$u) {
                return null;
            }
            $dates = array_filter([
                $viaRdv->get($id)?->derniere,
                $viaScan->get($id)?->derniere,
            ]);
            return [
                'user_id'    => $u->id,
                'name'       => $u->name,
                'avatar'     => $u->avatar,
                'last_seen'  => $dates ? max($dates) : null,
                'rdv_count'  => (int) ($viaRdv->get($id)->rdv ?? 0),
                'scan_count' => (int) ($viaScan->get($id)->visites ?? 0),
                'has_note'   => $notes->get($id)?->note !== null && $notes->has($id),
                'relance_sent_at' => $notes->get($id)?->relance_sent_at,
            ];
        })->filter()->sortByDesc('last_seen')->values();

        return response()->json(['clients' => $clients]);
    }

    /** GET /my-clients/{userId} — l'historique complet et la note. */
    public function show(Request $request, int $userId)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $client = User::find($userId, ['id', 'name', 'avatar']);
        if (!$client) {
            return response()->json(['message' => 'Client introuvable'], 404);
        }

        // On ne montre l'historique QUE de la relation avec CE coiffeur :
        // ce qu'un client fait chez les confrères ne regarde personne.
        $rdv = Appointment::where('hairdresser_id', $profile->id)
            ->where('client_id', $userId)
            ->whereIn('status', ['confirmed', 'completed', 'no_show'])
            ->orderByDesc('appointment_date')
            ->limit(30)
            ->get(['id', 'service', 'appointment_date', 'appointment_time', 'price', 'status']);

        $scans = VerifiedVisit::where('hairdresser_id', $profile->id)
            ->where('client_user_id', $userId)
            ->orderByDesc('scanned_at')
            ->limit(30)
            ->get(['id', 'service_type', 'scanned_at']);

        // La formule habituelle : la prestation la plus fréquente, tous flux
        // confondus. C'est ce qu'on veut savoir quand le client rappelle.
        $formule = collect($rdv->pluck('service'))
            ->merge($scans->pluck('service_type'))
            ->filter()
            ->countBy()
            ->sortDesc()
            ->keys()
            ->first();

        $fiche = ClientNote::where('hairdresser_id', $profile->id)
            ->where('client_user_id', $userId)
            ->first();

        return response()->json([
            'client'          => $client,
            'usual'           => $formule,
            'appointments'    => $rdv,
            'scans'           => $scans,
            'note'            => $fiche->note ?? null,
            'advice'          => $fiche->advice ?? null,
            'rebook_weeks'    => $fiche->rebook_weeks ?? null,
            'relance_sent_at' => $fiche->relance_sent_at ?? null,
        ]);
    }

    /** PUT /my-clients/{userId}/note — écrire ou effacer la note privée. */
    public function saveNote(Request $request, int $userId)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'note' => 'nullable|string|max:2000',
        ]);

        // Une note vidée devient NULL — la ligne reste : elle peut porter un
        // conseil, un rythme ou une date de relance (colonnes du 01/09/2026).
        // La supprimer effacerait tout le reste de la fiche.
        $note = trim((string) ($validated['note'] ?? ''));
        ClientNote::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'client_user_id' => $userId],
            ['note' => $note === '' ? null : $note]
        );

        return response()->json(['note' => $note === '' ? null : $note]);
    }

    /**
     * PUT /my-clients/{userId}/advice — le conseil post-visite, VISIBLE par
     * le client dans son app (contrairement à la note, privée). Le client est
     * notifié à l'écriture d'un conseil non vide.
     */
    public function saveAdvice(Request $request, int $userId)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'advice' => 'nullable|string|max:1000',
        ]);

        if ($reason = \App\Services\ContentFilter::checkOffensiveOnly($validated['advice'] ?? null)) {
            return response()->json(['message' => \App\Services\ContentFilter::message($reason, 'pro')], 422);
        }

        $advice = trim((string) ($validated['advice'] ?? ''));
        $fiche = ClientNote::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'client_user_id' => $userId],
            [
                'advice'            => $advice === '' ? null : $advice,
                'advice_updated_at' => $advice === '' ? null : now(),
            ]
        );

        if ($advice !== '') {
            \App\Services\NotificationService::sendTyped(
                $userId,
                'advice_posted',
                ['coiffeur' => $request->user()->name],
                \App\Services\NotificationCopy::AUDIENCE_CLIENT,
                ['url' => '/app/compte']
            );
        }

        return response()->json(['advice' => $fiche->advice]);
    }

    /**
     * PUT /my-clients/{userId}/rhythm — le rythme de retour réglé par le
     * coiffeur pour CE client. Prioritaire sur la moyenne calculée par le
     * rappel automatique (SendRebookReminders). null = retour à l'automatique.
     */
    public function saveRhythm(Request $request, int $userId)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        $validated = $request->validate([
            'rebook_weeks' => 'nullable|integer|min:2|max:26',
        ]);

        $fiche = ClientNote::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'client_user_id' => $userId],
            ['rebook_weeks' => $validated['rebook_weeks'] ?? null]
        );

        return response()->json(['rebook_weeks' => $fiche->rebook_weeks]);
    }

    /** 30 jours minimum entre deux relances du même client — anti-harcèlement. */
    private const RELANCE_COOLDOWN_DAYS = 30;

    /**
     * POST /my-clients/{userId}/relance — la relance manuelle, choisie par le
     * coiffeur client par client. Garde-fous : le client doit être dans SON
     * carnet, ne pas avoir de RDV à venir chez lui, et ne pas avoir été
     * relancé depuis 30 jours.
     */
    public function relance(Request $request, int $userId)
    {
        $profile = $request->user()->hairdresserProfile;
        if (!$profile) {
            return response()->json(['message' => 'Profil coiffeur introuvable'], 404);
        }

        // Dans le carnet = au moins un passage réel chez CE coiffeur.
        $connu = Appointment::where('hairdresser_id', $profile->id)
                ->where('client_id', $userId)
                ->whereIn('status', ['confirmed', 'completed'])
                ->exists()
            || VerifiedVisit::where('hairdresser_id', $profile->id)
                ->where('client_user_id', $userId)
                ->exists();
        if (!$connu) {
            return response()->json(['message' => 'Ce client n’est pas dans votre carnet.'], 422);
        }

        $aVenir = Appointment::where('hairdresser_id', $profile->id)
            ->where('client_id', $userId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('appointment_date', '>=', now('Europe/Paris')->toDateString())
            ->exists();
        if ($aVenir) {
            return response()->json(['message' => 'Ce client a déjà un rendez-vous à venir chez vous.'], 422);
        }

        $fiche = ClientNote::firstOrCreate(
            ['hairdresser_id' => $profile->id, 'client_user_id' => $userId]
        );
        if ($fiche->relance_sent_at && $fiche->relance_sent_at->gt(now()->subDays(self::RELANCE_COOLDOWN_DAYS))) {
            return response()->json([
                'message' => 'Client déjà relancé le ' . $fiche->relance_sent_at->locale('fr')->isoFormat('D MMMM') . ' — 30 jours minimum entre deux relances.',
            ], 422);
        }

        // Drapeau AVANT l'envoi — même règle d'idempotence que partout.
        $fiche->update(['relance_sent_at' => now()]);

        \App\Services\NotificationService::sendTyped(
            $userId,
            'pro_relance',
            ['coiffeur' => $request->user()->name],
            \App\Services\NotificationCopy::AUDIENCE_CLIENT,
            ['url' => '/app/coiffeur/' . $profile->slug]
        );

        return response()->json(['relance_sent_at' => $fiche->relance_sent_at]);
    }

    /**
     * GET /my-advices — côté CLIENT : les conseils laissés par ses coiffeurs.
     */
    public function myAdvices(Request $request)
    {
        $rows = ClientNote::where('client_user_id', $request->user()->id)
            ->whereNotNull('advice')
            ->with(['hairdresser' => fn ($q) => $q->with('user:id,name,avatar')])
            ->orderByDesc('advice_updated_at')
            ->get();

        return response()->json([
            'advices' => $rows->map(fn ($r) => [
                'hairdresser_name'   => $r->hairdresser->user->name ?? null,
                'hairdresser_avatar' => $r->hairdresser->user->avatar ?? null,
                'hairdresser_slug'   => $r->hairdresser->slug ?? null,
                'advice'             => $r->advice,
                'updated_at'         => $r->advice_updated_at,
            ])->filter(fn ($r) => $r['hairdresser_slug'] !== null)->values(),
        ]);
    }
}
