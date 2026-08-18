'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { detectOS, isAppPublished, storeUrlFor } from '@/lib/appDownload';
import { isNativeApp } from '@/hooks/useGeolocation';

// Session (pas localStorage) — retour de Julien : "il faut toujours le pop
// up sticky en haut", donc un dismiss ne doit plus bannir le visiteur à vie,
// juste pour l'onglet/session en cours (sinon un clic malheureux sur le X
// une fois et plus personne ne revoit jamais la bannière, y compris sur les
// nouveaux liens externes qui ouvrent le navigateur depuis CHAIR/CHAIR PRO).
const DISMISS_KEY = 'chair_app_banner_dismissed';

function computeVisible(): boolean {
  if (isNativeApp()) return false;
  if (!window.matchMedia('(max-width: 767px)').matches) return false;
  if (sessionStorage.getItem(DISMISS_KEY) === '1') return false;
  return true;
}

/**
 * Bannière mobile web sticky — jamais affichée dans l'app native, mais
 * partout ailleurs (CHAIR et CHAIR PRO, y compris quand un lien externe
 * comme /pro/classements ouvre le navigateur du téléphone) : retour de
 * Julien, pousser au téléchargement de la bonne app plutôt que de rester
 * caché sur /pro/*.
 */
export default function AppBanner() {
  const pathname = usePathname();
  const router = useRouter();
  // Toujours false au premier rendu (identique au serveur, qui n'a pas accès
  // à window/sessionStorage) — la vraie valeur n'est calculée qu'après le
  // montage. Un useState(() => computeVisible()) évaluait window dès le
  // premier rendu CLIENT, avant que l'hydratation soit terminée, ce qui
  // produisait un rendu différent de celui du serveur (mismatch d'hydratation
  // sur le layout racine, donc sur TOUTE page de l'app).
  const [visible, setVisible] = useState(false);

  // CHAIR PRO (coiffeurs/gérants) vs CHAIR (clients) — même bannière,
  // copie adaptée à l'app réellement pertinente pour ce visiteur.
  const isPro = pathname.startsWith('/pro');

  useEffect(() => {
    setVisible(computeVisible());
  }, [pathname]);

  if (!visible) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
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
          <p className="text-[12.5px] font-semibold leading-tight truncate">Ouvrir dans l&apos;app {isPro ? 'CHAIR PRO' : 'CHAIR'}</p>
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
