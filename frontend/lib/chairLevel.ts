/**
 * Fonctions et constantes CHAIR level — pas de 'use client'
 * Utilisables dans Server Components ET Client Components.
 */

import type { ApiHairdresserProfile } from '@/lib/types';

// ── Level card/bar styles ────────────────────────────────────────────────────

export const LEVEL_STYLES: Record<string, { bg: string; text: string; bar: string }> = {
  neutral: { bg: 'bg-neutral-100', text: 'text-neutral-600', bar: 'bg-neutral-400' },
  bronze:  { bg: 'bg-amber-50',    text: 'text-amber-700',   bar: 'bg-amber-500'   },
  silver:  { bg: 'bg-neutral-100', text: 'text-neutral-700', bar: 'bg-neutral-500' },
  gold:    { bg: 'bg-yellow-50',   text: 'text-yellow-700',  bar: 'bg-yellow-500'  },
  purple:  { bg: 'bg-purple-50',   text: 'text-purple-700',  bar: 'bg-purple-500'  },
  diamond: { bg: 'bg-neutral-900', text: 'text-white',        bar: 'bg-white'       },
};

// ── Ring styles par niveau ────────────────────────────────────────────────────

export const LEVEL_RING: Record<string, {
  ring: string;
  pill: string;
  glow: string;
  show: boolean;
  label: string;
}> = {
  neutral:  { ring: '',                                          pill: '',                               glow: '',                                  show: false, label: 'Débutant'       },
  bronze:   { ring: 'ring-[3px] ring-amber-400 ring-offset-2',  pill: 'bg-amber-400 text-white',        glow: '0 0 12px rgba(245,158,11,0.5)',     show: true,  label: 'Actif'          },
  silver:   { ring: 'ring-[3px] ring-neutral-300 ring-offset-2',pill: 'bg-neutral-200 text-neutral-700',glow: '0 0 12px rgba(163,163,163,0.4)',    show: true,  label: 'Confirmé'       },
  gold:     { ring: 'ring-[4px] ring-yellow-400 ring-offset-2', pill: 'bg-yellow-400 text-neutral-900', glow: '0 0 16px rgba(234,179,8,0.6)',      show: true,  label: 'Expert'         },
  purple:   { ring: 'ring-[4px] ring-purple-500 ring-offset-2', pill: 'bg-purple-500 text-white',       glow: '0 0 16px rgba(168,85,247,0.5)',     show: true,  label: 'Elite'          },
  diamond:  { ring: 'ring-[4px] ring-neutral-900 ring-offset-2',pill: 'bg-neutral-900 text-white',      glow: '0 0 20px rgba(0,0,0,0.4)',          show: true,  label: 'Légende CHAIR'  },
};

/** Renvoie le CSS du gradient de ring selon la couleur du niveau */
export function ringGradientClass(levelColor: string): string {
  switch (levelColor) {
    case 'gold':    return 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500';
    case 'purple':  return 'bg-gradient-to-br from-purple-400 to-purple-600';
    case 'silver':  return 'bg-gradient-to-br from-neutral-200 to-neutral-400';
    case 'diamond': return 'bg-neutral-900';
    case 'bronze':  return 'bg-amber-400';
    default:        return '';
  }
}

/** Estime le niveau depuis les stats brutes (Server + Client) */
export function estimateLevelColor(h: Pick<
  ApiHairdresserProfile,
  'posts_count' | 'followers_count' | 'reviews_count' | 'avg_rating' | 'visits_count' | 'is_verified'
>): string {
  let pts = 0;
  if (h.posts_count >= 1)  pts += 30;
  if (h.posts_count >= 5)  pts += 50;
  if (h.posts_count >= 20) pts += 100;
  if (h.followers_count >= 1)   pts += 15;
  if (h.followers_count >= 30)  pts += 60;
  if (h.followers_count >= 100) pts += 120;
  if (h.followers_count >= 500) pts += 300;
  if (h.reviews_count >= 1) pts += 25;
  const rating = parseFloat(h.avg_rating ?? '0');
  if (h.reviews_count >= 5  && rating >= 4.5) pts += 80;
  if (h.reviews_count >= 10 && rating >= 4.8) pts += 150;
  if (h.visits_count >= 1)   pts += 50;
  if (h.visits_count >= 10)  pts += 100;
  if (h.visits_count >= 50)  pts += 250;
  if (h.visits_count >= 100) pts += 500;
  if (h.is_verified) pts += 100;

  if (pts >= 2500) return 'diamond';
  if (pts >= 1000) return 'purple';
  if (pts >= 500)  return 'gold';
  if (pts >= 250)  return 'silver';
  if (pts >= 100)  return 'bronze';
  return 'neutral';
}
