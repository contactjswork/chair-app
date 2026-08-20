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
 * vers le bas, et un conteneur de contenu qui scrolle lui-même sans affecter
 * la page derrière.
 *
 * Le glisser-fermer fonctionne depuis TOUT le panneau, pas seulement la
 * poignée (retour Julien : impossible de viser une poignée de 40px au doigt —
 * "comme sur toutes les apps", tirer la fenêtre vers le bas doit la fermer).
 * Règles pour ne rien casser : le drag ne s'arme qu'après ~8px de mouvement
 * vers le bas (les taps sur les boutons restent des taps), et uniquement si
 * le contenu interne est déjà scrollé tout en haut (sinon on laisse le scroll
 * natif faire son travail — overscroll-contain empêche le chaînage, donc les
 * pointermove continuent de nous parvenir une fois en butée haute).
 *
 * setPointerCapture + onPointerCancel (pas seulement onPointerUp) pour rester
 * fiable même si le doigt sort du panneau pendant le geste.
 */
export default function BottomSheet({ onClose, children, className = '', maxHeight = 'max-h-[85vh]', zIndexClassName = 'z-50' }: BottomSheetProps) {
  useScrollLock(true);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ startY: number; active: boolean } | null>(null);

  function onPanelPointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return;
    gesture.current = { startY: e.clientY, active: false };
  }

  function onPanelPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const delta = e.clientY - g.startY;

    if (!g.active) {
      // Geste vers le haut → c'est un scroll de contenu, on s'efface.
      if (delta < -4) { gesture.current = null; return; }
      // On n'arme le drag que si le contenu est en butée haute — sinon le
      // doigt est en train de faire défiler le contenu, pas de tirer la sheet.
      const scroller = scrollRef.current;
      const atTop = !scroller || scroller.scrollTop <= 0;
      if (delta > 8 && atTop) {
        g.active = true;
        setDragging(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      }
      return;
    }

    if (delta > 0) setDragY(delta);
  }

  function onPanelPointerEnd() {
    const wasActive = gesture.current?.active;
    gesture.current = null;
    if (!wasActive) return;
    if (dragY > 110) onClose();
    setDragY(0);
    setDragging(false);
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
        onPointerDown={onPanelPointerDown}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerEnd}
        onPointerCancel={onPanelPointerEnd}
      >
        <div className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none">
          <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto" />
        </div>
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
