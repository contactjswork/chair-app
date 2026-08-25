CHAIR

TON RENDEZ-VOUS A ÉTÉ ANNULÉ.

Bonjour {!! $clientName !!}, ce rendez-vous n'aura pas lieu. Rien ne t'est facturé.

@include('emails.text.partials.details', ['rows' => $rows])

Tu peux reprendre un créneau quand tu veux.
@if($hairdresserUrl)

{!! $hairdresserUrl !!}
@endif

@include('emails.text.partials.footer')
