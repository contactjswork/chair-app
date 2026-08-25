@extends('emails.layout')

@section('subject', 'Ton rendez-vous a été annulé')

@section('content')
    <h1 class="chair-h1" style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:bold; color:#0a0a0a;">Ton rendez-vous a été annulé.</h1>

    <p style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Bonjour {{ $clientName }}, ce rendez-vous n'aura pas lieu. Rien ne t'est facturé.
    </p>

    @include('emails.partials.details', ['rows' => $rows])

    <p style="margin:0 0 24px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Tu peux reprendre un créneau quand tu veux.
    </p>

    @if($hairdresserUrl)
        @include('emails.partials.button', ['url' => $hairdresserUrl, 'label' => 'Reprendre un rendez-vous'])
    @endif
@endsection
