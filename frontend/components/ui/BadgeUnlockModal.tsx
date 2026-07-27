'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, ArrowRight, X } from 'lucide-react';
import { BadgeMedallion } from './ChairBadges';
import type { ApiChairBadge } from '@/lib/types';

interface Props {
  badges: ApiChairBadge[];
  onClose: () => void;
}

// Célébration de déblocage — déclenchée une seule fois par badge (voir
// useNewlyUnlockedBadges), jamais rejouée au refresh. L'intensité visuelle
// suit la rareté : un badge commun/rare a une carte sobre, un légendaire/
// ultime a un halo doré — pas de confettis systématiques partout (brief
// masterclass badges, section 9).
export default function BadgeUnlockModal({ badges, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const badge = badges[index];

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([12, 40, 12]);
  }, [index]);

  if (!badge) return null;

  const isBig = badge.rarity === 'legendaire' || badge.rarity === 'ultime';
  const hasMore = index < badges.length - 1;

  async function handleShare() {
    const text = `Nouveau badge débloqué sur CHAIR : ${badge.name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* partage annulé */ }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative w-full max-w-sm rounded-3xl p-7 text-center animate-in zoom-in-95 fade-in duration-300 ${
          isBig ? 'bg-neutral-950 shadow-[0_0_60px_rgba(217,119,6,0.25)]' : 'bg-white shadow-2xl'
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            isBig ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'
          }`}
        >
          <X size={15} />
        </button>

        <p className={`text-[10px] font-bold tracking-[0.25em] uppercase mb-6 ${isBig ? 'text-amber-300/80' : 'text-neutral-400'}`}>
          Badge débloqué
        </p>

        <div className="flex justify-center mb-5">
          <div className={isBig ? 'animate-in zoom-in duration-500' : ''}>
            <BadgeMedallion code={badge.code} tier={badge.tier} size={88} />
          </div>
        </div>

        <h2 className={`text-xl font-black mb-1.5 ${isBig ? 'text-white' : 'text-neutral-900'}`}>{badge.name}</h2>
        <p className={`text-[13px] leading-relaxed mb-6 ${isBig ? 'text-white/60' : 'text-neutral-500'}`}>{badge.desc}</p>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold transition-colors ${
              isBig ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Share2 size={14} />
            Partager
          </button>
          <button
            onClick={hasMore ? () => setIndex((i) => i + 1) : onClose}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold transition-colors ${
              isBig ? 'bg-white text-neutral-900 hover:bg-white/90' : 'bg-neutral-900 text-white hover:bg-neutral-700'
            }`}
          >
            {hasMore ? `Suivant (${badges.length - index - 1})` : 'Voir ma progression'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
