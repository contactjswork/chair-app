{{--
    Bouton d'action — table + padding (aucun display:inline-block seul : Outlook
    ignore les paddings sur les <a>). Noir plein, texte blanc, coins arrondis.
    Variables : $url, $label
--}}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px 0;">
    <tr>
        <td align="center" bgcolor="#0a0a0a" style="background-color:#0a0a0a; border-radius:10px;">
            <a href="{{ $url }}" target="_blank" style="display:inline-block; padding:14px 28px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:20px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:10px;">{{ $label }}</a>
        </td>
    </tr>
</table>
