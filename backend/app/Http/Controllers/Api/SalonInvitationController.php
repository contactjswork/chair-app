<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Models\SalonInvitation;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SalonInvitationController extends Controller
{
    private const EXPIRY_DAYS = 14;

    // ── SALON OWNER ───────────────────────────────────────────────────────────

    /** POST /my-salon/invite — gérant invite un coiffeur (compte existant ou par email) */
    public function invite(Request $request)
    {
        $salon = Salon::where('owner_id', $request->user()->id)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'hairdresser_id' => 'nullable|integer|exists:hairdresser_profiles,id',
            'email'          => 'nullable|email|max:255',
            'message'        => 'nullable|string|max:500',
        ]);
        $validator->after(function ($v) use ($request) {
            if (!$request->filled('hairdresser_id') && !$request->filled('email')) {
                $v->errors()->add('hairdresser_id', 'Choisissez un coiffeur ou indiquez un email.');
            }
        });
        $validated = $validator->validate();

        $profile = null;
        if (!empty($validated['hairdresser_id'])) {
            $profile = HairdresserProfile::with('user')->findOrFail($validated['hairdresser_id']);
        } elseif (!empty($validated['email'])) {
            // Si un compte coiffeur existe déjà avec cet email, on le rattache
            // directement plutôt que de laisser l'invitation "orpheline".
            $profile = HairdresserProfile::with('user')
                ->whereHas('user', fn ($q) => $q->where('email', $validated['email']))
                ->first();
        }

        if ($profile) {
            if ($profile->salon_id === $salon->id) {
                return response()->json(['message' => 'Ce coiffeur est déjà dans votre salon.'], 422);
            }
            if ($profile->salon_id !== null) {
                return response()->json(['message' => 'Ce coiffeur fait déjà partie d\'un autre salon.'], 422);
            }
        }

        // Une invitation active existante vers la même cible est rafraîchie
        // plutôt que dupliquée (même lien, nouvelle échéance).
        $existing = SalonInvitation::where('salon_id', $salon->id)
            ->where('status', 'pending')
            ->where(function ($q) use ($profile, $validated) {
                if ($profile) {
                    $q->where('hairdresser_id', $profile->id);
                } else {
                    $q->whereNull('hairdresser_id')->where('email', $validated['email']);
                }
            })
            ->first();

        $invitation = $existing ?? new SalonInvitation(['salon_id' => $salon->id]);
        $invitation->fill([
            'hairdresser_id' => $profile?->id,
            'email'          => $profile ? null : ($validated['email'] ?? null),
            'message'        => $validated['message'] ?? null,
            'status'         => 'pending',
            'token'          => SalonInvitation::generateToken(),
            'expires_at'     => now()->addDays(self::EXPIRY_DAYS),
        ]);
        $invitation->save();

        if ($profile) {
            NotificationService::send(
                $profile->user_id,
                'salon_invitation',
                'Invitation de salon',
                "{$salon->name} vous invite à rejoindre leur équipe.",
                ['salon_id' => $salon->id, 'invitation_id' => $invitation->id]
            );
        }

        return response()->json(array_merge(
            $invitation->load(['salon', 'hairdresser.user'])->toArray(),
            ['share_link' => $this->shareLink($invitation)]
        ), 201);
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

    /** POST /my-salon/invitations/{id}/resend — régénère le lien et l'échéance */
    public function resend(Request $request, int $id)
    {
        $salon      = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $invitation = SalonInvitation::where('salon_id', $salon->id)->findOrFail($id);

        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Seule une invitation en attente ou expirée peut être renvoyée.'], 422);
        }

        $invitation->update([
            'status'     => 'pending',
            'token'      => SalonInvitation::generateToken(),
            'expires_at' => now()->addDays(self::EXPIRY_DAYS),
        ]);

        if ($invitation->hairdresser_id) {
            $profile = HairdresserProfile::find($invitation->hairdresser_id);
            if ($profile) {
                NotificationService::send(
                    $profile->user_id,
                    'salon_invitation',
                    'Invitation de salon',
                    "{$salon->name} vous invite à nouveau à rejoindre leur équipe.",
                    ['salon_id' => $salon->id, 'invitation_id' => $invitation->id]
                );
            }
        }

        return response()->json(array_merge(
            $invitation->fresh(['salon', 'hairdresser.user'])->toArray(),
            ['share_link' => $this->shareLink($invitation)]
        ));
    }

    /** DELETE /my-salon/invitations/{id} — annule (statut, jamais de suppression définitive) */
    public function cancel(Request $request, int $id)
    {
        $salon      = Salon::where('owner_id', $request->user()->id)->firstOrFail();
        $invitation = SalonInvitation::where('salon_id', $salon->id)->where('id', $id)->firstOrFail();

        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Cette invitation ne peut plus être annulée.'], 422);
        }

        $invitation->update(['status' => 'cancelled']);

        if ($invitation->hairdresser_id) {
            $profile = HairdresserProfile::find($invitation->hairdresser_id);
            if ($profile) {
                NotificationService::send(
                    $profile->user_id,
                    'salon_invitation_cancelled',
                    'Invitation annulée',
                    "{$salon->name} a annulé son invitation.",
                    ['salon_id' => $salon->id, 'invitation_id' => $invitation->id]
                );
            }
        }

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
            ->findOrFail($id);

        return $this->doAccept($invitation, $profile, $request->user());
    }

    /** POST /my-invitations/{id}/decline */
    public function decline(Request $request, int $id)
    {
        $profile    = HairdresserProfile::where('user_id', $request->user()->id)->firstOrFail();
        $invitation = SalonInvitation::with('salon')
            ->where('hairdresser_id', $profile->id)
            ->findOrFail($id);

        return $this->doDecline($invitation, $request->user());
    }

    // ── LIEN PARTAGEABLE (invitation par email, avec ou sans compte) ──────────

    /** GET /invitations/{token} — aperçu public, sans authentification */
    public function showByToken(string $token)
    {
        $invitation = SalonInvitation::with('salon')->where('token', $token)->firstOrFail();

        return response()->json([
            'salon' => [
                'name' => $invitation->salon->name,
                'slug' => $invitation->salon->slug,
                'logo' => $invitation->salon->logo,
                'city' => $invitation->salon->city,
            ],
            'message'         => $invitation->message,
            'status'          => $invitation->effective_status,
            'already_claimed' => $invitation->hairdresser_id !== null,
        ]);
    }

    /** POST /invitations/{token}/accept — l'invité (authentifié) rattache son profil et accepte */
    public function acceptByToken(Request $request, string $token)
    {
        $invitation = SalonInvitation::with('salon')->where('token', $token)->firstOrFail();
        $profile    = HairdresserProfile::where('user_id', $request->user()->id)->first();

        if (!$profile) {
            return response()->json(['message' => 'Un profil coiffeur est nécessaire pour rejoindre un salon.'], 422);
        }
        if ($invitation->hairdresser_id !== null && $invitation->hairdresser_id !== $profile->id) {
            return response()->json(['message' => 'Cette invitation est destinée à quelqu\'un d\'autre.'], 403);
        }
        if ($invitation->hairdresser_id === null) {
            $invitation->hairdresser_id = $profile->id;
            $invitation->save();
        }

        return $this->doAccept($invitation, $profile, $request->user());
    }

    /** POST /invitations/{token}/decline */
    public function declineByToken(Request $request, string $token)
    {
        $invitation = SalonInvitation::with('salon')->where('token', $token)->firstOrFail();

        if ($invitation->hairdresser_id !== null) {
            $profile = HairdresserProfile::where('user_id', $request->user()->id)->first();
            if (!$profile || $invitation->hairdresser_id !== $profile->id) {
                return response()->json(['message' => 'Cette invitation est destinée à quelqu\'un d\'autre.'], 403);
            }
        }

        return $this->doDecline($invitation, $request->user());
    }

    // ── Logique partagée ─────────────────────────────────────────────────────

    private function doAccept(SalonInvitation $invitation, HairdresserProfile $profile, $user)
    {
        if ($invitation->status === 'pending' && $invitation->isExpired()) {
            $invitation->update(['status' => 'expired']);
        }
        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Cette invitation n\'est plus valable.'], 410);
        }
        if ($profile->salon_id !== null && $profile->salon_id !== $invitation->salon_id) {
            return response()->json(['message' => 'Vous faites déjà partie d\'un autre salon.'], 422);
        }

        $profile->update(['salon_id' => $invitation->salon_id, 'is_independent' => false]);

        // « J'ai changé de salon » : ses abonnés et favoris le suivent.
        \App\Services\SalonMoveNotifier::annoncer($profile, $invitation->salon);
        $invitation->update(['status' => 'accepted']);

        NotificationService::send(
            $invitation->salon->owner_id,
            'invitation_accepted',
            'Invitation acceptée',
            "{$user->name} a rejoint votre salon.",
            ['salon_id' => $invitation->salon_id, 'hairdresser_id' => $profile->id]
        );

        return response()->json(['ok' => true]);
    }

    private function doDecline(SalonInvitation $invitation, $user)
    {
        if ($invitation->status === 'pending' && $invitation->isExpired()) {
            $invitation->update(['status' => 'expired']);
        }
        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Cette invitation n\'est plus valable.'], 410);
        }

        $invitation->update(['status' => 'declined']);

        NotificationService::send(
            $invitation->salon->owner_id,
            'invitation_declined',
            'Invitation déclinée',
            "{$user->name} a décliné votre invitation.",
            ['salon_id' => $invitation->salon_id]
        );

        return response()->json(['ok' => true]);
    }

    private function shareLink(SalonInvitation $invitation): string
    {
        $base = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        return "{$base}/invitation/{$invitation->token}";
    }
}
