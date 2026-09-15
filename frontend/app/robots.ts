import type { MetadataRoute } from 'next';

// Robots — tout est indexable SAUF les espaces connectés (pro, business,
// admin, compte) : Google n'a rien à y faire, et un dashboard indexé est
// une fuite d'écran au mieux, une gêne au pire.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/pro/', '/business/', '/admin/', '/app/compte/', '/dashboard/', '/contrat-fauteuil/'],
      },
    ],
    sitemap: 'https://getchair.app/sitemap.xml',
  };
}
