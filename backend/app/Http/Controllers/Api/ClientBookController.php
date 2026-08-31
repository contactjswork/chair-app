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
            ->pluck('client_user_id')
            ->flip();

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
                'has_note'   => $notes->has($id),
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

        return response()->json([
            'client'       => $client,
            'usual'        => $formule,
            'appointments' => $rdv,
            'scans'        => $scans,
            'note'         => ClientNote::where('hairdresser_id', $profile->id)
                ->where('client_user_id', $userId)
                ->value('note'),
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

        $note = trim((string) ($validated['note'] ?? ''));
        if ($note === '') {
            // Une note vidée est une note supprimée — pas une ligne vide qui
            // marque le client « annoté » pour rien.
            ClientNote::where('hairdresser_id', $profile->id)
                ->where('client_user_id', $userId)
                ->delete();
            return response()->json(['note' => null]);
        }

        ClientNote::updateOrCreate(
            ['hairdresser_id' => $profile->id, 'client_user_id' => $userId],
            ['note' => $note]
        );

        return response()->json(['note' => $note]);
    }
}
