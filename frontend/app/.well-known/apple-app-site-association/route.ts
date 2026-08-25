// ── Universal Links iOS : apple-app-site-association ──────────────────────
//
// Ce fichier fait qu'un lien https://www.getchair.app/app/coiffeur/xxx partagé
// par SMS ouvre l'application installée au lieu de Safari. Sans lui, tout lien
// CHAIR sort de l'app.
//
// POURQUOI UNE ROUTE DYNAMIQUE ET PAS UN FICHIER STATIQUE DANS /public :
// le JSON doit contenir l'Apple Team ID RÉEL du compte Apple Developer
// (préfixe de l'App ID : `TEAMID.app.getchair.client`). Un Team ID inventé ou
// laissé en placeholder serait PIRE que l'absence de fichier : Apple récupère
// l'AASA via son propre CDN et le met en cache plusieurs jours ; un fichier
// faux resterait donc en cache et casserait les Universal Links bien après
// correction. On sert donc :
//   - 404 tant que APPLE_TEAM_ID est absente ou malformée (état actuel, et
//     état parfaitement sain : iOS conclut simplement « ce domaine ne
//     revendique aucune app » et continue d'ouvrir Safari) ;
//   - le JSON correct dès que la variable est renseignée chez l'hébergeur.
//
// Voir docs/app-store/DEEPLINKS_SETUP.md pour les étapes restantes côté natif
// (capability Associated Domains, plugin @capacitor/app) — elles exigent un
// nouveau build TestFlight.

// Le fichier est lu par le CDN d'Apple, jamais par un navigateur : on ne veut
// aucune valeur figée au build (sinon un build fait avant que le gérant ne
// pose la variable resterait bloqué sur le 404 pour toujours).
export const dynamic = 'force-dynamic';

/** Bundle ID de l'app CHAIR (client) — cf. capacitor.chair.config.ts. */
const CLIENT_BUNDLE_ID = process.env.APPLE_CLIENT_BUNDLE_ID || 'app.getchair.client';
/** Bundle ID de l'app CHAIR PRO — cf. capacitor.pro.config.ts. */
const PRO_BUNDLE_ID = process.env.APPLE_PRO_BUNDLE_ID || 'app.getchair.pro';

/**
 * Un Team ID Apple fait exactement 10 caractères alphanumériques majuscules
 * (ex: 4X8ZQ2K9AB). On refuse tout le reste — « TODO », « XXXXXXXXXX »,
 * une chaîne vide entourée d'espaces — plutôt que de publier un AASA
 * invalide qu'Apple garderait en cache.
 */
function readTeamId(): string | null {
  const raw = (process.env.APPLE_TEAM_ID ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(raw) ? raw : null;
}

/**
 * Chemins revendiqués par l'app CLIENT.
 *
 * DEUX FAMILLES, et les deux sont indispensables :
 *  1. les routes actuelles `/app/*` ;
 *  2. les routes historiques que next.config.ts redirige en permanent (308)
 *     vers `/app/*`
 *     (/realisation/:id, /avis/:token, /coiffeur/:slug…). iOS ne suit PAS les
 *     redirections pour décider s'il ouvre l'app : il compare l'URL cliquée,
 *     telle quelle, aux `components` ci-dessous. Un vieux lien
 *     getchair.app/realisation/42 encore vivant dans une conversation
 *     WhatsApp partirait donc dans Safari s'il n'était pas listé ici.
 *
 * `/x` et `/x/*` sont listés séparément : le motif `*` ne couvre pas le
 * chemin nu (`/favoris` n'est pas matché par `/favoris/*`).
 *
 * Ne sont volontairement PAS revendiqués : la home vitrine `/`, /cgu,
 * /confidentialite, /contact, /download, /connexion, /inscription,
 * /parrainage — pages de conversion ou pages partagées entre les deux apps,
 * qui doivent rester ouvrables dans un navigateur par quelqu'un qui n'a pas
 * (encore) l'app.
 */
const CLIENT_PATHS: string[] = [
  // Routes actuelles
  '/app',
  '/app/*',
  // Routes historiques redirigées en permanent (308) par next.config.ts
  '/feed',
  '/rechercher',
  '/mes-inspirations',
  '/favoris',
  '/classements',
  '/notifications',
  '/onboarding-client',
  '/recrutement',
  '/compte',
  '/compte/*',
  '/coiffeur',
  '/coiffeur/*',
  '/salon',
  '/salon/*',
  '/realisation/*',
  '/avis/*',
  '/scan/*',
];

/**
 * Chemins revendiqués par l'app PRO (même domaine, donc même fichier AASA :
 * un domaine ne peut servir qu'un seul apple-app-site-association).
 * `/dashboard*` est l'ancienne racine pro, redirigée en permanent vers `/pro`.
 */
const PRO_PATHS: string[] = ['/pro', '/pro/*', '/dashboard', '/dashboard/*'];

function components(paths: string[]) {
  return paths.map((path) => ({ '/': path, comment: `CHAIR ${path}` }));
}

export async function GET(): Promise<Response> {
  const teamId = readTeamId();

  if (!teamId) {
    // Pas de Team ID → pas de fichier. Surtout pas un JSON avec un
    // placeholder : le CDN d'Apple le mettrait en cache.
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const payload = {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${CLIENT_BUNDLE_ID}`],
          components: components(CLIENT_PATHS),
        },
        {
          appIDs: [`${teamId}.${PRO_BUNDLE_ID}`],
          components: components(PRO_PATHS),
        },
      ],
    },
    // Permet à iOS de proposer l'enregistrement / le remplissage automatique
    // du mot de passe CHAIR entre le site et l'app. Sans effet tant que
    // `webcredentials:www.getchair.app` n'est pas ajouté aux entitlements —
    // donc inoffensif à laisser ici dès maintenant.
    webcredentials: {
      apps: [`${teamId}.${CLIENT_BUNDLE_ID}`, `${teamId}.${PRO_BUNDLE_ID}`],
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      // Apple exige application/json ET une URL SANS extension de fichier.
      'Content-Type': 'application/json',
      // Le CDN d'Apple recharge le fichier régulièrement ; une heure de cache
      // suffit à absorber la charge sans figer une correction pendant des jours.
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
