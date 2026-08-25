'use client';

// Opt-in push contextualisé — JAMAIS de popup système à la première seconde.
//
// La demande de permission iOS ne peut être faite qu'UNE fois : si
// l'utilisateur refuse, seuls les Réglages système peuvent revenir dessus.
// D'où cette carte : elle explique la valeur AVANT de déclencher la popup,
// et ne s'affiche qu'après un événement d'engagement réel (réservation
// confirmée, visite de la page compte).
//
// Conditions d'affichage (toutes requises) :
//   • shell natif AVEC le plugin push (binaire du prochain build TestFlight
//     ou plus récent) — sur le web et les binaires actuels : rien, jamais ;
//   • permission encore à l'état 'prompt' (ni accordée, ni refusée) ;
//   • pas déjà écartée par l'utilisateur (croix → localStorage, on ne
//     harcèle pas).

import { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { getPushPermissionState, requestAndRegister, installPushListeners, syncRegistrationIfGranted } from '@/lib/push';

/** Dismiss mémorisé — la carte ne réapparaît plus sur cet appareil. */
const DISMISS_KEY = 'chair_push_optin_dismissed';

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

interface Props {
  /** Ajuste les marges externes selon l'écran hôte. */
  className?: string;
}

type CardState = 'hidden' | 'idle' | 'busy' | 'done';

export default function PushOptInCard({ className = '' }: Props) {
  const [state, setState] = useState<CardState>('hidden');

  useEffect(() => {
    let cancelled = false;
    if (isDismissed()) return;
    (async () => {
      const perm = await getPushPermissionState();
      // 'unavailable' (web, binaire ancien), 'granted' (déjà actif) et
      // 'denied' (le harceler ici serait un bouton mort : seule la popup
      // système peut demander, et iOS ne la remontre pas) → pas de carte.
      if (!cancelled && perm === 'prompt') setState('idle');
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === 'hidden') return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch { /* ignore */ }
    setState('hidden');
  }

  async function activate() {
    if (state === 'busy') return; // anti double-tap
    setState('busy');
    const result = await requestAndRegister();
    if (result === 'registered') {
      setState('done');
      // Confirmation visible un instant, puis la carte se retire seule.
      setTimeout(() => setState('hidden'), 2000);
    } else {
      // Refus ou erreur : on n'insiste pas — la carte disparaît, la page de
      // préférences explique comment réactiver via les Réglages iPhone.
      setState('hidden');
      if (result === 'denied') {
        try {
          localStorage.setItem(DISMISS_KEY, '1');
        } catch { /* ignore */ }
      }
    }
  }

  if (state === 'done') {
    return (
      <div className={`bg-white rounded-2xl border border-neutral-100 px-5 py-4 flex items-center gap-3 ${className}`}>
        <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <Check size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <p className="text-[14px] font-semibold text-neutral-900">Notifications activées</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-2xl border border-neutral-100 px-5 py-4 ${className}`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ne plus afficher"
        className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-neutral-300 hover:text-neutral-500 transition-colors"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell size={16} className="text-neutral-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-neutral-900 leading-snug">Ne rate aucun rendez-vous</p>
          <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">
            Active les notifications pour recevoir les confirmations et changements concernant tes rendez-vous.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={activate}
        disabled={state === 'busy'}
        aria-busy={state === 'busy' || undefined}
        className="mt-3 w-full h-[46px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
      >
        {state === 'busy' ? (
          <span aria-hidden="true" className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : null}
        {state === 'busy' ? 'Activation…' : 'Activer les notifications'}
      </button>
    </div>
  );
}

/**
 * Bootstrap push, rendu une fois par AppShell : installe les listeners
 * runtime (toast au premier plan, deep link au tap) et resynchronise le
 * token si l'opt-in a déjà eu lieu sur cet appareil. Aucun rendu, aucune
 * popup, no-op complet sur le web et les binaires sans le plugin.
 */
export function PushBootstrap() {
  useEffect(() => {
    installPushListeners();
    void syncRegistrationIfGranted();
  }, []);
  return null;
}
