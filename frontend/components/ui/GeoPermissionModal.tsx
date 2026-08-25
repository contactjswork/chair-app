'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MapPin, X, Navigation } from 'lucide-react';
import {
  getGeoPermissionState,
  getStoredLocation,
  hasGeoBeenAsked,
  markGeoAsked,
  requestBrowserGeolocation,
  storeLocation,
} from '@/hooks/useGeolocation';
import { api } from '@/lib/api';

/**
 * Explication maison AVANT la popup système de localisation ("soft ask").
 *
 * Trois règles tenues ici, toutes dictées par la review App Store
 * (guideline 5.1.1 — ne demander une donnée que là où la fonctionnalité
 * l'exige, et rester utilisable en cas de refus) :
 *
 * 1. JAMAIS au lancement. Ce composant est monté par AppShell, donc présent
 *    sur toutes les pages de l'app — il ne s'arme que sur l'écran de
 *    recherche, seul endroit où la distance pilote réellement les résultats
 *    (tri « les plus proches », rayon, carte). La home, elle, filtre sur la
 *    ville du compte : elle n'a aucun besoin du GPS.
 * 2. JAMAIS de popup système sans geste explicite. Le bouton « Autoriser »
 *    est le seul déclencheur — auparavant l'app appelait directement le
 *    plugin en natif au bout de 1,5 s, ce qui faisait apparaître l'alerte
 *    iOS sans que l'utilisateur ait rien demandé.
 * 3. Un refus ne dégrade rien. On ne réinsiste pas (l'état de l'autorisation
 *    est relu avant d'afficher quoi que ce soit) et la recherche par ville
 *    reste le chemin nominal (SearchModal → champ ville, LocationBar).
 */

/** Seul écran où la position sert vraiment de filtre. */
const GEO_RELEVANT_PATH = '/app/recherche';

/** Laisse la carte et les premiers résultats s'afficher avant de proposer. */
const SOFT_ASK_DELAY_MS = 1_800;

export default function GeoPermissionModal() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const requestAndStore = useCallback(async () => {
    try {
      const coords = await requestBrowserGeolocation();
      storeLocation({ latitude: coords.latitude, longitude: coords.longitude });
      // Mémorisée côté compte uniquement si l'utilisateur est connecté —
      // un visiteur non connecté garde sa position sur son seul appareil.
      const token = typeof window !== 'undefined' ? localStorage.getItem('chair_token') : null;
      if (token) {
        await api.put('/user/location', {
          latitude:  coords.latitude,
          longitude: coords.longitude,
        });
      }
    } catch {
      // Refus système ou position indisponible : silencieux et sans
      // conséquence — la recherche par ville reste disponible.
    }
  }, []);

  useEffect(() => {
    if (pathname !== GEO_RELEVANT_PATH) return;
    // Déjà proposé une fois, ou position fraîche en cache : ne rien faire.
    if (hasGeoBeenAsked() || getStoredLocation()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    getGeoPermissionState().then((state) => {
      if (cancelled) return;
      // 'granted' : rien à expliquer. 'denied' : la popup système ne se
      // rouvrira pas, insister n'apporterait qu'un écran de plus à fermer.
      if (state === 'granted' || state === 'denied') {
        markGeoAsked();
        return;
      }
      timer = setTimeout(() => {
        if (cancelled) return;
        markGeoAsked();
        setVisible(true);
      }, SOFT_ASK_DELAY_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  function dismiss() {
    setVisible(false);
  }

  async function allow() {
    setVisible(false);
    await requestAndStore();
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="geo-permission-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />

      {/* Panneau */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Navigation size={20} className="text-white" />
          </div>
          <h3 id="geo-permission-title" className="text-white font-bold text-[15px] leading-tight">
            Trouver les coiffeurs
            <br />autour de toi
          </h3>
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="ml-auto -mr-2 w-11 h-11 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="px-6 py-5">
          <p className="text-sm text-neutral-600 leading-relaxed mb-5">
            Avec ta position, la recherche classe les coiffeurs du plus proche au plus loin.
            Ta position n&apos;est jamais partagée avec d&apos;autres utilisateurs, ni revendue.
          </p>

          <div className="flex items-start gap-2 text-xs text-neutral-500 bg-neutral-50 rounded-xl px-4 py-3 mb-5">
            <MapPin size={13} className="text-neutral-400 flex-shrink-0 mt-0.5" />
            <span>
              Utilisée uniquement pendant que tu utilises l&apos;app, jamais en arrière-plan.
              Sans elle, tu peux chercher par ville.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={allow}
              className="w-full min-h-[44px] bg-neutral-900 text-white font-semibold py-3.5 rounded-2xl text-sm hover:bg-neutral-800 transition-colors"
            >
              Autoriser la localisation
            </button>
            <button
              onClick={dismiss}
              className="w-full min-h-[44px] text-neutral-500 font-medium py-2.5 rounded-2xl text-sm hover:text-neutral-700 transition-colors"
            >
              Chercher par ville
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
