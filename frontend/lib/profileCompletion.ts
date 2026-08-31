import type { ApiHairdresserProfile } from './types';

/**
 * Score de complétion du profil coiffeur.
 *
 * Le calcul vivait dans app/pro/profil/page.tsx. La home pro en a besoin
 * aussi : dupliquer la liste des critères aurait garanti qu'un jour les deux
 * écrans annoncent deux pourcentages différents pour le même profil — et
 * c'est exactement le genre d'incohérence qui fait douter de tout le reste.
 *
 * Les points ne sont pas arbitraires : ils reflètent ce qui fait réellement
 * réserver. Une photo et une bio pèsent plus qu'un code postal.
 */

export interface CompletionItem {
  label: string;
  done: boolean;
  pts: number;
  /** Où aller pour le remplir — utilisé par la home pour amener au bon champ. */
  href: string;
}

export interface CompletionResult {
  score: number;
  total: number;
  pct: number;
  items: CompletionItem[];
  /** Le critère manquant qui rapporte le plus. Null si le profil est complet. */
  next: CompletionItem | null;
}

interface Champs {
  avatarUrl: string | null;
  bio: string;
  tagline: string;
  city: string;
  postalCode: string;
  specialtyCount: number;
  bookingUrl: string;
  yearsExp: string;
  isIndependent: boolean;
}

export function computeCompletion(c: Champs): CompletionResult {
  const items: CompletionItem[] = [
    { label: 'Photo de profil', done: !!c.avatarUrl, pts: 20, href: '/pro/profil' },
    { label: 'Bio (100 caractères min)', done: c.bio.trim().length >= 100, pts: 20, href: '/pro/profil' },
    { label: 'Accroche', done: c.tagline.trim().length >= 10, pts: 15, href: '/pro/profil' },
    { label: 'Ville', done: c.city.trim().length > 0, pts: 10, href: '/pro/profil' },
    { label: 'Code postal', done: c.postalCode.trim().length > 0, pts: 5, href: '/pro/profil' },
    { label: 'Spécialités (min 2)', done: c.specialtyCount >= 2, pts: 15, href: '/pro/profil' },
    ...(!c.isIndependent
      ? [{ label: 'Lien de réservation', done: c.bookingUrl.trim().length > 0, pts: 15, href: '/pro/profil' }]
      : []),
    { label: "Années d'expérience", done: c.yearsExp.trim().length > 0 && c.yearsExp !== '0', pts: 5, href: '/pro/profil' },
  ];

  const total = items.reduce((s, i) => s + i.pts, 0);
  const score = items.filter((i) => i.done).reduce((s, i) => s + i.pts, 0);
  const manquants = items.filter((i) => !i.done).sort((a, b) => b.pts - a.pts);

  return {
    score,
    total,
    pct: total > 0 ? Math.round((score / total) * 100) : 100,
    items,
    next: manquants[0] ?? null,
  };
}

/** Variante à partir du profil renvoyé par l'API, pour les écrans qui ne tiennent pas de formulaire. */
export function completionFromProfile(p: ApiHairdresserProfile | null): CompletionResult | null {
  if (!p) return null;
  return computeCompletion({
    avatarUrl: p.user?.avatar ?? null,
    // La bio est portee par l utilisateur, pas par le profil coiffeur.
    bio: p.user?.bio ?? '',
    tagline: p.tagline ?? '',
    city: p.city ?? '',
    postalCode: p.postal_code ?? '',
    specialtyCount: p.specialties?.length ?? 0,
    bookingUrl: p.booking_url ?? '',
    yearsExp: p.years_experience != null ? String(p.years_experience) : '',
    isIndependent: p.is_independent,
  });
}
