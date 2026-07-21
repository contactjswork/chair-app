'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isNativeApp } from '@/hooks/useGeolocation';

const COOKIE_KEY = 'chair_cookies_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Le consentement cookies est une notion web (RGPD) — pas pertinente
    // dans l'app native, qui n'utilise pas de cookies tiers/publicitaires.
    if (isNativeApp()) return;
    try {
      if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
    } catch {}
  }, []);

  function accept() {
    try { localStorage.setItem(COOKIE_KEY, 'accepted'); } catch {}
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem(COOKIE_KEY, 'declined'); } catch {}
    setVisible(false);
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
