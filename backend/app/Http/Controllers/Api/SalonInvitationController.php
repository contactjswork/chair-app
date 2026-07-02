<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Models\SalonInvitation;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class SalonInvitationController extends Controller
{
    // ── SALON OWNER ───────────────────────────────────────────────────────────

    /** POST /my-salon/invite — gérant invite un coiffeur */
    public function invite(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'hairdresser_id' => 'required|integer|exists:hairdresser_profiles,id',
            'message'        => 'nullable|string|max:500',
        ]);

        // Vérifier que le coiffeur n'est pas déjà dans le salon
        $profile = HairdresserProfile::with('user')->findOrFail($validated['hairdresser_id']);
        if ($profile->salon_id === $salon->id) {
            return response()->json(['message' => 'Ce coiffeur est déjà dans votre salon.'], 422);
        }

        $invitation = SalonInvitation::updateOrCreate(
            ['salon_id' => $salon->id, 'hairdresser_id' => $validated['hairdresser_id']],
            ['status' => 'pending', 'message' => $validated['message'] ?? null]
        );

        NotificationService::send(
            $profile->user_id,
            'salon_invitation',
            'Invitation de salon',
            "{$salon->name} vous invite à rejoindre leur équipe.",
            ['salon_id' => $salon->id, 'invitation_id' => $invitation->id]
        );

        return response()->json($invitation->load(['salon', 'hairdresser.user']), 201);
    }

    /** GET /my-salon/invitations — liste des invitations envoyées */
    public function sentInvitations(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $invitations = SalonInvitation::with(['hairdresser.user'])
            ->where('salon_id', $salon->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invitations);
    }

    /** DELETE /my-salon/invitations/{id} — annuler une invitation */
    public function cancel(Request $request, int $id)
    {
        $salon      = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $invitation = SalonInvitation::where('salon_id', $salon->id)->where('id', $id)->firstOrFail();
        $invitation->delete();

        return response()->json(['ok' => true]);
    }

    // ── COIFFEUR ─────────────────────────────────────────────────────────────

    /** GET /my-invitations — invitations reçues par le coiffeur */
    public function myInvitations(Request $request)
    {
        $profile = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();

        $invitations = SalonInvitation::with(['salon'])
            ->where('hairdresser_id', $profile->id)
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invitations);
    }

    /** POST /my-invitations/{id}/accept */
    public function accept(Request $request, int $id)
    {
        $profile    = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        $invitation = SalonInvitation::with('salon')
            ->where('hairdresser_id', $profile->id)
            ->where('status', 'pending')
            ->findOrFail($id);

        // Ajouter le coiffeur au salon
        $profile->update(['salon_id' => $invitation->salon_id, 'is_independent' => false]);
        $invitation->update(['status' => 'accepted']);

        // Notifier le gérant
        NotificationService::send(
            $invitation->salon->owner_id,
            'invitation_accepted',
            'Invitation acceptée',
            "{$request->user()->name} a rejoint votre salon.",
            ['salon_id' => $invitation->salon_id, 'hairdresser_id' => $profile->id]
        );

        return response()->json(['ok' => true]);
    }

    /** POST /my-invitations/{id}/decline */
    public function decline(Request $request, int $id)
    {
        $profile    = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        $invitation = SalonInvitation::where('hairdresser_id', $profile->id)
            ->where('status', 'pending')
            ->findOrFail($id);

        $invitation->update(['status' => 'declined']);

        return response()->json(['ok' => true]);
    }
}
