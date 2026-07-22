import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Anciennes routes client → /app/...
      { source: '/feed',             destination: '/app/feed',          permanent: true },
      { source: '/rechercher',       destination: '/app/recherche',     permanent: true },
      { source: '/mes-inspirations', destination: '/app/inspirations',  permanent: true },
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
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'api.getchair.app', pathname: '/storage/**' },
      // Développement local uniquement
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/storage/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/storage/**' },
    ],
  },
};

export default nextConfig;
