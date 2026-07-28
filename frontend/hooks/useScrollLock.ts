'use client';

import { useEffect } from 'react';

/**
 * Verrouille le scroll de la page tant que `active` est vrai, via la technique
 * position:fixed (plus fiable que overflow:hidden seul sur iOS WKWebView / Safari,
 * qui laisse sinon le rubber-band scroll traverser vers l'arrière-plan pendant
 * qu'une bottom sheet est ouverte).
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
