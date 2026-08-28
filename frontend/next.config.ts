import type { NextConfig } from "next";

// ── Garde-fou de build production ────────────────────────────────────────
// Quasiment tout le code fait `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'`.
// NEXT_PUBLIC_* est inliné À LA COMPILATION : si la variable manque au moment
// du `next build` de production, l'application déployée part en clair vers
// http://localhost:8000 — donc écran vide chez l'utilisateur, et rejet App
// Review (guideline 2.1 Performance : App Completeness). Comme `.env*` est
// gitignoré, la variable ne peut venir que de l'environnement du build : on
// refuse donc de produire un build production sans URL d'API HTTPS valide,
// plutôt que d'expédier un binaire silencieusement cassé.
const IS_PROD_BUILD =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SKIP_ENV_CHECK !== 'true';

if (IS_PROD_BUILD) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error(
      "[CHAIR] NEXT_PUBLIC_API_URL est absente du build production. " +
        "Sans elle, l'app entière retombe sur http://localhost:8000/api et ne fonctionne chez personne. " +
        "Définis-la dans l'environnement de build (ex: https://api.getchair.app/api)."
    );
  }
  if (!apiUrl.startsWith('https://')) {
    throw new Error(
      `[CHAIR] NEXT_PUBLIC_API_URL doit être en HTTPS en production (reçu : ${apiUrl}). ` +
        "App Transport Security bloque le trafic en clair depuis la WebView iOS."
    );
  }
}

// ── Content-Security-Policy : origines réellement utilisées ──────────────
// Établies en inspectant le code, pas au jugé :
//  - l'API (NEXT_PUBLIC_API_URL) : tous les fetch de lib/api.ts, plus les
//    images servies depuis /storage ;
//  - cdn.apple-mapkit.com : mapkit.js + tuiles Apple Plans (mapkitAdapter.ts,
//    preconnect dans app/layout.tsx) ;
//  - tile.openstreetmap.org : tuiles du moteur de carte de repli (Leaflet).
//    Leaflet (leafletAdapter.ts) ;
//  - res.cloudinary.com / images.unsplash.com / i.pravatar.cc : hôtes
//    d'images déjà déclarés dans images.remotePatterns ci-dessous ;
//  - blob: / data: : aperçus locaux avant upload (ImageCropModal,
//    StoryCreateCard, ImageUpload — URL.createObjectURL) et export CSV admin.
// Les polices passent par next/font/google, qui les auto-héberge au build :
// aucun accès runtime à fonts.googleapis.com / fonts.gstatic.com n'est requis.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').origin;
  } catch {
    return 'http://localhost:8000';
  }
})();

const IMAGE_ORIGINS = [
  API_ORIGIN,
  'https://res.cloudinary.com',
  'https://images.unsplash.com',
  'https://i.pravatar.cc',
  'https://tile.openstreetmap.org',
  'https://*.apple-mapkit.com',
].join(' ');

// ATTENTION — CETTE CSP EST DÉLIBÉRÉMENT EN REPORT-ONLY.
// Elle n'empêche RIEN pour l'instant : le navigateur se contente de signaler
// dans la console ce qu'elle aurait bloqué. C'est volontaire : une CSP
// bloquante mal calibrée casse silencieusement la carte (MapKit charge des
// workers et des tuiles depuis plusieurs sous-domaines Apple qui ne sont pas
// tous documentés) ou les images de production, et le symptôme n'apparaîtrait
// qu'après mise en ligne.
// PROCÉDURE POUR LA RENDRE BLOQUANTE (à faire seulement après observation) :
//  1. déployer en l'état, ouvrir la recherche/carte, le feed, l'upload de
//     photo, le parcours de réservation, sur iOS et sur desktop ;
//  2. relever dans la console les rapports « Content-Security-Policy
//     (Report Only) … would have been blocked » et élargir les directives
//     concernées ici ;
//  3. quand plus aucun rapport ne remonte pendant plusieurs jours de trafic
//     réel, renommer l'en-tête en 'Content-Security-Policy'.
// Note : 'unsafe-inline' et 'unsafe-eval' sur script-src sont requis par
// Next.js (scripts d'hydratation inline, et eval en mode dev) tant qu'un
// système de nonce n'est pas mis en place.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.apple-mapkit.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${IMAGE_ORIGINS}`,
  "font-src 'self' data:",
  `connect-src 'self' blob: ${API_ORIGIN} https://*.apple-mapkit.com https://tile.openstreetmap.org`,
  "worker-src 'self' blob:",
  "media-src 'self' data: blob:",
  "manifest-src 'self'",
  "frame-src 'self'",
].join('; ');

// En-têtes de sécurité appliqués à toutes les réponses. Aucun n'a d'effet de
// bord sur l'app : le site n'est jamais embarqué en iframe (aucun <iframe>
// dans le code), n'utilise ni caméra ni micro, et la géolocalisation reste
// autorisée en same-origin (recherche de coiffeurs à proximité).
const SECURITY_HEADERS = [
  // Empêche le navigateur de « deviner » un type MIME (une image uploadée
  // interprétée comme du HTML deviendrait une XSS stockée).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Ne fuite jamais le chemin complet (ex: /app/avis/TOKEN) vers un site tiers.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Anti-clickjacking. Doublé par frame-ancestors dans la CSP, mais celle-ci
  // étant en report-only, X-Frame-Options est aujourd'hui la seule protection
  // réellement appliquée.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Coupe les API que l'app n'utilise pas ; la géolocalisation reste ouverte
  // en same-origin (page /app/recherche + @capacitor/geolocation côté natif).
  {
    key: 'Permissions-Policy',
    value:
      'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
  // Ignoré par les navigateurs sur une réponse HTTP en clair (donc sans effet
  // en développement local), actif dès que le site est servi en HTTPS.
  // Pas de `preload` : l'inscription à la liste HSTS d'un navigateur est
  // difficilement réversible et relève d'une décision du gérant.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  async headers() {
    // '/(.*)' — catch-all documenté par Next : couvre la racine, les routes
    // imbriquées et les chemins commençant par un point (/.well-known/…).
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // Anciennes routes client → /app/...
      { source: '/feed',             destination: '/app/feed',          permanent: true },
      { source: '/rechercher',       destination: '/app/recherche',     permanent: true },
      // « Inspirations » et l'onglet « Publications » des favoris designaient la
      // MEME liste (savedPosts), sous deux noms et deux adresses, et la page
      // dediee n'etait liee depuis aucun ecran. Une seule destination desormais.
      { source: '/mes-inspirations', destination: '/app/favoris', permanent: true },
      { source: '/app/inspirations', destination: '/app/favoris', permanent: true },
      { source: '/favoris',          destination: '/app/favoris',       permanent: true },
      { source: '/classements',      destination: '/app/classements',   permanent: true },
      { source: '/notifications',    destination: '/app/notifications', permanent: true },
      { source: '/onboarding-client',destination: '/app/onboarding',   permanent: true },
      { source: '/recrutement',      destination: '/app/recrutement',   permanent: true },
      { source: '/compte/:path*',    destination: '/app/compte/:path*', permanent: true },
      { source: '/coiffeur/:path*',  destination: '/app/coiffeur/:path*', permanent: true },
      { source: '/salon/:path*',     destination: '/app/salon/:path*',  permanent: true },
      { source: '/realisation/:id',  destination: '/app/realisation/:id', permanent: true },
      { source: '/avis/:token',      destination: '/app/avis/:token',   permanent: true },
      { source: '/scan/:token',      destination: '/app/scan/:token',   permanent: true },
      // Anciennes routes pro → /pro/...
      { source: '/dashboard',                  destination: '/pro',                   permanent: true },
      { source: '/dashboard/:path*',           destination: '/pro/:path*',            permanent: true },
      // Statistiques fusionnée dans Performance (ex-Business)
      { source: '/pro/statistiques',           destination: '/pro/business',          permanent: true },
      // Rejoindre un salon + invitations fusionnées dans la fiche Salon
      { source: '/pro/rejoindre-salon',        destination: '/pro/salon',             permanent: true },
      { source: '/pro/invitations',            destination: '/pro/salon',             permanent: true },
      // Ancienne URL site vitrine
      { source: '/site-vitrine',               destination: '/',                      permanent: true },
      { source: '/site-vitrine/:path*',        destination: '/:path*',                permanent: true },
      // Anciennes pages vitrine autonomes, jamais liées ailleurs — fusionnées dans la home
      { source: '/clients',                    destination: '/',                      permanent: true },
      { source: '/coiffeurs',                  destination: '/pro/inscription',       permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'api.getchair.app', pathname: '/storage/**' },
      // Développement local uniquement — jamais autorisé dans un build
      // production : l'optimiseur d'images Next irait alors chercher du HTTP
      // en clair sur la machine de déploiement, et une image servie en http://
      // depuis la WebView iOS est bloquée par App Transport Security.
      ...(process.env.NODE_ENV === 'production'
        ? []
        : ([
            { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/storage/**' },
            { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/storage/**' },
          ] as const)),
    ],
  },
};

export default nextConfig;
