'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { detectOS, isAppPublished, storeUrlFor } from '@/lib/appDownload';
import { isNativeApp } from '@/hooks/useGeolocation';

const DISMISS_KEY = 'chair_app_banner_dismissed';

function computeVisible(pathname: string): boolean {
  if (isNativeApp()) return false;
  if (pathname.startsWith('/pro')) return false;
  if (!window.matchMedia('(max-width: 767px)').matches) return false;
  if (localStorage.getItem(DISMISS_KEY) === '1') return false;
  return true;
}

/** Bannière mobile web discrète, jamais affichée dans l'app native ni sur CHAIR PRO. */
export default function AppBanner() {
  const pathname = usePathname();
  const router = useRouter();
  // Toujours false au premier rendu (identique au serveur, qui n'a pas accès
  // à window/localStorage) — la vraie valeur n'est calculée qu'après le
  // montage. Un useState(() => computeVisible(...)) évaluait window dès le
  // premier rendu CLIENT, avant que l'hydratation soit terminée, ce qui
  // produisait un rendu différent de celui du serveur (mismatch d'hydratation
  // sur le layout racine, donc sur TOUTE page de l'app).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(computeVisible(pathname));
  }, [pathname]);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  function open() {
    const os = detectOS();
    const url = isAppPublished() ? storeUrlFor(os) : '';
    dismiss();
    router.push(url || '/download');
  }

  return (
    <div className="sticky top-0 z-[60] bg-neutral-900 text-white">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[12px] font-black">C</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-tight truncate">Ouvrir dans l&apos;app CHAIR</p>
          <p className="text-[11px] text-white/40 leading-tight truncate">Notifications, favoris, expérience native</p>
        </div>
        <button
          onClick={open}
          className="flex-shrink-0 bg-white text-neutral-900 text-[12px] font-bold px-3.5 py-1.5 rounded-lg"
        >
          Ouvrir
        </button>
        <button onClick={dismiss} aria-label="Fermer" className="flex-shrink-0 text-white/30 p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
