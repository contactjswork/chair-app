'use client';

import { useState } from 'react';
import { MapPin, Navigation, ChevronRight, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, geo } from '@/lib/api';
import { requestBrowserGeolocation } from '@/hooks/useGeolocation';
import BottomSheet from './BottomSheet';
import CityAutocomplete from './CityAutocomplete';

/**
 * Bouton "ville" visible au-dessus de "Pour toi" — le seul endroit d'où on
 * peut changer la ville qui pilote TOUT le filtrage géographique de la home,
 * sans devoir aller dans modifier-profil. Deux façons de la définir :
 * position GPS (reverse-géocodée) ou recherche ville avec autocomplétion.
 */
export default function LocationBar() {
  const { user, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  if (!user) return null;

  async function saveCity(city: string, lat: number, lng: number) {
    setSaving(true);
    setError('');
    try {
      await api.put('/user/profile', { city, latitude: lat, longitude: lng });
      updateUser({ city, latitude: lat, longitude: lng });
      setOpen(false);
      setSearchText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer la ville.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Trois opérations distinctes, trois messages distincts.
   *
   * Un seul try/catch les enveloppait, et affichait « Position indisponible »
   * quelle que soit celle qui avait échoué — y compris quand la position était
   * parfaitement obtenue et que c'était la recherche de la ville qui ne
   * répondait pas. Un message faux envoie l'utilisateur vérifier un réglage
   * qui n'a jamais été en cause.
   */
  async function useMyPosition() {
    setLocating(true);
    setError('');

    let latitude: number;
    let longitude: number;
    try {
      ({ latitude, longitude } = await requestBrowserGeolocation());
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Position introuvable. Réessaie près d'une fenêtre ou saisis ta ville."
      );
      setLocating(false);
      return;
    }

    try {
      const result = await geo.reverseCity(latitude, longitude);
      await saveCity(result.city, latitude, longitude);
    } catch {
      setError('Ta position a bien été trouvée, mais la ville correspondante non. Saisis-la ci-dessus.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <>
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto pt-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white shadow-[0_2px_10px_-4px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 text-[12.5px] font-bold text-neutral-700 hover:shadow-[0_4px_14px_-4px_rgba(10,10,10,0.14)] hover:ring-neutral-200 active:scale-[0.97] transition-all"
        >
          <MapPin size={13} className="text-neutral-400" />
          {user.city ?? 'Ajouter ma ville'}
          <ChevronRight size={13} className="text-neutral-400" />
        </button>
      </div>

      {open && (
        <BottomSheet onClose={() => setOpen(false)} zIndexClassName="z-[70]">
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-neutral-900">Ta ville</h2>
              <button onClick={() => setOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
                <X size={16} className="text-neutral-500" />
              </button>
            </div>

            <p className="text-[12px] text-neutral-400 mb-4">
              Pilote tous les résultats « près de chez toi » sur la home.
            </p>

            <CityAutocomplete
              autoFocus
              value={searchText}
              onChange={setSearchText}
              onSelect={(s) => saveCity(s.city, s.lat, s.lng)}
              placeholder="Chercher une ville…"
              className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
            />

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-neutral-100" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">ou</span>
              <div className="h-px flex-1 bg-neutral-100" />
            </div>

            <button
              onClick={useMyPosition}
              disabled={locating || saving}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-neutral-900 text-white font-semibold text-[14px] hover:bg-neutral-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {locating ? <Loader2 size={17} className="animate-spin" /> : <Navigation size={17} />}
              {locating ? 'Localisation…' : 'Utiliser ma position actuelle'}
            </button>

            {error && <p className="text-[12px] text-red-600 mt-4">{error}</p>}
            {saving && <p className="text-[12px] text-neutral-400 mt-4">Enregistrement…</p>}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
