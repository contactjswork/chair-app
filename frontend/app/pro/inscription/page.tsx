'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Scissors, Building2, MapPin, CheckCircle, AlertCircle, Loader, Search, X, ChevronRight } from 'lucide-react';
import ChairLogo from '@/components/ui/ChairLogo';
import { useAuth } from '@/contexts/AuthContext';
import { salons } from '@/lib/api';
import type { ApiSalonFull } from '@/lib/types';

type ProRole = 'hairdresser' | 'salon_owner';
type HairdresserType = 'independent' | 'salon';
type SiretResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; business_name: string; city: string; is_hairdresser: boolean }
  | { status: 'error'; message: string };

export default function ProInscriptionPage() {
  const { register } = useAuth();

  const [role, setRole] = useState<ProRole>('hairdresser');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [hairdresserType, setHairdresserType] = useState<HairdresserType>('independent');
  const [city, setCity]         = useState('');

  // Recherche + rattachement salon
  const [salonQuery, setSalonQuery]     = useState('');
  const [salonResults, setSalonResults] = useState<ApiSalonFull[]>([]);
  const [salonSearching, setSalonSearching] = useState(false);
  const [selectedSalon, setSelectedSalon]   = useState<ApiSalonFull | null>(null);
  const salonSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [managerSalonName, setManagerSalonName] = useState('');
  const [managerCity, setManagerCity]           = useState('');
  const [siret, setSiret]                       = useState('');
  const [siretResult, setSiretResult]           = useState<SiretResult>({ status: 'idle' });
  const siretTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep]           = useState(1);
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Nombre d'étapes affichées pour le rôle "coiffeur" : 3 si en salon (recherche
  // de salon incluse), 2 si indépendant (l'étape recherche salon est sautée).
  // Les spécialités sont demandées plus tard, pendant l'onboarding — pas ici.
  const hairdresserSteps = hairdresserType === 'salon' ? 3 : 2;

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (hairdresserType === 'salon') {
      setStep(3);
    } else {
      submitForm();
    }
  }

  function searchSalons(q: string) {
    setSalonQuery(q);
    if (salonSearchTimer.current) clearTimeout(salonSearchTimer.current);
    if (q.trim().length < 2) { setSalonResults([]); return; }
    salonSearchTimer.current = setTimeout(async () => {
      setSalonSearching(true);
      try {
        const res = await salons.list({ q: q.trim() });
        setSalonResults(res.data ?? []);
      } catch {
        setSalonResults([]);
      } finally {
        setSalonSearching(false);
      }
    }, 400);
  }

  async function checkSiret(value: string) {
    const cleaned = value.replace(/\s/g, '');
    setSiret(cleaned);
    setSiretResult({ status: 'idle' });
    if (siretTimerRef.current) clearTimeout(siretTimerRef.current);
    if (cleaned.length !== 14 || !/^\d{14}$/.test(cleaned)) return;
    siretTimerRef.current = setTimeout(async () => {
      setSiretResult({ status: 'loading' });
      try {
        const res = await salons.verifySiret(cleaned);
        if (res.valid) {
          setSiretResult({ status: 'ok', business_name: res.business_name ?? '', city: res.city ?? '', is_hairdresser: res.is_hairdresser ?? false });
        } else {
          setSiretResult({ status: 'error', message: 'SIRET introuvable.' });
        }
      } catch {
        setSiretResult({ status: 'error', message: 'Impossible de vérifier le SIRET.' });
      }
    }, 600);
  }

  async function submitForm(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, string | number | undefined> = { name, email, password, password_confirmation: password, role };
      if (role === 'hairdresser') {
        payload.hairdresser_type = hairdresserType;
        if (hairdresserType === 'independent') {
          payload.city = city || undefined;
        } else if (selectedSalon) {
          payload.salon_id = selectedSalon.id;
        }
      } else {
        payload.salon_name = managerSalonName || undefined;
        payload.salon_city = managerCity || undefined;
        payload.siret = siret.length === 14 ? siret : undefined;
      }
      await register(payload as unknown as Parameters<typeof register>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <ChairLogo href="/pro" size="md" pro dark />
          <p className="text-sm text-neutral-400 mt-2">Créez votre espace professionnel</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: role === 'hairdresser' ? hairdresserSteps : 2 }, (_, i) => i + 1).map((s) => (
              <div key={s} className={`h-1 w-10 rounded-full transition-colors ${step >= s ? 'bg-white' : 'bg-neutral-700'}`} />
            ))}
          </div>
        </div>

        {/* ══ ÉTAPE 1 — Infos classiques ══ */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-4">
            {error && <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">{error}</div>}

            <p className="text-xs font-semibold text-neutral-400 mb-3">Je suis...</p>
            <div className="flex flex-col gap-2 mb-6">
              {([
                ['hairdresser', 'Coiffeur', 'Gérez votre profil, vos réalisations et vos RDV', Scissors],
                ['salon_owner', 'Gérant de salon', 'Créez la page de votre salon et gérez votre équipe', Building2],
              ] as const).map(([value, label, desc, Icon]) => (
                <button type="button" key={value} onClick={() => setRole(value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    role === value ? 'border-white bg-white text-neutral-900' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white'
                  }`}>
                  <Icon size={20} strokeWidth={1.5} className="flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className={`text-[11px] leading-tight mt-0.5 ${role === value ? 'text-neutral-500' : 'text-neutral-600'}`}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Nom complet</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sophie Martin" required
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Email professionnel</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" required
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
              </div>
              <button type="submit" className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-xl hover:bg-neutral-100 transition-colors text-sm mt-2">
                Continuer
              </button>
            </div>
          </form>
        )}

        {/* ══ ÉTAPE 2 — Coiffeur : type de compte ══ */}
        {step === 2 && role === 'hairdresser' && (
          <form onSubmit={handleStep2} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-4">
            {error && <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">{error}</div>}
            <button type="button" onClick={() => setStep(1)} className="text-xs text-neutral-500 hover:text-neutral-300 mb-5 flex items-center gap-1 transition-colors">
              ← Retour
            </button>
            <p className="text-xs font-semibold text-neutral-400 mb-3">Mon activité</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {([['independent', 'Indépendant(e)', MapPin], ['salon', 'En salon', Building2]] as const).map(([v, l, Icon]) => (
                <button type="button" key={v} onClick={() => setHairdresserType(v)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${
                    hairdresserType === v ? 'border-white bg-white text-neutral-900' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white'
                  }`}>
                  <Icon size={18} strokeWidth={1.5} />
                  <span className="text-xs">{l}</span>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {hairdresserType === 'independent' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Ville principale <span className="font-normal text-neutral-600">(optionnelle)</span></label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Strasbourg"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
                </div>
              )}
              <button type="submit" disabled={isLoading} className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-xl hover:bg-neutral-100 transition-colors text-sm mt-2 flex items-center justify-center gap-1.5 disabled:opacity-50">
                {hairdresserType === 'salon'
                  ? <>Continuer <ChevronRight size={15} /></>
                  : (isLoading ? 'Création...' : 'Créer mon compte pro')}
              </button>
            </div>
          </form>
        )}

        {/* ══ ÉTAPE 3 — Coiffeur en salon : rattachement ══ */}
        {step === 3 && role === 'hairdresser' && hairdresserType === 'salon' && (
          <form onSubmit={submitForm} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-4">
            {error && <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">{error}</div>}
            <button type="button" onClick={() => setStep(2)} className="text-xs text-neutral-500 hover:text-neutral-300 mb-5 flex items-center gap-1 transition-colors">
              ← Retour
            </button>
            <p className="text-xs font-semibold text-neutral-400 mb-1">Votre salon</p>
            <p className="text-[11px] text-neutral-600 mb-4">Cherchez le salon dans lequel vous travaillez — votre gérant confirmera le rattachement, ça n&apos;empêche pas de continuer.</p>

            {selectedSalon ? (
              <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 mb-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{selectedSalon.name}</p>
                  {selectedSalon.city && <p className="text-xs text-neutral-400">{selectedSalon.city}</p>}
                </div>
                <button type="button" onClick={() => { setSelectedSalon(null); setSalonQuery(''); }} className="text-neutral-400 hover:text-white flex-shrink-0 ml-2">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text" value={salonQuery} onChange={(e) => searchSalons(e.target.value)}
                    placeholder="Nom ou ville du salon"
                    className="w-full pl-9 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all"
                  />
                </div>
                {salonSearching && (
                  <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1"><Loader size={11} className="animate-spin" /> Recherche...</p>
                )}
                {!salonSearching && salonResults.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
                    {salonResults.map((s) => (
                      <button key={s.id} type="button" onClick={() => { setSelectedSalon(s); setSalonResults([]); }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 transition-colors">
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        {s.city && <p className="text-[11px] text-neutral-500">{s.city}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {!salonSearching && salonQuery.trim().length >= 2 && salonResults.length === 0 && (
                  <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                    Aucun salon trouvé. Pas grave — continuez, vous pourrez rattacher votre salon plus tard depuis votre espace pro dès que votre gérant aura créé sa page CHAIR.
                  </p>
                )}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-xl hover:bg-neutral-100 transition-colors text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
              {isLoading ? 'Création...' : (selectedSalon ? 'Créer mon compte pro' : 'Continuer sans salon pour l’instant')}
            </button>
          </form>
        )}

        {/* ══ ÉTAPE 2 — Gérant salon ══ */}
        {step === 2 && role === 'salon_owner' && (
          <form onSubmit={submitForm} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-4">
            {error && <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">{error}</div>}
            <button type="button" onClick={() => setStep(1)} className="text-xs text-neutral-500 hover:text-neutral-300 mb-5 flex items-center gap-1 transition-colors">
              ← Retour
            </button>
            <p className="text-xs font-semibold text-neutral-400 mb-1">Votre salon</p>
            <p className="text-[11px] text-neutral-600 mb-4">Ces informations seront visibles sur la page publique de votre salon.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Nom du salon</label>
                <input type="text" value={managerSalonName} onChange={(e) => setManagerSalonName(e.target.value)} placeholder="Koehler Coiffeur" required
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Ville</label>
                <input type="text" value={managerCity} onChange={(e) => setManagerCity(e.target.value)} placeholder="Strasbourg"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">SIRET <span className="font-normal text-neutral-600">(recommandé)</span></label>
                <div className="relative">
                  <input type="text" value={siret} onChange={(e) => checkSiret(e.target.value)} placeholder="14 chiffres" maxLength={14}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all pr-16" />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums ${
                    siret.length === 0 ? 'text-neutral-600' : siret.length === 14 ? 'text-green-400' : 'text-amber-400'
                  }`}>{siret.length}/14</span>
                </div>
                {siretResult.status === 'loading' && <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1"><Loader size={11} className="animate-spin" /> Vérification...</p>}
                {siretResult.status === 'ok' && (
                  <div className={`flex items-start gap-2 mt-2 px-3 py-2 rounded-xl text-xs ${siretResult.is_hairdresser ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>
                    {siretResult.is_hairdresser ? <CheckCircle size={12} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />}
                    <span>{siretResult.is_hairdresser ? 'Salon vérifié' : 'Entreprise trouvée'} — {siretResult.business_name}</span>
                  </div>
                )}
                {siretResult.status === 'error' && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} />{siretResult.message}</p>}
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-xl hover:bg-neutral-100 transition-colors text-sm mt-2 disabled:opacity-50">
                {isLoading ? 'Création...' : 'Créer mon espace salon'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-neutral-500">
          Déjà un compte pro ?{' '}
          <Link href="/pro/connexion" className="font-semibold text-white hover:underline">Se connecter</Link>
        </p>
        <p className="text-center text-sm text-neutral-600 mt-3">
          Vous êtes client ?{' '}
          <Link href="/inscription" className="text-neutral-500 hover:text-neutral-300 hover:underline">Créer un compte client</Link>
        </p>
      </div>
    </div>
  );
}
