'use client';

import { useEffect, useState } from 'react';
import type { ApiChairBadge } from '@/lib/types';

const STORAGE_KEY = 'chair_seen_badges';

/**
 * Détecte les badges débloqués depuis la dernière visite de la page badges
 * (diff localStorage vs chair_badges_all courant) — pas de canal temps réel
 * côté backend, mais suffisant pour ne jamais rejouer une célébration déjà vue.
 */
export function useNewlyUnlockedBadges(unlocked: ApiChairBadge[], ready: boolean): ApiChairBadge[] {
  const [newlyUnlocked, setNewlyUnlocked] = useState<ApiChairBadge[]>([]);

  useEffect(() => {
    if (!ready) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch { /* première visite ou storage corrompu */ }

    const seenSet = new Set(seen);
    const isFirstVisit = seen.length === 0;

    // Première visite jamais enregistrée : on ne célèbre rien rétroactivement
    // (sinon un coiffeur avec 30 badges déjà acquis verrait un carrousel de 30
    // célébrations à sa première ouverture de la page) — on marque juste l'état actuel comme vu.
    if (!isFirstVisit) {
      const fresh = unlocked.filter((b) => !seenSet.has(b.code));
      if (fresh.length > 0) setNewlyUnlocked(fresh);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked.map((b) => b.code)));
  }, [ready, unlocked]);

  return newlyUnlocked;
}
