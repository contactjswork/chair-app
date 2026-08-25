CHAIR — AVIS CERTIFIÉ

ALORS, CE RÉSULTAT ?

Bonjour {!! $clientName !!}, ton rendez-vous est terminé. Deux minutes pour dire ce
que tu en as pensé.

@include('emails.text.partials.details', ['rows' => $rows])

Ton avis sera publié comme avis certifié : sur CHAIR, seul quelqu'un qui est
vraiment passé chez ce coiffeur peut le noter. C'est ce qui rend les notes
fiables — et c'est ce qui fait connaître les bons coiffeurs.

Laisser mon avis :

{!! $reviewUrl !!}

@include('emails.text.partials.footer')
