--
CHAIR — la plateforme des coiffeurs professionnels.
Conditions d'utilisation : {!! $legalUrls['cgu'] ?? '' !!}
Confidentialité : {!! $legalUrls['privacy'] ?? '' !!}
@if(!empty($unsubscribeUrl))
Gérer mes notifications : {!! $unsubscribeUrl !!}
@endif
@if(!empty($securityNotice))

Cet email concerne la sécurité du compte : il est envoyé même si les
notifications sont désactivées.
@endif
