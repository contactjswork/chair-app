'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Deux web apps installables sur un seul domaine : CHAIR (client, /app) et
 * CHAIR PRO (/pro). iOS et Android lisent le manifest + les balises Apple au
 * moment où l'utilisateur fait "Ajouter à l'écran d'accueil" — ce composant
 * fait pointer ces balises vers la bonne identité selon la section visitée,
 * pour que chaque installation ait son nom, son icône et son écran d'entrée.
 *
 * Sans manifest ni apple-mobile-web-app-capable, iOS crée un simple raccourci
 * Safari (bug constaté par Julien après réinstallation) — ces balises sont
 * donc posées au montage, puis mises à jour à chaque navigation.
 */
export default function PwaManifest() {
  const pathname = usePathname();

  useEffect(() => {
    const isPro = pathname?.startsWith('/pro') ?? false;

    const ensure = (selector: string, create: () => HTMLElement): HTMLElement => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };

    const manifest = ensure('link[rel="manifest"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'manifest');
      return l;
    });
    manifest.setAttribute('href', isPro ? '/manifest-pro.webmanifest' : '/manifest-app.webmanifest');

    const touchIcon = ensure('link[rel="apple-touch-icon"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'apple-touch-icon');
      return l;
    });
    touchIcon.setAttribute('href', isPro ? '/icons/chair-pro-touch.png' : '/icons/chair-touch.png');

    const capable = ensure('meta[name="apple-mobile-web-app-capable"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'apple-mobile-web-app-capable');
      return m;
    });
    capable.setAttribute('content', 'yes');

    const title = ensure('meta[name="apple-mobile-web-app-title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'apple-mobile-web-app-title');
      return m;
    });
    title.setAttribute('content', isPro ? 'CHAIR PRO' : 'CHAIR');

    const statusBar = ensure('meta[name="apple-mobile-web-app-status-bar-style"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      return m;
    });
    statusBar.setAttribute('content', 'default');
  }, [pathname]);

  return null;
}
