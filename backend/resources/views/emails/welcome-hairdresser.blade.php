@extends('emails.layout')

@section('subject', 'Bienvenue sur CHAIR PRO')

@section('content')
    <h1 class="chair-h1" style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:bold; color:#0a0a0a;">Bienvenue sur CHAIR PRO, {{ $name }}.</h1>

    <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Votre compte est créé. Sur CHAIR, c'est le coiffeur qui est la marque — votre profil est votre vitrine, pas celle du salon.
    </p>

    <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
        Trois choses à faire pour être visible :
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
            <td style="padding:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
                <strong style="color:#0a0a0a;">1.</strong>&nbsp; Compléter votre profil : photo, ville, spécialités. C'est ce qui vous fait remonter dans la recherche.
            </td>
        </tr>
        <tr>
            <td style="padding:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
                <strong style="color:#0a0a0a;">2.</strong>&nbsp; Publier vos réalisations : vos clients choisissent sur ce qu'ils voient.
            </td>
        </tr>
        <tr>
            <td style="padding:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
                <strong style="color:#0a0a0a;">3.</strong>&nbsp; Afficher votre QR code en poste : vos clients scannent après la prestation et laissent un avis certifié. Sur CHAIR, personne ne peut vous noter sans être passé chez vous.
            </td>
        </tr>
    </table>

    @include('emails.partials.button', ['url' => $profileUrl, 'label' => 'Compléter mon profil'])

    <p style="margin:24px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:24px; color:#6b6b6b;">
        Votre QR code personnel est disponible dans votre espace pro, rubrique « Mon QR ».
    </p>
@endsection
