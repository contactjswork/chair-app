'use client';

import { useEffect } from 'react';

/**
 * Force l'arrivée EN HAUT de la page au montage. Les pages profil (Server
 * Components async, rendues en streaming) héritaient parfois de la position
 * de scroll de la page précédente : on atterrissait au milieu du profil
 * (bug constaté en réel — navigation home scrollée → profil ⇒ scrollY ~440
 * au lieu de 0). Monté en premier dans la page concernée.
 */
export default function ScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
