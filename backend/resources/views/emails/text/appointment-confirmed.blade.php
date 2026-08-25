CHAIR

TON RENDEZ-VOUS EST CONFIRMÉ.

Bonjour {!! $clientName !!}, c'est confirmé — voici le récapitulatif.

@include('emails.text.partials.details', ['rows' => $rows])
@if($appointmentsUrl)

Voir mes rendez-vous :

{!! $appointmentsUrl !!}
@endif

Un empêchement ? Préviens ton coiffeur au plus tôt, il pourra libérer le
créneau.

@include('emails.text.partials.footer')
