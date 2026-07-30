'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import QuestionScreen from '@/components/onboarding/QuestionScreen';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { useStepTransition, tapFeedback } from '@/hooks/useStepTransition';

type Step = 'name' | 'city' | 'email' | 'phone' | 'password';
const STEPS: Step[] = ['name', 'city', 'email', 'phone', 'password'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Screen(props: Omit<React.ComponentProps<typeof QuestionScreen>, 'theme'>) {
  return <QuestionScreen {...props} theme="light" />;
}

const inputCls = 'w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[16px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';

export default function InscriptionPage() {
  const { register } = useAuth();
  const { animClass, transition } = useStepTransition();

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
    if (stepIndex === 0) return;
    tapFeedback();
    setError('');
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
        phone: phone || undefined,
        password,
        password_confirmation: password,
        role: 'client',
      } as Parameters<typeof register>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setIsLoading(false);
    }
  }

  return (
    <div className="h-[100svh] bg-white flex flex-col overflow-hidden">
      <OnboardingHeader progress={progress} onBack={stepIndex > 0 ? goBack : undefined} />

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

        {/* ── Téléphone (optionnel) ── */}
        {step === 'phone' && (
          <Screen
            eyebrow="Contact"
            title="Ton numéro de téléphone ?"
            hint="Optionnel — utile si un coiffeur doit te joindre au sujet d'une réservation."
            ctaLabel="Continuer"
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
          <Link href="/connexion" className="font-semibold text-neutral-900 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
