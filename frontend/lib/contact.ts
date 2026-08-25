// Source unique des informations de contact publiées par CHAIR.
//
// Apple guideline 1.2 exige une « published contact information » qui répond
// réellement, et 2.3 interdit les informations trompeuses : une adresse ou un
// délai différent selon la page, c'est un motif de rejet. Toute page, tout
// composant qui affiche un email de support ou un délai de réponse DOIT
// importer ces constantes plutôt que réécrire la valeur en dur.
//
// L'adresse retenue est celle qui est réellement câblée côté serveur :
// backend/app/Http/Controllers/Api/ContactController.php envoie le formulaire
// de contact à contact@getchair.app. Elle DOIT donc être relevée par un humain.
export const SUPPORT_EMAIL = 'contact@getchair.app';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

// Plage d'ouverture annoncée publiquement (aide in-app, page contact).
export const SUPPORT_HOURS = 'Lun–Ven, 9h–18h';

// Délai de réponse annoncé. Aligné sur les CGU (« Réponse garantie sous
// 72 heures ouvrées ») — ne pas annoncer plus court ailleurs.
export const SUPPORT_RESPONSE_DELAY = 'sous 72h';
export const SUPPORT_RESPONSE_DELAY_LONG = 'sous 72 heures ouvrées';

// Délai d'examen d'un signalement de contenu. Valeur reprise à l'identique
// dans les règles de communauté, les CGU et les feuilles de signalement.
export const MODERATION_DELAY = 'sous 72 heures';

// ───────────────────────────────────────────────────────────────────────────
// Réseaux sociaux — À REMPLIR PAR LE GÉRANT, uniquement si le compte existe.
//
// Le code affichait auparavant des liens morts (https://instagram.com et
// https://tiktok.com, sans handle) et des handles non vérifiés : un lien qui
// tombe sur une 404 pendant la revue Apple fait amateur. Tant que la valeur
// vaut `null`, le bloc réseaux sociaux n'est simplement pas rendu.
// ───────────────────────────────────────────────────────────────────────────
export const SOCIAL_LINKS: {
  instagram: { handle: string; url: string } | null;
  tiktok: { handle: string; url: string } | null;
} = {
  instagram: null, // ex. { handle: '@chair.app', url: 'https://instagram.com/chair.app' }
  tiktok: null,    // ex. { handle: '@chair.app', url: 'https://tiktok.com/@chair.app' }
};
