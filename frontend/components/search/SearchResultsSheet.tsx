'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SheetPosition = 'peek' | 'half' | 'full';

interface Props {
  position: SheetPosition;
  onPositionChange: (p: SheetPosition) => void;
  /** Zone toujours visible (poignée + résumé + filtres rapides) — c'est la zone de drag */
  header: React.ReactNode;
  children: React.ReactNode;
}

const PEEK_VISIBLE = 112;

/**
 * Bottom sheet à trois positions (poignée seule / intermédiaire / quasi plein
 * écran), glissable au doigt, qui laisse la carte visible derrière et la
 * navigation CHAIR accessible en dessous.
 */
export default function SearchResultsSheet({ position, onPositionChange, header, children }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sheetRef   = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const dragRef = useRef<{ startY: number; baseOffset: number; lastY: number; lastT: number; velocity: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const halfVisible = Math.min(430, Math.round(height * 0.48));

  const offsetFor = useCallback((p: SheetPosition): number => {
    if (height === 0) return 0;
    if (p === 'full') return 0;
    if (p === 'half') return Math.max(0, height - halfVisible);
    return Math.max(0, height - PEEK_VISIBLE);
  }, [height, halfVisible]);

  const applyOffset = (offset: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 300ms cubic-bezier(0.32, 0.72, 0.28, 1)' : 'none';
    el.style.transform = `translateY(${offset}px)`;
  };

  // Position pilotée par le parent (tap marqueur, recherche lancée, etc.)
  useEffect(() => {
    if (height === 0) return;
    applyOffset(offsetFor(position), true);
  }, [position, height, offsetFor]);

  function onPointerDown(e: React.PointerEvent) {
    if (height === 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      baseOffset: offsetFor(position),
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;

    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt; // px/ms
    d.lastY = e.clientY;
    d.lastT = now;

    const maxOffset = offsetFor('peek');
    const next = Math.min(maxOffset, Math.max(0, d.baseOffset + dy));
    applyOffset(next, false);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;

    const current = Math.min(offsetFor('peek'), Math.max(0, d.baseOffset + (e.clientY - d.startY)));

    // Projection avec inertie légère, puis snap à la position la plus proche
    const projected = current + d.velocity * 160;
    const snaps: { p: SheetPosition; o: number }[] = [
      { p: 'full', o: offsetFor('full') },
      { p: 'half', o: offsetFor('half') },
      { p: 'peek', o: offsetFor('peek') },
    ];
    let best = snaps[0];
    for (const s of snaps) {
      if (Math.abs(s.o - projected) < Math.abs(best.o - projected)) best = s;
    }

    applyOffset(best.o, true);
    if (best.p !== position) onPositionChange(best.p);
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-x-0 top-0 bottom-0 z-30 pointer-events-none overflow-hidden"
    >
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 h-full flex flex-col bg-white rounded-t-3xl pointer-events-auto"
        style={{ boxShadow: '0 -6px 24px rgba(0,0,0,0.10)', transform: `translateY(${offsetFor(position)}px)` }}
      >
        {/* Zone de drag : poignée + header */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <button
              aria-label="Déplier les résultats"
              onClick={() => onPositionChange(position === 'peek' ? 'half' : position === 'half' ? 'full' : 'half')}
              className="w-10 h-1.5 bg-neutral-200 rounded-full"
            />
          </div>
          {header}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
