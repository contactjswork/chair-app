@extends('emails.layout')

@section('subject', 'Ton avis sur CHAIR')

@section('content')
    <p style="margin:0 0 10px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; font-weight:bold; letter-spacing:3px; text-transform:uppercase; color:#8a8a8a;">Avis certifié</p>

    <h1 class="chair-h1" style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:bold; color:#0a0a0a;">Alors, ce résultat ?</h1>

    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Bonjour {{ $clientName }}, ton rendez-vous est terminé. Deux minutes pour dire ce que tu en as pensé.
    </p>

    @include('emails.partials.details', ['rows' => $rows])

    <p style="margin:0 0 24px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Ton avis sera publié comme <strong style="color:#0a0a0a;">avis certifié</strong> : sur CHAIR, seul quelqu'un qui est vraiment passé chez ce coiffeur peut le noter. C'est ce qui rend les notes fiables — et c'est ce qui fait connaître les bons coiffeurs.
    </p>

    @include('emails.partials.button', ['url' => $reviewUrl, 'label' => 'Laisser mon avis'])

    <p style="margin:24px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:24px; color:#6b6b6b;">
        Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br />
        <a href="{{ $reviewUrl }}" style="color:#0a0a0a; text-decoration:underline; word-break:break-all;">{{ $reviewUrl }}</a>
    </p>
@endsection
