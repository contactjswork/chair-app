'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { isNativeApp } from '@/hooks/useGeolocation';

const COOKIE_KEY = 'chair_cookies_consent';
// Diffusé sur `window` à chaque changement de consentement — permet à un
// CTA sticky (ex: réservation) d'écouter sans dépendance directe sur ce
// composant ni polling du localStorage.
const CONSENT_EVENT = 'chair:cookie-consent-changed';

function hasStoredConsent() {
  try {
    return !!localStorage.getItem(COOKIE_KEY);
  } catch {
    // localStorage indisponible (mode privé strict...) : on considère le
    // consentement "traité" pour ne pas bloquer l'UI avec un bandeau qui
    // ne pourra jamais être fermé durablement.
    return true;
  }
}

function subscribeToConsentChanges(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

function getConsentSnapshot() {
  // Le consentement cookies est une notion web (RGPD) — pas pertinente
  // dans l'app native, qui n'utilise pas de cookies tiers/publicitaires.
  return !isNativeApp() && !hasStoredConsent();
}

// Toujours "non visible" pendant le rendu serveur : ni `Capacitor` ni
// `localStorage` n'y existent, et on évite ainsi tout flash / mismatch
// d'hydratation — le vrai statut est déterminé côté client au premier rendu.
function getConsentServerSnapshot() {
  return false;
}

// Hook partagé : expose si le bandeau cookies est actuellement affiché.
// Utilisé par PublicProfileStickyCTA pour ne jamais se faire recouvrir par
// le bandeau — le CTA se décale au-dessus tant que le consentement n'est
// pas traité, plutôt que de laisser le bandeau (z-index plus élevé, requis
// pour rester au-dessus de tout le reste) le masquer. `useSyncExternalStore`
// plutôt qu'un `useEffect` + `setState` : le localStorage est une source de
// vérité externe à React, c'est exactement ce que ce hook est fait pour
// synchroniser, sans le rendu en cascade d'un setState déclenché en effet.
export function useCookieBannerVisible() {
  return useSyncExternalStore(subscribeToConsentChanges, getConsentSnapshot, getConsentServerSnapshot);
}

export default function CookieBanner() {
  const visible = useCookieBannerVisible();

  function accept() {
    try { localStorage.setItem(COOKIE_KEY, 'accepted'); } catch {}
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  function decline() {
    try { localStorage.setItem(COOKIE_KEY, 'declined'); } catch {}
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9998] p-4 md:p-6">
      <div className="max-w-lg mx-auto bg-white border border-neutral-200 rounded-2xl shadow-2xl p-5">
        <p className="text-[13px] text-neutral-700 leading-relaxed mb-4">
          CHAIR utilise des cookies essentiels pour le fonctionnement de l'app (session, préférences). Aucun cookie publicitaire n'est utilisé.{' '}
          <Link href="/confidentialite" className="underline text-neutral-900 font-medium">
            Politique de confidentialité
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl"
          >
            Accepter
          </button>
          <button
            onClick={decline}
            className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 text-[13px] font-semibold rounded-xl"
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}
