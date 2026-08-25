@extends('emails.layout')

@section('subject', 'Bienvenue sur CHAIR')

@section('content')
    <h1 class="chair-h1" style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:bold; color:#0a0a0a;">Bienvenue, {{ $name }}.</h1>

    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Ton compte CHAIR est prêt. Ici, tu ne cherches pas un salon : tu cherches un coiffeur.
    </p>

    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Tu vois ses réalisations, ses spécialités, et des avis certifiés — impossible de noter un coiffeur sans être vraiment passé chez lui. Ce que tu lis correspond à de vraies visites.
    </p>

    <p style="margin:0 0 24px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Pour commencer : trouve les coiffeurs près de chez toi et regarde leur travail.
    </p>

    @include('emails.partials.button', ['url' => $exploreUrl, 'label' => 'Découvrir les coiffeurs'])

    <p style="margin:24px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:24px; color:#6b6b6b;">
        Après ton prochain rendez-vous, tu pourras laisser un avis certifié. C'est ce qui aide les bons coiffeurs à se faire connaître.
    </p>
@endsection
