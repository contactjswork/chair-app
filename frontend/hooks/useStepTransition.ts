'use client';

import { useState } from 'react';

/**
 * Transition fade + slide entre étapes d'un onboarding plein écran — même
 * mécanique que app/app/onboarding (client), extraite ici pour être partagée
 * avec l'onboarding CHAIR PRO sans dupliquer le calcul d'animation.
 */
export function useStepTransition(durationMs = 180) {
  const [anim, setAnim] = useState<'in' | 'out'>('in');

  function transition(fn: () => void) {
    setAnim('out');
    setTimeout(() => { fn(); setAnim('in'); }, durationMs);
  }

  const animClass = anim === 'out' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0';

  return { animClass, transition, durationMs };
}

/** Vibration discrète — même pattern que BottomNav, pas de plugin natif ajouté. */
export function tapFeedback(ms = 8): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
}
