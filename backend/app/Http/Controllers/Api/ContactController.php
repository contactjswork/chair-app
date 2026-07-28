<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Formulaire de contact public (site vitrine, visiteur non connecté) — pas
 * le même flux que SupportController (tickets in-app, réservé aux
 * utilisateurs connectés). Pas de table dédiée : le message part directement
 * par email, comme la demande de réinitialisation de mot de passe.
 */
class ContactController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:150',
            'email'   => 'required|email|max:255',
            'subject' => 'required|string|max:200',
            'message' => 'required|string|max:3000',
        ]);

        Mail::raw(
            "De : {$validated['name']} <{$validated['email']}>\nSujet : {$validated['subject']}\n\n{$validated['message']}",
            function ($mail) use ($validated) {
                $mail->to('contact@getchair.app')
                    ->subject('[Contact CHAIR] ' . $validated['subject'])
                    ->replyTo($validated['email'], $validated['name']);
            }
        );

        return response()->json(['message' => 'Message envoyé.']);
    }
}
