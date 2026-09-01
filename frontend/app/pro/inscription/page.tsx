'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isClientBinary } from '@/lib/appContext';
import { salons } from '@/lib/api';
import type { ApiSalonFull } from '@/lib/types';
import {
  AlertCircle, Building2, CheckCircle, Loader,
  Lock, Mail, MapPin, Scissors, Search, User, X,
} from 'lucide-react';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import ChoiceCard from '@/components/onboarding/ChoiceCard';
import WelcomeSlides from '@/components/onboarding/WelcomeSlides';
import QuestionScreen from '@/components/onboarding/QuestionScreen';
import LocationAccordion from '@/components/onboarding/LocationAccordion';
import { useStepTransition, tapFeedback } from '@/hooks/useStepTransition';

type ProRole = 'hairdresser' | 'salon_owner';
type HairdresserType = 'independent' | 'salon';
type SiretResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; business_name: string; city: string; is_hairdresser: boolean }
  | { status: 'error'; message: string };

type Step =
  | 'role' | 'name' | 'email' | 'password'
  | 'hd_type' | 'hd_location' | 'hd_salon_search'
  | 'so_name' | 'so_location' | 'so_siret';

/**
 * Ordre des écrans selon le chemin choisi — un seul endroit où la séquence
 * est décidée. Le sous-type (indépendant/salarié) est demandé juste après le
 * rôle — les deux questions "qui es-tu" restent groupées avant l'identité
 * (nom/email/mot de passe), au lieu de revenir dessus après coup. L'adresse
 * (indépendant + gérant) est un seul écran (`LocationAccordion` : pays →
 * région → département → ville → rue, chaque section se replie une fois
 * validée) plutôt qu'un écran par champ, pour être retrouvé sur la carte.
 */
function buildPath(role: ProRole | null, hdType: HairdresserType): Step[] {
  const identity: Step[] = ['name', 'email', 'password'];
  if (role === 'salon_owner') {
    return ['role', ...identity, 'so_name', 'so_location', 'so_siret'];
  }
  if (role === 'hairdresser') {
    return ['role', 'hd_type', ...identity, hdType === 'independent' ? 'hd_location' : 'hd_salon_search'];
  }
  return ['role'];
}

function Screen(props: Omit<React.ComponentProps<typeof QuestionScreen>, 'theme'>) {
  return <QuestionScreen {...props} theme="dark" />;
}

const inputCls = 'w-full px-4 py-4 bg-neutral-900 border border-neutral-700 rounded-2xl text-[16px] text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-400 transition-all';

export default function ProInscriptionPage() {
  const { register } = useAuth();
  const { animClass, transition } = useStepTransition();
  const router = useRouter();

  const [showSlides, setShowSlides] = useState(true);

  // Dans le binaire CHAIR CLIENT, pas de création de compte pro : chaque app
  // n'expose que son propre parcours d'entrée (verrou binaire ↔ rôle).
  useEffect(() => {
    if (isClientBinary()) router.replace('/inscription');
  }, [router]);

  const [role, setRole] = useState<ProRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hairdresserType, setHairdresserType] = useState<HairdresserType>('independent');
  const [country, setCountry] = useState('France');
  const [region, setRegion] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');

  // Recherche + rattachement salon
  const [salonQuery, setSalonQuery] = useState('');
  const [salonResults, setSalonResults] = useState<ApiSalonFull[]>([]);
  const [salonSearching, setSalonSearching] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<ApiSalonFull | null>(null);
  const salonSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [managerSalonName, setManagerSalonName] = useState('');
  const [managerCountry, setManagerCountry] = useState('France');
  const [managerRegion, setManagerRegion] = useState('');
  const [managerDepartment, setManagerDepartment] = useState('');
  const [managerCity, setManagerCity] = useState('');
  const [managerStreet, setManagerStreet] = useState('');
  const [siret, setSiret] = useState('');
  const [siretResult, setSiretResult] = useState<SiretResult>({ status: 'idle' });
  const siretTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const path = useMemo(() => buildPath(role, hairdresserType), [role, hairdresserType]);
  const step = path[stepIndex];
  const progress = ((stepIndex + 1) / path.length) * 100;

  function goNext() {
    tapFeedback();
    setError('');
    if (stepIndex < path.length - 1) {
      transition(() => setStepIndex((i) => i + 1));
    } else {
      submitForm();
    }
  }

  function goBack() {
    tapFeedback();
    setError('');
    // Première étape : on QUITTE l'inscription au lieu de ne rien faire.
    // Même correctif que l'inscription client (voir app/inscription/page.tsx) :
    // arrivé ici depuis les slides d'accueil, l'utilisateur était piégé — la
    // flèche n'apparaissait qu'à partir de l'étape 2, il fallait tuer l'app.
    if (stepIndex === 0) {
      if (typeof window !== 'undefined' && window.history.length > 1) router.back();
      else router.push('/pro/connexion');
      return;
    }
    transition(() => setStepIndex((i) => i - 1));
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

  async function submitForm() {
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, string | number | undefined> = { name, email, password, password_confirmation: password, role: role! };
      if (role === 'hairdresser') {
        payload.hairdresser_type = hairdresserType;
        if (hairdresserType === 'independent') {
          payload.region = region || undefined;
          payload.department = department || undefined;
          payload.city = city || undefined;
          payload.address = street || undefined;
        } else if (selectedSalon) {
          payload.salon_id = selectedSalon.id;
        }
      } else {
        payload.salon_name = managerSalonName || undefined;
        payload.salon_region = managerRegion || undefined;
        payload.salon_department = managerDepartment || undefined;
        payload.salon_city = managerCity || undefined;
        payload.salon_address = managerStreet || undefined;
        payload.siret = siret.length === 14 ? siret : undefined;
      }
      await register(payload as unknown as Parameters<typeof register>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setIsLoading(false);
    }
  }

  if (showSlides) {
    return <WelcomeSlides onDone={() => setShowSlides(false)} />;
  }

  return (
    // min-h (pas h fixe) + pas d'overflow-hidden : sur clavier mobile ouvert,
    // le viewport visuel se réduit sans que la mise en page ne se recalcule
    // (h-[100svh] restait figé) — le CTA passait alors sous le clavier, hors
    // d'atteinte. En laissant la page défiler naturellement, le focus d'un
    // champ fait remonter nativement le CTA juste en dessous à l'écran.
    <div className="min-h-[100dvh] bg-neutral-950 flex flex-col">
      <OnboardingHeader
        progress={progress}
        onBack={goBack}
        onSkip={undefined}
      />

      {error && (
        <div className="flex-shrink-0 mx-6 mb-3 px-4 py-3 bg-red-900/40 rounded-2xl text-sm text-red-400 flex items-start gap-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-180 ease-out ${animClass}`}>

        {/* ── Rôle ── */}
        {step === 'role' && (
          <Screen eyebrow="Bienvenue" title="Tu es..." ctaLabel="Continuer" ctaDisabled={!role} onNext={goNext}>
            <div className="grid grid-cols-1 gap-3">
              <ChoiceCard
                variant="dark"
                icon={Scissors}
                label="Coiffeur"
                sublabel="Gère ton profil, tes réalisations et tes RDV"
                active={role === 'hairdresser'}
                onClick={() => setRole('hairdresser')}
              />
              <ChoiceCard
                variant="dark"
                icon={Building2}
                label="Gérant de salon"
                sublabel="Crée la page de ton salon et gère ton équipe"
                active={role === 'salon_owner'}
                onClick={() => setRole('salon_owner')}
              />
            </div>
          </Screen>
        )}

        {/* ── Nom ── */}
        {step === 'name' && (
          <Screen
            eyebrow="Identité"
            title="Comment tu t'appelles ?"
            ctaLabel="Continuer"
            ctaDisabled={name.trim().length < 2}
            onNext={goNext}
          >
            <div className="relative">
              <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim().length >= 2) goNext(); }}
                placeholder="Sophie Martin"
                className={`${inputCls} pl-11`}
              />
            </div>
          </Screen>
        )}

        {/* ── Email ── */}
        {step === 'email' && (
          <Screen
            eyebrow="Identité"
            title="Ton email professionnel ?"
            hint="Il servira à te connecter et à recevoir tes notifications importantes."
            ctaLabel="Continuer"
            ctaDisabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
            onNext={goNext}
          >
            <div className="relative">
              <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) goNext(); }}
                placeholder="votre@email.fr"
                className={`${inputCls} pl-11`}
              />
            </div>
          </Screen>
        )}

        {/* ── Mot de passe ── */}
        {step === 'password' && (
          <Screen
            eyebrow="Sécurité"
            title="Choisis un mot de passe."
            hint="8 caractères minimum."
            ctaLabel="Continuer"
            ctaDisabled={password.length < 8}
            onNext={goNext}
          >
            <div className="relative">
              <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password.length >= 8) goNext(); }}
                placeholder="8 caractères minimum"
                className={`${inputCls} pl-11`}
              />
            </div>
          </Screen>
        )}

        {/* ── Coiffeur : type ── */}
        {step === 'hd_type' && (
          <Screen eyebrow="Ton activité" title="Indépendant(e) ou en salon ?" ctaLabel="Continuer" onNext={goNext}>
            <div className="grid grid-cols-2 gap-3">
              <ChoiceCard
                variant="dark"
                compact
                icon={MapPin}
                label="Indépendant(e)"
                active={hairdresserType === 'independent'}
                onClick={() => setHairdresserType('independent')}
              />
              <ChoiceCard
                variant="dark"
                compact
                icon={Building2}
                label="En salon"
                active={hairdresserType === 'salon'}
                onClick={() => setHairdresserType('salon')}
              />
            </div>
          </Screen>
        )}

        {/* ── Coiffeur indépendant : localisation (un seul écran, tout visible) ── */}
        {step === 'hd_location' && (
          <Screen
            eyebrow="Localisation"
            title="Où exerces-tu ?"
            hint="Pour être retrouvé sur la carte et dans les recherches et classements locaux."
            ctaLabel={isLoading ? 'Création...' : 'Créer mon profil'}
            ctaLoading={isLoading}
            ctaDisabled={country === 'France' ? (!region || !department || city.trim().length < 2) : city.trim().length < 2}
            onNext={goNext}
          >
            <LocationAccordion
              value={{ country, region, department, city, street }}
              onChange={(patch) => {
                if (patch.country !== undefined) setCountry(patch.country);
                if (patch.region !== undefined) setRegion(patch.region);
                if (patch.department !== undefined) setDepartment(patch.department);
                if (patch.city !== undefined) setCity(patch.city);
                if (patch.street !== undefined) setStreet(patch.street);
              }}
              theme="dark"
            />
          </Screen>
        )}

        {/* ── Coiffeur salarié : recherche du salon ── */}
        {step === 'hd_salon_search' && (
          <Screen
            eyebrow="Ton salon"
            title="Cherche ton salon."
            hint="Ton gérant confirmera le rattachement — ça n'empêche pas de continuer sans."
            ctaLabel={isLoading ? 'Création...' : (selectedSalon ? 'Créer mon profil' : 'Continuer sans salon')}
            ctaLoading={isLoading}
            onNext={goNext}
          >
            {selectedSalon ? (
              <div className="flex items-center justify-between bg-neutral-900 ring-1 ring-white/10 rounded-2xl px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{selectedSalon.name}</p>
                  {selectedSalon.city && <p className="text-xs text-neutral-500">{selectedSalon.city}</p>}
                </div>
                <button type="button" onClick={() => { setSelectedSalon(null); setSalonQuery(''); }} className="text-neutral-400 hover:text-white flex-shrink-0 ml-2">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    autoFocus
                    type="text"
                    value={salonQuery}
                    onChange={(e) => searchSalons(e.target.value)}
                    placeholder="Nom ou ville du salon"
                    className={`${inputCls} pl-11`}
                  />
                </div>
                {salonSearching && (
                  <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1.5"><Loader size={12} className="animate-spin" /> Recherche...</p>
                )}
                {!salonSearching && salonResults.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {salonResults.map((s) => (
                      <button key={s.id} type="button" onClick={() => { setSelectedSalon(s); setSalonResults([]); }}
                        className="w-full text-left px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 ring-1 ring-white/10 transition-colors">
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        {s.city && <p className="text-[11px] text-neutral-500">{s.city}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {!salonSearching && salonQuery.trim().length >= 2 && salonResults.length === 0 && (
                  <p className="text-[12px] text-neutral-500 mt-3 leading-relaxed">
                    Aucun salon trouvé — tu pourras te rattacher dès que ton gérant aura créé sa page CHAIR.
                  </p>
                )}
              </div>
            )}
          </Screen>
        )}

        {/* ── Gérant : nom du salon ── */}
        {step === 'so_name' && (
          <Screen eyebrow="Ton salon" title="Comment s'appelle ton salon ?" ctaLabel="Continuer" ctaDisabled={managerSalonName.trim().length < 2} onNext={goNext}>
            <input
              autoFocus
              type="text"
              value={managerSalonName}
              onChange={(e) => setManagerSalonName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && managerSalonName.trim().length >= 2) goNext(); }}
              placeholder="Koehler Coiffeur"
              className={inputCls}
            />
          </Screen>
        )}

        {/* ── Gérant : localisation salon (un seul écran, tout visible) ── */}
        {step === 'so_location' && (
          <Screen
            eyebrow="Ton salon"
            title="Où est-il situé ?"
            hint="Pour être retrouvé sur la carte et dans les recherches et classements locaux."
            ctaLabel="Continuer"
            ctaDisabled={managerCountry === 'France' ? (!managerRegion || !managerDepartment || managerCity.trim().length < 2) : managerCity.trim().length < 2}
            onNext={goNext}
          >
            <LocationAccordion
              value={{ country: managerCountry, region: managerRegion, department: managerDepartment, city: managerCity, street: managerStreet }}
              onChange={(patch) => {
                if (patch.country !== undefined) setManagerCountry(patch.country);
                if (patch.region !== undefined) setManagerRegion(patch.region);
                if (patch.department !== undefined) setManagerDepartment(patch.department);
                if (patch.city !== undefined) setManagerCity(patch.city);
                if (patch.street !== undefined) setManagerStreet(patch.street);
              }}
              theme="dark"
            />
          </Screen>
        )}

        {/* ── Gérant : SIRET ── */}
        {step === 'so_siret' && (
          <Screen
            eyebrow="Vérification"
            title="Un SIRET ?"
            hint="Recommandé — ça vérifie et certifie ton salon auprès des clients."
            ctaLabel={isLoading ? 'Création...' : 'Créer mon espace salon'}
            ctaLoading={isLoading}
            onNext={goNext}
          >
            <div className="relative">
              <input
                type="text"
                value={siret}
                onChange={(e) => checkSiret(e.target.value)}
                placeholder="14 chiffres"
                maxLength={14}
                className={`${inputCls} pr-16`}
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums ${
                siret.length === 0 ? 'text-neutral-600' : siret.length === 14 ? 'text-green-400' : 'text-amber-400'
              }`}>{siret.length}/14</span>
            </div>
            {siretResult.status === 'loading' && <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1.5"><Loader size={12} className="animate-spin" /> Vérification...</p>}
            {siretResult.status === 'ok' && (
              <div className={`flex items-start gap-2 mt-3 px-4 py-3 rounded-2xl text-xs ${siretResult.is_hairdresser ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>
                {siretResult.is_hairdresser ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
                <span>{siretResult.is_hairdresser ? 'Salon vérifié' : 'Entreprise trouvée'} — {siretResult.business_name}</span>
              </div>
            )}
            {siretResult.status === 'error' && <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5"><AlertCircle size={12} />{siretResult.message}</p>}
          </Screen>
        )}
      </div>

      <div className="flex-shrink-0 text-center pb-safe pb-4">
        <p className="text-[13px] text-neutral-500">
          Déjà un compte pro ?{' '}
          <Link href="/pro/connexion" className="font-semibold text-white hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
