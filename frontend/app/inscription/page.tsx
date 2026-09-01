'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { safeInternalPath } from '@/lib/auth';
import { isProBinary } from '@/lib/appContext';
import { AlertCircle, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import QuestionScreen from '@/components/onboarding/QuestionScreen';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { useStepTransition, tapFeedback } from '@/hooks/useStepTransition';

type Step = 'name' | 'city' | 'email' | 'phone' | 'password';
const STEPS: Step[] = ['name', 'city', 'email', 'phone', 'password'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Miroir exact de la règle serveur (AuthController::register) : 8 à 15
// chiffres une fois les séparateurs retirés, indicatif international admis.
// Volontairement pas restreint aux préfixes mobiles français, qui
// rejetteraient les numéros étrangers — légitimes.
const PHONE_RE = /^\+?[0-9][0-9 .\-]{7,18}[0-9]$/;

function isPhoneValid(v: string): boolean {
  return PHONE_RE.test(v.trim());
}

function Screen(props: Omit<React.ComponentProps<typeof QuestionScreen>, 'theme'>) {
  return <QuestionScreen {...props} theme="light" />;
}

const inputCls = 'w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[16px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';

function InscriptionContent() {
  const { register } = useAuth();
  const { animClass, transition } = useStepTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dans le binaire CHAIR PRO, pas de création de compte client : chaque app
  // n'expose que son propre parcours d'entrée (verrou binaire ↔ rôle).
  useEffect(() => {
    if (isProBinary()) router.replace('/pro/inscription');
  }, [router]);

  // Reprise de parcours : propagé depuis /connexion (ou posé directement par
  // BookingSheet). Chemin interne uniquement — anti open-redirect.
  const returnTo = safeInternalPath(searchParams.get('returnTo'));

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [cityGeo, setCityGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const emailValid = useMemo(() => EMAIL_RE.test(email), [email]);

  function goNext() {
    tapFeedback();
    setError('');
    if (stepIndex < STEPS.length - 1) {
      transition(() => setStepIndex((i) => i + 1));
    } else {
      submitForm();
    }
  }

  function goBack() {
    tapFeedback();
    setError('');
    // Première étape : on QUITTE l'inscription au lieu de ne rien faire.
    // Sans ça, quelqu'un qui arrive ici depuis les slides d'accueil est
    // piégé — pas de retour possible, il faut tuer l'app (retour Julien).
    if (stepIndex === 0) {
      if (typeof window !== 'undefined' && window.history.length > 1) router.back();
      else router.push('/app');
      return;
    }
    transition(() => setStepIndex((i) => i - 1));
  }

  async function submitForm() {
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register({
        name,
        email,
        city,
        latitude: cityGeo?.lat,
        longitude: cityGeo?.lng,
        phone: phone.trim(),
        password,
        password_confirmation: password,
        role: 'client',
      } as Parameters<typeof register>[0], { returnTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setIsLoading(false);
    }
  }

  return (
    // min-h (pas h fixe) + pas d'overflow-hidden : évite que le CTA passe
    // sous le clavier mobile ouvert (voir pro/inscription/page.tsx).
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <OnboardingHeader progress={progress} onBack={goBack} />

      {error && (
        <div className="flex-shrink-0 mx-6 mb-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-180 ease-out ${animClass}`}>

        {/* ── Nom ── */}
        {step === 'name' && (
          <Screen
            eyebrow="Bienvenue"
            title="Comment tu t'appelles ?"
            ctaLabel="Continuer"
            ctaDisabled={name.trim().length < 2}
            onNext={goNext}
          >
            <div className="relative">
              <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim().length >= 2) goNext(); }}
                placeholder="Sophie Martin"
                autoComplete="name"
                className={`${inputCls} pl-11`}
              />
            </div>
          </Screen>
        )}

        {/* ── Ville ── */}
        {step === 'city' && (
          <Screen
            eyebrow="Localisation"
            title="Dans quelle ville es-tu ?"
            hint="Pour ne te montrer que des coiffeurs vraiment près de chez toi."
            ctaLabel="Continuer"
            ctaDisabled={city.trim().length < 2}
            onNext={goNext}
          >
            <CityAutocomplete
              autoFocus
              value={city}
              onChange={(text) => { setCity(text); setCityGeo(null); }}
              onSelect={(s) => { setCity(s.city); setCityGeo({ lat: s.lat, lng: s.lng }); }}
              placeholder="Paris, Lyon, Strasbourg…"
              className={`${inputCls} pl-11`}
              icon={<MapPin size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />}
            />
          </Screen>
        )}

        {/* ── Email ── */}
        {step === 'email' && (
          <Screen
            eyebrow="Identité"
            title="Ton adresse e-mail ?"
            hint="Elle servira à te connecter et à recevoir tes confirmations de réservation."
            ctaLabel="Continuer"
            ctaDisabled={!emailValid}
            onNext={goNext}
          >
            <div className="relative">
              <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && emailValid) goNext(); }}
                placeholder="vous@email.fr"
                autoComplete="email"
                className={`${inputCls} pl-11`}
              />
            </div>
          </Screen>
        )}

        {/* ── Téléphone (obligatoire) ── */}
        {step === 'phone' && (
          <Screen
            eyebrow="Contact"
            title="Ton numéro de téléphone ?"
            hint="Nécessaire pour qu'un coiffeur puisse te joindre en cas d'imprévu sur un rendez-vous."
            ctaLabel="Continuer"
            ctaDisabled={!isPhoneValid(phone)}
            onNext={goNext}
          >
            <div className="relative">
              <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') goNext(); }}
                placeholder="06 12 34 56 78"
                autoComplete="tel"
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
            ctaLabel={isLoading ? 'Création...' : 'Créer mon compte'}
            ctaLoading={isLoading}
            ctaDisabled={password.length < 8}
            onNext={goNext}
          >
            <div className="relative">
              <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password.length >= 8) goNext(); }}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                className={`${inputCls} pl-11`}
              />
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed mt-4">
              En continuant, tu acceptes nos{' '}
              <a href="/cgu" className="underline hover:text-neutral-600">CGU</a>
              {' '}et notre{' '}
              <a href="/confidentialite" className="underline hover:text-neutral-600">Politique de confidentialité</a>.
            </p>
          </Screen>
        )}
      </div>

      <div className="flex-shrink-0 text-center pb-safe pb-4">
        <p className="text-[13px] text-neutral-400">
          Déjà un compte ?{' '}
          <Link
            href={returnTo ? `/connexion?returnTo=${encodeURIComponent(returnTo)}` : '/connexion'}
            className="font-semibold text-neutral-900 hover:underline"
          >Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  // useSearchParams (returnTo) impose une frontière Suspense au-dessus du
  // contenu — même montage que /connexion.
  return (
    <Suspense fallback={null}>
      <InscriptionContent />
    </Suspense>
  );
}
