'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';

interface Props {
  before: string;
  after: string;
  alt?: string;
  aspectClass?: string;
}

/**
 * Curseur avant/après : l'image « après » se révèle en glissant le doigt.
 *
 * Le geste vaut mille mots pour une transformation — bien plus que deux
 * vignettes côte à côte. Pointer events uniquement (souris + tactile d'un
 * seul code), et touch-action: none sur la poignée pour que le glissement
 * ne défile pas la page sous le doigt.
 */
export default function BeforeAfterSlider({ before, after, alt = 'Transformation', aspectClass = 'aspect-[4/5]' }: Props) {
  const [pct, setPct] = useState(50);
  const zone = useRef<HTMLDivElement>(null);
  const glisse = useRef(false);

  const placer = useCallback((clientX: number) => {
    const r = zone.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPct(Math.min(94, Math.max(6, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    glisse.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    placer(e.clientX);
  }, [placer]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (glisse.current) placer(e.clientX);
  }, [placer]);

  const onPointerUp = useCallback(() => { glisse.current = false; }, []);

  return (
    <div
      ref={zone}
      className={`relative w-full ${aspectClass} overflow-hidden bg-neutral-900 select-none [touch-action:none]`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Avant : pleine surface, dessous. */}
      <Image src={before} alt={`${alt} — avant`} fill className="object-cover" draggable={false} />

      {/* Après : dessus, rogné à droite du curseur. */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pct}%)` }}>
        <Image src={after} alt={`${alt} — après`} fill className="object-cover" draggable={false} />
      </div>

      {/* Ligne + poignée. */}
      <div className="absolute inset-y-0 w-px bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.4)]" style={{ left: `${pct}%` }} />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] flex items-center justify-center"
        style={{ left: `${pct}%` }}
        aria-hidden
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className="text-neutral-900">
          <path d="M5 1 1 6l4 5M13 1l4 5-4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Étiquettes en bas (le haut appartient au bouton retour et au menu) ;
          chacune ne vit que quand sa moitié est visible. */}
      <span className={`absolute bottom-3 left-3 text-[9px] font-semibold tracking-[0.15em] uppercase text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full transition-opacity duration-200 ${pct < 12 ? 'opacity-0' : 'opacity-100'}`}>
        Avant
      </span>
      <span className={`absolute bottom-3 right-3 text-[9px] font-semibold tracking-[0.15em] uppercase text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full transition-opacity duration-200 ${pct > 88 ? 'opacity-0' : 'opacity-100'}`}>
        Après
      </span>
    </div>
  );
}
