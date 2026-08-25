{{--
    Gabarit email CHAIR — DA stricte : noir / blanc / gris neutres, aucune couleur,
    aucun emoji, aucune image distante (les clients mail bloquent les images par
    défaut : le logo est donc du texte).

    Compatibilité : tables + styles inline uniquement (Outlook Windows utilise le
    moteur Word — pas de flexbox, pas de grid, pas de CSS moderne). Largeur 600px.

    Variables attendues :
      $preheader      (string|null) — texte d'aperçu affiché par la boîte mail
      $unsubscribeUrl (string|null) — lien de gestion des préférences (emails non critiques)
      $securityNotice (bool)        — affiche la mention "email de sécurité, toujours envoyé"
      $legalUrls      (array)       — ['cgu' => ..., 'privacy' => ...]
    Section : @section('content')
--}}
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>@yield('subject', 'CHAIR')</title>
<!--[if mso]>
<style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style type="text/css">
    /* Seules règles non-inline : media query mobile (ignorée par Outlook, sans effet
       sur le rendu desktop) — tout le reste du style est inline. */
    {{-- @@media : échappement Blade, sinon le compilateur consomme le "@" comme une directive. --}}
    @@media only screen and (max-width: 620px) {
        .chair-wrap { width: 100% !important; }
        .chair-pad { padding-left: 24px !important; padding-right: 24px !important; }
        .chair-h1 { font-size: 24px !important; line-height: 32px !important; }
    }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

{{-- Preheader : aperçu dans la liste des mails, invisible dans le corps. --}}
@if(!empty($preheader))
<div style="display:none; font-size:1px; color:#f4f4f4; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">{{ $preheader }}</div>
@endif

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; margin:0; padding:0;">
<tr>
<td align="center" style="padding:32px 12px;">

    <table role="presentation" class="chair-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid #e5e5e5; border-radius:16px;">

        {{-- En-tête : mot-marque CHAIR en texte (aucune image distante) --}}
        <tr>
            <td class="chair-pad" align="left" style="padding:36px 40px 8px 40px; font-family:Arial, Helvetica, sans-serif;">
                <span style="font-family:Arial, Helvetica, sans-serif; font-size:20px; line-height:20px; font-weight:bold; letter-spacing:5px; color:#0a0a0a; text-transform:uppercase;">CHAIR</span>
            </td>
        </tr>

        {{-- Contenu --}}
        <tr>
            <td class="chair-pad" align="left" style="padding:20px 40px 40px 40px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#0a0a0a;">
                @yield('content')
            </td>
        </tr>

        {{-- Séparateur --}}
        <tr>
            <td style="padding:0 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td style="border-top:1px solid #e5e5e5; font-size:0; line-height:0;">&nbsp;</td></tr>
                </table>
            </td>
        </tr>

        {{-- Pied de page --}}
        <tr>
            <td class="chair-pad" align="left" style="padding:24px 40px 36px 40px; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#8a8a8a;">
                <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#8a8a8a;">
                    CHAIR — la plateforme des coiffeurs professionnels.
                </p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#8a8a8a;">
                    <a href="{{ $legalUrls['cgu'] ?? '#' }}" style="color:#8a8a8a; text-decoration:underline;">Conditions d'utilisation</a>
                    &nbsp;&middot;&nbsp;
                    <a href="{{ $legalUrls['privacy'] ?? '#' }}" style="color:#8a8a8a; text-decoration:underline;">Confidentialité</a>
                    @if(!empty($unsubscribeUrl))
                    &nbsp;&middot;&nbsp;
                    <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a; text-decoration:underline;">Gérer mes notifications</a>
                    @endif
                </p>
                @if(!empty($securityNotice))
                <p style="margin:8px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#8a8a8a;">
                    Cet email concerne la sécurité du compte : il est envoyé même si les notifications sont désactivées.
                </p>
                @endif
            </td>
        </tr>

    </table>

</td>
</tr>
</table>

</body>
</html>
