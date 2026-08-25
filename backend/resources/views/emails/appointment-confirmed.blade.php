@extends('emails.layout')

@section('subject', 'Ton rendez-vous est confirmé')

@section('content')
    <h1 class="chair-h1" style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:bold; color:#0a0a0a;">Ton rendez-vous est confirmé.</h1>

    <p style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Bonjour {{ $clientName }}, c'est confirmé — voici le récapitulatif.
    </p>

    @include('emails.partials.details', ['rows' => $rows])

    @if($appointmentsUrl)
        @include('emails.partials.button', ['url' => $appointmentsUrl, 'label' => 'Voir mes rendez-vous'])
    @endif

    <p style="margin:24px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:24px; color:#6b6b6b;">
        Un empêchement ? Préviens ton coiffeur au plus tôt, il pourra libérer le créneau.
    </p>
@endsection
