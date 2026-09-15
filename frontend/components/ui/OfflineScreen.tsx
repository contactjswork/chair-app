'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Écran hors-ligne global — monté une fois dans le layout racine.
 *
 * Sans réseau, l'app native affichait des écrans cassés ou des spinners
 * infinis (et Apple regarde ça au review). Ici : dès que le navigateur
 * passe hors-ligne, un écran propre recouvre tout ; il disparaît tout seul
 * au retour du réseau, et « Réessayer » recharge la page courante (les
 * données re-fetchent, l'utilisateur reprend où il était).
 *
 * navigator.onLine + événements online/offline : fiables dans une WebView
 * Capacitor comme sur le web. État initial toujours « en ligne » (identique
 * au serveur, pas de mismatch d'hydratation) — corrigé au montage.
 */
export default function OfflineScreen() {
  const [horsLigne, setHorsLigne] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);

  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);

  if (!horsLigne) return null;

  function reessayer() {
    setRetryBusy(true);
    if (navigator.onLine) {
      window.location.reload();
      return;
    }
    // Toujours coupé : petit délai pour que le geste soit perçu, puis on
    // relâche le bouton — pas de faux espoir, pas de reload dans le vide.
    setTimeout(() => setRetryBusy(false), 800);
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-[22px] bg-neutral-100 flex items-center justify-center mb-5">
        <WifiOff size={26} className="text-neutral-400" strokeWidth={1.75} />
      </div>
      <h1 className="text-[20px] font-bold text-neutral-900 mb-1.5">Pas de connexion</h1>
      <p className="text-[13px] text-neutral-500 leading-relaxed max-w-[260px] mb-7">
        Vérifiez votre réseau — tout revient dès que la connexion est rétablie.
      </p>
      <button
        onClick={reessayer}
        disabled={retryBusy}
        className="flex items-center gap-2 bg-neutral-900 text-white font-semibold px-6 py-3 rounded-2xl text-[14px] hover:bg-neutral-700 active:scale-[0.97] transition-all disabled:opacity-60"
      >
        <RefreshCw size={14} className={retryBusy ? 'animate-spin' : ''} /> Réessayer
      </button>
    </div>
  );
}
