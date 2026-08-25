'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { isNativeApp } from '@/hooks/useGeolocation';

const COOKIE_KEY = 'chair_cookies_consent';
// Diffusé sur `window` à chaque changement — permet à un CTA sticky (ex:
// réservation) d'écouter sans dépendance directe sur ce composant ni
// polling du localStorage.
const CONSENT_EVENT = 'chair:cookie-consent-changed';

/**
 * Bandeau d'INFORMATION sur le stockage local — pas une demande de
 * consentement, et c'est délibéré.
 *
 * Ce que CHAIR dépose réellement sur l'appareil (audit exhaustif dans
 * docs/app-store/APP_PRIVACY_MAPPING.md) : uniquement du localStorage
 * première partie strictement nécessaire — jeton de session
 * (`chair_token`/`chair_user`), position mise en cache 24 h avec
 * autorisation (`chair_user_location`), préférences d'affichage, recherches
 * récentes, écrans déjà vus. Aucun cookie publicitaire, aucun SDK
 * analytics, aucun traceur tiers, aucun identifiant de suivi.
 *
 * Or un traceur strictement nécessaire est exempt de consentement : afficher
 * « Accepter / Refuser » pour du stockage qui reste déposé dans les deux cas
 * était un faux choix (le bouton « Refuser » ne changeait strictement rien).
 * Le bandeau informe donc, et renvoie à la politique de confidentialité.
 *
 * La clé `chair_cookies_consent` est conservée telle quelle : les visiteurs
 * qui avaient déjà répondu (`accepted` comme `declined`) ne revoient rien.
 */
function hasStoredAcknowledgement() {
  try {
    return !!localStorage.getItem(COOKIE_KEY);
  } catch {
    // localStorage indisponible (mode privé strict...) : on considère
    // l'information comme délivrée, pour ne pas coincer l'UI avec un
    // bandeau qui ne pourra jamais être fermé durablement.
    return true;
  }
}

function subscribeToConsentChanges(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

function getConsentSnapshot() {
  // Jamais dans l'app native : un bandeau cookies n'y a pas d'objet (pas de
  // navigation web, aucun traceur déposé) et il masquerait l'écran d'accueil
  // dès le lancement — y compris pour le reviewer App Store.
  return !isNativeApp() && !hasStoredAcknowledgement();
}

// Toujours "non visible" pendant le rendu serveur : ni `Capacitor` ni
// `localStorage` n'y existent, et on évite ainsi tout flash / mismatch
// d'hydratation — le vrai statut est déterminé côté client au premier rendu.
function getConsentServerSnapshot() {
  return false;
}

// Hook partagé : expose si le bandeau est actuellement affiché. Utilisé par
// PublicProfileStickyCTA pour ne jamais se faire recouvrir — le CTA se décale
// au-dessus tant que le bandeau est là. `useSyncExternalStore` plutôt qu'un
// `useEffect` + `setState` : le localStorage est une source de vérité externe
// à React, c'est exactement ce que ce hook est fait pour synchroniser.
export function useCookieBannerVisible() {
  return useSyncExternalStore(subscribeToConsentChanges, getConsentSnapshot, getConsentServerSnapshot);
}

export default function CookieBanner() {
  const visible = useCookieBannerVisible();

  function acknowledge() {
    try { localStorage.setItem(COOKIE_KEY, 'acknowledged'); } catch {}
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9998] p-4 md:p-6">
      <div className="max-w-lg mx-auto bg-white border border-neutral-200 rounded-2xl shadow-2xl p-5">
        <p className="text-[13px] text-neutral-700 leading-relaxed mb-4">
          CHAIR utilise uniquement du stockage local nécessaire à son fonctionnement (session, préférences,
          recherches récentes). Aucun cookie publicitaire, aucun traceur tiers, aucune mesure d&apos;audience.{' '}
          <Link href="/confidentialite" className="underline text-neutral-900 font-medium">
            Politique de confidentialité
          </Link>
        </p>
        <button
          onClick={acknowledge}
          className="w-full min-h-[44px] py-2.5 bg-neutral-900 text-white text-[13px] font-semibold rounded-xl"
        >
          J&apos;ai compris
        </button>
      </div>
    </div>
  );
}
