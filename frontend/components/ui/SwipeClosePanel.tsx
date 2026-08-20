'use client';

import { useRef, useState } from 'react';

/**
 * Enveloppe un panneau (bottom sheet custom qui n'utilise pas BottomSheet.tsx)
 * pour le rendre fermable en le tirant vers le bas — le geste standard de
 * toutes les apps mobiles. Même règles que BottomSheet :
 *  - le drag ne s'arme qu'après ~8px de mouvement vers le bas (les taps sur
 *    les boutons restent des taps) ;
 *  - si le doigt est posé dans une zone qui scrolle et qu'elle n'est pas en
 *    butée haute, on laisse le scroll natif faire son travail.
 */
export default function SwipeClosePanel({
  onClose, className = '', children,
}: { onClose: () => void; className?: string; children: React.ReactNode }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ startY: number; startScrollTop: number; active: boolean } | null>(null);

  /** scrollTop du premier ancêtre réellement scrollable entre le point touché et le panneau. */
  function scrollTopAt(target: EventTarget | null): number {
    let el = target instanceof HTMLElement ? target : null;
    const panel = panelRef.current;
    while (el && el !== panel) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
        return el.scrollTop;
      }
      el = el.parentElement;
    }
    return 0;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return;
    gesture.current = { startY: e.clientY, startScrollTop: scrollTopAt(e.target), active: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const delta = e.clientY - g.startY;

    if (!g.active) {
      if (delta < -4) { gesture.current = null; return; }
      if (delta > 8 && g.startScrollTop <= 0) {
        g.active = true;
        setDragging(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      }
      return;
    }

    if (delta > 0) setDragY(delta);
  }

  function onPointerEnd() {
    const wasActive = gesture.current?.active;
    gesture.current = null;
    if (!wasActive) return;
    if (dragY > 110) onClose();
    setDragY(0);
    setDragging(false);
  }

  return (
    <div
      ref={panelRef}
      className={className}
      style={{
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragging ? 'none' : 'transform 250ms ease-out',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {children}
    </div>
  );
}
