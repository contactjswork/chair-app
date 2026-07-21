'use client';

import { useState, useEffect } from 'react';
import { MapPin, X, Navigation } from 'lucide-react';
import {
  hasGeoBeenAsked,
  markGeoAsked,
  requestBrowserGeolocation,
  storeLocation,
  isNativeApp,
} from '@/hooks/useGeolocation';
import { api } from '@/lib/api';

export default function GeoPermissionModal() {
  const [visible, setVisible] = useState(false);

  async function requestAndStore() {
    try {
      const coords = await requestBrowserGeolocation();
      storeLocation({ latitude: coords.latitude, longitude: coords.longitude });
      // Mettre à jour en base si connecté
      const token = typeof window !== 'undefined' ? localStorage.getItem('chair_token') : null;
      if (token) {
        await api.put('/user/location', {
          latitude:  coords.latitude,
          longitude: coords.longitude,
        });
      }
    } catch {
      // Silencieux — l'utilisateur a peut-être refusé la popup système
    }
  }

  useEffect(() => {
    // Montrer uniquement si jamais demandé et pas déjà de position
    if (!hasGeoBeenAsked()) {
      const timer = setTimeout(() => {
        markGeoAsked();
        if (isNativeApp()) {
          // App native : la popup système iOS suffit, pas d'écran maison
          // avant — sinon ça fait deux demandes pour une seule action.
          requestAndStore();
        } else {
          setVisible(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    markGeoAsked();
    setVisible(false);
  }

  async function allow() {
    markGeoAsked();
    setVisible(false);
    await requestAndStore();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />

      {/* Panneau */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Navigation size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-[15px] leading-tight">CHAIR souhaite accéder{' '}
              <br />à votre position</h3>
          </div>
          <button onClick={dismiss} className="ml-auto text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="px-6 py-5">
          <p className="text-sm text-neutral-600 leading-relaxed mb-5">
            Pour vous montrer les coiffeurs les plus proches de vous — comme Airbnb ou Uber.
            Votre position n'est jamais partagée avec d'autres utilisateurs.
          </p>

          <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-50 rounded-xl px-4 py-3 mb-5">
            <MapPin size={13} className="text-neutral-400 flex-shrink-0" />
            <span>Utilisé uniquement pour afficher les coiffeurs proches de vous</span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={allow}
              className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-2xl text-sm hover:bg-neutral-800 transition-colors"
            >
              Autoriser la localisation
            </button>
            <button
              onClick={dismiss}
              className="w-full text-neutral-500 font-medium py-2.5 rounded-2xl text-sm hover:text-neutral-700 transition-colors"
            >
              Pas maintenant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
