'use client';

import { useRef, useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';

interface BottomSheetProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** Hauteur maximale du panneau — Tailwind, ex. 'max-h-[85vh]'. */
  maxHeight?: string;
  /** z-index du conteneur — Tailwind, ex. 'z-[100]'. Défaut z-50. */
  zIndexClassName?: string;
}

/**
 * Coquille commune à toutes les bottom sheets de l'app (spécialité, avis,
 * partage, badges...). Gère : verrouillage du scroll d'arrière-plan (l'app ne
 * doit plus scroller pendant qu'une sheet est ouverte), fermeture par glisser
 * vers le bas (poignée réellement fonctionnelle, pas juste décorative), et un
 * conteneur de contenu qui scrolle lui-même sans affecter la page derrière.
 *
 * Le drag utilise setPointerCapture + onPointerCancel (pas seulement
 * onPointerUp/onPointerLeave) pour rester fiable même si le doigt sort de la
 * poignée pendant le geste — même piège que le drag de l'agenda pro.
 */
export default function BottomSheet({ onClose, children, className = '', maxHeight = 'max-h-[85vh]', zIndexClassName = 'z-50' }: BottomSheetProps) {
  useScrollLock(true);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  function onHandlePointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const delta = e.clientY - startY.current;
    if (delta > 0) setDragY(delta);
  }
  function endDrag() {
    if (dragY > 110) onClose();
    setDragY(0);
    setDragging(false);
    startY.current = null;
  }

  return (
    <div className={`fixed inset-0 flex items-end justify-center ${zIndexClassName}`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white rounded-t-3xl w-full max-w-lg shadow-2xl flex flex-col ${maxHeight} ${className}`}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 250ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto" />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
