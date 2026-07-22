import type { AuthUser } from '@/lib/auth';
import type { ApiHairdresserProfile, ApiStats } from '@/lib/types';

export interface ScoreItem {
  pts: number;
  label: string;
  /** Version courte du label, pour les listes condensées ("Il manque : bannière, bio") */
  short: string;
  href: string;
  done: boolean;
}

/**
 * Calcule la progression du profil (0-100) et la liste complète des actions
 * manquantes, triée par valeur en points décroissante (la plus prioritaire
 * en premier). Seule source de vérité côté frontend — utilisée par la home
 * (hero + actions recommandées + prochaine étape) et potentiellement d'autres
 * écrans à l'avenir.
 */
export function computeScore(
  user: AuthUser | null,
  fullProfile: ApiHairdresserProfile | null,
  stats: ApiStats | null,
  servicesCount: number,
  scheduleSet: boolean,
): { score: number; items: ScoreItem[] } {
  if (!user) return { score: 0, items: [] };
  const profile = user.hairdresser_profile;
  const isIndependent = profile?.is_independent !== false;
  const postsCount = stats?.posts_count ?? profile?.posts_count ?? 0;
  const reviewsCount = stats?.reviews_count ?? profile?.reviews_count ?? 0;
  const specialtiesCount = fullProfile?.specialties?.length ?? 0;

  const base: ScoreItem[] = [
    { pts: 12, done: !!user.avatar,              label: 'Ajoutez une photo de profil',    short: 'photo de profil',   href: '/pro/profil' },
    { pts: 10, done: !!fullProfile?.banner_image, label: 'Ajoutez une bannière',           short: 'bannière',          href: '/pro/profil' },
    { pts: 8,  done: !!profile?.tagline,          label: 'Ajoutez une accroche',           short: 'accroche',          href: '/pro/profil' },
    { pts: 8,  done: !!user.bio,                  label: 'Écrivez votre bio',              short: 'bio',               href: '/pro/profil' },
    { pts: 5,  done: !!(profile?.city || user.city), label: 'Ajoutez votre ville',         short: 'ville',             href: '/pro/profil' },
    { pts: 12, done: specialtiesCount >= 2,        label: 'Ajoutez au moins 2 spécialités', short: '2 spécialités',    href: '/pro/profil' },
    { pts: 20, done: postsCount >= 3,              label: postsCount === 0 ? 'Publiez vos premières réalisations' : 'Publiez au moins 3 réalisations', short: postsCount === 0 ? 'vos premières réalisations' : '3 réalisations', href: '/pro/portfolio' },
    { pts: 5,  done: reviewsCount > 0,             label: 'Recevez votre premier avis',    short: 'votre premier avis', href: isIndependent ? '/pro/reservations' : '/pro/mon-qr' },
  ];
  const independentOnly: ScoreItem[] = [
    { pts: 10, done: servicesCount > 0, label: 'Ajoutez vos services',     short: 'vos services',  href: '/pro/services' },
    { pts: 10, done: scheduleSet,        label: 'Définissez vos horaires', short: 'vos horaires',  href: '/pro/planning' },
  ];
  const all = isIndependent ? [...base, ...independentOnly] : base;
  const score = all.reduce((acc, item) => item.done ? acc + item.pts : acc, 0);
  const items = all.filter((i) => !i.done).sort((a, b) => b.pts - a.pts);
  return { score, items };
}
