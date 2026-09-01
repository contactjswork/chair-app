'use client';

import { useEffect, useState } from 'react';
import { Bell, MapPin, Check } from 'lucide-react';
import { requestAndRegister, isPushAvailable } from '@/lib/push';
import {
  requestBrowserGeolocation,
  storeLocation,
  markGeoAsked,
  isNativeApp,
} from '@/hooks/useGeolocation';

/**
 * Étape d'onboarding qui demande, EN UN SEUL écran et sur un geste explicite,
 * les deux autorisations qui font vivre l'app : notifications (rappels de RDV,
 * avis, abonnement…) et localisation (coiffeurs proches). Placée juste avant
 * l'entrée dans l'app — c'est le bon moment côté iOS pour présenter les popups
 * système, une fois que l'utilisateur a compris à quoi elles servent.
 *
 * Comportement :
 *  - Sur le web (pas d'app native), l'étape n'a pas lieu d'être pour le push :
 *    elle s'auto-passe immédiatement (onContinue) sans rien afficher.
 *  - « Autoriser » déclenche les deux popups système à la suite, puis continue.
 *  - « Plus tard » continue sans rien demander (jamais bloquant — l'app reste
 *    utilisable, les autorisations se redemandent depuis les réglages).
 */
export default function PermissionsStep({
  onContinue,
  theme = 'light',
}: {
  onContinue: () => void;
  theme?: 'light' | 'dark';
}) {
  const [busy, setBusy] = useState(false);
  const native = isNativeApp() || isPushAvailable();

  // Web : rien à demander ici (le push n'existe pas), on ne montre pas d'écran
  // mort — on enchaîne directement.
  useEffect(() => {
    if (!native) onContinue();
    // onContinue est stable (défini par le parent), pas besoin en dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native]);

  if (!native) return null;

  async function autoriser() {
    setBusy(true);
    // Notifications d'abord : enregistre le token APNs auprès du backend si
    // l'utilisateur accepte. On n'interrompt jamais le parcours sur un refus.
    try {
      await requestAndRegister();
    } catch { /* refus ou erreur : on continue quand même */ }

    // Puis la localisation : la popup système apparaît, et si accordée on
    // mémorise la position pour personnaliser la home dès la première ouverture.
    try {
      const pos = await requestBrowserGeolocation();
      storeLocation({ latitude: pos.latitude, longitude: pos.longitude });
    } catch { /* refus ou indisponible : on continue */ }
    finally { markGeoAsked(); }

    setBusy(false);
    onContinue();
  }

  const dark = theme === 'dark';
  const bg = dark ? 'bg-neutral-950' : 'bg-white';
  const titleCls = dark ? 'text-white' : 'text-neutral-900';
  const subCls = dark ? 'text-neutral-400' : 'text-neutral-500';
  const cardCls = dark
    ? 'bg-neutral-900 ring-1 ring-white/[0.06]'
    : 'bg-neutral-50 ring-1 ring-neutral-100';
  const iconWrap = dark ? 'bg-white/10 text-white' : 'bg-neutral-900 text-white';
  const primaryBtn = dark
    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
    : 'bg-neutral-900 text-white hover:bg-neutral-700';
  const secondaryBtn = dark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-700';

  const items = [
    { Icon: Bell, title: 'Notifications', desc: 'Rappels de rendez-vous, avis, nouveautés — rien d\'important ne t\'échappe.' },
    { Icon: MapPin, title: 'Localisation', desc: 'Trouve les meilleurs coiffeurs autour de toi, tout de suite.' },
  ];

  return (
    <div className={`min-h-[100dvh] ${bg} flex flex-col px-6 py-10`}>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="mb-8 text-center">
          <h1 className={`text-[28px] font-bold leading-[1.1] tracking-tight ${titleCls} mb-2`}>
            Avant de commencer
          </h1>
          <p className={`text-[14px] ${subCls}`}>
            Deux autorisations pour profiter pleinement de CHAIR.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {items.map(({ Icon, title, desc }) => (
            <div key={title} className={`flex items-start gap-3.5 rounded-2xl p-4 ${cardCls}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className={`text-[14px] font-bold ${titleCls}`}>{title}</p>
                <p className={`text-[12px] ${subCls} leading-relaxed mt-0.5`}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={autoriser}
          disabled={busy}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] transition-colors disabled:opacity-50 ${primaryBtn}`}
        >
          {busy ? 'Un instant…' : <>Autoriser <Check size={16} /></>}
        </button>

        <button
          onClick={() => { markGeoAsked(); onContinue(); }}
          disabled={busy}
          className={`mt-3 mx-auto block text-[13px] font-semibold transition-colors disabled:opacity-50 ${secondaryBtn}`}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
