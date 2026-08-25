CHAIR

RÉINITIALISER LE MOT DE PASSE

Bonjour{{ $name !== '' ? ' ' : '' }}{!! $name !!}, une demande de réinitialisation a été faite
pour ce compte CHAIR.

Ce lien est valable {{ $expireMinutes }} minutes :

{!! $resetUrl !!}

Si cette demande ne vient pas de vous, ignorez cet email : le mot de passe
reste inchangé.

@include('emails.text.partials.footer')
