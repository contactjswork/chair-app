'use client';

import Link from 'next/link';
import { useState } from 'react';
import { User, Scissors, Building2, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'client' | 'hairdresser';
type HairdresserType = 'independent' | 'salon';

export default function InscriptionPage() {
  const { register } = useAuth();

  const [role, setRole] = useState<Role>(() => {
    if (typeof window === 'undefined') return 'client';
    return new URLSearchParams(window.location.search).get('role') === 'hairdresser'
      ? 'hairdresser'
      : 'client';
  });

  // Step 1 — commun
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — coiffeur uniquement
  const [hairdresserType, setHairdresserType] = useState<HairdresserType>('independent');
  const [city, setCity]                 = useState('');
  const [salonName, setSalonName]       = useState('');
  const [salonCity, setSalonCity]       = useState('');
  const [bookingUrl, setBookingUrl]     = useState('');
  const [salonInstagram, setSalonInstagram] = useState('');

  const [step, setStep]         = useState(1); // 1 = base, 2 = détails coiffeur
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (role === 'hairdresser') {
      setStep(2);
    } else {
      submitForm();
    }
  }

  async function submitForm() {
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, string | undefined> = {
        name,
        email,
        password,
        password_confirmation: password,
        role,
      };

      if (role === 'hairdresser') {
        payload.hairdresser_type = hairdresserType;
        if (hairdresserType === 'independent') {
          payload.city = city || undefined;
        } else {
          payload.salon_name      = salonName || undefined;
          payload.salon_city      = salonCity || undefined;
          payload.booking_url     = bookingUrl || undefined;
          payload.salon_instagram = salonInstagram || undefined;
        }
      } else {
        payload.city = city || undefined;
      }

      await register(payload as unknown as Parameters<typeof register>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight text-neutral-900">CHAIR</Link>
          <p className="text-sm text-neutral-500 mt-2">Créez votre compte gratuitement</p>
        </div>

        {/* ══ ÉTAPE 1 — Infos de base ══ */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 mb-4">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <p className="text-xs font-semibold text-neutral-700 mb-3">Je suis...</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {([['client', 'Client', User], ['hairdresser', 'Coiffeur', Scissors]] as const).map(([value, label, Icon]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setRole(value as Role)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${
                    role === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nom complet</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sophie Martin" required
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" required
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
              </div>
              {/* Ville uniquement pour les clients */}
              {role === 'client' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Ville <span className="font-normal text-neutral-400">(optionnelle)</span>
                  </label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Strasbourg"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
                </div>
              )}
              <button type="submit"
                className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-colors text-sm mt-2">
                {role === 'hairdresser' ? 'Continuer' : 'Créer mon compte'}
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 text-center mt-4">
              En créant un compte, vous acceptez nos{' '}
              <a href="#" className="underline">Conditions d'utilisation</a>.
            </p>
          </form>
        )}

        {/* ══ ÉTAPE 2 — Détails coiffeur ══ */}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); submitForm(); }}
            className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 mb-4">

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <button type="button" onClick={() => setStep(1)}
              className="text-xs text-neutral-400 hover:text-neutral-700 mb-5 flex items-center gap-1 transition-colors">
              ← Retour
            </button>

            <p className="text-xs font-semibold text-neutral-700 mb-3">Mon activité</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {([
                ['independent', 'Indépendant(e)', MapPin],
                ['salon', 'En salon', Building2],
              ] as const).map(([value, label, Icon]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setHairdresserType(value as HairdresserType)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${
                    hairdresserType === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {hairdresserType === 'independent' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Ville principale <span className="font-normal text-neutral-400">(optionnelle)</span>
                    </label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Strasbourg"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-3 text-xs text-neutral-500 leading-relaxed">
                    En tant qu'indépendant(e), vous pouvez recevoir des demandes de rendez-vous directement via CHAIR.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nom du salon</label>
                    <input type="text" value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder="Salon Elégance"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Ville du salon <span className="font-normal text-neutral-400">(optionnelle)</span>
                    </label>
                    <input type="text" value={salonCity} onChange={(e) => setSalonCity(e.target.value)} placeholder="Strasbourg"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Lien de réservation du salon <span className="font-normal text-neutral-400">(optionnel)</span>
                    </label>
                    <input type="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://planity.com/votre-salon"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Instagram du salon <span className="font-normal text-neutral-400">(optionnel)</span>
                    </label>
                    <input type="url" value={salonInstagram} onChange={(e) => setSalonInstagram(e.target.value)} placeholder="https://instagram.com/votre-salon"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all" />
                  </div>
                </>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-colors text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-neutral-500">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="font-semibold text-neutral-900 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
