{{--
    Encadré récapitulatif (rendez-vous, etc.) — gris très clair, coins arrondis.
    Variable : $rows = [['label' => 'Coiffeur', 'value' => 'Nom'], ...]
    Les lignes dont la valeur est vide sont ignorées (aucune ligne "—" inventée).
--}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa; border:1px solid #e5e5e5; border-radius:12px; margin:8px 0 24px 0;">
    <tr>
        <td style="padding:20px 24px; font-family:Arial, Helvetica, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                @foreach($rows as $row)
                    @if(!empty($row['value']))
                        <tr>
                            <td style="padding:4px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#6b6b6b; width:38%;">{{ $row['label'] }}</td>
                            <td style="padding:4px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#0a0a0a; font-weight:bold;">{{ $row['value'] }}</td>
                        </tr>
                    @endif
                @endforeach
            </table>
        </td>
    </tr>
</table>
