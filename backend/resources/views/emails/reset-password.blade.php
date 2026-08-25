@extends('emails.layout')

@section('subject', 'Réinitialiser le mot de passe')

@section('content')
    <h1 class="chair-h1" style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:bold; color:#0a0a0a;">Réinitialiser le mot de passe</h1>

    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Bonjour{{ $name !== '' ? ' ' . $name : '' }}, une demande de réinitialisation a été faite pour ce compte CHAIR.
    </p>

    <p style="margin:0 0 24px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Ce lien est valable {{ $expireMinutes }} minutes.
    </p>

    @include('emails.partials.button', ['url' => $resetUrl, 'label' => 'Choisir un nouveau mot de passe'])

    <p style="margin:24px 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:24px; color:#6b6b6b;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
        <a href="{{ $resetUrl }}" style="color:#0a0a0a; text-decoration:underline; word-break:break-all;">{{ $resetUrl }}</a>
    </p>

    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:24px; color:#6b6b6b;">
        Si cette demande ne vient pas de vous, ignorez cet email : le mot de passe reste inchangé.
    </p>
@endsection
