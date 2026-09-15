import type { MetadataRoute } from 'next';

// Sitemap — l'acquisition gratuite : chaque fiche coiffeur, salon et annonce
// de fauteuil est indexable par Google. Les slugs viennent d'un endpoint
// public léger (cache 1 h côté backend), régénérés ici toutes les heures.

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const SITE = 'https://getchair.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statiques: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/app`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/app/recherche`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/pro`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/business`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/cgu`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE}/confidentialite`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  try {
    const res = await fetch(`${API}/sitemap-slugs`, { next: { revalidate: 3600 } });
    if (!res.ok) return statiques;
    const data = (await res.json()) as { hairdressers?: string[]; salons?: string[]; rentals?: string[] };

    return [
      ...statiques,
      ...(data.hairdressers ?? []).map((slug) => ({
        url: `${SITE}/app/coiffeur/${slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
      ...(data.salons ?? []).map((slug) => ({
        url: `${SITE}/app/salon/${slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
      ...(data.rentals ?? []).map((slug) => ({
        url: `${SITE}/fauteuil/${slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // API injoignable au build : le sitemap statique vaut mieux que pas de
    // sitemap du tout.
    return statiques;
  }
}
